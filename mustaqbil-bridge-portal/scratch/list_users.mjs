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

const res = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/admin/users', {
  headers: {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY
  }
})
const { users } = await res.json()
console.log('Users in auth:')
for (const u of users) {
  console.log(`- ${u.email} (${u.id})`)
}
