// Simple test runner for the local auth server
const BASE = process.env.LOCAL_FUNCTIONS_URL || 'http://localhost:54322';
const email = process.env.SUPABASE_TEST_EMAIL || `localtest+${Date.now()}@example.com`;
const password = process.env.SUPABASE_TEST_PASSWORD || 'Testpass123!';

async function call(path, method = 'POST', body = {}) {
  const url = `${BASE}${path.startsWith('/') ? '' : '/'}${path}`.replace('//', '/').replace('http:/', 'http://');
  const res = await fetch(`${BASE}${path}`, {
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
  console.log('Testing local auth server at', BASE);

  console.log('\n1) Signup');
  const signup = await call('/auth/signup', 'POST', { email, password });
  console.log('Signup =>', signup.status, signup.body);

  console.log('\n2) Signin');
  const signin = await call('/auth/signin', 'POST', { email, password });
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

run().catch(err => { console.error('Test failed:', err); process.exit(1); });
