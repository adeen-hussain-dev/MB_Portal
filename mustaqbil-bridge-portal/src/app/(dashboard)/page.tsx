import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchAdminOverview, fetchVolunteerOverview } from '@/lib/portal-data'
import { CompletedTasksChart } from '@/components/dashboard/completed-tasks-chart'
import {
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  AlertCircleIcon,
  TrophyIcon,
  ArrowRightIcon,
  RotateCcwIcon,
  UserCheckIcon,
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'volunteer'
  const isVolunteer = userRole === 'volunteer'

  if (isVolunteer) {
    const data = await fetchVolunteerOverview(user.id)
    const today = new Date().toISOString().split('T')[0]

    return (
      <section className="space-y-8">
        <header className="space-y-2">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-[#0F3F7F]">
            Volunteer workspace
          </p>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-[#101828]">
            Welcome back, {profile?.full_name || 'Volunteer'}
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-[#64748B]">
            Here is the current status of your assigned tasks and upcoming deadlines.
          </p>
        </header>

        {/* Volunteer 5-Status Counts */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-[#D8E0EA] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">To do</p>
            <p className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-[#64748B]">
              {data.statusCounts.todo}
            </p>
            <p className="mt-1 text-[11px] text-[#94A3B8]">Ready to start</p>
          </div>

          <div className="rounded-2xl border border-[#B9D3FF] bg-[#EAF1FF]/40 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0F3F7F]">In progress</p>
            <p className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-[#0F3F7F]">
              {data.statusCounts.in_progress}
            </p>
            <p className="mt-1 text-[11px] text-[#0F3F7F]/70">Currently working</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#D97706]">In review</p>
            <p className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-[#D97706]">
              {data.statusCounts.in_review}
            </p>
            <p className="mt-1 text-[11px] text-amber-700/70">Awaiting manager</p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#DC2626]">Needs changes</p>
            <p className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-[#DC2626]">
              {data.statusCounts.changes_requested}
            </p>
            <p className="mt-1 text-[11px] text-rose-700/70">Feedback given</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm col-span-2 sm:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#16A34A]">Completed</p>
            <p className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-[#16A34A]">
              {data.statusCounts.done}
            </p>
            <p className="mt-1 text-[11px] text-emerald-700/70">Approved & done</p>
          </div>
        </div>

        {/* Upcoming and Overdue Tasks */}
        <div className="rounded-[2rem] border border-[#D8E0EA] bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-semibold text-[#101828]">
                Upcoming Deadlines & Open Work
              </h2>
              <p className="text-xs text-[#64748B]">Your assigned active tasks</p>
            </div>
            <Link
              href="/tasks"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F3F7F] hover:underline"
            >
              Open Tasks Board <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>

          {data.upcomingTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D8E0EA] bg-[#F8FAFC] p-8 text-center text-xs text-[#64748B]">
              You have no pending tasks right now. Great job!
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {data.upcomingTasks.map((t) => {
                const isOverdue = t.dueDate && t.dueDate < today
                const isDueToday = t.dueDate && t.dueDate === today

                return (
                  <div key={t.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/tasks/${t.id}`}
                          className="font-heading text-sm font-semibold text-[#101828] hover:text-[#0F3F7F] hover:underline truncate"
                        >
                          {t.title}
                        </Link>
                        {t.domain && (
                          <span className="rounded bg-[#F5F7FA] px-1.5 py-0.5 text-[10px] font-medium text-[#64748B]">
                            {t.domain}
                          </span>
                        )}
                        <span className="capitalize rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-[#64748B] line-clamp-1">{t.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {t.dueDate && (
                        <div className="flex items-center gap-1.5 font-mono text-xs text-[#64748B]">
                          <CalendarIcon className="size-3.5 text-[#94A3B8]" />
                          <span>{t.dueDate}</span>
                          {isOverdue && (
                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                              Overdue
                            </span>
                          )}
                          {isDueToday && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                              Due Today
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    )
  }

  // Admin / Manager Overview
  const adminData = await fetchAdminOverview()

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-[#0F3F7F]">
          Management overview
        </p>
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-[#101828]">
          Branch Operations & Volunteer Analytics
        </h1>
        <p className="max-w-2xl text-xs sm:text-sm text-[#64748B]">
          Org-wide metrics, review queues, volunteer completions, and the monthly leaderboard.
        </p>
      </header>

      {/* Org-Wide Status Counts */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-[#D8E0EA] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">To do</p>
          <p className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-[#64748B]">
            {adminData.statusCounts.todo}
          </p>
          <p className="mt-1 text-[11px] text-[#94A3B8]">Unstarted queue</p>
        </div>

        <div className="rounded-2xl border border-[#B9D3FF] bg-[#EAF1FF]/40 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0F3F7F]">In progress</p>
          <p className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-[#0F3F7F]">
            {adminData.statusCounts.in_progress}
          </p>
          <p className="mt-1 text-[11px] text-[#0F3F7F]/70">Being worked on</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D97706]">In review</p>
          <p className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-[#D97706]">
            {adminData.statusCounts.in_review}
          </p>
          <p className="mt-1 text-[11px] text-amber-700/80">Pending approval</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#DC2626]">Changes requested</p>
          <p className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-[#DC2626]">
            {adminData.statusCounts.changes_requested}
          </p>
          <p className="mt-1 text-[11px] text-rose-700/80">Sent back to volunteer</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#16A34A]">Done</p>
          <p className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-[#16A34A]">
            {adminData.statusCounts.done}
          </p>
          <p className="mt-1 text-[11px] text-emerald-700/80">Approved completion</p>
        </div>
      </div>

      {/* Main Analytics: Bar Chart & Leaderboard */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
        {/* Completed Tasks Bar Chart */}
        <div className="rounded-[2rem] border border-[#D8E0EA] bg-white p-5 sm:p-6 shadow-sm lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold text-[#101828]">
                Tasks Completed This Month
              </h2>
              <p className="text-xs text-[#64748B]">Approved completions per volunteer</p>
            </div>
            <span className="rounded-full bg-[#EAF1FF] px-2.5 py-0.5 text-xs font-semibold text-[#0F3F7F]">
              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <CompletedTasksChart data={adminData.completedPerVolunteer} />
        </div>

        {/* Top Volunteer This Month Leaderboard */}
        <div className="rounded-[2rem] border border-[#D8E0EA] bg-white p-5 sm:p-6 shadow-sm lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrophyIcon className="size-5 text-[#FFC107]" />
              <h2 className="font-heading text-lg font-semibold text-[#101828]">
                Top Volunteers This Month
              </h2>
            </div>
            <span className="text-[11px] text-[#64748B] font-medium">Formula Scored</span>
          </div>

          <p className="text-xs leading-5 text-[#64748B] bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
            <span className="font-semibold text-[#0F3F7F]">Scoring Formula:</span> (Done &times; 10) + (On-Time &times; 5) &minus; (Rejections &times; 5) + (Avg Rating &times; 3)
          </p>

          {adminData.leaderboard.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D8E0EA] p-6 text-center text-xs text-[#64748B]">
              No volunteer activity recorded this month yet.
            </div>
          ) : (
            <div className="space-y-3">
              {adminData.leaderboard.map((vol, index) => {
                const rankBadgeColors = [
                  'bg-[#FFC107] text-[#0F3F7F]', // 1st Gold
                  'bg-slate-200 text-slate-800',  // 2nd Silver
                  'bg-amber-700 text-white',      // 3rd Bronze
                ]

                return (
                  <div
                    key={vol.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[#D8E0EA] bg-[#F8FAFC] p-3.5 transition hover:border-[#0F3F7F]/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          rankBadgeColors[index] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs sm:text-sm font-semibold text-[#101828]">
                          {vol.name}
                        </p>
                        <p className="text-[10px] text-[#64748B] truncate">
                          {vol.completed} completed &bull; {vol.onTime} on-time &bull; {vol.rejections} rejected{vol.avgRating ? ` • ★ ${vol.avgRating}/10` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-heading text-base font-bold text-[#0F3F7F]">
                        {vol.score}
                      </span>
                      <span className="block text-[10px] uppercase font-bold text-[#64748B]">
                        pts
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
