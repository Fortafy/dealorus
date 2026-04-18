import React, { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
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
  google_group: { status: "pending", value: null, url: null },
  google_drive: { status: "pending", value: null, url: null },
  timesync: { status: "pending", value: null, url: null },
});

function StatusIcon({ status }) {
  if (status === "running") return <span className="text-blue-600">🔄</span>;
  if (status === "done") return <span className="text-green-600">✅</span>;
  if (status === "skipped") return <span className="text-amber-600">⏭️</span>;
  if (status === "failed") return <span className="text-red-600">❌</span>;
  return <span className="text-slate-400">⬜</span>;
}

function StepRow({ label, status, value, url }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="pt-0.5 text-lg leading-none"><StatusIcon status={status} /></div>
        <div>
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className="text-xs text-slate-500 capitalize">{status}</p>
        </div>
      </div>
      {value ? (
        url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex max-w-[45%] items-center gap-1 truncate text-xs text-blue-600 hover:underline">
            <span className="truncate">{value}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        ) : (
          <div className="max-w-[45%] truncate text-xs text-slate-600">{value}</div>
        )
      ) : null}
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

  const getStepUrl = (key, value) => {
    if (!value) return null;
    if (key === "google_group") return `https://groups.google.com/a/fortafy.us/g/${encodeURIComponent(value)}`;
    if (key === "google_drive") return `https://drive.google.com/drive/folders/${encodeURIComponent(value)}`;
    if (key === "timesync") return `https://timesync.fortafy.us/clients/${encodeURIComponent(value)}`;
    return null;
  };

  const handleStart = async () => {
    if (!organization) return;

    setIsRunning(true);
    setHasCompleted(false);
    setSteps(createInitialSteps());
    setErrors([]);

    try {
      const response = await base44.functions.invoke("triggerOnboarding", { org_id: organization.id });
      const data = response.data || {};
      const nextSteps = createInitialSteps();

      STEP_CONFIG.forEach((step) => {
        const stepData = data.steps?.[step.key] || {};
        const value = stepData.value || null;
        const status = stepData.status || "pending";
        nextSteps[step.key] = {
          status,
          value,
          url: getStepUrl(step.key, value),
        };
      });

      setSteps(nextSteps);
      setHasCompleted(true);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["deal-onboarding-org", organization.id] }),
        queryClient.invalidateQueries({ queryKey: ["organizations-list"] }),
        queryClient.invalidateQueries({ queryKey: ["organizations"] }),
      ]);

      const hasFailures = Object.values(data.steps || {}).some((step) => step?.status === "failed");
      if (hasFailures) {
        toast.error("Onboarding finished with some failed steps");
      } else if (data.already_provisioned) {
        toast.success("Everything was already set up");
      } else {
        toast.success("Onboarding completed");
      }
    } catch (error) {
      setErrors([{ step: "onboarding", label: "Onboarding", message: error.message }]);
      toast.error("Onboarding failed");
    } finally {
      setIsRunning(false);
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
            <Button variant="outline" onClick={() => { setSteps(createInitialSteps()); setErrors([]); setHasCompleted(false); setIsModalOpen(true); }} disabled={!organization || isRunning} className="gap-2">
              View Onboarding
            </Button>
          </div>
        ) : (
          <Button onClick={() => { setSteps(createInitialSteps()); setErrors([]); setHasCompleted(false); setIsModalOpen(true); }} disabled={!organization || isRunning} className="gap-2">
            Open Onboarding
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
                url={steps[step.key].url}
              />
            ))}
            <ErrorLogPanel errors={errors} />
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button onClick={handleStart} disabled={isRunning || !organization}>
              {isRunning ? "Running..." : "Start Onboarding"}
            </Button>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isRunning}>
              {hasCompleted ? "Done" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}