import { createClient } from '@/lib/supabase/server'
import { AddVolunteerDialog } from '@/components/team/add-volunteer-dialog'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: profiles } = await supabase.from('profiles').select('*').order('created_at')

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0F3F7F]">Volunteer directory</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold text-[#101828]">Team roster</h1>
          <p className="mt-2 text-sm text-[#64748B]">Add volunteers and review their roles and status.</p>
        </div>
        <AddVolunteerDialog />
      </header>

      <div className="overflow-hidden rounded-2xl border border-[#D8E0EA] bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-[#F5F7FA] text-left text-[#101828]">
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
              <tr key={profile.id} className="border-t border-[#E6EDF5]">
                <td className="px-4 py-3 font-medium text-[#101828]">{profile.full_name}</td>
                <td className="px-4 py-3 text-[#64748B]">{profile.email}</td>
                <td className="px-4 py-3 capitalize">{profile.role}</td>
                <td className="px-4 py-3 text-[#64748B]">{profile.domain ?? '—'}</td>
                <td className="px-4 py-3 capitalize text-[#64748B]">{profile.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
