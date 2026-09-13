'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2Icon,
  ClockIcon,
  StarIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  CalendarIcon,
  ArrowUpRightIcon,
  RefreshCwIcon,
  SparklesIcon,
  AwardIcon,
  FileCheckIcon,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts'

type TaskHistoryItem = {
  id: string
  title: string
  status: string
  priority: string
  domain: string
  dueDate: string | null
  approvedAt: string | null
  satisfactionRating: number | null
  isOnTime: boolean | null
  createdAt: string
}

type RatingTrendItem = {
  taskTitle: string
  fullTitle: string
  rating: number
  date: string
  order: number
}

type MonthlyCompletedItem = {
  name: string
  completed: number
}

type AnalyticsData = {
  summary: {
    totalCompleted: number
    onTimeCount: number
    lateCount: number
    onTimeRate: number
    avgRating: number
    rejectionCount: number
    totalAssigned: number
  }
  taskHistory: TaskHistoryItem[]
  ratingTrend: RatingTrendItem[]
  monthlyCompleted: MonthlyCompletedItem[]
}

const statusBadgeStyles: Record<string, string> = {
  done: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  in_review: 'bg-amber-50 text-amber-800 border-amber-200',
  in_progress: 'bg-sky-50 text-sky-800 border-sky-200',
  todo: 'bg-slate-50 text-slate-700 border-slate-200',
  changes_requested: 'bg-rose-50 text-rose-800 border-rose-200',
}

export interface VolunteerAnalyticsViewProps {
  volunteerId?: string
  volunteerName?: string
}

export function VolunteerAnalyticsView({ volunteerId, volunteerName }: VolunteerAnalyticsViewProps = {}) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeChart, setActiveChart] = useState<'rating' | 'monthly'>('rating')

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true)
        setError(null)
        const endpoint = volunteerId ? `/api/analytics/${volunteerId}` : '/api/analytics/me'
        const res = await fetch(endpoint)
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Failed to load performance analytics')
        }
        const json = await res.json()
        setData(json)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [volunteerId])

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 rounded-2xl border border-[#D8E0EA] bg-white p-8">
        <RefreshCwIcon className="size-8 animate-spin text-[#0F3F7F]" />
        <p className="text-sm font-medium text-[#64748B]">Calculating performance statistics...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center">
        <p className="text-sm font-semibold text-rose-900">{error || 'Unable to display analytics'}</p>
        <p className="mt-1 text-xs text-rose-700">Please verify your session and refresh the page.</p>
      </div>
    )
  }

  const { summary, taskHistory, ratingTrend, monthlyCompleted } = data
  const completedHistory = taskHistory.filter((t) => t.status === 'done')

  return (
    <section className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl sm:rounded-[2rem] border border-[#D8E0EA] bg-white p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 sm:space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF1FF] px-3 py-1 text-xs font-semibold text-[#0F3F7F]">
              <AwardIcon className="size-3.5" />
              <span>{volunteerName ? `${volunteerName}'s Performance` : 'Personal Performance Report'}</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-[#101828]">
              {volunteerName ? `${volunteerName}'s Analytics` : 'My Analytics'}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B]">
              {volunteerName
                ? `Track ${volunteerName}'s completed work, on-time delivery rate, satisfaction ratings, and revisions.`
                : 'Track your completed work, on-time delivery rate, quality satisfaction ratings, and revisions.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-xl border border-[#D8E0EA] bg-[#F8FAFC] px-4 py-2.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Total Assigned</p>
              <p className="font-heading text-xl font-bold text-[#0F3F7F]">{summary.totalAssigned}</p>
            </span>
            <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Done & Approved</p>
              <p className="font-heading text-xl font-bold text-emerald-700">{summary.totalCompleted}</p>
            </span>
          </div>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Completed Tasks */}
        <div className="rounded-2xl border border-[#D8E0EA] bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Tasks Completed</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <CheckCircle2Icon className="size-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-heading text-3xl font-bold text-[#101828]">{summary.totalCompleted}</p>
            <p className="text-xs text-[#64748B]">
              {summary.totalCompleted === 1 ? '1 approved task' : `${summary.totalCompleted} approved tasks`}
            </p>
          </div>
        </div>

        {/* Card 2: On-Time Delivery */}
        <div className="rounded-2xl border border-[#D8E0EA] bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">On-Time Delivery</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#0F3F7F]">
              <ClockIcon className="size-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <p className="font-heading text-3xl font-bold text-[#101828]">{summary.onTimeRate}%</p>
              <span className="text-xs font-semibold text-[#0F3F7F]">({summary.onTimeCount}/{summary.totalCompleted})</span>
            </div>
            <p className="text-xs text-[#64748B]">
              <span className="text-emerald-700 font-semibold">{summary.onTimeCount} on-time</span>
              {' • '}
              <span className={summary.lateCount > 0 ? 'text-amber-700 font-semibold' : 'text-slate-500'}>
                {summary.lateCount} late
              </span>
            </p>
          </div>
        </div>

        {/* Card 3: Quality Satisfaction Rating */}
        <div className="rounded-2xl border border-[#D8E0EA] bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Average Rating</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <StarIcon className="size-5 fill-amber-500 text-amber-500" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <p className="font-heading text-3xl font-bold text-[#101828]">{summary.avgRating > 0 ? summary.avgRating : '—'}</p>
              {summary.avgRating > 0 && <span className="text-xs font-semibold text-[#64748B]">/ 10</span>}
            </div>
            <p className="text-xs text-[#64748B]">
              {ratingTrend.length > 0 ? `Based on ${ratingTrend.length} rated tasks` : 'No ratings received yet'}
            </p>
          </div>
        </div>

        {/* Card 4: Revisions Requested */}
        <div className="rounded-2xl border border-[#D8E0EA] bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Revisions Requested</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
              <AlertTriangleIcon className="size-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-heading text-3xl font-bold text-[#101828]">{summary.rejectionCount}</p>
            <p className="text-xs text-[#64748B]">
              {summary.rejectionCount === 0
                ? 'Zero revisions requested 🎉'
                : `${summary.rejectionCount} revisions across all work`}
            </p>
          </div>
        </div>
      </div>

      {/* Performance Visualizations (Recharts) */}
      <div className="rounded-2xl sm:rounded-[2rem] border border-[#D8E0EA] bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-[#101828]">Performance Trends</h2>
            <p className="text-xs text-[#64748B]">Visual progression of satisfaction ratings and monthly output</p>
          </div>
          <div className="flex items-center rounded-xl border border-[#D8E0EA] bg-[#F8FAFC] p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveChart('rating')}
              className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                activeChart === 'rating'
                  ? 'bg-[#0F3F7F] text-white shadow-sm'
                  : 'text-[#64748B] hover:text-[#101828]'
              }`}
            >
              Satisfaction Trend
            </button>
            <button
              type="button"
              onClick={() => setActiveChart('monthly')}
              className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                activeChart === 'monthly'
                  ? 'bg-[#0F3F7F] text-white shadow-sm'
                  : 'text-[#64748B] hover:text-[#101828]'
              }`}
            >
              Monthly Output
            </button>
          </div>
        </div>

        {activeChart === 'rating' ? (
          <div>
            {ratingTrend.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[#D8E0EA] bg-[#F8FAFC] p-6 text-center">
                <StarIcon className="size-8 text-[#CBD5E1] mb-2" />
                <p className="text-sm font-semibold text-[#64748B]">No ratings recorded yet</p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Once managers rate your completed tasks (1-10), your satisfaction trend chart will render here.
                </p>
              </div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ratingTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFC107" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#FFC107" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="taskTitle"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                    />
                    <YAxis
                      domain={[0, 10]}
                      ticks={[0, 2, 4, 6, 8, 10]}
                      stroke="#64748B"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload as RatingTrendItem
                          return (
                            <div className="rounded-xl border border-[#D8E0EA] bg-white p-3 shadow-lg text-xs space-y-1">
                              <p className="font-semibold text-[#101828]">{item.fullTitle}</p>
                              <p className="text-[#64748B]">Approved: {item.date}</p>
                              <p className="flex items-center gap-1 font-bold text-amber-600">
                                <StarIcon className="size-3.5 fill-amber-500 text-amber-500" />
                                Rating: {item.rating} / 10
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="rating"
                      name="Satisfaction Rating"
                      stroke="#D97706"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#ratingGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCompleted} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #D8E0EA',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                  cursor={{ fill: '#F1F5F9' }}
                />
                <Bar
                  dataKey="completed"
                  name="Tasks Completed"
                  fill="#0F3F7F"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Task Delivery History Table */}
      <div className="rounded-2xl sm:rounded-[2rem] border border-[#D8E0EA] bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold text-[#101828]">Task Delivery History</h2>
            <p className="text-xs text-[#64748B]">Detailed log of your assigned tasks and completion outcomes</p>
          </div>
          <span className="rounded-full bg-[#EAF1FF] px-2.5 py-0.5 text-xs font-semibold text-[#0F3F7F]">
            {taskHistory.length} {taskHistory.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        {taskHistory.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D8E0EA] bg-[#F8FAFC] p-8 text-center">
            <FileCheckIcon className="size-8 text-[#CBD5E1] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#64748B]">No tasks assigned yet</p>
            <p className="text-xs text-[#94A3B8] mt-1">
              Your task delivery history and performance metrics will appear here once you receive task assignments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <tr>
                  <th className="py-3 px-3">Task</th>
                  <th className="py-3 px-3">Domain</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3">Completed On</th>
                  <th className="py-3 px-3">Timeliness</th>
                  <th className="py-3 px-3">Rating</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {taskHistory.map((task) => (
                  <tr key={task.id} className="hover:bg-[#F8FAFC] transition">
                    {/* Title */}
                    <td className="py-3.5 px-3 max-w-xs sm:max-w-md">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-semibold text-[#101828] hover:text-[#0F3F7F] hover:underline line-clamp-1 inline-flex items-center gap-1.5"
                      >
                        {task.title}
                        <ArrowUpRightIcon className="size-3 text-[#64748B]" />
                      </Link>
                    </td>

                    {/* Domain */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-xs text-[#64748B]">
                      {task.domain || '—'}
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-xs text-[#64748B]">
                      {task.dueDate || '—'}
                    </td>

                    {/* Completed Date */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-xs text-[#64748B]">
                      {task.approvedAt ? new Date(task.approvedAt).toLocaleDateString() : '—'}
                    </td>

                    {/* Timeliness */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {task.status === 'done' ? (
                        task.isOnTime ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                            <CheckCircle2Icon className="size-3 text-emerald-600" /> On-Time
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                            <ClockIcon className="size-3 text-amber-600" /> Late
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    {/* Satisfaction Rating */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {task.satisfactionRating != null ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                          <StarIcon className="size-3 fill-amber-500 text-amber-500" />
                          {task.satisfactionRating}/10
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                          statusBadgeStyles[task.status] || 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
