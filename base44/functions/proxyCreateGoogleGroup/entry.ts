import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const resp = await fetch('https://client-onboarding-fdfc7132.base44.app/functions/createGoogleGroup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return Response.json(await resp.json(), { status: resp.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});