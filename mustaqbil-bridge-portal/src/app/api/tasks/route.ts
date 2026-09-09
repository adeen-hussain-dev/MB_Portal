import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'
import { createTask, fetchTasks } from '@/lib/portal-data'
import { sendTaskAssignedEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const tasks = await fetchTasks()
  return NextResponse.json({ tasks })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  if (!profile || !['admin', 'manager'].includes(profile.role ?? '')) {
    return NextResponse.json({ error: 'Only admin or manager can create tasks' }, { status: 403 })
  }

  const body = await request.json();

  if (!body.title || !body.description || !body.domain || !body.assigneeName || !body.assigneeEmail || !body.dueDate) {
    return NextResponse.json({ error: 'Missing required task fields' }, { status: 400 })
  }

  try {
    const task = await createTask({
      title: body.title,
      description: body.description,
      domain: body.domain,
      assigneeId: body.assigneeId,
      assigneeName: body.assigneeName,
      assigneeEmail: body.assigneeEmail,
      priority: body.priority ?? 'medium',
      dueDate: body.dueDate,
      createdBy: user.id,
      attachmentName: body.attachmentName ?? '',
      attachments: Array.isArray(body.attachments) ? body.attachments : (body.attachmentName ? [body.attachmentName] : []),
    });

    // Send email notification to assignee
    if (body.assigneeEmail) {
      try {
        await sendTaskAssignedEmail({
          taskId: task.id,
          taskTitle: body.title,
          taskDescription: body.description,
          taskDomain: body.domain,
          taskPriority: body.priority ?? 'medium',
          taskDueDate: body.dueDate,
          assigneeName: body.assigneeName,
          assigneeEmail: body.assigneeEmail,
          assignedByName: profile.full_name || 'Mustaqbil Bridge Team',
        })
      } catch (emailErr) {
        console.error('[Tasks API] Failed to send assignment email:', emailErr)
      }
    }

    // In-App Notification: Dispatch to assigned volunteer
    if (body.assigneeId) {
      try {
        await createNotification({
          userId: body.assigneeId,
          type: 'task_assigned',
          title: 'New Task Assigned',
          body: `You have been assigned to "${body.title}".`,
          taskId: task.id,
        })
      } catch (notifErr) {
        console.error('[Tasks API] Failed to create assignment notification:', notifErr)
      }
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create task'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
