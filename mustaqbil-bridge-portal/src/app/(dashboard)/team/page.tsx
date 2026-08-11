import { createClient } from '@/lib/supabase/server'
import { AddVolunteerDialog } from '@/components/team/add-volunteer-dialog'
import { fetchTasks } from '@/lib/portal-data'

export default async function TeamPage() {
  const supabase = await createClient()
  const [profilesResult, tasks] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at'),
    fetchTasks(),
  ])

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message)
  }

  const profiles = profilesResult.data ?? []

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
        <AddVolunteerDialog />
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
            const isInactive = profile.status?.toLowerCase() === 'inactive'

            return (
              <article key={profile.id} className="rounded-[2rem] border border-[#D8E0EA] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-xl font-semibold text-[#101828]">{profile.full_name ?? 'Unnamed volunteer'}</h2>
                    <p className="mt-1 text-sm text-[#64748B]">{profile.email ?? 'No email on file'}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isInactive ? 'bg-[#FEE4E2] text-[#B42318]' : 'bg-[#EAF7EE] text-[#166534]'}`}>
                    {profile.status ?? 'active'}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[#F5F7FA] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Role</p>
                    <p className="mt-1 text-sm font-medium text-[#101828] capitalize">{profile.role ?? 'volunteer'}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F5F7FA] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Domain</p>
                    <p className="mt-1 text-sm font-medium text-[#101828]">{profile.domain ?? '—'}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-[#F5F7FA] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Open tasks</p>
                  <p className="mt-1 text-sm font-medium text-[#101828]">{openTasks}</p>
                  {isInactive && openTasks > 0 && (
                    <p className="mt-2 text-sm text-[#B42318]">
                      Warning: this inactive volunteer still has {openTasks} open task{openTasks === 1 ? '' : 's'}.
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
