import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  return NextResponse.json({ message: 'Comments API ready' })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const { taskId, content } = await request.json()

  if (!taskId || !content || typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'Task ID and comment content are required' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('task_comments')
    .insert({
      task_id: taskId,
      author_name: profile?.full_name ?? user.email ?? 'Team Member',
      author_role: profile?.role ?? 'volunteer',
      content: content.trim(),
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ message: 'Comment added', comment: data }, { status: 201 })
}
