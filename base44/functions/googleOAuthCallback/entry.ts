import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const encoder = new TextEncoder();
const STATE_MAX_AGE_MS = 15 * 60 * 1000;

const toBase64Url = (value) =>
  btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const fromBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return atob(normalized + padding);
};

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

const readState = async (rawState) => {
  const parsed = JSON.parse(fromBase64Url(rawState));
  const expectedSignature = await signValue(parsed.payload);

  if (parsed.signature !== expectedSignature) {
    throw new Error('Invalid OAuth state');
  }

  const state = JSON.parse(parsed.payload);
  const createdAt = new Date(state.createdAt).getTime();

  if (!createdAt || Date.now() - createdAt > STATE_MAX_AGE_MS) {
    throw new Error('OAuth state expired');
  }

  return state;
};

const normalizeAppOrigin = (value, fallback) =>
  typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))
    ? value.replace(/\/$/, '')
    : fallback;

const normalizeReturnPath = (value) =>
  typeof value === 'string' && value.startsWith('/') ? value : '/Settings?section=connected-apps';

const buildRedirectUrl = (origin, returnPath, status, message) => {
  const redirectUrl = new URL(normalizeReturnPath(returnPath), origin);
  redirectUrl.searchParams.set('google_oauth', status);

  if (message) {
    redirectUrl.searchParams.set('message', message);
  }

  return redirectUrl.toString();
};

Deno.serve(async (req) => {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const rawState = requestUrl.searchParams.get('state');
  const oauthError = requestUrl.searchParams.get('error');

  let state = null;
  let appOrigin = requestUrl.origin;
  let returnPath = '/Settings?section=connected-apps';

  if (rawState) {
    try {
      state = await readState(rawState);
      appOrigin = normalizeAppOrigin(state.appOrigin, appOrigin);
      returnPath = normalizeReturnPath(state.returnPath);
    } catch (error) {
      const redirectUrl = buildRedirectUrl(appOrigin, returnPath, 'error', error.message || 'Google connection failed.');
      return Response.redirect(redirectUrl, 302);
    }
  }

  try {
    if (oauthError) {
      const redirectUrl = buildRedirectUrl(appOrigin, returnPath, 'error', 'Google authorization was cancelled.');
      return Response.redirect(redirectUrl, 302);
    }

    if (!code || !state) {
      const redirectUrl = buildRedirectUrl(appOrigin, returnPath, 'error', 'Missing Google authorization data.');
      return Response.redirect(redirectUrl, 302);
    }

    const base44 = createClientFromRequest(req);
    const redirectUri = `${appOrigin}/functions/googleOAuthCallback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const details = await tokenResponse.text();
      throw new Error(details || 'Failed to exchange Google authorization code');
    }

    const tokenData = await tokenResponse.json();
    const scopes = (tokenData.scope || '').split(' ').filter(Boolean);
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString()
      : null;

    let profile = { email: null, name: null };
    if (tokenData.access_token) {
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        profile = {
          email: profileData.email || null,
          name: profileData.name || null,
        };
      }
    }

    const existingRecords = await base44.asServiceRole.entities.UserIntegration.filter({
      user_id: state.userId,
      integration_type: state.integrationType,
    });
    const existingRecord = existingRecords[0] || null;

    const payload = {
      user_id: state.userId,
      provider: 'google',
      integration_type: state.integrationType,
      status: 'connected',
      access_token: tokenData.access_token || null,
      refresh_token: tokenData.refresh_token || existingRecord?.refresh_token || null,
      expires_at: expiresAt,
      scopes,
      account_email: profile.email || existingRecord?.account_email || null,
      account_name: profile.name || existingRecord?.account_name || null,
      error_message: null,
      metadata: {
        token_type: tokenData.token_type || null,
        scope_count: scopes.length,
      },
    };

    if (existingRecord) {
      await base44.asServiceRole.entities.UserIntegration.update(existingRecord.id, payload);
    } else {
      await base44.asServiceRole.entities.UserIntegration.create(payload);
    }

    const redirectUrl = buildRedirectUrl(appOrigin, returnPath, 'success', 'Google account connected successfully.');
    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    const redirectUrl = buildRedirectUrl(appOrigin, returnPath, 'error', error.message || 'Google connection failed.');
    return Response.redirect(redirectUrl, 302);
  }
});