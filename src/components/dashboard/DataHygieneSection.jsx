import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, RefreshCw, Search } from "lucide-react";
import { getNTEEDescription } from "@/components/utils/nteeCodeLookup";
import DataHygieneTable from "@/components/dashboard/data-hygiene/DataHygieneTable";
import ToolCard from "@/components/dashboard/data-hygiene/ToolCard";
import { buildContactDuplicateRows, normalizePhone, normalizeState, normalizeWebsite } from "@/lib/dataHygiene";

const badgeCell = (value) => <Badge variant="secondary">{value}</Badge>;

const organizationDuplicateColumns = [
  { key: "primary_organization", label: "Primary Organization", width: 220 },
  { key: "location", label: "Location", width: 180 },
  { key: "duplicate_count", label: "Duplicates", width: 110, render: (row) => badgeCell(row.duplicate_count) },
  { key: "match_reasons", label: "Match Rules", width: 220 },
  { key: "duplicates", label: "Matched Records", width: 360 },
];

const contactDuplicateColumns = [
  { key: "match_type", label: "Match Type", width: 120, render: (row) => badgeCell(row.match_type) },
  { key: "match_value", label: "Match Value", width: 200 },
  { key: "record_count", label: "Records", width: 110, render: (row) => badgeCell(row.record_count) },
  { key: "contacts", label: "Matched Contacts", width: 480 },
];

const stateColumns = [
  { key: "organization_name", label: "Organization", width: 260 },
  { key: "current_state", label: "Current State", width: 160 },
  { key: "normalized_state", label: "Normalized State", width: 180, render: (row) => badgeCell(row.normalized_state) },
];

const phoneColumns = [
  { key: "entity_type", label: "Record Type", width: 120, render: (row) => badgeCell(row.entity_type) },
  { key: "record_name", label: "Record", width: 240 },
  { key: "current_phone", label: "Current Phone", width: 220 },
  { key: "normalized_phone", label: "Normalized Phone", width: 220 },
];

const websiteColumns = [
  { key: "organization_name", label: "Organization", width: 260 },
  { key: "current_website", label: "Current Website", width: 320 },
  { key: "normalized_website", label: "Standardized Website", width: 320 },
];

const nteeColumns = [
  { key: "organization_name", label: "Organization", width: 260 },
  { key: "current_code", label: "Current NTEE", width: 140 },
  { key: "issue", label: "Issue", width: 240 },
];

export default function DataHygieneSection({ clientId }) {
  const queryClient = useQueryClient();
  const [organizationDuplicateRows, setOrganizationDuplicateRows] = useState([]);
  const [contactDuplicateRows, setContactDuplicateRows] = useState([]);
  const [stateRows, setStateRows] = useState([]);
  const [phoneRows, setPhoneRows] = useState([]);
  const [websiteRows, setWebsiteRows] = useState([]);
  const [nteeRows, setNteeRows] = useState([]);
  const [hasRun, setHasRun] = useState({ org: false, contact: false, state: false, phone: false, website: false, ntee: false });

  const { data: organizations = [], isLoading: isLoadingOrganizations } = useQuery({
    queryKey: ["organizations", clientId],
    enabled: !!clientId,
    queryFn: () => base44.entities.Organization.filter({ client_id: clientId }, "-created_date"),
  });

  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ["contacts", clientId],
    enabled: !!clientId,
    queryFn: () => base44.entities.Contact.filter({ client_id: clientId }, "-created_date"),
  });

  const statePreviewRows = useMemo(() => organizations
    .map((organization) => {
      const normalizedState = normalizeState(organization.state);
      if (!normalizedState || normalizedState === organization.state) return null;
      return {
        id: organization.id,
        organization_name: organization.organization_name,
        current_state: organization.state,
        normalized_state: normalizedState,
      };
    })
    .filter(Boolean), [organizations]);

  const phonePreviewRows = useMemo(() => ([
    ...organizations.map((organization) => {
      const normalizedPhone = normalizePhone(organization.phone);
      if (!normalizedPhone || normalizedPhone === organization.phone) return null;
      return {
        id: organization.id,
        entity_type: "Organization",
        record_name: organization.organization_name,
        current_phone: organization.phone,
        normalized_phone: normalizedPhone,
      };
    }),
    ...contacts.map((contact) => {
      const normalizedPhone = normalizePhone(contact.phone);
      if (!normalizedPhone || normalizedPhone === contact.phone) return null;
      return {
        id: contact.id,
        entity_type: "Contact",
        record_name: contact.name,
        current_phone: contact.phone,
        normalized_phone: normalizedPhone,
      };
    }),
  ].filter(Boolean)), [organizations, contacts]);

  const websitePreviewRows = useMemo(() => organizations
    .map((organization) => {
      const normalizedWebsite = normalizeWebsite(organization.website);
      if (!normalizedWebsite || normalizedWebsite === organization.website) return null;
      return {
        id: organization.id,
        organization_name: organization.organization_name,
        current_website: organization.website,
        normalized_website: normalizedWebsite,
      };
    })
    .filter(Boolean), [organizations]);

  const nteePreviewRows = useMemo(() => organizations
    .map((organization) => {
      const currentCode = organization.ntee_code?.trim().toUpperCase();
      if (!currentCode || getNTEEDescription(currentCode)) return null;
      return {
        id: organization.id,
        organization_name: organization.organization_name,
        current_code: currentCode,
        issue: "Not found in the NTEE code list",
      };
    })
    .filter(Boolean), [organizations]);

  const contactDuplicatePreviewRows = useMemo(() => buildContactDuplicateRows(contacts), [contacts]);

  const organizationDuplicateSearch = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("findDuplicates", { client_id: clientId });
      return response.data?.duplicateGroups || [];
    },
    onSuccess: (groups) => {
      setHasRun((current) => ({ ...current, org: true }));
      setOrganizationDuplicateRows(groups.map((group, index) => ({
        id: group.primary?.id || `group-${index}`,
        primary_organization: group.primary?.organization_name || "—",
        location: [group.primary?.city, group.primary?.state].filter(Boolean).join(", ") || "—",
        duplicate_count: group.duplicates?.length || 0,
        match_reasons: [...new Set((group.duplicates || []).flatMap((item) => item.matchReasons || []))].join(", ") || "—",
        duplicates: (group.duplicates || []).map((item) => item.organization?.organization_name || "Unnamed").join(", "),
      })));
    },
    onError: () => {
      setHasRun((current) => ({ ...current, org: true }));
      setOrganizationDuplicateRows([]);
    },
  });

  const applyStateNormalization = useMutation({
    mutationFn: (rows) => Promise.all(rows.map((row) => base44.entities.Organization.update(row.id, { state: row.normalized_state }))),
    onSuccess: () => {
      setStateRows([]);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  const applyPhoneNormalization = useMutation({
    mutationFn: (rows) => Promise.all(rows.map((row) => row.entity_type === "Organization"
      ? base44.entities.Organization.update(row.id, { phone: row.normalized_phone })
      : base44.entities.Contact.update(row.id, { phone: row.normalized_phone }))),
    onSuccess: () => {
      setPhoneRows([]);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const applyWebsiteNormalization = useMutation({
    mutationFn: (rows) => Promise.all(rows.map((row) => base44.entities.Organization.update(row.id, { website: row.normalized_website }))),
    onSuccess: () => {
      setWebsiteRows([]);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  if (isLoadingOrganizations || isLoadingContacts) {
    return (
      <div className="settings-page">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-section-header">
        <h1 className="settings-page-title">Data Hygiene</h1>
        <p className="settings-card-description">Run duplicate scans and batch-clean key fields without leaving the dashboard.</p>
      </div>

      <div className="settings-stack">
        <ToolCard
          title="1. Duplicate Organization Search"
          description="Runs the existing organization duplicate rules and lists matching groups for review."
          actions={<Button onClick={() => organizationDuplicateSearch.mutate()} disabled={organizationDuplicateSearch.isPending}><Search className="h-4 w-4" />{organizationDuplicateSearch.isPending ? "Running..." : "Run search"}</Button>}
        >
          {organizationDuplicateSearch.isError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{organizationDuplicateSearch.error?.message || "Unable to run duplicate search."}</div>}
          {hasRun.org && organizationDuplicateRows.length === 0 && !organizationDuplicateSearch.isError && <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">No duplicate organization groups found.</div>}
          {organizationDuplicateRows.length > 0 && <><Badge variant="secondary">{organizationDuplicateRows.length} groups found</Badge><DataHygieneTable columns={organizationDuplicateColumns} rows={organizationDuplicateRows} /></>}
        </ToolCard>

        <ToolCard
          title="2. Duplicate Contact Search"
          description="Finds possible duplicate contacts using matching email addresses and matching last names."
          actions={<Button variant="outline" onClick={() => { setHasRun((current) => ({ ...current, contact: true })); setContactDuplicateRows(contactDuplicatePreviewRows); }}><Search className="h-4 w-4" />Run search</Button>}
        >
          {hasRun.contact && contactDuplicateRows.length === 0 && <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">No duplicate contact matches found.</div>}
          {contactDuplicateRows.length > 0 && <><Badge variant="secondary">{contactDuplicateRows.length} match groups found</Badge><DataHygieneTable columns={contactDuplicateColumns} rows={contactDuplicateRows} /></>}
        </ToolCard>

        <ToolCard
          title="3. Normalize State Values"
          description="Previews organization records that can be converted to a standard two-letter state code."
          actions={<><Button variant="outline" onClick={() => { applyStateNormalization.reset(); setHasRun((current) => ({ ...current, state: true })); setStateRows(statePreviewRows); }}><Search className="h-4 w-4" />Scan</Button><Button onClick={() => applyStateNormalization.mutate(stateRows)} disabled={applyStateNormalization.isPending || stateRows.length === 0}><RefreshCw className="h-4 w-4" />{applyStateNormalization.isPending ? "Applying..." : "Apply updates"}</Button></>}
        >
          {applyStateNormalization.isSuccess && <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700"><CheckCircle2 className="mr-1 inline h-4 w-4" />State values updated.</div>}
          {applyStateNormalization.isError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{applyStateNormalization.error?.message || "Unable to update state values."}</div>}
          {hasRun.state && stateRows.length === 0 && <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">No state values need normalization.</div>}
          {stateRows.length > 0 && <><Badge variant="secondary">{stateRows.length} records ready</Badge><DataHygieneTable columns={stateColumns} rows={stateRows} /></>}
        </ToolCard>

        <ToolCard
          title="4. Normalize Phone Numbers"
          description="Previews organization and contact phone numbers that can be standardized to (###) ###-####."
          actions={<><Button variant="outline" onClick={() => { applyPhoneNormalization.reset(); setHasRun((current) => ({ ...current, phone: true })); setPhoneRows(phonePreviewRows); }}><Search className="h-4 w-4" />Scan</Button><Button onClick={() => applyPhoneNormalization.mutate(phoneRows)} disabled={applyPhoneNormalization.isPending || phoneRows.length === 0}><RefreshCw className="h-4 w-4" />{applyPhoneNormalization.isPending ? "Applying..." : "Apply updates"}</Button></>}
        >
          {applyPhoneNormalization.isSuccess && <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700"><CheckCircle2 className="mr-1 inline h-4 w-4" />Phone numbers updated.</div>}
          {applyPhoneNormalization.isError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{applyPhoneNormalization.error?.message || "Unable to update phone numbers."}</div>}
          {hasRun.phone && phoneRows.length === 0 && <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">No phone numbers need normalization.</div>}
          {phoneRows.length > 0 && <><Badge variant="secondary">{phoneRows.length} records ready</Badge><DataHygieneTable columns={phoneColumns} rows={phoneRows} /></>}
        </ToolCard>

        <ToolCard
          title="5. Standardize Website URLs"
          description="Previews organization website URLs that can be standardized to the https://www.{domain} format."
          actions={<><Button variant="outline" onClick={() => { applyWebsiteNormalization.reset(); setHasRun((current) => ({ ...current, website: true })); setWebsiteRows(websitePreviewRows); }}><Search className="h-4 w-4" />Scan</Button><Button onClick={() => applyWebsiteNormalization.mutate(websiteRows)} disabled={applyWebsiteNormalization.isPending || websiteRows.length === 0}><RefreshCw className="h-4 w-4" />{applyWebsiteNormalization.isPending ? "Applying..." : "Apply updates"}</Button></>}
        >
          {applyWebsiteNormalization.isSuccess && <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700"><CheckCircle2 className="mr-1 inline h-4 w-4" />Website URLs updated.</div>}
          {applyWebsiteNormalization.isError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{applyWebsiteNormalization.error?.message || "Unable to update website URLs."}</div>}
          {hasRun.website && websiteRows.length === 0 && <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">No website URLs need normalization.</div>}
          {websiteRows.length > 0 && <><Badge variant="secondary">{websiteRows.length} records ready</Badge><DataHygieneTable columns={websiteColumns} rows={websiteRows} /></>}
        </ToolCard>

        <ToolCard
          title="6. NTEE Code Audit"
          description="Reviews organization NTEE codes and highlights any values that do not exist in the current lookup list."
          actions={<Button variant="outline" onClick={() => { setHasRun((current) => ({ ...current, ntee: true })); setNteeRows(nteePreviewRows); }}><AlertCircle className="h-4 w-4" />Run audit</Button>}
        >
          {hasRun.ntee && nteeRows.length === 0 && <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">No invalid NTEE codes were found.</div>}
          {nteeRows.length > 0 && <><Badge variant="secondary">{nteeRows.length} invalid codes found</Badge><DataHygieneTable columns={nteeColumns} rows={nteeRows} /></>}
        </ToolCard>
      </div>
    </div>
  );
}