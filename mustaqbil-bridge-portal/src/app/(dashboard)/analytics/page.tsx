import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { VolunteerAnalyticsView } from '@/components/analytics/volunteer-analytics-view'

export const metadata = {
  title: 'My Analytics | Mustaqbil Bridge',
  description: 'Volunteer personal performance report, delivery timeliness, satisfaction ratings, and task history.',
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const headerStore = await headers()
  const authHeader = headerStore.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
  const { data: { user } } = await supabase.auth.getUser(token)

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  // As specified: visible to volunteers only (admin/manager have org-wide dashboard)
  if (profile && ['admin', 'manager'].includes(profile.role ?? '')) {
    redirect('/overview')
  }

  return <VolunteerAnalyticsView />
}
