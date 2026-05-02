// Simple test for local Supabase auth Edge Function
// Usage: set SUPABASE_TEST_EMAIL and SUPABASE_TEST_PASSWORD or edit defaults below.

const BASE = process.env.SUPABASE_FUNCTIONS_URL || 'http://localhost:54321/functions/v1';
const email = process.env.SUPABASE_TEST_EMAIL || 'test+auth@example.com';
const password = process.env.SUPABASE_TEST_PASSWORD || 'Testpass123!';

async function call(path, method = 'POST', body = {}) {
  const url = `${BASE}/auth/${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: Object.keys(body).length ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { json = { text }; }
  return { status: res.status, body: json };
}

async function run() {
  console.log('Testing auth function at', BASE);

  console.log('\n1) Signup (may require SUPABASE_SERVICE_ROLE_KEY in emulator env)');
  const signup = await call('signup', 'POST', { email, password });
  console.log('Signup =>', signup.status, signup.body);

  console.log('\n2) Signin');
  const signin = await call('signin', 'POST', { email, password });
  console.log('Signin =>', signin.status, signin.body);

  if (signin.body && signin.body.token) {
    console.log('\n3) User info (using returned token)');
    const token = signin.body.token;
    const userRes = await fetch(`${BASE}/auth/user`, { headers: { Authorization: `Bearer ${token}` } });
    const userText = await userRes.text();
    let userJson = null;
    try { userJson = JSON.parse(userText); } catch (e) { userJson = { text: userText }; }
    console.log('User =>', userRes.status, userJson);
  } else {
    console.log('\nSkipping user info (no token returned)');
  }
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
