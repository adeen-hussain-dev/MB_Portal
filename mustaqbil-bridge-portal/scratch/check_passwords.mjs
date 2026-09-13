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

async function checkPass(email, pass) {
  const res = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass })
  })
  return res.status
}

async function main() {
  for (const email of ['adeengamer972@gmail.com', 'ansha.hussain28@gmail.com', 'adeen.hussain1831@gmail.com', 'hussainarshai972@gmail.com']) {
    console.log(email, '->', await checkPass(email, 'password123'))
  }
}
main()
