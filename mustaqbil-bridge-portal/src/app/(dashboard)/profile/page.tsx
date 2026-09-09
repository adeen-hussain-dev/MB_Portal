import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileEditor } from '@/components/profile/profile-editor'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, domain, status, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0F3F7F]">Settings</p>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#101828]">My Profile</h1>
        <p className="text-xs sm:text-sm text-[#64748B]">
          Manage your account avatar, review permissions, and update your security credentials.
        </p>
      </div>

      <ProfileEditor profile={profile} />
    </div>
  )
}
