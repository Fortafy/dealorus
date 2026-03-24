import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const encoder = new TextEncoder();
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_SCOPES = {
  google_drive: [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
  ],
  google_calendar: [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/calendar.readonly',
  ],
};

const toBase64Url = (value) =>
  btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const signValue = async (value) => {
  const secret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  const bytes = Array.from(new Uint8Array(signature));
  return toBase64Url(String.fromCharCode(...bytes));
};

const buildState = async (payload) => {
  const rawPayload = JSON.stringify(payload);
  const signature = await signValue(rawPayload);
  return toBase64Url(JSON.stringify({ payload: rawPayload, signature }));
};

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return Response.json({ error: 'Google OAuth credentials are missing' }, { status: 500 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const integrationType = body?.integrationType;

    if (!GOOGLE_SCOPES[integrationType]) {
      return Response.json({ error: 'Unsupported Google integration type' }, { status: 400 });
    }

    const requestUrl = new URL(req.url);
    const appOrigin = typeof body?.appOrigin === 'string' ? body.appOrigin.trim() : '';
    const redirectBase = appOrigin.startsWith('http://') || appOrigin.startsWith('https://')
      ? appOrigin.replace(/\/$/, '')
      : requestUrl.origin;
    const redirectUri = `${redirectBase}/functions/googleOAuthCallback`;
    const state = await buildState({
      userId: user.id,
      integrationType,
      returnPath: '/Settings?section=connected-apps',
      createdAt: new Date().toISOString(),
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      scope: GOOGLE_SCOPES[integrationType].join(' '),
      state,
    });

    return Response.json({ authUrl: `${GOOGLE_AUTH_URL}?${params.toString()}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});