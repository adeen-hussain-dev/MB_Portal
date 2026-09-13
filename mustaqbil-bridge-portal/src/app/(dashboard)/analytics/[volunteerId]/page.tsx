import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VolunteerAnalyticsView } from '@/components/analytics/volunteer-analytics-view'

interface AnalyticsVolunteerPageProps {
  params: Promise<{
    volunteerId: string
  }>
}

export default async function AnalyticsVolunteerPage({ params }: AnalyticsVolunteerPageProps) {
  const { volunteerId } = await params

  const supabase = await createClient()
  const headerStore = await headers()
  const authHeader = headerStore.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
  const { data: { user } } = await supabase.auth.getUser(token)

  if (!user) {
    redirect('/login')
  }

  const admin = createAdminClient()
  const { data: currentProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Volunteers can only view their own analytics at /analytics
  if (!currentProfile || !['admin', 'manager'].includes(currentProfile.role)) {
    redirect('/analytics')
  }

  // Fetch the target volunteer's profile
  const { data: targetProfile } = await admin
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', volunteerId)
    .single()

  if (!targetProfile) {
    redirect('/team')
  }

  return (
    <VolunteerAnalyticsView
      volunteerId={volunteerId}
      volunteerName={targetProfile.full_name ?? 'Volunteer'}
    />
  )
}
