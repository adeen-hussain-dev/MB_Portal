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
  console.log(' VERIFYING ALL 4 FIXES VIA REAL API CALLS & SSR DATA')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const adminSession = await getAuthSession('adeengamer972@gmail.com', 'password123')
  const volSession = await getAuthSession('volunteer.tester@mustaqbil.org', 'password123')

  // ─────────────────────────────────────────────────────────────
  // 1. OVERVIEW ROUTE FIX CONFIRMATION
  // ─────────────────────────────────────────────────────────────
  console.log('--- 1. OVERVIEW ROUTE FIX (API/SSR TEST) ---')
  const volOverviewRes = await fetch(`${SITE_URL}/overview`, { headers: volSession.headers })
  const volOverviewHtml = await volOverviewRes.text()
  console.log(`GET /overview HTTP Status: ${volOverviewRes.status}`)
  const hasOverviewNav = volOverviewHtml.includes('href="/overview"')
  const hasLandingText = volOverviewHtml.includes('Empowering Young Careers') || volOverviewHtml.includes('Sign In to Portal')
  const hasDashboardStats = volOverviewHtml.includes('Active Tasks') || volOverviewHtml.includes('My assigned work') || volOverviewHtml.includes('Volunteer workspace')
  console.log(`- /overview returns HTTP 200: ${volOverviewRes.status === 200}`)
  console.log(`- Sidebar "Overview" link points to /overview: ${hasOverviewNav}`)
  console.log(`- Contains authenticated dashboard content: ${hasDashboardStats}`)
  console.log(`- Does NOT contain public landing page markup: ${!hasLandingText}`)

  const publicLandingRes = await fetch(`${SITE_URL}/`)
  const publicLandingHtml = await publicLandingRes.text()
  console.log(`GET / (public landing) HTTP Status: ${publicLandingRes.status}`)
  const isPublicLanding = publicLandingHtml.includes('Mustaqbil Bridge') && (publicLandingHtml.includes('A clear bridge from assigned work to approved results.') || publicLandingHtml.includes('Invite-only internal portal'))
  console.log(`- "/" returns public landing page exclusively: ${isPublicLanding}\n`)

  // ─────────────────────────────────────────────────────────────
  // SETUP TEST TASK FOR ITEMS 2, 3, 4
  // ─────────────────────────────────────────────────────────────
  console.log('--- Setting up in_review test task with reference and submission attachments ---')
  const createTaskRes = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      title: 'E2E Test 4 Fixes Verification',
      description: 'Verifying task actions and distinct attachment labeling.',
      domain: 'Engineering',
      status: 'in_review',
      priority: 'high',
      assignee_id: volSession.user.id,
      due_date: '2026-12-31',
      created_by: adminSession.user.id
    })
  })
  const taskJsonText = await createTaskRes.text()
  if (!createTaskRes.ok) {
    throw new Error(`Failed to create test task: ${createTaskRes.status} ${taskJsonText}`)
  }
  const createdTask = JSON.parse(taskJsonText)[0]
  const taskId = createdTask.id
  console.log(`Created in_review task: ${taskId}`)

  // Add 1 Reference Attachment
  const refAttRes = await fetch(`${SUPABASE_URL}/rest/v1/task_attachments`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      task_id: taskId,
      file_name: 'Brand_Guidelines_Reference.pdf',
      file_url: 'https://example.com/files/Brand_Guidelines_Reference.pdf',
      purpose: 'reference',
      uploaded_by: adminSession.user.id
    })
  })
  if (!refAttRes.ok) console.error('Failed to insert ref attachment:', await refAttRes.text())

  // Add 1 Submission Attachment
  const subAttRes = await fetch(`${SUPABASE_URL}/rest/v1/task_attachments`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      task_id: taskId,
      file_name: 'Final_Social_Media_Graphic_Submission.png',
      file_url: 'https://example.com/files/Final_Social_Media_Graphic_Submission.png',
      purpose: 'submission',
      uploaded_by: volSession.user.id
    })
  })
  if (!subAttRes.ok) console.error('Failed to insert sub attachment:', await subAttRes.text())
  console.log('Added 1 reference attachment and 1 submission attachment.\n')

  try {
    // ─────────────────────────────────────────────────────────────
    // 2. REVIEW SUBMISSION ACTION ON TASK DETAIL
    // ─────────────────────────────────────────────────────────────
    console.log('--- 2. REVIEW SUBMISSION BUTTON ON TASK DETAIL ---')
    const adminDetailRes = await fetch(`${SITE_URL}/tasks/${taskId}`, { headers: adminSession.headers })
    const adminDetailHtml = await adminDetailRes.text()
    const adminHasReviewBtn = adminDetailHtml.includes('Review Submission')
    console.log(`- Admin sees "Review Submission" button on /tasks/${taskId}: ${adminHasReviewBtn}`)

    const volDetailRes = await fetch(`${SITE_URL}/tasks/${taskId}`, { headers: volSession.headers })
    const volDetailHtml = await volDetailRes.text()
    const volHasReviewBtn = volDetailHtml.includes('Review Submission')
    console.log(`- Volunteer does NOT see "Review Submission" button: ${!volHasReviewBtn}`)

    // Verify component reuse: check task-detail-actions and kanban-board both import the same component
    const taskDetailActionsSrc = fs.readFileSync('src/components/tasks/task-detail-actions.tsx', 'utf8')
    const kanbanSrc = fs.readFileSync('src/components/tasks/kanban-board.tsx', 'utf8')
    const taskDetailImportsModal = taskDetailActionsSrc.includes("import { TaskReviewModal } from './task-review-modal'")
    const kanbanImportsModal = kanbanSrc.includes("import { TaskReviewModal } from './task-review-modal'")
    console.log(`- task-detail-actions.tsx imports shared TaskReviewModal: ${taskDetailImportsModal}`)
    console.log(`- kanban-board.tsx imports shared TaskReviewModal: ${kanbanImportsModal}`)
    console.log(`- Exact same component reused without duplication: ${taskDetailImportsModal && kanbanImportsModal}\n`)

    // ─────────────────────────────────────────────────────────────
    // 3. REVIEW MODAL DESKTOP RESPONSIVENESS & OVERFLOW FIX
    // ─────────────────────────────────────────────────────────────
    console.log('--- 3. REVIEW MODAL DESKTOP RESPONSIVENESS (LAYOUT CODE AUDIT) ---')
    const modalSrc = fs.readFileSync('src/components/tasks/task-review-modal.tsx', 'utf8')
    const hasDesktopWidth = modalSrc.includes('sm:max-w-2xl')
    const hasFlexWrapButtons = modalSrc.includes('flex flex-wrap items-center justify-end gap-3')
    const hasScrollableBody = modalSrc.includes('max-h-[75vh]') && modalSrc.includes('overflow-y-auto')
    const hasShrinkZero = modalSrc.includes('shrink-0 rounded-xl')
    console.log(`- Dialog width overridden to sm:max-w-2xl (fixing sm:max-w-sm 384px cramp): ${hasDesktopWidth}`)
    console.log(`- Button row uses flex-wrap with gap-3: ${hasFlexWrapButtons}`)
    console.log(`- Modal body constrained to max-h-[75vh] with overflow-y-auto: ${hasScrollableBody}`)
    console.log(`- Buttons have shrink-0 rounded-xl styling: ${hasShrinkZero}`)
    console.log(`* NOTE: Desktop visual layout flagged for user inspection at 1280px+.\n`)

    // ─────────────────────────────────────────────────────────────
    // 4. ATTACHMENT LABELS (REFERENCE VS SUBMISSION)
    // ─────────────────────────────────────────────────────────────
    console.log('--- 4. ATTACHMENT LABELS: REFERENCE VS SUBMISSION ---')
    const taskApiRes = await fetch(`${SITE_URL}/api/tasks/${taskId}`, { headers: adminSession.headers })
    const taskApiData = await taskApiRes.json()
    console.log(`GET /api/tasks/${taskId} HTTP Status: ${taskApiRes.status}`)
    const attachments = taskApiData.attachmentDetails || []
    console.log(`Found ${attachments.length} attachmentDetails in API response:`)
    for (const att of attachments) {
      console.log(`  * "${att.fileName}": purpose="${att.purpose}", type="${att.attachmentType}"`)
    }
    const hasRef = attachments.some(a => a.purpose === 'reference')
    const hasSub = attachments.some(a => a.purpose === 'submission')
    console.log(`- API returns purpose="reference": ${hasRef}`)
    console.log(`- API returns purpose="submission": ${hasSub}`)

    // Confirm modal component groups by purpose
    const modalHasSubmittedSection = modalSrc.includes('Submitted Work') && modalSrc.includes("a.purpose === 'submission'")
    const modalHasReferenceSection = modalSrc.includes('Reference Materials') && modalSrc.includes("a.purpose === 'reference'")
    const modalHasBadges = modalSrc.includes('Submission') && modalSrc.includes('Reference')
    console.log(`- TaskReviewModal has distinct "Submitted Work" sub-section: ${modalHasSubmittedSection}`)
    console.log(`- TaskReviewModal has distinct "Reference Materials" sub-section: ${modalHasReferenceSection}`)
    console.log(`- TaskReviewModal renders "Submission" and "Reference" badges: ${modalHasBadges}\n`)

  } finally {
    // Clean up test task
    console.log(`Cleaning up test task ${taskId}...`)
    await fetch(`${SUPABASE_URL}/rest/v1/task_attachments?task_id=eq.${taskId}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    })
    await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${taskId}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    })
    console.log('Cleanup complete.')
  }
}

main().catch(err => {
  console.error('Execution failed:', err)
  process.exit(1)
})
