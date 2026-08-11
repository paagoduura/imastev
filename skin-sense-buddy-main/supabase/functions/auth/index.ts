import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '');
    const segments = path.split('/').filter(Boolean);
    const action = segments[segments.length - 1] || '';

    // Helper to parse JSON body
    const parseJson = async () => {
      try {
        return await req.json();
      } catch (e) {
        return {};
      }
    };

    // GET /user - expects Authorization: Bearer <token>
    if (req.method === 'GET' && action === 'user') {
      const authHeader = req.headers.get('authorization') || '';
      const token = authHeader.replace('Bearer ', '');
      if (!token) {
        return new Response(JSON.stringify({ error: 'No token provided' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data, error } = await supabaseClient.auth.getUser(token);
      if (error || !data.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Fetch profile row if exists
      const { data: profile } = await supabaseClient.from('profiles').select('*').eq('user_id', data.user.id).maybeSingle();

      return new Response(JSON.stringify({ user: { ...data.user, profile } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST /signup
    if (req.method === 'POST' && action === 'signup') {
      const body = await parseJson();
      const email = (body.email || '').toString().trim().toLowerCase();
      const password = (body.password || '').toString();

      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Create user via Admin API
      const { data: createdUser, error: createError } = await supabaseClient.auth.admin.createUser({ email, password, email_confirm: true });
      if (createError || !createdUser) {
        console.error('Supabase createUser error:', createError);
        return new Response(JSON.stringify({ error: createError?.message || 'Failed to create user' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Create profile row
      await supabaseClient.from('profiles').insert({ user_id: createdUser.id });

      // Assign default role
      await supabaseClient.from('user_roles').insert({ user_id: createdUser.id, role: 'patient' }).maybeSingle();

      // Try to sign in to produce a session token to return (best-effort)
      const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });

      const token = signInData?.session?.access_token || null;

      return new Response(JSON.stringify({ user: createdUser, token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST /signin
    if (req.method === 'POST' && action === 'signin') {
      const body = await parseJson();
      const email = (body.email || '').toString().trim().toLowerCase();
      const password = (body.password || '').toString();

      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error || !data.session || !data.user) {
        console.error('Signin failed:', error);
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Ensure profile exists
      const { data: profile } = await supabaseClient.from('profiles').select('*').eq('user_id', data.user.id).maybeSingle();

      return new Response(JSON.stringify({ user: data.user, token: data.session.access_token, profile }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST /refresh - validate token and return it again (compatibility)
    if (req.method === 'POST' && action === 'refresh') {
      const authHeader = req.headers.get('authorization') || '';
      const token = authHeader.replace('Bearer ', '');
      if (!token) {
        return new Response(JSON.stringify({ error: 'No token provided' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data, error } = await supabaseClient.auth.getUser(token);
      if (error || !data.user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // For compatibility, return the same token if valid
      return new Response(JSON.stringify({ token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in auth function:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});
