import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { SHARE_TYPE, createShareExpiry, createShareToken, isExpired } from '../../shared/onePagerShare.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id } = await req.json();
    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    const accessibleOrganizations = await base44.entities.Organization.filter({ id: organization_id }, '-updated_date', 1);
    const organization = accessibleOrganizations[0] || null;
    if (!organization) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const existingShares = await base44.asServiceRole.entities.OrganizationOnePagerShare.filter({
      organization_id,
      share_type: SHARE_TYPE,
    }, '-updated_date', 10);

    const activeShare = existingShares.find((share) => !isExpired(share.expires_at));
    const origin = req.headers.get('origin') || new URL(req.url).origin;

    if (activeShare) {
      return Response.json({
        token: activeShare.token,
        expires_at: activeShare.expires_at,
        share_url: `${origin}/organization-one-pager?share=${activeShare.token}`,
      });
    }

    const token = createShareToken();
    const expiresAt = createShareExpiry();
    const latestShare = existingShares[0] || null;

    const shareRecord = latestShare
      ? await base44.asServiceRole.entities.OrganizationOnePagerShare.update(latestShare.id, {
          client_id: organization.client_id,
          organization_id: organization.id,
          share_type: SHARE_TYPE,
          token,
          expires_at: expiresAt,
          created_by_user_id: user.id,
        })
      : await base44.asServiceRole.entities.OrganizationOnePagerShare.create({
          client_id: organization.client_id,
          organization_id: organization.id,
          share_type: SHARE_TYPE,
          token,
          expires_at: expiresAt,
          created_by_user_id: user.id,
        });

    return Response.json({
      token: shareRecord.token,
      expires_at: shareRecord.expires_at,
      share_url: `${origin}/organization-one-pager?share=${shareRecord.token}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}