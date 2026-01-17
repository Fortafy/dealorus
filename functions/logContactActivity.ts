import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contact_id, action, description, fields_changed } = await req.json();

    if (!contact_id || !action || !description) {
      return Response.json(
        { error: 'Missing required fields: contact_id, action, description' },
        { status: 400 }
      );
    }

    const activity = await base44.entities.Activity.create({
      contact_id,
      action,
      description,
      fields_changed: fields_changed || []
    });

    return Response.json({ success: true, activity });
  } catch (error) {
    console.error('Error logging contact activity:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});