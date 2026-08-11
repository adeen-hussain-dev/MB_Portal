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
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0F3F7F]">Operations overview</p>
        <h1 className="font-heading text-3xl font-semibold text-[#101828]">Bridge coordination dashboard</h1>
        <p className="max-w-2xl text-sm text-[#64748B]">
          Track tasks, review volunteer availability, and keep communication flowing across the branch team.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <div key={item.title} className="rounded-2xl border border-[#D8E0EA] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#64748B]">{item.title}</p>
            <p className="mt-2 font-heading text-3xl font-semibold text-[#0F3F7F]">{item.value}</p>
            <p className="mt-2 text-sm text-[#64748B]">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#D8E0EA] bg-white p-6 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-[#101828]">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/tasks" className="rounded-xl bg-[#0F3F7F] px-4 py-2.5 font-semibold text-white transition hover:bg-[#123f79]">
            View tasks
          </Link>
          <Link href="/team" className="rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] px-4 py-2.5 font-semibold text-[#101828] transition hover:border-[#0F3F7F] hover:text-[#0F3F7F]">
            View volunteer directory
          </Link>
        </div>
      </div>
    </section>
  );
}
