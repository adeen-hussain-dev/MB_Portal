import fs from 'fs'
import path from 'path'

// Read .env.local
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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const PORT = 3000
const BASE_URL = `http://localhost:${PORT}`

async function dbQuery(endpoint, options = {}) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`DB query failed on ${endpoint}: ${res.status} ${errText}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function getAuthToken(email) {
  const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'magiclink', email }),
  })
  const linkData = await linkRes.json()
  const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'email', token_hash: linkData.hashed_token }),
  })
  const session = await verifyRes.json()
  return { token: session.access_token, user: session.user }
}

async function run() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(' MODULE 12D: SUBMISSION UPLOAD & PURPOSE SEPARATION E2E TEST')
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Step 1: Confirm Schema and Backfill
  console.log('--- Step 1: Checking Schema & Existing Attachments Backfill ---')
  const existingAtts = await dbQuery('task_attachments?select=id,file_name,purpose')
  console.log(`Found ${existingAtts.length} existing attachment rows in task_attachments.`)
  for (const att of existingAtts) {
    console.log(` - ID: ${att.id}, File: ${att.file_name}, Purpose: "${att.purpose}"`)
  }
  const nonReference = existingAtts.filter(a => a.purpose !== 'reference')
  if (nonReference.length > 0) {
    console.warn(`Warning: Found ${nonReference.length} rows with purpose != 'reference'`)
  } else {
    console.log('CONFIRMED: All pre-existing attachment rows correctly defaulted to purpose = "reference".\n')
  }

  // Step 2: Authenticate Test Users
  console.log('--- Step 2: Authenticating Test Users ---')
  const { token: adminToken, user: adminUser } = await getAuthToken('adeengamer972@gmail.com')
  console.log(`Admin logged in: ${adminUser.email} (${adminUser.id})`)

  const { token: volunteerToken, user: volunteerUser } = await getAuthToken('hussainarshai972@gmail.com')
  console.log(`Volunteer logged in: ${volunteerUser.email} (${volunteerUser.id})\n`)

  const testTaskIds = []

  try {
    // ═══════════════════════════════════════════════════════════════
    // Check 1: Volunteer attempts PATCH to in_review with ZERO submissions
    // ═══════════════════════════════════════════════════════════════
    console.log('--- Check 1: Volunteer PATCH status to in_review with 0 submissions ---')
    const [task1] = await dbQuery('tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: 'TEST-12D-Task-Zero-Submissions',
        description: 'Testing mandatory submission requirement',
        domain: 'Social Media',
        priority: 'medium',
        status: 'in_progress',
        assignee_id: volunteerUser.id,
        created_by: adminUser.id,
        due_date: '2028-12-31',
      }),
    })
    testTaskIds.push(task1.id)
    console.log(`Created Task 1 (ID: ${task1.id}) assigned to volunteer.`)

    // Attempt PATCH to in_review without any submission attachment
    const res1 = await fetch(`${BASE_URL}/api/tasks/${task1.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volunteerToken}`,
      },
      body: JSON.stringify({
        status: 'in_review',
      }),
    })

    const body1 = await res1.json()
    console.log(`HTTP Response status: ${res1.status}`)
    console.log(`Response error message: "${body1.error}"`)

    if (res1.status === 400 && body1.error?.toLowerCase().includes('submission attachment is required')) {
      console.log('CONFIRMED Check 1: Server rejected with 400: "At least one submission attachment is required before submitting for review"\n')
    } else {
      throw new Error(`Check 1 failed: Expected 400 with submission error, got ${res1.status}: ${JSON.stringify(body1)}`)
    }

    // ═══════════════════════════════════════════════════════════════
    // Check 2: Volunteer uploads a real file as a submission
    // ═══════════════════════════════════════════════════════════════
    console.log('--- Check 2: Volunteer uploads a real file as a submission ---')
    const fileUploadRes = await fetch(`${BASE_URL}/api/tasks/${task1.id}/attachments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volunteerToken}`,
      },
      body: JSON.stringify({
        fileUrl: 'https://mustaqbil-bridge.supabase.co/storage/v1/object/public/task-attachments/sample_campaign_report.pdf',
        fileName: 'sample_campaign_report.pdf',
        attachmentType: 'file',
        purpose: 'submission',
      }),
    })

    const fileUploadData = await fileUploadRes.json()
    console.log(`Upload API status: ${fileUploadRes.status}`)
    console.log(`Upload API response:`, fileUploadData)

    if (!fileUploadRes.ok) {
      throw new Error(`Check 2 failed: Could not create attachment: ${JSON.stringify(fileUploadData)}`)
    }

    // Check DB row directly
    const [dbAtt1] = await dbQuery(`task_attachments?task_id=eq.${task1.id}&purpose=eq.submission`)
    console.log(`DB Row queried:`)
    console.log(`- ID: ${dbAtt1.id}`)
    console.log(`- Task ID: ${dbAtt1.task_id}`)
    console.log(`- File Name: ${dbAtt1.file_name}`)
    console.log(`- Purpose: "${dbAtt1.purpose}"`)
    console.log(`- Uploaded By: ${dbAtt1.uploaded_by}`)

    // Fetch via GET /api/tasks/:id
    const task1DetailRes = await fetch(`${BASE_URL}/api/tasks/${task1.id}`, {
      headers: { Authorization: `Bearer ${volunteerToken}` },
    })
    const task1Detail = await task1DetailRes.json()
    const task1Submissions = (task1Detail.attachmentDetails || []).filter(a => a.purpose === 'submission')
    const task1References = (task1Detail.attachmentDetails || []).filter(a => a.purpose === 'reference')

    console.log(`Task Detail API response sections:`)
    console.log(`- Submitted Work count: ${task1Submissions.length} [${task1Submissions.map(s => s.fileName).join(', ')}]`)
    console.log(`- Reference Materials count: ${task1References.length}`)

    if (task1Submissions.length === 1 && task1References.length === 0) {
      console.log('CONFIRMED Check 2: File submission has purpose="submission", renders under "Submitted Work" and not "Reference Materials".\n')
    } else {
      throw new Error(`Check 2 failed: Lists mixed or wrong counts`)
    }

    // Now moving to in_review should SUCCEED
    const res1b = await fetch(`${BASE_URL}/api/tasks/${task1.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volunteerToken}`,
      },
      body: JSON.stringify({
        status: 'in_review',
      }),
    })
    const body1b = await res1b.json()
    console.log(`PATCH to in_review now: status=${res1b.status}, updated task status="${body1b.status}"`)
    if (res1b.ok && body1b.status === 'in_review') {
      console.log('CONFIRMED: Task successfully moved to in_review now that submission attachment exists.\n')
    } else {
      throw new Error(`Check 2 PATCH to in_review failed: ${JSON.stringify(body1b)}`)
    }

    // ═══════════════════════════════════════════════════════════════
    // Check 3: Volunteer uploads a video LINK as a submission
    // ═══════════════════════════════════════════════════════════════
    console.log('--- Check 3: Volunteer uploads video LINK as submission ---')
    const linkUploadRes = await fetch(`${BASE_URL}/api/tasks/${task1.id}/attachments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volunteerToken}`,
      },
      body: JSON.stringify({
        fileUrl: 'https://youtube.com/watch?v=campaign_reel_final_cut',
        fileName: 'Campaign Reel Final Cut',
        attachmentType: 'link',
        purpose: 'submission',
      }),
    })

    const linkUploadData = await linkUploadRes.json()
    console.log(`Link submission HTTP status: ${linkUploadRes.status}`)
    console.log(`Link submission response:`, linkUploadData)

    const [dbAtt2] = await dbQuery(`task_attachments?task_id=eq.${task1.id}&file_name=eq.Campaign%20Reel%20Final%20Cut`)
    console.log(`DB Row queried:`)
    console.log(`- ID: ${dbAtt2.id}`)
    console.log(`- File URL: ${dbAtt2.file_url}`)
    console.log(`- Purpose: "${dbAtt2.purpose}"`)

    const task1AfterLinkRes = await fetch(`${BASE_URL}/api/tasks/${task1.id}`, {
      headers: { Authorization: `Bearer ${volunteerToken}` },
    })
    const task1AfterLink = await task1AfterLinkRes.json()
    const linkAttachment = task1AfterLink.attachmentDetails?.find(a => a.fileName === 'Campaign Reel Final Cut')
    console.log(`Task detail attachment object:`, linkAttachment)

    if (linkAttachment && linkAttachment.attachmentType === 'link' && linkAttachment.purpose === 'submission') {
      console.log('CONFIRMED Check 3: Video link submission has attachmentType="link", purpose="submission", and renders under "Submitted Work".\n')
    } else {
      throw new Error(`Check 3 failed: link attachment properties incorrect`)
    }

    // ═══════════════════════════════════════════════════════════════
    // Check 4: Late scenario test (task past due_date)
    // ═══════════════════════════════════════════════════════════════
    console.log('--- Check 4: Late Scenario (task past due_date) ---')
    const [lateTask] = await dbQuery('tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: 'TEST-12D-Late-Task-Submission',
        description: 'Testing late submission interaction with attachments',
        domain: 'Graphics',
        priority: 'high',
        status: 'todo',
        assignee_id: volunteerUser.id,
        created_by: adminUser.id,
        due_date: '2020-01-01', // definitely past due in PKT
      }),
    })
    testTaskIds.push(lateTask.id)
    console.log(`Created Late Task (ID: ${lateTask.id}, due_date: 2020-01-01)`)

    // 4a: Missing BOTH submission attachment AND late reason
    console.log('\nSub-check 4a: Missing submission attachment (and no late reason)')
    const res4a = await fetch(`${BASE_URL}/api/tasks/${lateTask.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volunteerToken}`,
      },
      body: JSON.stringify({
        status: 'in_review',
      }),
    })
    const body4a = await res4a.json()
    console.log(`4a Status: ${res4a.status}, error message: "${body4a.error}"`)
    if (res4a.status !== 400 || !body4a.error?.includes('submission attachment is required')) {
      throw new Error(`4a failed: expected 400 naming submission attachment`)
    }
    console.log('Sub-check 4a CONFIRMED: Rejected for missing submission attachment.')

    // 4b: Submission attachment exists, but missing late reason
    console.log('\nSub-check 4b: Submission uploaded, but late reason missing')
    await fetch(`${BASE_URL}/api/tasks/${lateTask.id}/attachments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volunteerToken}`,
      },
      body: JSON.stringify({
        fileUrl: 'https://example.com/late_banner_design.png',
        fileName: 'late_banner_design.png',
        attachmentType: 'file',
        purpose: 'submission',
      }),
    })

    const res4b = await fetch(`${BASE_URL}/api/tasks/${lateTask.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volunteerToken}`,
      },
      body: JSON.stringify({
        status: 'in_review',
        // missing late_reason!
      }),
    })
    const body4b = await res4b.json()
    console.log(`4b Status: ${res4b.status}, error message: "${body4b.error}"`)
    if (res4b.status !== 400 || !body4b.error?.toLowerCase().includes('reason is required for late submission')) {
      throw new Error(`4b failed: expected 400 naming late reason required, got ${res4b.status}: ${JSON.stringify(body4b)}`)
    }
    console.log('Sub-check 4b CONFIRMED: Rejected for missing late submission reason.')

    // 4c: Late submit with BOTH late reason AND submission attachment in one request
    console.log('\nSub-check 4c: Submits BOTH late reason AND submission attachment in ONE request')
    const res4c = await fetch(`${BASE_URL}/api/tasks/${lateTask.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volunteerToken}`,
      },
      body: JSON.stringify({
        status: 'in_review',
        late_reason: 'Power outage in city center delayed the final asset export.',
        submission_attachment: {
          fileUrl: 'https://drive.google.com/file/d/late_final_assets_archive/view',
          fileName: 'Final_Assets_Late_Archive.zip',
          attachmentType: 'link',
        },
      }),
    })
    const body4c = await res4c.json()
    console.log(`4c HTTP Status: ${res4c.status}`)
    console.log(`4c Task Status after submit: "${body4c.status}"`)
    if (!res4c.ok || body4c.status !== 'in_review') {
      throw new Error(`4c failed: expected 200 and status in_review, got ${res4c.status}`)
    }

    // Verify comment row exists
    const lateComments = await dbQuery(`task_comments?task_id=eq.${lateTask.id}`)
    console.log(`Task Comments in DB (${lateComments.length} rows):`)
    for (const c of lateComments) {
      console.log(` - "${c.comment}" (by user ${c.user_id})`)
    }
    const hasLateComment = lateComments.some(c => c.comment.includes('Power outage in city center'))
    if (!hasLateComment) {
      throw new Error(`4c failed: late reason comment not found in task_comments`)
    }

    // Verify attachment row exists
    const lateAtts = await dbQuery(`task_attachments?task_id=eq.${lateTask.id}`)
    console.log(`Task Attachments in DB (${lateAtts.length} rows):`)
    for (const a of lateAtts) {
      console.log(` - File: ${a.file_name}, Purpose: "${a.purpose}"`)
    }
    const hasLateArchive = lateAtts.some(a => a.file_name === 'Final_Assets_Late_Archive.zip' && a.purpose === 'submission')
    if (!hasLateArchive) {
      throw new Error(`4c failed: Final_Assets_Late_Archive.zip not found with purpose='submission'`)
    }
    console.log('CONFIRMED Check 4: Late scenario passed! 200 returned, comment row and submission attachment created.\n')

    // ═══════════════════════════════════════════════════════════════
    // Check 5: Admin/Manager Reference Attachments Visually Separate
    // ═══════════════════════════════════════════════════════════════
    console.log('--- Check 5: Admin/Manager Reference Attachments Separate from Submissions ---')
    // Insert a reference attachment on lateTask
    await dbQuery('task_attachments', {
      method: 'POST',
      body: JSON.stringify({
        task_id: lateTask.id,
        file_url: 'https://mustaqbil-bridge.supabase.co/storage/v1/object/public/task-attachments/brand_guidelines_2026.pdf',
        file_name: 'brand_guidelines_2026.pdf',
        purpose: 'reference',
        uploaded_by: adminUser.id,
      }),
    })

    const finalLateDetailRes = await fetch(`${BASE_URL}/api/tasks/${lateTask.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const finalLateDetail = await finalLateDetailRes.json()

    const references = (finalLateDetail.attachmentDetails || []).filter(a => a.purpose === 'reference')
    const submissions = (finalLateDetail.attachmentDetails || []).filter(a => a.purpose === 'submission')

    console.log(`Reference Materials (${references.length}):`, references.map(r => r.fileName))
    console.log(`Submitted Work (${submissions.length}):`, submissions.map(s => s.fileName))

    const hasRefMismatch = submissions.some(s => s.fileName === 'brand_guidelines_2026.pdf')
    const hasSubMismatch = references.some(r => r.fileName === 'Final_Assets_Late_Archive.zip')

    if (!hasRefMismatch && !hasSubMismatch && references.length >= 1 && submissions.length >= 1) {
      console.log('CONFIRMED Check 5: Reference materials and Submitted work are strictly separate and never mixed!\n')
    } else {
      throw new Error('Check 5 failed: Reference materials and Submissions are mixed!')
    }

  } finally {
    // ═══════════════════════════════════════════════════════════════
    // Check 6: Cleanup Test Data
    // ═══════════════════════════════════════════════════════════════
    console.log('--- Check 6: Cleaning up all test data ---')
    for (const tid of testTaskIds) {
      console.log(`Cleaning up test task ${tid}...`)
      await dbQuery(`task_comments?task_id=eq.${tid}`, { method: 'DELETE' })
      await dbQuery(`task_attachments?task_id=eq.${tid}`, { method: 'DELETE' })
      await dbQuery(`activity_log?task_id=eq.${tid}`, { method: 'DELETE' })
      await dbQuery(`notifications?task_id=eq.${tid}`, { method: 'DELETE' })
      await dbQuery(`tasks?id=eq.${tid}`, { method: 'DELETE' })
    }

    // Confirm 0 leftovers
    const leftoverTasks = await dbQuery(`tasks?id=in.(${testTaskIds.join(',')})`)
    const leftoverAtts = await dbQuery(`task_attachments?task_id=in.(${testTaskIds.join(',')})`)
    const leftoverComments = await dbQuery(`task_comments?task_id=in.(${testTaskIds.join(',')})`)

    console.log(`Leftover tasks: ${leftoverTasks?.length || 0}`)
    console.log(`Leftover attachments: ${leftoverAtts?.length || 0}`)
    console.log(`Leftover comments: ${leftoverComments?.length || 0}`)

    if ((leftoverTasks?.length || 0) === 0 && (leftoverAtts?.length || 0) === 0 && (leftoverComments?.length || 0) === 0) {
      console.log('CONFIRMED Check 6: All test data cleaned up with 0 leftover rows!\n')
    } else {
      console.error('Warning: Leftovers detected!')
    }
  }

  console.log('═══════════════════════════════════════════════════════════════')
  console.log(' ALL MODULE 12D CHECKS COMPLETED AND VERIFIED WITH REAL OUTPUT!')
  console.log('═══════════════════════════════════════════════════════════════')
}

run().catch(err => {
  console.error('Test run failed with error:', err)
  process.exit(1)
})
