import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const EXCLUDED_FIELDS = new Set(['updated_date', 'last_modified']);

const normalizeValue = (value) => {
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => item == null ? null : String(item).trim())
      .filter(Boolean);
    return cleaned.length ? cleaned : null;
  }

  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  return value;
};

const valuesMatch = (left, right) => JSON.stringify(normalizeValue(left)) === JSON.stringify(normalizeValue(right));

const formatValue = (value) => {
  const normalized = normalizeValue(value);

  if (normalized == null) return null;
  if (Array.isArray(normalized)) return normalized.join(', ');
  if (typeof normalized === 'object') return JSON.stringify(normalized);
  return String(normalized);
};

const formatFieldName = (field) => field
  .split('_')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const buildDescription = (fieldsChanged) => fieldsChanged
  .map((change) => `${formatFieldName(change.field)}: ${change.old_value ?? 'empty'} → ${change.new_value ?? 'empty'}`)
  .join(' • ');

const buildFieldsChanged = (oldData = {}, newData = {}, changedFields = []) => {
  const fieldsToCheck = (changedFields.length ? changedFields : Object.keys(newData))
    .filter((field) => !EXCLUDED_FIELDS.has(field));

  return fieldsToCheck
    .map((field) => ({
      field,
      old_value: formatValue(oldData[field]),
      new_value: formatValue(newData[field]),
    }))
    .filter((change) => !valuesMatch(change.old_value, change.new_value));
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    if (payload?.event?.type === 'update' && payload?.event?.entity_name === 'Contact') {
      const contact = payload.data;
      const previousContact = payload.old_data || {};
      const fieldsChanged = buildFieldsChanged(previousContact, contact, payload.changed_fields || []);

      if (!contact?.id || !contact?.client_id || fieldsChanged.length === 0) {
        return Response.json({ success: true, skipped: true });
      }

      const activityData = {
        client_id: contact.client_id,
        contact_id: contact.id,
        action: 'edit',
        description: buildDescription(fieldsChanged),
        fields_changed: fieldsChanged,
      };

      if (contact.organization_id) {
        activityData.organization_id = contact.organization_id;
      }

      const activity = await base44.asServiceRole.entities.Activity.create(activityData);
      return Response.json({ success: true, activity });
    }

    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      client_id,
      organization_id,
      contact_id,
      action,
      description,
      fields_changed = [],
    } = payload;

    if (!client_id || !contact_id || !action || (!description && fields_changed.length === 0)) {
      return Response.json(
        { error: 'Missing required fields: client_id, contact_id, action, and description or fields_changed' },
        { status: 400 }
      );
    }

    const activityData = {
      client_id,
      contact_id,
      action,
      description: description || buildDescription(fields_changed),
      fields_changed,
    };

    if (organization_id) {
      activityData.organization_id = organization_id;
    }

    const activity = await base44.entities.Activity.create(activityData);
    return Response.json({ success: true, activity });
  } catch (error) {
    console.error('Error logging contact activity:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});