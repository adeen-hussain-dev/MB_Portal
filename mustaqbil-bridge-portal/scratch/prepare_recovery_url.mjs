import tls from 'tls';
import fs from 'fs';

const envContent = fs.readFileSync('c:/Users/USER/Documents/MB_Portal/mustaqbil-bridge-portal/.env.local', 'utf-8');
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
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SMTP_USER = env.SMTP_USER;
const SMTP_PASS = env.SMTP_PASS;

const TEST_EMAIL = SMTP_USER;
const OLD_PASSWORD = 'oldPassword123!Test';

async function fetchLatestRecoveryEmail() {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(993, 'imap.gmail.com', { rejectUnauthorized: false });
    socket.setEncoding('utf8');
    let buffer = '';
    let step = 0;
    let found = null;

    const timeout = setTimeout(() => {
      socket.end();
      reject(new Error('IMAP timeout'));
    }, 25000);

    socket.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\r\n');
      for (const line of lines) {
        if (line.startsWith('* OK') && step === 0) {
          step = 1;
          socket.write(`A1 LOGIN "${SMTP_USER}" "${SMTP_PASS}"\r\n`);
          break;
        } else if (line.startsWith('A1 OK') && step === 1) {
          step = 2;
          socket.write('A2 SELECT "INBOX"\r\n');
          break;
        } else if (line.startsWith('A2 OK') && step === 2) {
          step = 3;
          buffer = '';
          socket.write('A3 SEARCH ALL\r\n');
          break;
        } else if (line.startsWith('A3 OK') && step === 3) {
          step = 4;
          const searchLine = lines.find((l) => l.startsWith('* SEARCH'));
          const uids = searchLine ? searchLine.replace('* SEARCH', '').trim().split(/\s+/).filter(Boolean) : [];
          if (uids.length === 0) {
            socket.write('A5 LOGOUT\r\n');
            break;
          }
          const lastUid = uids[uids.length - 1];
          buffer = '';
          socket.write(`A4 FETCH ${lastUid} (BODY[])\r\n`);
          break;
        } else if (line.startsWith('A4 OK') && step === 4) {
          step = 5;
          found = buffer;
          socket.write('A5 LOGOUT\r\n');
          break;
        } else if (line.startsWith('A5 OK') && step === 5) {
          clearTimeout(timeout);
          socket.end();
          resolve(found);
          break;
        }
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function main() {
  console.log('--- Step 1: Ensure test volunteer user exists ---');
  const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  const { users } = await listRes.json();
  let user = users.find((u) => u.email === TEST_EMAIL);

  if (user) {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: OLD_PASSWORD }),
    });
    console.log(`User ${user.id} password set to: ${OLD_PASSWORD}`);
  } else {
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: OLD_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: 'Test Volunteer' },
      }),
    });
    user = await createRes.json();
    console.log(`Created user ${user.id}`);
  }

  // Ensure volunteer role in profiles
  await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: user.id,
      email: TEST_EMAIL,
      full_name: 'Test Volunteer',
      role: 'volunteer',
    }),
  });

  console.log('\n--- Step 2: Confirm login works with OLD_PASSWORD ---');
  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: OLD_PASSWORD }),
  });
  console.log('Login status with old password:', loginRes.status);
  if (!loginRes.ok) throw new Error('Initial login failed');

  console.log('\n--- Step 3: Trigger password reset via POST /api/auth/reset-password ---');
  const resetRes = await fetch('http://localhost:3000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL }),
  });
  console.log('Reset-password API status:', resetRes.status);
  if (!resetRes.ok) throw new Error('Failed to request reset');

  console.log('\n--- Step 4: Poll Gmail INBOX for new email ---');
  let emailBody = null;
  for (let i = 1; i <= 8; i++) {
    console.log(`Polling attempt ${i}...`);
    try {
      const b = await fetchLatestRecoveryEmail();
      if (b && (b.includes('Reset your password') || b.includes('verify?token='))) {
        emailBody = b;
        console.log('Found recovery email!');
        break;
      }
    } catch (e) {
      console.log('Polling notice:', e.message);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  if (!emailBody) throw new Error('Email not found in inbox');

  const decoded = emailBody.replace(/=\r?\n/g, '').replace(/=3D/gi, '=').replace(/&amp;/gi, '&');
  const hrefMatch = decoded.match(/href="([^"]+auth\/v1\/verify[^"]+)"/i) || decoded.match(/(https?:\/\/[^\s"<>]+verify[^\s"<>]+)/i);
  if (!hrefMatch) throw new Error('Verify URL not found in email');

  const verifyUrl = hrefMatch[1];
  console.log('\nVERIFY_URL_EXTRACTED: ' + verifyUrl);

  // Write URL to a local text file so tools/subagents can read it
  fs.writeFileSync('scratch/latest_recovery_url.txt', verifyUrl, 'utf-8');
}

main().catch(console.error);
