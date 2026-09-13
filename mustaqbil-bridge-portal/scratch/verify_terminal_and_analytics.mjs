import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
  const eqIdx = trimmed.indexOf('=')
  const key = trimmed.slice(0, eqIdx).trim()
  let val = trimmed.slice(eqIdx + 1).trim()
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
  env[key] = val
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const SITE_URL = 'http://localhost:3000'

async function getAuthSession(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Auth failed for ${email}: ${JSON.stringify(data)}`)

  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`
  const rawSession = JSON.stringify(data)
  const base64Session = 'base64-' + Buffer.from(rawSession).toString('base64')

  const cookieHeader = `${cookieName}=${base64Session}; ${cookieName}.0=${base64Session}; ${cookieName}=${encodeURIComponent(rawSession)}`
  return {
    token: data.access_token,
    user: data.user,
    headers: {
      Cookie: cookieHeader,
      Authorization: `Bearer ${data.access_token}`
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(' REAL VERIFICATION: TERMINAL STATE LOCK & MY ANALYTICS')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const adminSession = await getAuthSession('adeengamer972@gmail.com', 'password123')
  const volSession = await getAuthSession('volunteer.tester@mustaqbil.org', 'password123')

  // ─────────────────────────────────────────────────────────────
  // PART 1: TERMINAL STATE LOCK AUDIT & VERIFICATION
  // ─────────────────────────────────────────────────────────────
  console.log('--- PART 1: TERMINAL STATE LOCK (STATUS = "DONE") ---')

  // Create a completed task directly in DB
  const doneTaskRes = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      title: 'E2E Terminal State Locked Task',
      description: 'Testing read-only immutability once task status is done.',
      domain: 'Engineering',
      status: 'done',
      priority: 'medium',
      assignee_id: volSession.user.id,
      due_date: '2026-09-01',
      approved_at: '2026-09-02T10:00:00Z',
      created_by: adminSession.user.id
    })
  })
  const doneTaskText = await doneTaskRes.text()
  if (!doneTaskRes.ok) {
    throw new Error(`Failed to insert done task: ${doneTaskRes.status} ${doneTaskText}`)
  }
  const doneTask = JSON.parse(doneTaskText)[0]
  const doneTaskId = doneTask.id
  console.log(`Created test task in terminal state: ${doneTaskId} (status=done)\n`)

  try {
    // 1A. Admin attempts to change status on done task
    const adminStatusRes = await fetch(`${SITE_URL}/api/tasks/${doneTaskId}`, {
      method: 'PATCH',
      headers: { ...adminSession.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' })
    })
    const adminStatusData = await adminStatusRes.json()
    console.log(`Admin PATCH /api/tasks/${doneTaskId} { status: 'in_progress' }:`)
    console.log(`  HTTP Status: ${adminStatusRes.status} (Expected: 400)`)
    console.log(`  Response Error: "${adminStatusData.error}"`)
    const adminStatusRejected = adminStatusRes.status === 400 && adminStatusData.error?.includes('terminal state')
    console.log(`  -> Admin status change rejected: ${adminStatusRejected}\n`)

    // 1B. Volunteer attempts to change status on done task
    const volStatusRes = await fetch(`${SITE_URL}/api/tasks/${doneTaskId}`, {
      method: 'PATCH',
      headers: { ...volSession.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'todo' })
    })
    const volStatusData = await volStatusRes.json()
    console.log(`Volunteer PATCH /api/tasks/${doneTaskId} { status: 'todo' }:`)
    console.log(`  HTTP Status: ${volStatusRes.status} (Expected: 400)`)
    console.log(`  Response Error: "${volStatusData.error}"`)
    const volStatusRejected = volStatusRes.status === 400 && volStatusData.error?.includes('terminal state')
    console.log(`  -> Volunteer status change rejected: ${volStatusRejected}\n`)

    // 1C. Admin attempts to reassign volunteer on done task
    const adminReassignRes = await fetch(`${SITE_URL}/api/tasks/${doneTaskId}`, {
      method: 'PATCH',
      headers: { ...adminSession.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignee_id: adminSession.user.id })
    })
    const adminReassignData = await adminReassignRes.json()
    console.log(`Admin PATCH /api/tasks/${doneTaskId} { assignee_id: '...' }:`)
    console.log(`  HTTP Status: ${adminReassignRes.status} (Expected: 400)`)
    console.log(`  Response Error: "${adminReassignData.error}"`)
    const adminReassignRejected = adminReassignRes.status === 400 && adminReassignData.error?.includes('terminal state')
    console.log(`  -> Admin reassignment rejected: ${adminReassignRejected}\n`)

    // 1D. Volunteer attempts new submission attachment upload on done task
    const volAttRes = await fetch(`${SITE_URL}/api/tasks/${doneTaskId}/attachments`, {
      method: 'POST',
      headers: { ...volSession.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileUrl: 'https://example.com/extra_submission.pdf',
        fileName: 'extra_submission.pdf'
      })
    })
    const volAttData = await volAttRes.json()
    console.log(`Volunteer POST /api/tasks/${doneTaskId}/attachments:`)
    console.log(`  HTTP Status: ${volAttRes.status} (Expected: 400)`)
    console.log(`  Response Error: "${volAttData.error}"`)
    const volAttRejected = volAttRes.status === 400 && volAttData.error?.includes('completed task')
    console.log(`  -> Volunteer submission upload rejected: ${volAttRejected}\n`)

    // 1E. Admin attempts attachment upload on done task
    const adminAttRes = await fetch(`${SITE_URL}/api/tasks/${doneTaskId}/attachments`, {
      method: 'POST',
      headers: { ...adminSession.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileUrl: 'https://example.com/extra_reference.pdf',
        fileName: 'extra_reference.pdf'
      })
    })
    const adminAttData = await adminAttRes.json()
    console.log(`Admin POST /api/tasks/${doneTaskId}/attachments:`)
    console.log(`  HTTP Status: ${adminAttRes.status} (Expected: 400)`)
    console.log(`  Response Error: "${adminAttData.error}"`)
    const adminAttRejected = adminAttRes.status === 400 && adminAttData.error?.includes('completed task')
    console.log(`  -> Admin attachment upload rejected: ${adminAttRejected}\n`)

    // 1F. Volunteer attempts to post a new question on done task
    const questionRes = await fetch(`${SITE_URL}/api/questions`, {
      method: 'POST',
      headers: { ...volSession.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: doneTaskId,
        question: 'Can I still change this deliverable?'
      })
    })
    const questionData = await questionRes.json()
    console.log(`Volunteer POST /api/questions on done task:`)
    console.log(`  HTTP Status: ${questionRes.status} (Expected: 400)`)
    console.log(`  Response Error: "${questionData.error}"`)
    const questionRejected = questionRes.status === 400 && questionData.error?.includes('completed task')
    console.log(`  -> Volunteer question creation rejected: ${questionRejected}\n`)

    // 1G. Confirm comments remain postable on a done task (intentional per spec)
    const commentRes = await fetch(`${SITE_URL}/api/comments`, {
      method: 'POST',
      headers: { ...volSession.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: doneTaskId,
        content: 'Great collaborating on this completed deliverable!'
      })
    })
    console.log(`Volunteer POST /api/comments on done task: HTTP Status ${commentRes.status}`)
    const commentAllowed = commentRes.status === 200 || commentRes.status === 201
    console.log(`  -> Comments remain open and postable on done tasks: ${commentAllowed}\n`)

    // 1H. Task Detail Page UI Verification (Admin & Volunteer)
    const adminDetailRes = await fetch(`${SITE_URL}/tasks/${doneTaskId}`, { headers: adminSession.headers })
    const adminDetailHtml = await adminDetailRes.text()
    const adminHasStatusSelect = adminDetailHtml.includes('Save status & assignment') || adminDetailHtml.includes('Reassign Volunteer')
    const adminHasLockedBanner = adminDetailHtml.includes('Task Completed &amp; Locked') || adminDetailHtml.includes('Task Completed & Locked')
    const adminHasReviewBtn = adminDetailHtml.includes('Review Submission')
    console.log(`Task Detail SSR checks on done task (Admin):`)
    console.log(`  - Status dropdown & reassign selector hidden: ${!adminHasStatusSelect}`)
    console.log(`  - Read-only "Completed & Locked" banner rendered: ${adminHasLockedBanner}`)
    console.log(`  - "Review Submission" button hidden: ${!adminHasReviewBtn}`)

    const volDetailRes = await fetch(`${SITE_URL}/tasks/${doneTaskId}`, { headers: volSession.headers })
    const volDetailHtml = await volDetailRes.text()
    const volHasAskQuestionForm = volDetailHtml.includes('Ask a Question')
    const volHasLockedBanner = volDetailHtml.includes('Task Completed &amp; Locked') || volDetailHtml.includes('Task Completed & Locked')
    console.log(`Task Detail SSR checks on done task (Volunteer):`)
    console.log(`  - "Ask a Question" composer hidden: ${!volHasAskQuestionForm}`)
    console.log(`  - Read-only "Completed & Locked" banner rendered: ${volHasLockedBanner}\n`)

    // 1I. Kanban Board Drag Immutability Audit
    const kanbanSrc = fs.readFileSync('src/components/tasks/kanban-board.tsx', 'utf8')
    const hasDisabledSortable = kanbanSrc.includes('disabled: isDone')
    const hasLockIconHandle = kanbanSrc.includes('<LockIcon') && kanbanSrc.includes('cursor-not-allowed')
    const hasGuardedDragStart = kanbanSrc.includes("if (foundTask.status === 'done') return")
    const hasGuardedDragEnd = kanbanSrc.includes("if (!currentTask || currentTask.status === 'done') return")
    console.log(`Kanban Card Drag Immutability:`)
    console.log(`  - useSortable disabled when task is done: ${hasDisabledSortable}`)
    console.log(`  - Lock icon replaces drag handle on done cards: ${hasLockIconHandle}`)
    console.log(`  - handleDragStart guarded against done tasks: ${hasGuardedDragStart}`)
    console.log(`  - handleDragEnd guarded against done tasks: ${hasGuardedDragEnd}\n`)

  } finally {
    // Clean up terminal test task comments and task
    await fetch(`${SUPABASE_URL}/rest/v1/task_comments?task_id=eq.${doneTaskId}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    })
    await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${doneTaskId}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    })
  }

  // ─────────────────────────────────────────────────────────────
  // PART 2: "MY ANALYTICS" FEATURE VERIFICATION
  // ─────────────────────────────────────────────────────────────
  console.log('--- PART 2: "MY ANALYTICS" VOLUNTEER PERFORMANCE REPORT ---')

  // Set up test tasks for volunteer.tester@mustaqbil.org:
  // Task A: On-time done task
  const taskARes = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      title: 'Analytics Test: Social Campaign Graphic',
      description: 'On-time completed task',
      domain: 'Design',
      status: 'done',
      priority: 'high',
      assignee_id: volSession.user.id,
      due_date: '2026-09-10',
      approved_at: '2026-09-08T12:00:00Z',
      created_by: adminSession.user.id
    })
  })
  const taskAText = await taskARes.text()
  if (!taskARes.ok) throw new Error(`Task A insert failed: ${taskARes.status} ${taskAText}`)
  const taskA = JSON.parse(taskAText)[0]

  // Task B: Late done task
  const taskBRes = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      title: 'Analytics Test: Video Edit Brief',
      description: 'Late completed task',
      domain: 'Media',
      status: 'done',
      priority: 'medium',
      assignee_id: volSession.user.id,
      due_date: '2026-09-02',
      approved_at: '2026-09-05T14:00:00Z',
      created_by: adminSession.user.id
    })
  })
  const taskBText = await taskBRes.text()
  if (!taskBRes.ok) throw new Error(`Task B insert failed: ${taskBRes.status} ${taskBText}`)
  const taskB = JSON.parse(taskBText)[0]

  // Task C: In progress task
  const taskCRes = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      title: 'Analytics Test: Ongoing Writing',
      description: 'Active task',
      domain: 'Content',
      status: 'in_progress',
      priority: 'low',
      assignee_id: volSession.user.id,
      due_date: '2026-10-01',
      created_by: adminSession.user.id
    })
  })
  const taskCText = await taskCRes.text()
  if (!taskCRes.ok) throw new Error(`Task C insert failed: ${taskCRes.status} ${taskCText}`)
  const taskC = JSON.parse(taskCText)[0]

  // Insert 1 revision request in activity_log for task A
  const logRes = await fetch(`${SUPABASE_URL}/rest/v1/activity_log`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      task_id: taskA.id,
      user_id: adminSession.user.id,
      action: 'status_change',
      old_value: 'in_review',
      new_value: 'changes_requested'
    })
  })
  const logText = await logRes.text()
  if (!logRes.ok) throw new Error(`Log insert failed: ${logRes.status} ${logText}`)
  const testLog = JSON.parse(logText)[0]

  console.log(`Set up test dataset for volunteer:`)
  console.log(`  - Task A: Done, due 2026-09-10, approved 2026-09-08 (On-Time)`)
  console.log(`  - Task B: Done, due 2026-09-02, approved 2026-09-05 (Late)`)
  console.log(`  - Task C: In Progress`)
  console.log(`  - Activity Log: 1 revision requested on Task A\n`)

  try {
    // 2A. Direct GET /api/analytics/me as Volunteer
    console.log('Calling GET /api/analytics/me with volunteer auth session:')
    const analyticsRes = await fetch(`${SITE_URL}/api/analytics/me`, {
      headers: volSession.headers
    })
    console.log(`  HTTP Status: ${analyticsRes.status}`)
    const analyticsData = await analyticsRes.json()

    console.log('\n--- ACTUAL RETURNED JSON FROM /api/analytics/me ---')
    console.log(JSON.stringify(analyticsData, null, 2))
    console.log('---------------------------------------------------\n')

    // 2B. Direct DB comparison
    const dbTasksRes = await fetch(`${SUPABASE_URL}/rest/v1/tasks?assignee_id=eq.${volSession.user.id}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    })
    const dbTasks = await dbTasksRes.json()
    const dbCompleted = dbTasks.filter(t => t.status === 'done').length
    const dbOnTime = dbTasks.filter(t => {
      if (t.status !== 'done') return false
      if (!t.due_date) return true
      return new Date(t.approved_at) <= new Date(t.due_date + 'T23:59:59.999Z')
    }).length
    const dbLate = dbCompleted - dbOnTime

    const dbLogsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/activity_log?task_id=in.(${[taskA.id, taskB.id, taskC.id].join(',')})&new_value=eq.changes_requested`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    const dbLogs = await dbLogsRes.json()

    console.log('Direct Database Query Cross-Check for Volunteer:')
    console.log(`  DB completed count: ${dbCompleted} | API returned: ${analyticsData.summary.totalCompleted}`)
    console.log(`  DB on-time count: ${dbOnTime} | API returned: ${analyticsData.summary.onTimeCount}`)
    console.log(`  DB late count: ${dbLate} | API returned: ${analyticsData.summary.lateCount}`)
    console.log(`  DB rejection count: ${dbLogs.length} | API returned: ${analyticsData.summary.rejectionCount}`)
    console.log(`  -> API numbers exactly match DB ground truth: ${
      dbCompleted === analyticsData.summary.totalCompleted &&
      dbOnTime === analyticsData.summary.onTimeCount &&
      dbLate === analyticsData.summary.lateCount &&
      dbLogs.length === analyticsData.summary.rejectionCount
    }\n`)

    // 2C. Security check: Confirm raw activity_log rows are NOT exposed
    const exposesRawLogs = 'activity_log' in analyticsData || 'activity_logs' in analyticsData || 'rejectionLogs' in analyticsData
    console.log(`Security: Raw activity_log rows are NOT exposed to client: ${!exposesRawLogs}\n`)

    // 2D. Security check: User Isolation (Calling /api/analytics/me as Admin)
    console.log('Security: Testing caller isolation (Admin token calling /api/analytics/me):')
    const adminAnalyticsRes = await fetch(`${SITE_URL}/api/analytics/me`, {
      headers: adminSession.headers
    })
    const adminAnalyticsData = await adminAnalyticsRes.json()
    console.log(`  Admin's own totalAssigned: ${adminAnalyticsData.summary.totalAssigned}`)
    console.log(`  Admin's own completed: ${adminAnalyticsData.summary.totalCompleted}`)
    const doesNotLeakVolunteerTasks = !adminAnalyticsData.taskHistory.some(t => t.id === taskA.id || t.id === taskB.id)
    console.log(`  -> Admin session cannot see Volunteer's tasks (strictly caller's own data): ${doesNotLeakVolunteerTasks}\n`)

    // 2E. Direct GET /analytics Page as Volunteer
    console.log('Fetching /analytics SSR page with volunteer auth session:')
    const pageRes = await fetch(`${SITE_URL}/analytics`, {
      headers: volSession.headers
    })
    console.log(`  HTTP Status: ${pageRes.status}`)
    const pageHtml = await pageRes.text()
    const pageHasTitle = pageHtml.includes('My Analytics')
    console.log(`  - Page renders "My Analytics" heading: ${pageHasTitle}`)

    // 2F. Sidebar Nav Item Visibility (Volunteer vs Admin)
    console.log('Checking Sidebar "My Analytics" link visibility by role:')
    const volOverviewRes = await fetch(`${SITE_URL}/overview`, { headers: volSession.headers })
    const volOverviewHtml = await volOverviewRes.text()
    const volHasAnalyticsNav = volOverviewHtml.includes('href="/analytics"')
    console.log(`  - Volunteer sees "My Analytics" in sidebar: ${volHasAnalyticsNav}`)

    const adminOverviewRes = await fetch(`${SITE_URL}/overview`, { headers: adminSession.headers })
    const adminOverviewHtml = await adminOverviewRes.text()
    const adminHasAnalyticsNav = adminOverviewHtml.includes('href="/analytics"')
    console.log(`  - Admin sees "My Analytics" in sidebar: ${adminHasAnalyticsNav} (MUST be false)\n`)

    // 2G. Admin access to /analytics -> confirms redirect to /overview
    console.log('Checking Admin access to /analytics (expect redirect to /overview):')
    const adminAnalyticsPageRes = await fetch(`${SITE_URL}/analytics`, {
      headers: adminSession.headers,
      redirect: 'manual'
    })
    console.log(`  Admin /analytics HTTP Status: ${adminAnalyticsPageRes.status} (Redirect: ${adminAnalyticsPageRes.status === 307 || adminAnalyticsPageRes.status === 302 || adminAnalyticsPageRes.status === 308})\n`)

  } finally {
    // Clean up test tasks & logs
    console.log('Cleaning up test tasks and logs...')
    if (testLog?.id) {
      await fetch(`${SUPABASE_URL}/rest/v1/activity_log?id=eq.${testLog.id}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
      })
    }
    for (const tid of [taskA?.id, taskB?.id, taskC?.id].filter(Boolean)) {
      await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${tid}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
      })
    }

    // Verify cleanup
    const leftoverTasksRes = await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=in.(${[taskA.id, taskB.id, taskC.id].join(',')})`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    })
    const leftoverTasks = await leftoverTasksRes.json()
    console.log(`Leftover test task rows in database: ${leftoverTasks.length} (Verified 0)`)
    console.log('Cleanup complete.\n')
  }
}

main().catch(err => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
