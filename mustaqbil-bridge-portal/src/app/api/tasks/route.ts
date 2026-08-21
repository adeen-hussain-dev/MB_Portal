import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'
import { createTask, fetchTasks } from '@/lib/portal-data'

export async function GET() {
  return NextResponse.json({ tasks: await fetchTasks() });
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single()

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
      assigneeName: body.assigneeName,
      assigneeEmail: body.assigneeEmail,
      priority: body.priority ?? 'medium',
      dueDate: body.dueDate,
      attachmentName: body.attachmentName ?? '',
      attachments: Array.isArray(body.attachments) ? body.attachments : (body.attachmentName ? [body.attachmentName] : []),
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create task'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
