import React, { useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
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

const VERIFY_CONFIG = [
  { key: "google_group", label: "Google Group" },
  { key: "google_drive", label: "Google Drive Folder" },
  { key: "timesync", label: "Timesync" },
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
        {errors.map((error, index) => (
          <div key={`${error.step}-${index}`} className="rounded-lg border border-red-100 bg-white p-3">
            <p className="text-xs font-semibold text-red-700">{error.label}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-xs text-red-600">{error.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerifyResultRow({ label, found, value }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className={`text-xs font-medium ${found ? "text-green-700" : "text-red-700"}`}>
          {found ? "✅ Found" : "❌ Not Found"}
        </p>
      </div>
      <div className="max-w-[45%] truncate text-xs text-slate-600">{value || "—"}</div>
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
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyErrors, setVerifyErrors] = useState([]);
  const [verifyResults, setVerifyResults] = useState({});
  const [verifyFieldsToSave, setVerifyFieldsToSave] = useState(null);
  const [hasVerifyCompleted, setHasVerifyCompleted] = useState(false);
  const [isSavingVerify, setIsSavingVerify] = useState(false);

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

  const verificationPayload = useMemo(() => {
    const organizationName = organization?.organization_name || organization?.name || "";
    const abbreviation = organization?.abbreviation || "";
    const website = organization?.website || organization?.url || "";

    return {
      organization_name: String(organizationName).trim(),
      abbreviation: String(abbreviation).trim(),
      website: String(website).trim(),
    };
  }, [organization]);

  const missingVerificationFields = useMemo(() => {
    const missing = [];
    if (!verificationPayload.organization_name) missing.push("organization name");
    if (!verificationPayload.abbreviation) missing.push("abbreviation");
    if (!verificationPayload.website) missing.push("website");
    return missing;
  }, [verificationPayload]);

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

  const resetVerifyState = () => {
    setVerifyErrors([]);
    setVerifyResults({});
    setVerifyFieldsToSave(null);
    setHasVerifyCompleted(false);
  };

  const handleVerify = async () => {
    if (!organization) return;

    resetVerifyState();

    if (!verificationPayload.organization_name || !verificationPayload.abbreviation || !verificationPayload.website) {
      setVerifyErrors([{
        step: "verify",
        label: "Verify Onboarding",
        message: "Organization name, abbreviation, and website are required before verification can run.",
      }]);
      setHasVerifyCompleted(true);
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch("https://client-onboarding-fdfc7132.base44.app/functions/verifyOnboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verificationPayload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setVerifyResults(data.results || {});
      setVerifyFieldsToSave(data.fields_to_save || {});
      setVerifyErrors(data.errors || []);
      setHasVerifyCompleted(true);
    } catch (error) {
      setVerifyErrors([{ step: "verify", label: "Verify Onboarding", message: error.message }]);
      setHasVerifyCompleted(true);
      toast.error("Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveVerify = async () => {
    if (!organization || !verifyFieldsToSave) return;

    setIsSavingVerify(true);

    try {
      await base44.entities.Organization.update(organization.id, verifyFieldsToSave);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["deal-onboarding-org", organization.id] }),
        queryClient.invalidateQueries({ queryKey: ["organizations-list"] }),
        queryClient.invalidateQueries({ queryKey: ["organizations"] }),
      ]);
      toast.success("Organization updated");
      setIsVerifyModalOpen(false);
    } catch (error) {
      toast.error("Failed to save verification results");
    } finally {
      setIsSavingVerify(false);
    }
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
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { setSteps(createInitialSteps()); setErrors([]); setHasCompleted(false); setIsModalOpen(true); }} disabled={!organization || isRunning} className="gap-2">
                View Onboarding
              </Button>
              <Button variant="outline" onClick={() => { resetVerifyState(); setIsVerifyModalOpen(true); handleVerify(); }} disabled={!organization || isVerifying} className="gap-2">
                Verify Onboarding
              </Button>
            </div>
            {missingVerificationFields.length ? (
              <p className="text-xs text-amber-700">Missing for verification: {missingVerificationFields.join(", ")}</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => { setSteps(createInitialSteps()); setErrors([]); setHasCompleted(false); setIsModalOpen(true); }} disabled={!organization || isRunning} className="gap-2">
                Start Onboarding
              </Button>
              <Button variant="outline" onClick={() => { resetVerifyState(); setIsVerifyModalOpen(true); handleVerify(); }} disabled={!organization || isVerifying} className="gap-2">
                Verify Onboarding
              </Button>
            </div>
            {missingVerificationFields.length ? (
              <p className="text-xs text-amber-700">Missing for verification: {missingVerificationFields.join(", ")}</p>
            ) : null}
          </div>
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
            <div className="flex items-center gap-2">
              <Button onClick={handleStart} disabled={isRunning || !organization}>
                {isRunning ? "Running..." : "Start Onboarding"}
              </Button>
              <Button variant="outline" onClick={() => { resetVerifyState(); setIsVerifyModalOpen(true); handleVerify(); }} disabled={isRunning || isVerifying || !organization}>
                Verify Onboarding
              </Button>
            </div>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isRunning}>
              {hasCompleted ? "Done" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isVerifyModalOpen} onOpenChange={(open) => { if (!isVerifying && !isSavingVerify) setIsVerifyModalOpen(open); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verifying Onboarding — {organization?.organization_name || "Organization"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {isVerifying ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                <p className="text-sm font-medium text-slate-700">Checking onboarding services...</p>
              </div>
            ) : hasVerifyCompleted ? (
              <>
                <div className="space-y-3">
                  {VERIFY_CONFIG.map((item) => {
                    const result = verifyResults[item.key] || {};
                    return (
                      <VerifyResultRow
                        key={item.key}
                        label={item.label}
                        found={!!result.found}
                        value={result.value || null}
                      />
                    );
                  })}
                </div>
                <ErrorLogPanel errors={verifyErrors} />
              </>
            ) : null}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button onClick={handleSaveVerify} disabled={!hasVerifyCompleted || isVerifying || isSavingVerify || !verifyFieldsToSave}>
              {isSavingVerify ? "Saving..." : "Save to Organization"}
            </Button>
            <Button variant="outline" onClick={() => setIsVerifyModalOpen(false)} disabled={isVerifying || isSavingVerify}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}