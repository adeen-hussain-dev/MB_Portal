import fs from 'fs'
const envContent = fs.readFileSync('.env.local', 'utf8')
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
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const TEST_EMAIL = 'volunteer.tester@mustaqbil.org'
const TEST_PASS = 'password123'

async function main() {
  // Check if user exists in auth
  const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  })
  const { users } = await usersRes.json()
  let testUser = users.find(u => u.email === TEST_EMAIL)

  if (!testUser) {
    console.log('Creating auth user...')
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASS,
        email_confirm: true,
        user_metadata: { full_name: 'Test Volunteer' }
      })
    })
    testUser = await createRes.json()
    console.log('Created user:', testUser.id)
  } else {
    // Ensure password is password123
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${testUser.id}`, {
      method: 'PUT',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: TEST_PASS, email_confirm: true })
    })
    console.log('Updated user password:', testUser.id)
  }

  // Ensure profile in profiles table with role volunteer
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${testUser.id}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  })
  const profiles = await profileRes.json()

  if (profiles.length === 0) {
    console.log('Inserting profile...')
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        id: testUser.id,
        email: TEST_EMAIL,
        full_name: 'Test Volunteer',
        role: 'volunteer'
      })
    })
  } else {
    console.log('Updating profile...')
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${testUser.id}`, {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'volunteer', full_name: 'Test Volunteer' })
    })
  }

  // Also assign a sample task to this volunteer so overview has real stats
  const tasksRes = await fetch(`${SUPABASE_URL}/rest/v1/tasks?limit=1`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  })
  const [existingTask] = await tasksRes.json()
  if (existingTask) {
    await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${existingTask.id}`, {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ assignee_id: testUser.id })
    })
    console.log(`Assigned task ${existingTask.id} to test volunteer.`)
  }

  console.log('Test volunteer setup complete: volunteer.tester@mustaqbil.org / password123')
}

main().catch(console.error)
