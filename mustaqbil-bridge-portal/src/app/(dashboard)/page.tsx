import Link from 'next/link'
import { fetchDashboardSummary } from '@/lib/portal-data'

export default async function DashboardPage() {
  const summary = await fetchDashboardSummary()

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
        <div className="rounded-2xl border border-[#D8E0EA] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#64748B]">Open tasks</p>
          <p className="mt-2 font-heading text-3xl font-semibold text-[#0F3F7F]">{summary.openTasks}</p>
          <p className="mt-2 text-sm text-[#64748B]">Awaiting assignment or review</p>
        </div>
        <div className="rounded-2xl border border-[#D8E0EA] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#64748B]">Volunteers</p>
          <p className="mt-2 font-heading text-3xl font-semibold text-[#0F3F7F]">{summary.volunteers}</p>
          <p className="mt-2 text-sm text-[#64748B]">Active team records in the database</p>
        </div>
        <div className="rounded-2xl border border-[#D8E0EA] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#64748B]">Comments</p>
          <p className="mt-2 font-heading text-3xl font-semibold text-[#0F3F7F]">{summary.comments}</p>
          <p className="mt-2 text-sm text-[#64748B]">Task discussion entries from the database</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#D8E0EA] bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-[#64748B]">In review</p>
          <p className="mt-2 font-heading text-2xl font-semibold text-[#101828]">{summary.inReview}</p>
        </div>
        <div className="rounded-2xl border border-[#D8E0EA] bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-[#64748B]">Done</p>
          <p className="mt-2 font-heading text-2xl font-semibold text-[#101828]">{summary.done}</p>
        </div>
        <div className="rounded-2xl border border-[#D8E0EA] bg-white p-6 shadow-sm md:col-span-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0F3F7F]">Quick actions</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/tasks" className="rounded-xl bg-[#0F3F7F] px-4 py-2.5 font-semibold text-white transition hover:bg-[#123f79]">
              View tasks
            </Link>
            <Link href="/team" className="rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] px-4 py-2.5 font-semibold text-[#101828] transition hover:border-[#0F3F7F] hover:text-[#0F3F7F]">
              View volunteer directory
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
