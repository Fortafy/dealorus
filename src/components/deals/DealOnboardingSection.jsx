import React, { useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const STEP_CONFIG = [
  { key: "google_group", label: "Create Google Group", functionName: "proxyCreateGoogleGroup" },
  { key: "google_drive", label: "Create Google Drive Folder", functionName: "proxyCreateGoogleDriveFolder" },
  { key: "timesync", label: "Add to Timesync", functionName: "proxyCreateTimesyncClient" },
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

function VerifyResultRow({ label, found, value, matchedBy }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className={`text-xs font-medium ${found ? "text-green-700" : "text-red-700"}`}>
          {found ? "✅ Found" : "❌ Not Found"}
        </p>
        {found && matchedBy ? (
          <p className="mt-1 text-xs text-slate-500">Matched by: {matchedBy}</p>
        ) : null}
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
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyErrors, setVerifyErrors] = useState([]);
  const [verifyResults, setVerifyResults] = useState({});
  const [verifyFieldsToSave, setVerifyFieldsToSave] = useState(null);
  const [hasVerifyCompleted, setHasVerifyCompleted] = useState(false);
  const [isSavingVerify, setIsSavingVerify] = useState(false);

  const { data: organization, isLoading } = useQuery({
    queryKey: ["deal-onboarding-org", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const org = await base44.entities.Organization.get(organizationId);
      console.log("[DealOnboardingSection] fetched organization", org);
      return org;
    },
  });

  const normalizedVerifyResults = useMemo(() => ({
    google_group: verifyResults.google_group || verifyResults.googleGroup || {},
    google_drive: verifyResults.google_drive || verifyResults.googleDrive || {},
    timesync: verifyResults.timesync || {},
  }), [verifyResults]);

  const summaryRows = useMemo(() => [
    { label: "Google Group Email", value: organization?.google_group_email },
    { label: "Drive Folder ID", value: organization?.google_drive_folder_id },
    { label: "Timesync ID", value: organization?.timesync_id },
  ].filter((item) => item.value), [organization]);

  const verificationPayload = useMemo(() => {
    const organizationName = organization?.organization_name || organization?.name || "";
    const abbreviation = organization?.abbreviation || "";
    const website = organization?.website || organization?.url || "";
    const timesyncId = organization?.timesync_id || null;
    const ein = organization?.ein || null;

    const payload = {
      organization_name: String(organizationName).trim(),
      abbreviation: String(abbreviation).trim(),
      website: String(website).trim(),
      timesync_id: timesyncId ? String(timesyncId).trim() : null,
      ein: ein ? String(ein).trim() : null,
    };

    console.log("[DealOnboardingSection] verification payload", {
      organization,
      payload,
    });

    return payload;
  }, [organization]);

  const missingVerificationFields = useMemo(() => {
    const missing = [];
    if (!verificationPayload.organization_name) missing.push("organization name");
    if (!verificationPayload.abbreviation) missing.push("abbreviation");
    if (!verificationPayload.website) missing.push("website");
    return missing;
  }, [verificationPayload]);


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

    console.log("[DealOnboardingSection] handleVerify start", {
      organization,
      verificationPayload,
      missingVerificationFields,
    });

    if (!verificationPayload.organization_name || !verificationPayload.abbreviation || !verificationPayload.website) {
      console.log("[DealOnboardingSection] verification blocked: missing required fields", {
        organization,
        verificationPayload,
        missingVerificationFields,
      });
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
      const response = await base44.functions.invoke("proxyVerifyOnboarding", verificationPayload);
      const data = response.data;
      console.log("[DealOnboardingSection] proxyVerifyOnboarding response", {
        status: response.status,
        data,
      });
      setVerifyResults(data.results || {});
      setVerifyFieldsToSave(data.fields_to_save || {});
      setVerifyErrors(data.errors || []);
      setHasVerifyCompleted(true);
    } catch (error) {
      console.log("[DealOnboardingSection] proxyVerifyOnboarding error", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      setVerifyErrors([{ step: "verify", label: "Verify Onboarding", message: error.message }]);
      setHasVerifyCompleted(true);
      toast.error("Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveVerify = async (closeAfterSave = false) => {
    if (!organization || !verifyFieldsToSave) return null;

    setIsSavingVerify(true);

    try {
      const updatedOrganization = await base44.entities.Organization.update(organization.id, verifyFieldsToSave);
      queryClient.setQueryData(["deal-onboarding-org", organization.id], updatedOrganization);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["deal-onboarding-org", organization.id] }),
        queryClient.invalidateQueries({ queryKey: ["organizations-list"] }),
        queryClient.invalidateQueries({ queryKey: ["organizations"] }),
      ]);
      toast.success("Organization updated");
      if (closeAfterSave) {
        setIsModalOpen(false);
      }
      return updatedOrganization;
    } catch (error) {
      toast.error("Failed to save verification results");
      return null;
    } finally {
      setIsSavingVerify(false);
    }
  };

  const handleStart = async () => {
    if (!organization) return;

    setHasCompleted(false);
    setSteps(createInitialSteps());
    setErrors([]);
    await handleVerify();
  };

  const handleProvisionMissing = async () => {
    if (!organization) return;

    const missingItemKeys = VERIFY_CONFIG.filter((item) => {
      const result = normalizedVerifyResults[item.key] || {};
      return !((result.found ?? result.exists) === true);
    }).map((item) => item.key);

    if (!missingItemKeys.length) {
      await handleSaveVerify(true);
      return;
    }

    const basePayload = {
      organization_name: organization.organization_name,
      abbreviation: organization.abbreviation,
      ein: organization.ein || null,
      website: organization.website || null,
      city: organization.city || null,
      state: organization.state || null,
      zip_code: organization.zip_code || null,
      mission: organization.mission || null,
      annual_revenue: organization.annual_revenue || null,
      salesforce_id: organization.salesforce_id || null,
    };

    const payloadsByStep = {
      google_group: basePayload,
      google_drive: basePayload,
      timesync: {
        ...basePayload,
        google_group_email: organization.google_group_email || verifyFieldsToSave?.google_group_email || null,
        google_drive_folder_id: organization.google_drive_folder_id || verifyFieldsToSave?.google_drive_folder_id || null,
      },
    };

    const valueExtractors = {
      google_group: (data) => data?.groupEmail || data?.groupId || null,
      google_drive: (data) => data?.clientFolderId || data?.folderId || null,
      timesync: (data) => data?.id || null,
    };

    const organizationUpdate = {};
    const nextSteps = createInitialSteps();
    const nextErrors = [];

    setIsRunning(true);
    setErrors([]);
    setHasCompleted(false);
    setSteps(createInitialSteps());

    try {
      for (const step of STEP_CONFIG) {
        if (!missingItemKeys.includes(step.key)) {
          const existingValue = step.key === "google_group"
            ? (organization.google_group_email || organization.google_group_id || null)
            : step.key === "google_drive"
              ? (organization.google_drive_folder_id || null)
              : (organization.timesync_id || null);

          nextSteps[step.key] = {
            status: existingValue ? "skipped" : "pending",
            value: existingValue,
            url: getStepUrl(step.key, existingValue),
          };
          setSteps({ ...nextSteps });
          continue;
        }

        nextSteps[step.key] = { status: "running", value: null, url: null };
        setSteps({ ...nextSteps });

        try {
          const response = await base44.functions.invoke(step.functionName, payloadsByStep[step.key]);
          const result = response.data || {};
          const value = valueExtractors[step.key](result);

          nextSteps[step.key] = {
            status: value ? "done" : "failed",
            value,
            url: getStepUrl(step.key, value),
          };

          if (step.key === "google_group" && value) {
            organizationUpdate.google_group_email = result.groupEmail || value;
            organizationUpdate.google_group_id = result.groupId || null;
            payloadsByStep.timesync.google_group_email = result.groupEmail || value;
          }

          if (step.key === "google_drive" && value) {
            organizationUpdate.google_drive_folder_id = result.clientFolderId || result.folderId || value;
            payloadsByStep.timesync.google_drive_folder_id = organizationUpdate.google_drive_folder_id;
          }

          if (step.key === "timesync" && value) {
            organizationUpdate.timesync_id = value;
          }
        } catch (error) {
          nextSteps[step.key] = {
            status: "failed",
            value: null,
            url: null,
          };
          nextErrors.push({ step: step.key, label: step.label, message: error.message });
        }

        setSteps({ ...nextSteps });
      }

      const hasFailures = Object.values(nextSteps).some((step) => step.status === "failed");
      const hasCompletedProvisioning = Object.values(nextSteps).every((step) => step.status === "done" || step.status === "skipped");

      if (hasCompletedProvisioning) {
        organizationUpdate.is_provisioned = true;
      }

      if (Object.keys(organizationUpdate).length) {
        await base44.entities.Organization.update(organization.id, organizationUpdate);
      }

      setErrors(nextErrors);
      setHasCompleted(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["deal-onboarding-org", organization.id] }),
        queryClient.invalidateQueries({ queryKey: ["organizations-list"] }),
        queryClient.invalidateQueries({ queryKey: ["organizations"] }),
      ]);

      await handleVerify();

      if (hasFailures) {
        toast.error("Onboarding finished with some failed steps");
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

  const allItemsFound = useMemo(
    () => VERIFY_CONFIG.every((item) => !!((normalizedVerifyResults[item.key] || {}).found ?? (normalizedVerifyResults[item.key] || {}).exists)),
    [normalizedVerifyResults]
  );

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
              <Button variant="outline" onClick={() => { resetVerifyState(); setSteps(createInitialSteps()); setErrors([]); setHasCompleted(false); setIsModalOpen(true); handleStart(); }} disabled={!organization || isRunning || isVerifying} className="gap-2">
                Review Onboarding
              </Button>
            </div>
            {missingVerificationFields.length ? (
              <p className="text-xs text-amber-700">Missing for verification: {missingVerificationFields.join(", ")}</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => { resetVerifyState(); setSteps(createInitialSteps()); setErrors([]); setHasCompleted(false); setIsModalOpen(true); handleStart(); }} disabled={!organization || isRunning || isVerifying} className="gap-2">
                Start Onboarding
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
            <DialogDescription>
              First verify what already exists, then save found values or provision any missing items.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {isVerifying ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                <p className="text-sm font-medium text-slate-700">Checking onboarding services...</p>
              </div>
            ) : hasVerifyCompleted ? (
              <div className="space-y-3">
                {VERIFY_CONFIG.map((item) => {
                  const result = normalizedVerifyResults[item.key] || {};
                  const found = !!(result.found ?? result.exists);
                  const value = item.key === "google_group"
                    ? (result.value || result.groupEmail || result.groupId || null)
                    : item.key === "google_drive"
                      ? (result.value || result.folderId || null)
                      : (result.value || result.id || null);

                  return (
                    <VerifyResultRow
                      key={item.key}
                      label={item.label}
                      found={found}
                      value={value}
                      matchedBy={item.key === "timesync" ? result.matched_by || null : null}
                    />
                  );
                })}
              </div>
            ) : null}

            {(hasCompleted || isRunning) ? (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-slate-900">Provisioning</p>
                {STEP_CONFIG.map((step) => (
                  <StepRow
                    key={step.key}
                    label={step.label}
                    status={steps[step.key].status}
                    value={steps[step.key].value}
                    url={steps[step.key].url}
                  />
                ))}
              </div>
            ) : null}

            {allItemsFound && hasVerifyCompleted ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                All onboarding items were found and can be saved to complete onboarding.
              </div>
            ) : hasVerifyCompleted ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Missing items can now be provisioned while keeping any already found values.
              </div>
            ) : null}

            <ErrorLogPanel errors={[...verifyErrors, ...errors]} />
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div className="flex items-center gap-2">
              {hasVerifyCompleted && allItemsFound ? (
                <Button onClick={() => handleSaveVerify(true)} disabled={isVerifying || isSavingVerify || !verifyFieldsToSave}>
                  {isSavingVerify ? "Saving..." : "Save and Complete"}
                </Button>
              ) : (
                <Button onClick={handleProvisionMissing} disabled={isRunning || isVerifying || isSavingVerify || !organization || !hasVerifyCompleted}>
                  {isRunning ? "Provisioning..." : "Provision Missing Items"}
                </Button>
              )}
              <Button variant="outline" onClick={handleStart} disabled={isRunning || isVerifying || !organization}>
                Re-check
              </Button>
            </div>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isRunning || isVerifying || isSavingVerify}>
              Done
            </Button>
          </DialogFooter>
          </DialogContent>
          </Dialog>
    </>
  );
}