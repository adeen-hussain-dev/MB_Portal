import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getVolunteerAnalytics } from '@/lib/volunteer-analytics'

export async function GET(request: Request) {
  const supabase = await createClient()
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  try {
    const analytics = await getVolunteerAnalytics(user.id)
    return NextResponse.json(analytics)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch personal analytics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
