import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
  const { data: { user } } = await supabase.auth.getUser(token)

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  try {
    // 1. Fetch user's recent notifications (RLS enforces user_id = auth.uid())
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // 2. Fetch exact unread count
    const { count: unreadCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 400 })
    }

    const mapped = (notifications || []).map((n) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      body: n.body,
      taskId: n.task_id,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at,
    }))

    return NextResponse.json({
      notifications: mapped,
      unreadCount: unreadCount ?? 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch notifications'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
  const { data: { user } } = await supabase.auth.getUser(token)

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Case A: Mark all as read
    if (body.markAllRead === true) {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .select('id')

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
        markedCount: data?.length ?? 0,
      })
    }

    // Case B: Mark single notification as read
    if (body.id && typeof body.id === 'string') {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', body.id)
        .select('*')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        notification: {
          id: data.id,
          userId: data.user_id,
          type: data.type,
          title: data.title,
          body: data.body,
          taskId: data.task_id,
          isRead: Boolean(data.is_read),
          createdAt: data.created_at,
        },
      })
    }

    return NextResponse.json(
      { error: 'Provide either id or markAllRead: true' },
      { status: 400 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update notifications'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
