import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from 'base44:runtime';
import { SHARE_TYPE, isExpired } from '../../shared/onePagerShare.ts';

function pickOrganizationData(organization) {
  return {
    id: organization.id,
    organization_name: organization.organization_name,
    organization_type: organization.organization_type,
    state: organization.state,
    mission: organization.mission,
    website: organization.website,
    email: organization.email,
    phone: organization.phone,
    address: organization.address,
    city: organization.city,
    zip_code: organization.zip_code,
    annual_revenue: organization.annual_revenue,
    ein: organization.ein,
  };
}

function pickContactData(contact) {
  if (!contact) return null;
  return {
    id: contact.id,
    name: contact.name,
    title: contact.title,
    role_department: contact.role_department,
    email: contact.email,
    phone: contact.phone,
    linkedin: contact.linkedin,
    source: contact.source,
  };
}

function findTaggedContact(contacts, labels, tagName) {
  const tag = labels.find((label) => label.name?.toLowerCase() === tagName.toLowerCase());
  if (!tag) return null;
  return contacts.find((contact) => (contact.label_ids || []).includes(tag.id)) || null;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'token is required' }, { status: 400 });
    }

    const shares = await base44.asServiceRole.entities.OrganizationOnePagerShare.filter({
      token,
      share_type: SHARE_TYPE,
    }, '-updated_date', 1);
    const share = shares[0] || null;

    if (!share) {
      return Response.json({ error: 'Share link not found' }, { status: 404 });
    }

    if (isExpired(share.expires_at)) {
      return Response.json({ error: 'This one-pager link has expired' }, { status: 410 });
    }

    const organization = await base44.asServiceRole.entities.Organization.get(share.organization_id);
    if (!organization || organization.client_id !== share.client_id) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const contacts = await base44.asServiceRole.entities.Contact.filter({
      organization_id: organization.id,
      client_id: organization.client_id,
    }, 'name', 200);
    const labels = await base44.asServiceRole.entities.Label.filter({
      client_id: organization.client_id,
    }, 'name', 200);

    const primaryContact = findTaggedContact(contacts, labels, 'Primary');
    const decisionMakerContact = findTaggedContact(contacts, labels, 'Decision Maker');

    waitUntil(
      base44.asServiceRole.entities.OrganizationOnePagerShare.update(share.id, {
        last_accessed_at: new Date().toISOString(),
      })
    );

    return Response.json({
      organization: pickOrganizationData(organization),
      primary_contact: pickContactData(primaryContact),
      decision_maker_contact: pickContactData(decisionMakerContact),
      expires_at: share.expires_at,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}