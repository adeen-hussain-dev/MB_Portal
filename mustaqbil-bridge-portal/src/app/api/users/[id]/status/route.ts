import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params

  if (!targetUserId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: callerProfile, error: profileErr } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileErr || callerProfile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: Only administrators can block or unblock team members' },
      { status: 403 }
    )
  }

  // Prevent admin from blocking themselves
  if (user.id === targetUserId) {
    return NextResponse.json(
      { error: 'Cannot block or modify your own account status' },
      { status: 400 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const newStatus = body.status === 'inactive' ? 'inactive' : 'active'
  const isBlocking = newStatus === 'inactive'

  try {
    // 1. Update Supabase Auth user ban status via service-role admin client
    // 876000 hours (~100 years) ban prevents session renewal / token issue
    const { error: authErr } = await admin.auth.admin.updateUserById(targetUserId, {
      ban_duration: isBlocking ? '876000h' : 'none',
    })

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 400 })
    }

    // 2. Update profiles.status in database
    const { error: dbErr } = await admin
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', targetUserId)

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      id: targetUserId,
      status: newStatus,
      message: isBlocking ? 'Team member has been blocked and suspended' : 'Team member has been unblocked and restored',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
