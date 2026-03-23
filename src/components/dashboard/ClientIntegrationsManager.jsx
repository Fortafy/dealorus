import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CLIENT_INTEGRATION_CATALOG } from "@/lib/clientIntegrationCatalog";
import ClientIntegrationKeyCard from "./ClientIntegrationKeyCard";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ClientIntegrationsManager({ organization }) {
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = React.useState({});

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = user?.role === "admin" || user?.data?.client_role === "admin";

  const { data: integrations = [], isLoading: isLoadingIntegrations } = useQuery({
    queryKey: ["client-integrations", organization?.id],
    queryFn: () => base44.entities.ClientIntegration.filter({ client_id: organization.id }, "-updated_date", 20),
    enabled: Boolean(organization?.id && isAdmin),
    initialData: []
  });

  const saveMutation = useMutation({
    mutationFn: async ({ service, apiKey, integration }) => {
      if (integration?.id) {
        return base44.entities.ClientIntegration.update(integration.id, {
          api_key: apiKey,
          is_active: true
        });
      }

      return base44.entities.ClientIntegration.create({
        client_id: organization.id,
        integration_type: service.integration_type,
        display_name: service.display_name,
        api_key: apiKey,
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-integrations", organization?.id] });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: (integration) =>
    base44.entities.ClientIntegration.update(integration.id, {
      is_active: !integration.is_active
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-integrations", organization?.id] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (integration) => base44.entities.ClientIntegration.delete(integration.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-integrations", organization?.id] });
    }
  });

  const testMutation = useMutation({
    mutationFn: ({ service, apiKey, clientId }) => base44.functions.invoke(
      service.test_function_name,
      {
        client_id: clientId,
        ...(apiKey ? { api_key: apiKey } : {})
      }
    ),
    onMutate: ({ service }) => {
      setTestResults((current) => ({
        ...current,
        [service.integration_type]: null
      }));
    },
    onSuccess: (response, variables) => {
      const service = variables.service;
      const isSuccess = Boolean(response?.data?.success);
      const message = isSuccess
        ? response.data.message || `${service.display_name} connection is working.`
        : response?.data?.error || `Could not connect to ${service.display_name}.`;

      setTestResults((current) => ({
        ...current,
        [service.integration_type]: {
          status: isSuccess ? "success" : "error",
          message
        }
      }));

      if (isSuccess) {
        toast.success(message);
        return;
      }

      toast.error(message);
    },
    onError: (error, variables) => {
      const service = variables.service;
      const message = error?.response?.data?.error || error?.message || `Could not connect to ${service.display_name}.`;

      setTestResults((current) => ({
        ...current,
        [service.integration_type]: {
          status: "error",
          message
        }
      }));

      toast.error(message);
    }
  });

  if (!organization?.id) {
    return null;
  }

  if (isLoadingUser || isLoadingIntegrations) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      </div>);

  }

  if (!isAdmin) {
    return (
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>Only administrators can manage client integration keys.</AlertDescription>
      </Alert>);

  }

  return (
    <div className="settings-stack">
      




      

      {CLIENT_INTEGRATION_CATALOG.map((service) => {
        const integration = integrations.find((item) => item.integration_type === service.integration_type);

        return (
          <ClientIntegrationKeyCard
            key={service.integration_type}
            service={service}
            integration={integration}
            onSave={(selectedService, apiKey, existingIntegration) =>
            saveMutation.mutateAsync({ service: selectedService, apiKey, integration: existingIntegration })
            }
            onToggle={(selectedIntegration) => toggleMutation.mutate(selectedIntegration)}
            onDelete={(selectedIntegration) => deleteMutation.mutate(selectedIntegration)}
            onTest={(selectedService, apiKey) => testMutation.mutate({ service: selectedService, apiKey, clientId: organization.id })}
            isSaving={saveMutation.isPending}
            isToggling={toggleMutation.isPending}
            isDeleting={deleteMutation.isPending}
            isTesting={testMutation.isPending && testMutation.variables?.service?.integration_type === service.integration_type}
            testResult={testResults[service.integration_type]} />);


      })}
    </div>);

}