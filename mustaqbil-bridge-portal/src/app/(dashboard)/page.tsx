import Link from 'next/link';

const highlights = [
  { title: 'Open tasks', value: '24', hint: 'Awaiting assignment' },
  { title: 'Volunteers', value: '18', hint: 'Across active shifts' },
  { title: 'Comments', value: '9', hint: 'New updates today' },
];

export default function DashboardPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Operations overview</p>
        <h1 className="text-3xl font-semibold">Bridge coordination dashboard</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Track tasks, review volunteer availability, and keep communication flowing across the branch team.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">{item.title}</p>
            <p className="mt-2 text-3xl font-semibold">{item.value}</p>
            <p className="mt-2 text-sm text-slate-500">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-xl font-semibold">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/tasks" className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-400">
            View tasks
          </Link>
          <Link href="/team" className="rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-200 transition hover:border-cyan-500 hover:text-cyan-400">
            View volunteer directory
          </Link>
        </div>
      </div>
    </section>
  );
}
