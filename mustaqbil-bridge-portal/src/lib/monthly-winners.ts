import { createAdminClient } from '@/lib/supabase/admin'

export interface PastWinner {
  id: string
  month: string // e.g. '2026-08-01'
  formattedMonth: string // e.g. 'August 2026'
  volunteerId: string
  volunteerName: string
  volunteerEmail: string
  avatarUrl?: string | null
  score: number
  completedCount: number
  onTimeCount: number
  rejectedCount: number
  avgRating?: number | null
  createdAt: string
}

export interface SnapshotResult {
  ran: boolean
  reason?: string
  month?: string
  winner?: {
    volunteerId: string
    name: string
    score: number
    completed: number
    onTime: number
    rejections: number
    avgRating: number
  } | null
  skippedDuplicate?: boolean
}

/**
 * Computes previous month's leaderboard and inserts a snapshot row into monthly_winners.
 * Triggered automatically on the 1st day of each month in PKT.
 */
export async function recordMonthlyWinnerSnapshot(options: {
  todayPktDate?: string // YYYY-MM-DD
  force?: boolean
} = {}): Promise<SnapshotResult> {
  const admin = createAdminClient()

  // 1. Determine date in PKT
  let todayPkt = options.todayPktDate
  if (!todayPkt) {
    todayPkt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  }

  const [yearStr, monthStr, dayStr] = todayPkt.split('-')
  const isFirstOfMonth = dayStr === '01'

  if (!isFirstOfMonth && !options.force) {
    return {
      ran: false,
      reason: `Today is ${todayPkt} (day ${dayStr}), not the 1st of the month. Snapshot skipped.`,
    }
  }

  // 2. Calculate previous calendar month
  let targetYear = parseInt(yearStr, 10)
  let targetMonth = parseInt(monthStr, 10) - 1 // 1-indexed to 0-indexed previous month
  if (targetMonth === 0) {
    targetMonth = 12
    targetYear -= 1
  }

  const prevMonthStr = String(targetMonth).padStart(2, '0')
  const snapshotMonthDate = `${targetYear}-${prevMonthStr}-01`

  // Month range boundaries in UTC
  const monthStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0)).toISOString()
  const nextMonthYear = targetMonth === 12 ? targetYear + 1 : targetYear
  const nextMonthNum = targetMonth === 12 ? 1 : targetMonth + 1
  const monthEnd = new Date(Date.UTC(nextMonthYear, nextMonthNum - 1, 1, 0, 0, 0, 0)).toISOString()

  console.log(`[Monthly Winner Snapshot] Processing for ${snapshotMonthDate} (window: ${monthStart} to ${monthEnd})`)

  // 3. Fetch all tasks, volunteers, and rejections in that target window
  const [tasksRes, profilesRes, activityRes] = await Promise.all([
    admin.from('tasks').select('*'),
    admin.from('profiles').select('id, full_name, email, role').eq('role', 'volunteer'),
    admin
      .from('activity_log')
      .select('task_id, new_value, created_at')
      .eq('new_value', 'changes_requested')
      .gte('created_at', monthStart)
      .lt('created_at', monthEnd),
  ])

  const tasks = tasksRes.data ?? []
  const volunteers = profilesRes.data ?? []
  const activityLogs = activityRes.data ?? []

  if (volunteers.length === 0) {
    return {
      ran: true,
      month: snapshotMonthDate,
      reason: 'No volunteers found in directory.',
      winner: null,
    }
  }

  // Map rejections by task ID
  const rejectionsByTaskId = new Map<string, number>()
  for (const log of activityLogs) {
    if (log.task_id) {
      rejectionsByTaskId.set(log.task_id, (rejectionsByTaskId.get(log.task_id) ?? 0) + 1)
    }
  }

  // Map task ID to assignee ID
  const taskAssigneeMap = new Map<string, string>()
  for (const t of tasks) {
    if (t.assignee_id) {
      taskAssigneeMap.set(t.id, t.assignee_id)
    }
  }

  // Map rejections by volunteer ID
  const rejectionsByVolunteerId = new Map<string, number>()
  rejectionsByTaskId.forEach((count, taskId) => {
    const volId = taskAssigneeMap.get(taskId)
    if (volId) {
      rejectionsByVolunteerId.set(volId, (rejectionsByVolunteerId.get(volId) ?? 0) + count)
    }
  })

  // 4. Score volunteers for target month using exact formula:
  // score = (completed * 10) + (on_time * 5) - (rejections * 5) + (avg_rating * 3)
  const scores = volunteers.map((vol) => {
    const volTasks = tasks.filter((t) => t.assignee_id === vol.id)

    const completedTasks = volTasks.filter((t) => {
      if (t.status !== 'done' || !t.approved_at) return false
      return t.approved_at >= monthStart && t.approved_at < monthEnd
    })

    const completed = completedTasks.length

    const onTime = completedTasks.filter((t) => {
      if (!t.due_date) return true
      const approvedTime = new Date(t.approved_at).getTime()
      const dueDateTime = new Date(`${t.due_date}T23:59:59.999Z`).getTime()
      return approvedTime <= dueDateTime
    }).length

    const rejections = rejectionsByVolunteerId.get(vol.id) ?? 0

    const ratedTasks = completedTasks.filter(
      (t) => t.satisfaction_rating != null && !isNaN(Number(t.satisfaction_rating))
    )
    const avgRating =
      ratedTasks.length > 0
        ? ratedTasks.reduce((sum, t) => sum + Number(t.satisfaction_rating), 0) / ratedTasks.length
        : 0

    const score = Math.round(
      completed * 10 + onTime * 5 - rejections * 5 + avgRating * 3
    )

    return {
      volunteerId: vol.id,
      name: vol.full_name || vol.email || 'Volunteer',
      completed,
      onTime,
      rejections,
      avgRating: Number(avgRating.toFixed(1)),
      score,
    }
  })

  // Sort descending by score; tie-break by completed count
  scores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.completed - a.completed
  })

  const top = scores[0]
  if (!top || (top.completed === 0 && top.score <= 0)) {
    console.log(`[Monthly Winner Snapshot] No eligible volunteer with completions/score for ${snapshotMonthDate}.`)
    return {
      ran: true,
      month: snapshotMonthDate,
      reason: 'No volunteer activity or completed tasks found for previous month.',
      winner: null,
    }
  }

  // 5. Insert winner into monthly_winners table
  try {
    const { error: insertErr } = await admin.from('monthly_winners').insert({
      month: snapshotMonthDate,
      volunteer_id: top.volunteerId,
      score: top.score,
      completed_count: top.completed,
      on_time_count: top.onTime,
      rejected_count: top.rejections,
      avg_rating: top.avgRating,
    })

    if (insertErr) {
      // If duplicate key error (code 23505), ignore silently per specification
      if (insertErr.code === '23505') {
        console.log(`[Monthly Winner Snapshot] Snapshot for ${snapshotMonthDate} already exists (unique month constraint). Silently skipped.`)
        return {
          ran: true,
          month: snapshotMonthDate,
          winner: top,
          skippedDuplicate: true,
        }
      }
      console.error('[Monthly Winner Snapshot] Database insert error:', insertErr)
      return {
        ran: true,
        month: snapshotMonthDate,
        winner: top,
        reason: insertErr.message,
      }
    }

    console.log(`[Monthly Winner Snapshot] Successfully recorded ${top.name} as winner for ${snapshotMonthDate} (score: ${top.score}).`)
    return {
      ran: true,
      month: snapshotMonthDate,
      winner: top,
      skippedDuplicate: false,
    }
  } catch (err) {
    console.error('[Monthly Winner Snapshot] Unexpected error:', err)
    return {
      ran: true,
      month: snapshotMonthDate,
      winner: top,
      reason: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

/**
 * Fetch past monthly winners from monthly_winners table for display on Admin/Manager dashboard.
 */
export async function fetchPastWinners(): Promise<PastWinner[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('monthly_winners')
    .select(`
      id,
      month,
      score,
      completed_count,
      on_time_count,
      rejected_count,
      avg_rating,
      created_at,
      volunteer:volunteer_id (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .order('month', { ascending: false })

  if (error || !data) {
    console.warn('[Past Winners] Failed to fetch monthly winners:', error?.message)
    return []
  }

  return data.map((row: any) => {
    const vol = Array.isArray(row.volunteer) ? row.volunteer[0] : row.volunteer
    // Format month: e.g. "2026-08-01" -> "August 2026"
    let formattedMonth = row.month
    try {
      const [y, m] = row.month.split('-')
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1)
      formattedMonth = date.toLocaleString('default', { month: 'long', year: 'numeric' })
    } catch {}

    return {
      id: row.id,
      month: row.month,
      formattedMonth,
      volunteerId: row.volunteer_id,
      volunteerName: vol?.full_name || vol?.email || 'Volunteer',
      volunteerEmail: vol?.email || '',
      avatarUrl: vol?.avatar_url,
      score: Number(row.score),
      completedCount: Number(row.completed_count),
      onTimeCount: Number(row.on_time_count),
      rejectedCount: Number(row.rejected_count),
      avgRating: row.avg_rating != null ? Number(row.avg_rating) : null,
      createdAt: row.created_at,
    }
  })
}
