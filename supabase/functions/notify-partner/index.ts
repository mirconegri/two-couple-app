// ---------------------------------------------------------------------------
// notify-partner
//
// Triggered by a Supabase database webhook on `messages` INSERT.
// Sends a *generic* push notification to the other member of the space.
//
// Privacy: the message body is never included. The recipient opens the app to
// read it. A per-user preference could change this later; it must not be the
// default.
//
// Deploy:
//   supabase functions deploy notify-partner --no-verify-jwt
// Then create a webhook in Dashboard → Database → Webhooks:
//   table: messages, events: INSERT, type: Supabase Edge Function
//   function: notify-partner
// ---------------------------------------------------------------------------

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface WebhookRecord {
  id: string;
  couple_id: string;
  sender_id: string;
  body: string;
  deleted_at: string | null;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: WebhookRecord | null;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoResponse {
  data?: ExpoTicket[];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'method not allowed' }, 405);
  }

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return json({ ok: false, error: 'invalid json' }, 400);
  }

  // Only brand-new messages are interesting. A soft delete must not notify.
  if (
    payload.type !== 'INSERT' ||
    payload.table !== 'messages' ||
    !payload.record ||
    payload.record.deleted_at !== null
  ) {
    return json({ ok: true, skipped: 'not a new message' });
  }

  const record = payload.record;

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.45.4');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return json({ ok: false, error: 'server misconfigured' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Every token in this space that does not belong to the sender.
  const { data: tokens, error } = await admin
    .from('push_tokens')
    .select('expo_token')
    .eq('couple_id', record.couple_id)
    .neq('user_id', record.sender_id);

  if (error) {
    console.error('push token lookup failed', error.message);
    return json({ ok: false, error: 'token lookup failed' }, 500);
  }

  if (!tokens || tokens.length === 0) {
    return json({ ok: true, skipped: 'no recipient tokens' });
  }

  const messages = tokens.map((row: { expo_token: string }) => ({
    to: row.expo_token,
    title: 'New message',
    body: 'Open Two to read it',
    data: { type: 'chat', coupleId: record.couple_id },
    priority: 'high',
    channelId: 'messages',
    sound: 'default',
  }));

  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    console.error('expo push request failed', response.status);
    return json({ ok: false, error: 'push request failed' }, 502);
  }

  const result = (await response.json()) as ExpoResponse;

  // A ticket only means Expo accepted the request. Delivery is confirmed
  // later by a receipt, which this function deliberately does not poll.
  const stale: string[] = [];
  (result.data ?? []).forEach((ticket, index) => {
    if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
      const target = messages[index];
      if (target) stale.push(target.to);
    }
  });

  if (stale.length > 0) {
    await admin.from('push_tokens').delete().in('expo_token', stale);
    console.log(`removed ${stale.length} unregistered token(s)`);
  }

  return json({ ok: true, requested: messages.length, stale: stale.length });
});
