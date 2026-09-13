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
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

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
    const err = await res.text()
    throw new Error(`DB query failed: ${err}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function main() {
  const [admin] = await dbQuery('profiles?role=eq.admin&limit=1')
  const [volunteer] = await dbQuery('profiles?role=eq.volunteer&limit=1')

  console.log(`Admin: ${admin.email} (${admin.id})`)
  console.log(`Volunteer: ${volunteer.email} (${volunteer.id})`)

  // Create test task
  const [task] = await dbQuery('tasks', {
    method: 'POST',
    body: JSON.stringify({
      title: 'TEST-Review-Modal-Verification-Task',
      description: 'Comprehensive test task for review modal desktop responsiveness, labeled attachments, and task detail review action.',
      domain: 'Social Media',
      priority: 'high',
      status: 'in_review',
      assignee_id: volunteer.id,
      created_by: admin.id,
      due_date: '2028-10-15',
    }),
  })

  console.log(`Created Task ID: ${task.id}`)

  // 1. Add Reference Attachment
  await dbQuery('task_attachments', {
    method: 'POST',
    body: JSON.stringify({
      task_id: task.id,
      file_url: 'https://mustaqbil-bridge.supabase.co/storage/v1/object/public/task-attachments/brief_and_templates.pdf',
      file_name: 'Campaign_Brief_and_Templates.pdf',
      purpose: 'reference',
      uploaded_by: admin.id,
    }),
  })

  // 2. Add Submission Attachment (File)
  await dbQuery('task_attachments', {
    method: 'POST',
    body: JSON.stringify({
      task_id: task.id,
      file_url: 'https://mustaqbil-bridge.supabase.co/storage/v1/object/public/task-attachments/completed_infographic.png',
      file_name: 'Completed_Infographic_v1.png',
      purpose: 'submission',
      uploaded_by: volunteer.id,
    }),
  })

  // 3. Add Submission Attachment (Link)
  await dbQuery('task_attachments', {
    method: 'POST',
    body: JSON.stringify({
      task_id: task.id,
      file_url: 'https://youtube.com/watch?v=campaign_final_video_cut',
      file_name: 'Campaign_Final_Video_Cut.mp4',
      purpose: 'submission',
      uploaded_by: volunteer.id,
    }),
  })

  console.log(`Added 1 reference and 2 submission attachments to task ${task.id}`)
  fs.writeFileSync('scratch/active_test_task_id.txt', task.id, 'utf8')
}

main().catch(console.error)
