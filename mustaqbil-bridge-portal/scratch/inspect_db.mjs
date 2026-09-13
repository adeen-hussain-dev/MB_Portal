if (!globalThis.WebSocket) globalThis.WebSocket = class {};
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#') || !t.includes('=')) continue;
  const eq = t.indexOf('=');
  env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^"|"$/g, '');
}

async function inspect() {
  const pRes = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/profiles?select=id,full_name,email,role,status', {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY }
  });
  const profiles = await pRes.json();
  console.log('Profiles (' + profiles.length + '):');
  console.table(profiles);

  const tRes = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/tasks?select=id,title,status,assignee_id', {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY }
  });
  const tasks = await tRes.json();
  console.log('Tasks (' + tasks.length + '):');
  console.table(tasks);
}
inspect();
