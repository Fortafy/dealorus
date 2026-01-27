import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Fetch the CSV file
    const response = await fetch(file_url);
    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch CSV file' }, { status: 400 });
    }

    const csvText = await response.text();
    
    // Parse CSV
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return Response.json({ error: 'CSV file must have at least a header row and one data row' }, { status: 400 });
    }

    // Get headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    
    // Find column indices
    const orgNameIndex = headers.findIndex(h => 
      h.toLowerCase().includes('organization') || h.toLowerCase().includes('name')
    );
    const stateIndex = headers.findIndex(h => 
      h.toLowerCase().includes('state')
    );

    if (orgNameIndex === -1 || stateIndex === -1) {
      return Response.json({ 
        error: 'CSV must contain columns for organization name and state',
        headers_found: headers
      }, { status: 400 });
    }

    // Parse data rows
    const organizations = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
      const orgName = values[orgNameIndex];
      const state = values[stateIndex];

      if (orgName && state) {
        organizations.push({
          organization_name: orgName,
          state: state
        });
      }
    }

    return Response.json({ 
      status: 'success',
      organizations 
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      status: 'error'
    }, { status: 500 });
  }
});