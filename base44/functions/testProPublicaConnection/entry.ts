import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.role === 'admin' || user?.data?.client_role === 'admin';
    if (!isAdmin) {
      return Response.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    await req.json().catch(() => ({}));

    const response = await fetch('https://projects.propublica.org/nonprofits/api/v2/search.json?q=american%20red%20cross');

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ success: false, error: errorText || `ProPublica test failed with status ${response.status}.` }, { status: 400 });
    }

    const result = await response.json();
    const orgName = result?.organizations?.[0]?.name || 'a nonprofit result';

    return Response.json({
      success: true,
      message: `ProPublica connected successfully. Test search returned ${orgName}.`,
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Failed to test ProPublica connection' }, { status: 500 });
  }
});