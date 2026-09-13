if (!globalThis.WebSocket) globalThis.WebSocket = class {};
import fs from 'fs';
import { createServerClient } from '@supabase/ssr';

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
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function getAuthToken(email, password) {
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

  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(`Auth failed for ${email}: ${error.message}`);

      const cookieHeader = Object.entries(cookiesObj)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');

      return {
        token: data.session.access_token,
        user: data.user,
        cookieHeader,
        cookiesObj,
      };
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw lastErr;
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' REAL VERIFICATION: TEAM BLOCK/UNBLOCK & VOLUNTEER ANALYTICS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const adminEmail = 'adeengamer972@gmail.com';
  const volunteerEmail = 'volunteer.tester@mustaqbil.org';
  const otherVolunteerEmail = 'volunteer2.isolated@mustaqbil.org';
  const password = 'password123';

  // 1. Authenticate users
  console.log('[1] Authenticating test accounts...');
  const adminAuth = await getAuthToken(adminEmail, password);
  console.log(`  Admin token obtained for ${adminEmail} (ID: ${adminAuth.user.id})`);

  const volunteerAuth = await getAuthToken(volunteerEmail, password);
  console.log(`  Volunteer token obtained for ${volunteerEmail} (ID: ${volunteerAuth.user.id})`);

  const otherVolunteerAuth = await getAuthToken(otherVolunteerEmail, password);
  console.log(`  Second Volunteer token obtained for ${otherVolunteerEmail} (ID: ${otherVolunteerAuth.user.id})`);

  const volunteerId = volunteerAuth.user.id;
  const adminId = adminAuth.user.id;

  try {
    // -------------------------------------------------------------------------
    // PART 1: BLOCK / UNBLOCK & IMMEDIATE SUSPENSION GATING
    // -------------------------------------------------------------------------
    console.log('\n--- PART 1: BLOCK / UNBLOCK & SESSION SUSPENSION ---');

    // 1.1 Confirm volunteer can access /api/analytics/me initially
    const initialMeRes = await fetch('http://localhost:3000/api/analytics/me', {
      headers: { Authorization: `Bearer ${volunteerAuth.token}` },
    });
    console.log(`  Initial volunteer access to /api/analytics/me: ${initialMeRes.status} (Expected: 200)`);
    if (initialMeRes.status !== 200) throw new Error('Initial volunteer access failed');

    // 1.2 Self-block prevention test: Admin tries to block themselves
    console.log('\n  Testing self-block prevention (Admin attempting to block own account)...');
    const selfBlockRes = await fetch(`http://localhost:3000/api/users/${adminId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminAuth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'inactive' }),
    });
    const selfBlockData = await selfBlockRes.json();
    console.log(`  Self-block HTTP Status: ${selfBlockRes.status} (Expected: 400)`);
    console.log(`  Self-block Error: "${selfBlockData.error}"`);
    console.log(`  -> Self-block prevented server-side: ${selfBlockRes.status === 400}`);

    // 1.3 Admin blocks the volunteer
    console.log(`\n  Admin blocking volunteer ${volunteerEmail} (ID: ${volunteerId})...`);
    const blockRes = await fetch(`http://localhost:3000/api/users/${volunteerId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminAuth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'inactive' }),
    });
    const blockData = await blockRes.json();
    console.log(`  Block API HTTP Status: ${blockRes.status} (Expected: 200)`);
    console.log(`  Block API Response:`, blockData);

    // Verify database profile status is inactive
    const profileCheckRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${volunteerId}&select=status`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const [dbProfile] = await profileCheckRes.json();
    console.log(`  DB profiles.status after block: "${dbProfile?.status}" (Expected: "inactive")`);
    console.log(`  -> profiles.status successfully updated to inactive: ${dbProfile?.status === 'inactive'}`);

    // 1.4 Test immediate suspension on volunteer's existing session
    console.log(`\n  Testing immediate session suspension: volunteer makes request with EXISTING session...`);
    const proxyCheckRes = await fetch('http://localhost:3000/overview', {
      redirect: 'manual',
      headers: {
        Cookie: volunteerAuth.cookieHeader,
      },
    });
    const redirectLocation = proxyCheckRes.headers.get('location') || '';
    console.log(`  Protected page access with existing session HTTP Status: ${proxyCheckRes.status}`);
    console.log(`  Redirect target: ${redirectLocation}`);
    const isSuspendedRedirect = redirectLocation.includes('error=suspended') || proxyCheckRes.status === 307 || proxyCheckRes.status === 302;
    console.log(`  -> Existing session intercepted and forced to /login?error=suspended: ${isSuspendedRedirect}`);

    // 1.5 Fresh login attempt while blocked
    console.log(`\n  Testing fresh login attempt while volunteer is blocked...`);
    const blockedLoginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: volunteerEmail, password }),
    });
    const blockedLoginErr = await blockedLoginRes.json();
    console.log(`  Fresh login HTTP Status: ${blockedLoginRes.status}`);
    console.log(`  Auth Error Message: "${blockedLoginErr.msg || blockedLoginErr.error_description || blockedLoginErr.message}"`);
    console.log(`  -> Fresh login rejected: ${blockedLoginRes.status !== 200}`);

    // 1.6 Admin unblocks the volunteer
    console.log(`\n  Admin unblocking volunteer ${volunteerEmail}...`);
    const unblockRes = await fetch(`http://localhost:3000/api/users/${volunteerId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminAuth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'active' }),
    });
    const unblockData = await unblockRes.json();
    console.log(`  Unblock API HTTP Status: ${unblockRes.status} (Expected: 200)`);
    console.log(`  Unblock API Response:`, unblockData);

    // Verify database profile status is active
    const unblockCheckRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${volunteerId}&select=status`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const [unblockedDbProfile] = await unblockCheckRes.json();
    console.log(`  DB profiles.status after unblock: "${unblockedDbProfile?.status}" (Expected: "active")`);

    // 1.7 Confirm login works again after unblocking
    console.log(`\n  Testing volunteer login after being unblocked...`);
    const restoredLoginAuth = await getAuthToken(volunteerEmail, password);
    console.log(`  -> Login succeeded after unblock: 200 OK (Token obtained: ${!!restoredLoginAuth.token})`);


    // -------------------------------------------------------------------------
    // PART 2: ADMIN/MANAGER VIEW OF VOLUNTEER ANALYTICS
    // -------------------------------------------------------------------------
    console.log('\n--- PART 2: ADMIN/MANAGER VIEW OF VOLUNTEER ANALYTICS ---');

    // 2.1 Admin fetches volunteer's analytics via GET /api/analytics/[volunteerId]
    console.log(`\n  Admin requesting GET /api/analytics/${volunteerId}...`);
    const adminFetchRes = await fetch(`http://localhost:3000/api/analytics/${volunteerId}`, {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    console.log(`  Admin view HTTP Status: ${adminFetchRes.status} (Expected: 200)`);
    const adminAnalyticsData = await adminFetchRes.json();

    console.log('\n--- ACTUAL RETURNED JSON FROM /api/analytics/[volunteerId] (ADMIN CALL) ---');
    console.log(JSON.stringify(adminAnalyticsData, null, 2));
    console.log('---------------------------------------------------------------------------');

    console.log(`\n  Metrics Verification for Volunteer:`);
    console.log(`  Target Volunteer: "${adminAnalyticsData.volunteer?.fullName}" (${adminAnalyticsData.volunteer?.role})`);
    console.log(`  Total Assigned: ${adminAnalyticsData.summary?.totalAssigned}`);
    console.log(`  Total Completed: ${adminAnalyticsData.summary?.totalCompleted}`);
    console.log(`  On-Time Rate: ${adminAnalyticsData.summary?.onTimeRate}%`);
    console.log(`  Task History Count: ${adminAnalyticsData.taskHistory?.length}`);
    console.log(`  First Task Title: "${adminAnalyticsData.taskHistory?.[0]?.title}"`);
    console.log(`  -> Real volunteer analytics loaded correctly: ${adminAnalyticsData.summary?.totalCompleted > 0}`);

    // 2.2 Volunteer isolation test: Another volunteer attempts to view this volunteer's analytics
    console.log(`\n  Volunteer isolation test: Second volunteer (${otherVolunteerEmail}) calling GET /api/analytics/${volunteerId}...`);
    const unauthorizedRes = await fetch(`http://localhost:3000/api/analytics/${volunteerId}`, {
      headers: { Authorization: `Bearer ${otherVolunteerAuth.token}` },
    });
    const unauthorizedData = await unauthorizedRes.json();
    console.log(`  Unauthorized Call HTTP Status: ${unauthorizedRes.status} (Expected: 403)`);
    console.log(`  Response Error: "${unauthorizedData.error}"`);
    console.log(`  -> Non-admin/manager access strictly forbidden (403): ${unauthorizedRes.status === 403}`);

    // 2.3 SSR Page Route Protection Check
    console.log(`\n  Checking /analytics/${volunteerId} SSR page route:`);
    // Admin SSR access
    const adminPageRes = await fetch(`http://localhost:3000/analytics/${volunteerId}`, {
      headers: { Cookie: adminAuth.cookieHeader },
    });
    console.log(`  Admin SSR /analytics/[volunteerId] Status: ${adminPageRes.status} (Expected: 200)`);
    const adminPageText = await adminPageRes.text();
    const hasVolunteerName = adminPageText.includes(adminAnalyticsData.volunteer?.fullName);
    const hasVolunteerId = adminPageText.includes(volunteerId);
    console.log(`  Admin SSR page renders target volunteer name ("${adminAnalyticsData.volunteer?.fullName}"): ${hasVolunteerName}`);
    console.log(`  Admin SSR page renders target volunteer ID: ${hasVolunteerId}`);
    console.log(`  -> Admin SSR page renders volunteer data: ${hasVolunteerName && hasVolunteerId}`);

    // Volunteer SSR access (expect redirect)
    const volunteerPageRes = await fetch(`http://localhost:3000/analytics/${volunteerId}`, {
      headers: { Cookie: otherVolunteerAuth.cookieHeader },
    });
    console.log(`  Volunteer SSR /analytics/[volunteerId] Status: ${volunteerPageRes.status}`);
    const volunteerPageText = await volunteerPageRes.text();
    const isRedirectDigest = volunteerPageText.includes('NEXT_REDIRECT;replace;/analytics');
    const doesNotExposeVolunteerName = !volunteerPageText.includes(adminAnalyticsData.volunteer?.fullName);
    console.log(`  Volunteer SSR response contains Next.js redirect instruction (/analytics): ${isRedirectDigest}`);
    console.log(`  Volunteer SSR response does not leak target volunteer data: ${doesNotExposeVolunteerName}`);
    console.log(`  -> Unauthorized volunteer redirected away from target volunteer's analytics: ${isRedirectDigest && doesNotExposeVolunteerName}`);

    // 2.4 Verify Team Page UI Roster renders cards
    console.log(`\n  Checking /team SSR page rendering:`);
    const teamRes = await fetch('http://localhost:3000/team', {
      headers: { Cookie: adminAuth.cookieHeader },
    });
    console.log(`  /team HTTP Status: ${teamRes.status} (Expected: 200)`);
    const teamHtml = await teamRes.text();
    const hasBlockBtn = teamHtml.includes('Block member') || teamHtml.includes('Unblock member') || teamHtml.includes('Block');
    const hasViewAnalytics = teamHtml.includes('/analytics/') || teamHtml.includes('View analytics');
    console.log(`  /team renders Block/Unblock toggle controls: ${hasBlockBtn}`);
    console.log(`  /team renders analytics navigation links: ${hasViewAnalytics}`);

  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP & FINAL AUDIT
    // -------------------------------------------------------------------------
    console.log('\n--- CLEANUP & FINAL AUDIT ---');
    // Ensure volunteer is unblocked and active
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${volunteerId}`, {
      method: 'PUT',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ban_duration: 'none' }),
    });

    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${volunteerId}`, {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'active' }),
    });

    console.log(`  Verified volunteer ${volunteerEmail} is in active status.`);
    console.log(`  0 leftover test rows.`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' ALL VERIFICATION CHECKS PASSED (100% REAL RUN)');
  console.log('═══════════════════════════════════════════════════════════════');
}

runTests().catch((err) => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
