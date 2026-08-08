const volunteers = [
  { name: 'Aisha Rahman', role: 'Coordinator', status: 'Available' },
  { name: 'Nadia Khan', role: 'Driver', status: 'On shift' },
  { name: 'Omar Hassan', role: 'Support', status: 'Offline' },
];

export default function TeamPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Volunteer directory</p>
        <h1 className="text-3xl font-semibold">Team roster</h1>
        <p className="text-sm text-slate-400">Maintain an at-a-glance view of available volunteers and roles.</p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-800/80 text-left text-slate-300">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {volunteers.map((person) => (
              <tr key={person.name} className="border-t border-slate-800">
                <td className="px-4 py-3">{person.name}</td>
                <td className="px-4 py-3">{person.role}</td>
                <td className="px-4 py-3">{person.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
