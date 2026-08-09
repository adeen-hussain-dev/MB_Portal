import { createClient } from '@/lib/supabase/server'
import { AddVolunteerDialog } from '@/components/team/add-volunteer-dialog'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: profiles } = await supabase.from('profiles').select('*').order('created_at')

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Volunteer directory</p>
          <h1 className="mt-2 text-3xl font-semibold">Team roster</h1>
          <p className="mt-2 text-sm text-slate-400">Add volunteers and review their roles and status.</p>
        </div>
        <AddVolunteerDialog />
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-800/80 text-left text-slate-300">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Domain</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {profiles?.map((profile) => (
              <tr key={profile.id} className="border-t border-slate-800">
                <td className="px-4 py-3">{profile.full_name}</td>
                <td className="px-4 py-3">{profile.email}</td>
                <td className="px-4 py-3 capitalize">{profile.role}</td>
                <td className="px-4 py-3">{profile.domain ?? '—'}</td>
                <td className="px-4 py-3 capitalize">{profile.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
