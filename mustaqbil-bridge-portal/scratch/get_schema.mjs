import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const eqIdx = line.indexOf('=')
  if (eqIdx > 0 && !line.startsWith('#')) {
    let val = line.slice(eqIdx + 1).trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    env[line.slice(0, eqIdx).trim()] = val
  }
}

const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${env.SUPABASE_SERVICE_ROLE_KEY}`)
const s = await res.json()
const pRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?email=eq.adeengamer972@gmail.com`, {
  headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
})
console.log('Admin profile:', await pRes.json())
