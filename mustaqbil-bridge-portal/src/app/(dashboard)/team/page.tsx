import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AddVolunteerDialog } from '@/components/team/add-volunteer-dialog'
import { TeamMemberCard } from '@/components/team/team-member-card'
import { fetchTasks } from '@/lib/portal-data'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', user.id)
    .single()

  if (!currentProfile || !['admin', 'manager'].includes(currentProfile.role ?? '')) {
    redirect('/tasks')
  }

  const [profilesResult, tasks] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at'),
    fetchTasks(),
  ])

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message)
  }

  const profiles = profilesResult.data ?? []
  const isAdmin = currentProfile?.role === 'admin'
  const isManager = currentProfile?.role === 'manager'

  const openTasksByEmail = tasks.reduce<Record<string, number>>((accumulator, task) => {
    if (task.status === 'done') return accumulator
    if (!task.assigneeEmail) return accumulator

    accumulator[task.assigneeEmail] = (accumulator[task.assigneeEmail] ?? 0) + 1
    return accumulator
  }, {})

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0F3F7F]">Volunteer directory</p>
          <h1 className="font-heading text-3xl font-semibold text-[#101828]">Team roster</h1>
          <p className="max-w-2xl text-sm text-[#64748B]">Add volunteers, review their roles, and flag open work before inactivation.</p>
        </div>
        {isAdmin && <AddVolunteerDialog />}
      </header>

      {profiles.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-[#D8E0EA] bg-white p-10 text-center shadow-sm">
          <p className="font-heading text-2xl font-semibold text-[#101828]">No volunteers yet</p>
          <p className="mt-2 text-sm text-[#64748B]">Invite the first volunteer to start building the directory.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {profiles.map((profile) => {
            const openTasks = profile.email ? (openTasksByEmail[profile.email] ?? 0) : 0

            return (
              <TeamMemberCard
                key={profile.id}
                profile={profile}
                openTasks={openTasks}
                isAdmin={isAdmin}
                isManager={isManager}
                currentUserId={user.id}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
