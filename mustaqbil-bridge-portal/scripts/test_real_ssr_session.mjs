import fs from 'fs';
import WebSocket from 'ws';
import { createServerClient } from '@supabase/ssr';

globalThis.WebSocket = WebSocket;

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const eqIdx = trimmed.indexOf('=');
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  env[key] = val;
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE_URL = 'http://localhost:3000';

async function main() {
  // 1. Authenticate with Supabase client to get genuine cookies
  let cookiesObj = {};
  const supabase = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll: () => Object.entries(cookiesObj).map(([name, value]) => ({ name, value })),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => {
          cookiesObj[name] = value;
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'adeengamer972@gmail.com',
    password: 'password123',
  });

  if (error) {
    console.error('Sign in error:', error);
    process.exit(1);
  }

  console.log('✓ Logged in as:', data.user.email);
  const cookieHeader = Object.entries(cookiesObj)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  console.log('✓ Generated cookies:', Object.keys(cookiesObj));

  // 2. Fetch /overview
  const overviewRes = await fetch(`${SITE_URL}/overview`, {
    headers: {
      Cookie: cookieHeader,
    },
  });
  console.log('✓ /overview HTTP Status:', overviewRes.status);
  const overviewText = await overviewRes.text();
  console.log('✓ Has "Management overview":', overviewText.includes('Management overview'));
  console.log('✓ Has "Branch Operations & Volunteer Analytics":', overviewText.includes('Branch Operations & Volunteer Analytics'));
  console.log('✓ Has status counts (To do, In progress, In review, Changes requested, Done):',
    overviewText.includes('To do') &&
    overviewText.includes('In progress') &&
    overviewText.includes('In review') &&
    overviewText.includes('Changes requested') &&
    overviewText.includes('Done')
  );
  console.log('✓ Has "Tasks Completed This Month":', overviewText.includes('Tasks Completed This Month'));
  console.log('✓ Has "Top Volunteers This Month":', overviewText.includes('Top Volunteers This Month'));
  console.log('✓ Has "Past Winners":', overviewText.includes('Past Winners'));
  console.log('✓ Sidebar link href="/overview":', overviewText.includes('href="/overview"'));
  console.log('✓ Sidebar logo uses /MB_Logo.svg:', overviewText.includes('/MB_Logo.svg'));
  console.log('✓ Does NOT contain public landing page text:', !overviewText.includes('A clear bridge from assigned work'));

  // 3. Fetch / (landing page) with authenticated session -> should redirect to /overview
  const rootRes = await fetch(`${SITE_URL}/`, {
    headers: {
      Cookie: cookieHeader,
    },
    redirect: 'manual',
  });
  console.log('✓ GET / (root with authenticated user) HTTP Status:', rootRes.status);
  console.log('✓ Redirect destination:', rootRes.headers.get('location'));
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
