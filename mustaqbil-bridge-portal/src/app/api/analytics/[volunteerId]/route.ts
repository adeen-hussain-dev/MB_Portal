import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVolunteerAnalytics } from '@/lib/volunteer-analytics'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ volunteerId: string }> }
) {
  const { volunteerId } = await params

  if (!volunteerId) {
    return NextResponse.json({ error: 'Volunteer ID is required' }, { status: 400 })
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

  if (profileErr || !callerProfile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
  }

  // Only admin and manager can view any volunteer's analytics
  if (!['admin', 'manager'].includes(callerProfile.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Volunteers can only access their own analytics report' },
      { status: 403 }
    )
  }

  // Confirm the target volunteer exists
  const { data: targetProfile, error: targetErr } = await admin
    .from('profiles')
    .select('id, full_name, role, status')
    .eq('id', volunteerId)
    .single()

  if (targetErr || !targetProfile) {
    return NextResponse.json({ error: 'Target volunteer not found' }, { status: 404 })
  }

  try {
    const analytics = await getVolunteerAnalytics(volunteerId)
    return NextResponse.json({
      ...analytics,
      volunteer: {
        id: targetProfile.id,
        fullName: targetProfile.full_name,
        role: targetProfile.role,
        status: targetProfile.status,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch volunteer analytics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
