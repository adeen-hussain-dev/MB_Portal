import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendDueTomorrowEmail } from '@/lib/email'

/**
 * Helper to get a calendar date formatted as YYYY-MM-DD in Pakistan Standard Time (PKT / Asia/Karachi).
 * PKT is UTC+5 year-round.
 */
function getPktDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export async function GET(request: Request) {
  // 1. Mandatory CRON_SECRET authorization check (no fallback)
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Compute calendar dates in PKT (Pakistan Time, UTC+5)
  const now = new Date()
  const todayPkt = getPktDateString(now)
  const tomorrowPkt = getPktDateString(new Date(now.getTime() + 24 * 60 * 60 * 1000))

  console.log(`[Cron: Due Reminders] Running at UTC: ${now.toISOString()} | PKT Today: ${todayPkt} | Looking for tasks due PKT Tomorrow: ${tomorrowPkt}`)

  const admin = createAdminClient()

  // 3. Find active tasks (todo / in_progress) due tomorrow in PKT
  const { data: rawTasks, error } = await admin
    .from('tasks')
    .select(`
      id,
      title,
      description,
      domain,
      priority,
      due_date,
      status,
      assignee_id,
      profiles:assignee_id (
        id,
        full_name,
        email
      )
    `)
    .in('status', ['todo', 'in_progress'])
    .eq('due_date', tomorrowPkt)

  if (error) {
    console.error('[Cron: Due Reminders] Database error fetching tasks:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const tasksToRemind = rawTasks || []
  console.log(`[Cron: Due Reminders] Found ${tasksToRemind.length} active task(s) due tomorrow (${tomorrowPkt})`)

  // 4. Lightweight deduplication check using activity_log
  // Check which of these tasks already had a reminder sent for tomorrowPkt
  const taskIds = tasksToRemind.map((t) => t.id)
  let alreadyRemindedTaskIds = new Set<string>()

  if (taskIds.length > 0) {
    const { data: sentLogs, error: logErr } = await admin
      .from('activity_log')
      .select('task_id')
      .in('task_id', taskIds)
      .eq('action', 'due_reminder_sent')
      .eq('new_value', tomorrowPkt)

    if (logErr) {
      console.warn('[Cron: Due Reminders] Warning: Could not check activity_log for dedup:', logErr.message)
    } else if (sentLogs) {
      alreadyRemindedTaskIds = new Set(sentLogs.map((l) => l.task_id))
    }
  }

  const results: Array<{ taskId: string; title: string; email: string; success: boolean; skipped?: boolean; reason?: string; error?: string }> = []

  // 5. Send reminder email for each matching task (unless already reminded today)
  for (const task of tasksToRemind) {
    const profile = Array.isArray(task.profiles) ? task.profiles[0] : task.profiles
    const assigneeEmail = profile?.email

    if (!assigneeEmail) {
      console.warn(`[Cron: Due Reminders] Task ${task.id} has no assignee email. Skipping.`)
      results.push({
        taskId: task.id,
        title: task.title,
        email: '',
        success: false,
        skipped: true,
        reason: 'No assignee email',
      })
      continue
    }

    // Dedup check: skip if reminder was already sent today for this task
    if (alreadyRemindedTaskIds.has(task.id)) {
      console.log(`[Cron: Due Reminders] Task ${task.id} already received a reminder for ${tomorrowPkt}. Skipping (dedup).`)
      results.push({
        taskId: task.id,
        title: task.title,
        email: assigneeEmail,
        success: true,
        skipped: true,
        reason: 'Already sent today (deduplicated)',
      })
      continue
    }

    try {
      const emailResult = await sendDueTomorrowEmail({
        taskId: task.id,
        taskTitle: task.title,
        taskDescription: task.description,
        taskDomain: task.domain,
        taskPriority: task.priority,
        taskDueDate: tomorrowPkt,
        assigneeName: profile?.full_name,
        assigneeEmail,
      })

      if (emailResult.success) {
        // Record into activity_log to prevent duplicate emails on retry/re-trigger
        if (task.assignee_id) {
          try {
            await admin.from('activity_log').insert({
              task_id: task.id,
              user_id: task.assignee_id,
              action: 'due_reminder_sent',
              new_value: tomorrowPkt,
            })
          } catch (logInsertErr) {
            console.warn('[Cron: Due Reminders] Warning: Could not log dedup entry:', logInsertErr)
          }
        }
      }

      results.push({
        taskId: task.id,
        title: task.title,
        email: assigneeEmail,
        success: emailResult.success,
        error: emailResult.error,
      })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[Cron: Due Reminders] Failed to send email for task ${task.id}:`, errMsg)
      results.push({
        taskId: task.id,
        title: task.title,
        email: assigneeEmail,
        success: false,
        error: errMsg,
      })
    }
  }

  return NextResponse.json({
    success: true,
    timezone: 'Asia/Karachi (PKT, UTC+5)',
    todayPkt,
    tomorrowPkt,
    remindedCount: results.filter((r) => r.success).length,
    totalFound: tasksToRemind.length,
    results,
  })
}

export const POST = GET

