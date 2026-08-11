import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'
import { deleteTask, fetchTaskById, updateTask } from '@/lib/portal-data'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const task = await fetchTaskById(id);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Task not found'
    return NextResponse.json({ error: message }, { status: 404 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
    return NextResponse.json({ error: 'Only admin or manager can update tasks' }, { status: 403 })
  }

  const body = await request.json();
  try {
    const task = await updateTask(id, body);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update task'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Only admin can delete tasks' }, { status: 403 })
  }

  try {
    await deleteTask(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete task'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
