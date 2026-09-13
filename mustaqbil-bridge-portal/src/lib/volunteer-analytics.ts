import { createAdminClient } from '@/lib/supabase/admin'

export type TaskHistoryItem = {
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

export type RatingTrendItem = {
  taskTitle: string
  fullTitle: string
  rating: number
  date: string
  order: number
}

export type MonthlyCompletedItem = {
  name: string
  completed: number
}

export type VolunteerAnalyticsResult = {
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

export async function getVolunteerAnalytics(volunteerId: string): Promise<VolunteerAnalyticsResult> {
  const admin = createAdminClient()

  // 1. Fetch user's assigned tasks (with fallback if satisfaction_rating column is not in DB)
  let taskList: Array<Record<string, unknown>> = []
  const { data: tasksWithRating, error: ratingError } = await admin
    .from('tasks')
    .select('id, title, status, priority, domain, due_date, approved_at, satisfaction_rating, created_at, updated_at')
    .eq('assignee_id', volunteerId)
    .order('created_at', { ascending: false })

  if (ratingError) {
    const { data: tasksFallback, error: fallbackError } = await admin
      .from('tasks')
      .select('id, title, status, priority, domain, due_date, approved_at, created_at, updated_at')
      .eq('assignee_id', volunteerId)
      .order('created_at', { ascending: false })

    if (fallbackError) {
      throw new Error(fallbackError.message)
    }
    taskList = tasksFallback ?? []
  } else {
    taskList = tasksWithRating ?? []
  }
  const taskIds = taskList.map((t) => t.id)

  // 2. Fetch rejection counts strictly from activity_log using admin/service-role client
  // standing security rule: raw activity_log rows are never exposed to the caller
  let rejectionCount = 0
  if (taskIds.length > 0) {
    const { data: rejectionLogs, error: logError } = await admin
      .from('activity_log')
      .select('id')
      .in('task_id', taskIds)
      .eq('new_value', 'changes_requested')

    if (!logError && rejectionLogs) {
      rejectionCount = rejectionLogs.length
    }
  }

  // 3. Compute delivery metrics
  const completedTasks = taskList.filter((t) => t.status === 'done')
  const totalCompleted = completedTasks.length

  let onTimeCount = 0
  let lateCount = 0

  const taskHistory = taskList.map((t) => {
    let isOnTime: boolean | null = null
    const effectiveCompletionDate = (t.approved_at as string | null) || (t.status === 'done' ? ((t.updated_at as string | null) || (t.created_at as string | null)) : null)

    if (t.status === 'done') {
      if (!t.due_date) {
        isOnTime = true
        onTimeCount += 1
      } else if (effectiveCompletionDate) {
        const approvedTime = new Date(effectiveCompletionDate).getTime()
        const dueDateTime = new Date(t.due_date as string)
        dueDateTime.setUTCHours(23, 59, 59, 999)
        if (approvedTime <= dueDateTime.getTime()) {
          isOnTime = true
          onTimeCount += 1
        } else {
          isOnTime = false
          lateCount += 1
        }
      } else {
        isOnTime = true
        onTimeCount += 1
      }
    }

    return {
      id: t.id as string,
      title: t.title as string,
      status: t.status as string,
      priority: t.priority as string,
      domain: (t.domain as string) || '',
      dueDate: (t.due_date as string) || null,
      approvedAt: effectiveCompletionDate,
      satisfactionRating: t.satisfaction_rating != null ? Number(t.satisfaction_rating) : null,
      isOnTime,
      createdAt: t.created_at as string,
    }
  })

  // 4. Calculate average satisfaction rating
  const ratedTasks = completedTasks.filter(
    (t) => t.satisfaction_rating != null && !isNaN(Number(t.satisfaction_rating))
  )
  const avgRating = ratedTasks.length > 0
    ? Number((ratedTasks.reduce((sum, t) => sum + Number(t.satisfaction_rating), 0) / ratedTasks.length).toFixed(1))
    : 0

  const onTimeRate = totalCompleted > 0 ? Math.round((onTimeCount / totalCompleted) * 100) : 0

  // 5. Rating trend data for Recharts (chronological)
  const ratingTrend = ratedTasks
    .map((t, idx) => {
      const dateVal = (t.approved_at as string | null) || (t.updated_at as string | null) || (t.created_at as string | null)
      return {
        taskTitle: (t.title as string).length > 20 ? `${(t.title as string).slice(0, 18)}...` : (t.title as string),
        fullTitle: t.title as string,
        rating: Number(t.satisfaction_rating),
        date: dateVal ? new Date(dateVal).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
        timestamp: dateVal ? new Date(dateVal).getTime() : 0,
        order: idx + 1,
      }
    })
    .sort((a, b) => a.timestamp - b.timestamp)

  // 6. Monthly completed trend (past 6 months)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const now = new Date()
  const monthlyCompleted = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const m = d.getUTCMonth()
    const y = d.getUTCFullYear()
    const label = `${monthNames[m]} ${y !== now.getUTCFullYear() ? `'${String(y).slice(2)}` : ''}`.trim()
    const count = completedTasks.filter((t) => {
      const compDateStr = (t.approved_at as string | null) || (t.updated_at as string | null) || (t.created_at as string | null)
      if (!compDateStr) return false
      const appDate = new Date(compDateStr)
      return appDate.getUTCMonth() === m && appDate.getUTCFullYear() === y
    }).length
    monthlyCompleted.push({
      name: label,
      completed: count,
    })
  }

  return {
    summary: {
      totalCompleted,
      onTimeCount,
      lateCount,
      onTimeRate,
      avgRating,
      rejectionCount,
      totalAssigned: taskList.length,
    },
    taskHistory,
    ratingTrend,
    monthlyCompleted,
  }
}
