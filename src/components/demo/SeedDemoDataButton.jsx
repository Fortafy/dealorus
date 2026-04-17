import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";

import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

const DEFAULT_LIFECYCLE_STAGES = [
  { id: "prospect", name: "Prospect", order: 0 },
  { id: "qualified", name: "Qualified", order: 1 },
  { id: "proposal", name: "Proposal", order: 2 },
  { id: "negotiation", name: "Negotiation", order: 3 },
  { id: "closed_won", name: "Closed Won", order: 4 },
];

const ORGANIZATION_FIXTURES = [
  {
    organization_name: "Lakeside Youth Alliance",
    city: "Chicago",
    state: "IL",
    ein: "36-4829101",
    organization_type: "501c3",
    website: "https://lakesideyouthalliance.org",
    phone: "(312) 555-0148",
    email: "hello@lakesideyouthalliance.org",
    annual_revenue: 1850000,
  },
  {
    organization_name: "Riverbend Community Health",
    city: "Milwaukee",
    state: "WI",
    ein: "39-2740195",
    organization_type: "501c3",
    website: "https://riverbendcommunityhealth.org",
    phone: "(414) 555-0189",
    email: "contact@riverbendcommunityhealth.org",
    annual_revenue: 4200000,
  },
  {
    organization_name: "Bright Path Foundation",
    city: "St. Louis",
    state: "MO",
    ein: "43-1985221",
    organization_type: "foundation",
    website: "https://brightpathfoundation.org",
    phone: "(314) 555-0124",
    email: "info@brightpathfoundation.org",
    annual_revenue: 960000,
  },
];

const CONTACT_FIXTURES = [
  {
    organizationName: "Lakeside Youth Alliance",
    name: "Monica Reyes",
    title: "Executive Director",
    role_department: "Leadership",
    email: "monica.reyes@lakesideyouthalliance.org",
    phone: "(312) 555-0170",
    linkedin: "https://linkedin.com/in/monica-reyes-demo",
    starred: true,
  },
  {
    organizationName: "Lakeside Youth Alliance",
    name: "Jordan Kim",
    title: "Programs Manager",
    role_department: "Programs",
    email: "jordan.kim@lakesideyouthalliance.org",
    phone: "(312) 555-0192",
    linkedin: "",
    starred: false,
  },
  {
    organizationName: "Riverbend Community Health",
    name: "Avery Patel",
    title: "Chief Development Officer",
    role_department: "Development",
    email: "avery.patel@riverbendcommunityhealth.org",
    phone: "(414) 555-0107",
    linkedin: "https://linkedin.com/in/avery-patel-demo",
    starred: true,
  },
  {
    organizationName: "Bright Path Foundation",
    name: "Caleb Nguyen",
    title: 'Program Officer',
    role_department: "Grants",
    email: "caleb.nguyen@brightpathfoundation.org",
    phone: "(314) 555-0166",
    linkedin: "",
    starred: false,
  },
];

const DEAL_FIXTURES = [
  {
    organizationName: "Lakeside Youth Alliance",
    name: "2026 Leadership Giving Campaign",
    stage: "proposal",
    value: 75000,
    contract_type: "Grant",
  },
  {
    organizationName: "Riverbend Community Health",
    name: "Corporate Wellness Partnership",
    stage: "negotiation",
    value: 125000,
    contract_type: "Sponsorship",
  },
  {
    organizationName: "Bright Path Foundation",
    name: "Summer Innovation Fund",
    stage: "qualified",
    value: 45000,
    contract_type: "Grant",
  },
];

export default function SeedDemoDataButton({ clientId, userId, className = "", onSeeded }) {
  const queryClient = useQueryClient();

  const seedMutation = useMutation({
    mutationFn: async () => {
      if (!clientId || !userId) {
        throw new Error("Missing client context for demo data seeding.");
      }

      const [existingOrganizations, existingContacts, existingDeals, clientRecords] = await Promise.all([
        base44.entities.Organization.filter({ client_id: clientId }),
        base44.entities.Contact.filter({ client_id: clientId }),
        base44.entities.Deal.filter({ client_id: clientId }),
        base44.entities.Client.filter({ id: clientId }),
      ]);

      if (existingOrganizations.length || existingContacts.length || existingDeals.length) {
        throw new Error("Demo data seeding is only available when the account is empty.");
      }

      const clientRecord = clientRecords[0];
      if (!clientRecord) {
        throw new Error("Unable to find the current client record.");
      }

      if (!Array.isArray(clientRecord.lifecycle_stages) || clientRecord.lifecycle_stages.length === 0) {
        await base44.entities.Client.update(clientRecord.id, {
          lifecycle_stages: DEFAULT_LIFECYCLE_STAGES,
        });
      }

      const createdOrganizations = [];
      for (const organization of ORGANIZATION_FIXTURES) {
        const record = await base44.entities.Organization.create({
          ...organization,
          client_id: clientId,
          user_id: userId,
        });
        createdOrganizations.push(record);
      }

      const organizationIdByName = Object.fromEntries(
        createdOrganizations.map((organization) => [organization.organization_name, organization.id])
      );

      for (const contact of CONTACT_FIXTURES) {
        const organizationId = organizationIdByName[contact.organizationName] || null;
        await base44.entities.Contact.create({
          name: contact.name,
          title: contact.title,
          role_department: contact.role_department,
          email: contact.email,
          phone: contact.phone,
          linkedin: contact.linkedin,
          starred: contact.starred,
          client_id: clientId,
          organization_id: organizationId,
          email_addresses: contact.email ? [contact.email] : [],
          phone_numbers: contact.phone ? [contact.phone] : [],
          description: "Seeded demo contact",
          source: "Demo Seed",
          last_modified: new Date().toISOString(),
        });
      }

      for (const deal of DEAL_FIXTURES) {
        const organizationId = organizationIdByName[deal.organizationName] || null;
        await base44.entities.Deal.create({
          name: deal.name,
          stage: deal.stage,
          value: deal.value,
          contract_type: deal.contract_type,
          client_id: clientId,
          organization_id: organizationId,
          organization_name: deal.organizationName,
          is_active: true,
        });
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["organizations"] }),
        queryClient.invalidateQueries({ queryKey: ["people"] }),
        queryClient.invalidateQueries({ queryKey: ["deals-board"] }),
        queryClient.invalidateQueries({ queryKey: ["client"] }),
      ]);
      toast.success("Demo data created");
      onSeeded?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create demo data");
    },
  });

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => seedMutation.mutate()}
      disabled={seedMutation.isPending}
      className={className}
    >
      <FlaskConical className="w-3.5 h-3.5" />
      {seedMutation.isPending ? "Creating Demo Data..." : "Seed Demo Data"}
    </Button>
  );
}
