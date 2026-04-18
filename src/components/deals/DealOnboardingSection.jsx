import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const STEP_CONFIG = [
  { key: "google_group", label: "Create Google Group" },
  { key: "google_drive", label: "Create Google Drive Folder" },
  { key: "timesync", label: "Add to Timesync" },
];

const createInitialSteps = () => ({
  google_group: { status: "pending", value: null },
  google_drive: { status: "pending", value: null },
  timesync: { status: "pending", value: null },
});

function StatusIcon({ status }) {
  if (status === "running") return <span className="text-blue-600">🔄</span>;
  if (status === "success") return <span className="text-green-600">✅</span>;
  if (status === "failed") return <span className="text-red-600">❌</span>;
  return <span className="text-slate-400">⬜</span>;
}

function StepRow({ label, status, value }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="pt-0.5 text-lg leading-none"><StatusIcon status={status} /></div>
        <div>
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className="text-xs text-slate-500 capitalize">{status}</p>
        </div>
      </div>
      {value ? <div className="max-w-[45%] truncate text-xs text-slate-600">{value}</div> : null}
    </div>
  );
}

function ErrorLogPanel({ errors }) {
  if (!errors.length) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="mb-3 text-sm font-semibold text-red-700">Error Log</p>
      <div className="space-y-3">
        {errors.map((error) => (
          <div key={error.step} className="rounded-lg border border-red-100 bg-white p-3">
            <p className="text-xs font-semibold text-red-700">{error.label}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-xs text-red-600">{error.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DealOnboardingSection({ organizationId }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState(createInitialSteps());
  const [errors, setErrors] = useState([]);
  const [hasCompleted, setHasCompleted] = useState(false);

  const { data: organization, isLoading } = useQuery({
    queryKey: ["deal-onboarding-org", organizationId],
    enabled: !!organizationId,
    queryFn: () => base44.entities.Organization.get(organizationId),
  });

  const summaryRows = useMemo(() => [
    { label: "Google Group Email", value: organization?.google_group_email },
    { label: "Drive Folder ID", value: organization?.google_drive_folder_id },
    { label: "Timesync ID", value: organization?.timesync_id },
  ].filter((item) => item.value), [organization]);

  const setStepState = (key, patch) => {
    setSteps((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  };

  const runStep = async ({ key, label, url, body, getValue }) => {
    setStepState(key, { status: "running" });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      const value = getValue(data);
      setStepState(key, { status: "success", value: value || null });
      return { success: true, data };
    } catch (error) {
      setStepState(key, { status: "failed" });
      setErrors((current) => [...current, { step: key, label, message: error.message }]);
      return { success: false, data: null };
    }
  };

  const handleStart = async () => {
    if (!organization) return;

    setIsModalOpen(true);
    setIsRunning(true);
    setHasCompleted(false);
    setSteps(createInitialSteps());
    setErrors([]);

    const groupResult = await runStep({
      key: "google_group",
      label: "Create Google Group",
      url: "https://client-onboarding-fdfc7132.base44.app/functions/createGoogleGroup",
      body: {
        organization_name: organization.organization_name,
        abbreviation: organization.abbreviation,
      },
      getValue: (data) => data?.groupEmail || data?.result?.groupEmail || null,
    });

    const googleGroupId = groupResult.data?.groupId || groupResult.data?.result?.groupId || null;
    const googleGroupEmail = groupResult.data?.groupEmail || groupResult.data?.result?.groupEmail || null;

    const driveResult = await runStep({
      key: "google_drive",
      label: "Create Google Drive Folder",
      url: "https://client-onboarding-fdfc7132.base44.app/functions/createGoogleDriveFolder",
      body: {
        website: organization.website || organization.url || null,
        group_email: googleGroupEmail || null,
      },
      getValue: (data) => data?.clientFolderId || data?.result?.clientFolderId || null,
    });

    const driveFolderId = driveResult.data?.clientFolderId || driveResult.data?.result?.clientFolderId || null;

    const timesyncResult = await runStep({
      key: "timesync",
      label: "Add to Timesync",
      url: "https://timesync.fortafy.us/functions/createClient",
      body: {
        name: organization.organization_name || organization.name || null,
        abbreviation: organization.abbreviation || null,
        ein: organization.ein || null,
        salesforceId: organization.salesforce_id || organization.salesforceId || null,
        url: organization.website || organization.url || null,
        city: organization.city || null,
        state: organization.state || null,
        zipCode: organization.zip_code || organization.zipCode || null,
        missionStatement: organization.mission || organization.mission_statement || null,
        annualRevenue: organization.annual_revenue || organization.annualRevenue || null,
      },
      getValue: (data) => data?.client?.id || data?.id || data?.result?.client?.id || null,
    });

    const timesyncId = timesyncResult.data?.client?.id || timesyncResult.data?.id || timesyncResult.data?.result?.client?.id || null;
    const allSucceeded = [groupResult.success, driveResult.success, timesyncResult.success].every(Boolean);

    await base44.entities.Organization.update(organization.id, {
      google_group_id: googleGroupId,
      google_group_email: googleGroupEmail,
      google_drive_folder_id: driveFolderId,
      timesync_id: timesyncId,
      is_provisioned: allSucceeded,
    });

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["deal-onboarding-org", organization.id] }),
      queryClient.invalidateQueries({ queryKey: ["organizations-list"] }),
      queryClient.invalidateQueries({ queryKey: ["organizations"] }),
    ]);

    setIsRunning(false);
    setHasCompleted(true);

    if (allSucceeded) {
      toast.success("Onboarding completed");
    } else {
      toast.error("Onboarding finished with some failed steps");
    }
  };

  if (!organizationId) return null;

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Onboarding</h3>
            <p className="text-xs text-slate-500">Provision external client resources for this organization.</p>
          </div>
          {isLoading ? <span className="text-xs text-slate-400">Loading...</span> : null}
        </div>

        {organization?.is_provisioned ? (
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              ✅ Already Provisioned
            </div>
            <div className="space-y-2">
              {summaryRows.map((row) => (
                <div key={row.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{row.label}</p>
                  <p className="mt-1 break-words text-sm text-slate-800">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Button onClick={handleStart} disabled={!organization || isRunning} className="gap-2">
            🚀 Start Onboarding
          </Button>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!isRunning) setIsModalOpen(open); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Onboarding — {organization?.organization_name || "Organization"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {STEP_CONFIG.map((step) => (
              <StepRow
                key={step.key}
                label={step.label}
                status={steps[step.key].status}
                value={steps[step.key].value}
              />
            ))}
            <ErrorLogPanel errors={errors} />
          </div>

          <DialogFooter>
            <Button onClick={() => setIsModalOpen(false)} disabled={isRunning || !hasCompleted}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}