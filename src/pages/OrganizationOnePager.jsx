import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Globe, Landmark, Mail, MapPin, Phone } from "lucide-react";
import { base44 } from "@/api/base44Client";
import OnePagerContactCard from "@/components/organizations/OnePagerContactCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDataSourceLinks } from "@/components/utils/dataSourceLinks";

const ONE_PAGER_LINKS = ["ProPublica Nonprofit Explorer", "GuideStar/Candid", "Official Website"];

export default function OrganizationOnePager() {
  const urlParams = new URLSearchParams(window.location.search);
  const organizationId = urlParams.get("id");
  const shareToken = urlParams.get("share");
  const isPublicShare = !!shareToken;

  const { data: publicShareData, isLoading: isLoadingPublicShare, error: publicShareError } = useQuery({
    queryKey: ["public-organization-one-pager", shareToken],
    queryFn: async () => {
      const response = await base44.functions.invoke("getPublicOrganizationOnePager", { token: shareToken });
      return response.data;
    },
    enabled: isPublicShare,
    retry: false,
  });

  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    enabled: !isPublicShare,
  });

  const activeClientId = currentUser?.data?.client_id || currentUser?.client_id || null;

  const { data: organization, isLoading: isLoadingOrganization } = useQuery({
    queryKey: ["organization-one-pager", organizationId, activeClientId],
    queryFn: async () => {
      const results = await base44.entities.Organization.filter({ id: organizationId, client_id: activeClientId });
      return results[0] || null;
    },
    enabled: !isPublicShare && !!organizationId && !!activeClientId,
  });

  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ["organization-one-pager-contacts", organizationId, activeClientId],
    queryFn: () => base44.entities.Contact.filter({ organization_id: organizationId, client_id: activeClientId }, "name"),
    enabled: !isPublicShare && !!organizationId && !!activeClientId,
  });

  const { data: labels = [], isLoading: isLoadingLabels } = useQuery({
    queryKey: ["organization-one-pager-labels", activeClientId],
    queryFn: () => base44.entities.Label.filter({ client_id: activeClientId }, "name"),
    enabled: !isPublicShare && !!activeClientId,
  });

  const pageOrganization = isPublicShare ? publicShareData?.organization : organization;
  const primaryContact = isPublicShare
    ? publicShareData?.primary_contact || null
    : findTaggedContact(contacts, labels, "Primary");
  const decisionMakerContact = isPublicShare
    ? publicShareData?.decision_maker_contact || null
    : findTaggedContact(contacts, labels, "Decision Maker");
  const expiresAt = publicShareData?.expires_at || null;
  const links = pageOrganization ? getDataSourceLinks(pageOrganization).filter((link) => ONE_PAGER_LINKS.includes(link.name)) : [];

  if (isLoadingPublicShare || isLoadingUser || isLoadingOrganization || isLoadingContacts || isLoadingLabels) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
      </div>
    );
  }

  if (!pageOrganization) {
    const errorMessage = publicShareError?.response?.data?.error || publicShareError?.message || "This one-pager link does not have a matching organization.";
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">{isPublicShare ? "One-pager link unavailable" : "Organization not found"}</p>
          <p className="mt-2 text-sm text-slate-500">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {isPublicShare ? (
            <div className="text-sm text-slate-500">Shared organization one-pager</div>
          ) : (
            <Button asChild variant="outline" className="gap-2 bg-white">
              <Link to={`/Organizations?id=${pageOrganization.id}`}>
                <ArrowLeft className="h-4 w-4" />
                Back to organization
              </Link>
            </Button>
          )}
          <div className="text-sm text-slate-500">Organization one-pager</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                {pageOrganization.organization_type ? <Badge variant="secondary">{pageOrganization.organization_type}</Badge> : null}
                {pageOrganization.state ? <Badge variant="outline">{pageOrganization.state}</Badge> : null}
                {isPublicShare && expiresAt ? <Badge variant="outline">Valid until {formatDate(expiresAt)}</Badge> : null}
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{pageOrganization.organization_name}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                {pageOrganization.mission || "No mission has been added for this organization yet."}
              </p>
            </div>

            <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:w-[360px] lg:grid-cols-1">
              {pageOrganization.website ? <InfoLink icon={Globe} href={pageOrganization.website.startsWith("http") ? pageOrganization.website : `https://${pageOrganization.website}`} label={pageOrganization.website} /> : null}
              {pageOrganization.email ? <InfoLink icon={Mail} href={`mailto:${pageOrganization.email}`} label={pageOrganization.email} /> : null}
              {pageOrganization.phone ? <InfoLink icon={Phone} href={`tel:${pageOrganization.phone}`} label={pageOrganization.phone} /> : null}
              {(pageOrganization.address || pageOrganization.city || pageOrganization.state) ? <InfoText icon={MapPin} label={[pageOrganization.address, pageOrganization.city, [pageOrganization.state, pageOrganization.zip_code].filter(Boolean).join(" ")].filter(Boolean).join(", ")} /> : null}
              {pageOrganization.annual_revenue ? <InfoText icon={Landmark} label={`Annual revenue: ${pageOrganization.annual_revenue}`} /> : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {links.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {formatLinkLabel(link.name)}
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </a>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <OnePagerContactCard title="Primary Contact" contact={primaryContact} />
          <OnePagerContactCard title="Decision Maker" contact={decisionMakerContact} />
        </div>
      </div>
    </div>
  );
}

function InfoLink({ icon: Icon, href, label }) {
  return (
    <a href={href} target={href.startsWith("mailto:") || href.startsWith("tel:") ? undefined : "_blank"} rel="noopener noreferrer" className="flex items-center gap-2 hover:text-blue-600">
      <Icon className="h-4 w-4 text-slate-400" />
      <span>{label}</span>
    </a>
  );
}

function InfoText({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-slate-400" />
      <span>{label}</span>
    </div>
  );
}

function findTaggedContact(contacts, labels, tagName) {
  const tag = labels.find((label) => label.name?.toLowerCase() === tagName.toLowerCase());
  if (!tag) return null;
  return contacts.find((contact) => (contact.label_ids || []).includes(tag.id)) || null;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLinkLabel(name) {
  if (name === "GuideStar/Candid") return "GuideStar";
  if (name === "Official Website") return "Website";
  if (name === "ProPublica Nonprofit Explorer") return "ProPublica";
  return name;
}