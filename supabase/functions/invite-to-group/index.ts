// Invites someone to a sales group by email. If they don't have a SalesBell account yet, Supabase
// Auth emails them an invite link; the new account is flagged `invited` so the app asks them to
// pick a name and password before anything else. The group invite itself is created by the
// invite_to_group RPC, called as the requesting user so all its permission checks apply.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  let body: { groupId?: unknown; email?: unknown; redirectTo?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
  const groupId = Number(body.groupId);
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!Number.isInteger(groupId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Enter a valid email address' }, 400);
  }

  const { data: allowed, error: checkError } = await asCaller.rpc('can_manage_group', { p_group_id: groupId });
  if (checkError || !allowed) return json({ error: 'Only the group owner can invite people' }, 403);

  const { data: existing, error: lookupError } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (lookupError) return json({ error: lookupError.message }, 500);

  let inviteeId = existing?.id as string | undefined;
  let status: 'invited' | 'emailed' = 'invited';
  if (!inviteeId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: typeof body.redirectTo === 'string' ? body.redirectTo : undefined,
      data: { invited: true },
    });
    if (error) return json({ error: error.message }, 400);
    inviteeId = data.user.id;
    status = 'emailed';
  }

  const { error: inviteError } = await asCaller.rpc('invite_to_group', { p_group_id: groupId, p_user_id: inviteeId });
  if (inviteError) return json({ error: inviteError.message }, 400);

  return json({ status });
});
