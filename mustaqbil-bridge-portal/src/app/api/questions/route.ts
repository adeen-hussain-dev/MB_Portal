import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendQuestionAskedEmail } from '@/lib/email'
import { createNotifications } from '@/lib/notifications'

export async function GET() {
  return NextResponse.json({ message: 'Questions API ready' })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
  const { data: { user } } = await supabase.auth.getUser(token)

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { taskId, question } = body

    if (!taskId || typeof taskId !== 'string' || !taskId.trim()) {
      return NextResponse.json({ error: 'Valid task ID is required' }, { status: 400 })
    }

    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json({ error: 'Question content cannot be empty' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Verify task existence & verify assignee matches user
    const { data: task, error: taskError } = await admin
      .from('tasks')
      .select('id, title, assignee_id, status')
      .eq('id', taskId)
      .maybeSingle()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.status === 'done') {
      return NextResponse.json(
        { error: 'Cannot ask questions on a completed task' },
        { status: 400 }
      )
    }

    if (task.assignee_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the assigned volunteer can ask questions on this task' },
        { status: 403 }
      )
    }

    // 2. Insert the question
    const { data: newQuestion, error: insertError } = await admin
      .from('task_questions')
      .insert({
        task_id: taskId,
        asked_by: user.id,
        question: question.trim(),
        status: 'open',
      })
      .select('*')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    // 3. Fetch volunteer and admin/manager details for email dispatch
    try {
      const [volunteerRes, staffRes] = await Promise.all([
        admin.from('profiles').select('full_name, email').eq('id', user.id).single(),
        admin.from('profiles').select('id, email').in('role', ['admin', 'manager']),
      ])

      const volunteerName = volunteerRes.data?.full_name || user.email || 'Volunteer'
      const adminManagerEmails = (staffRes.data || [])
        .map((p) => p.email)
        .filter((e): e is string => Boolean(e))

      if (adminManagerEmails.length > 0) {
        await sendQuestionAskedEmail({
          taskId: task.id,
          taskTitle: task.title,
          question: question.trim(),
          volunteerName,
          volunteerEmail: volunteerRes.data?.email || user.email,
          adminManagerEmails,
        })
      }

      // In-App Notification: Dispatch to all admins and managers
      const staffIds = (staffRes.data || [])
        .map((p) => p.id)
        .filter((id): id is string => Boolean(id))

      if (staffIds.length > 0) {
        await createNotifications(
          staffIds.map((staffId) => ({
            userId: staffId,
            type: 'question_asked',
            title: 'New Volunteer Question',
            body: `${volunteerName} asked: "${question.trim()}" on "${task.title}".`,
            taskId: task.id,
          }))
        )
      }
    } catch (err) {
      console.error('[Questions API] Failed to send notifications for question asked:', err)
    }

    return NextResponse.json(
      {
        message: 'Question posted successfully',
        question: newQuestion,
      },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
