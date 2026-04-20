import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GMAIL_CONNECTOR_ID = "69e6a0603f40a2278282ab3b";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await base44.asServiceRole.connectors.getCurrentAppUserConnection(GMAIL_CONNECTOR_ID);

    return Response.json({
      connected: true,
      record: {
        status: 'connected',
        account_email: connection?.connectionConfig?.email || 'Gmail account connected',
      },
    });
  } catch {
    return Response.json({
      connected: false,
      record: null,
    });
  }
});