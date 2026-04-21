import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return Response.json({ error: 'Google OAuth credentials are missing' }, { status: 500 });
    }

    const records = await base44.asServiceRole.entities.UserIntegration.filter({
      user_id: user.id,
      integration_type: 'gmail',
    });

    const record = records[0] || null;

    if (!record || record.status !== 'connected') {
      return Response.json({
        connected: false,
        record: null,
      });
    }

    return Response.json({
      connected: true,
      record,
    });
  } catch {
    return Response.json({
      connected: false,
      record: null,
    });
  }
});