import { useQuery } from "@tanstack/react-query";
import { startOfMonth } from "date-fns";
import { base44 } from "@/api/base44Client";
import { getMonthlyApiLimit, normalizeSubscriptionPlan } from "@/lib/clientPlanLimits";

export default function useClientMonthlyUsage(enabled = true) {
  return useQuery({
    queryKey: ["client-monthly-usage"],
    enabled,
    queryFn: async () => {
      const user = await base44.auth.me().catch(() => null);
      const clientId = user?.client_id || user?.data?.client_id;

      if (!clientId) {
        return null;
      }

      const client = await base44.entities.Client.get(clientId);
      const logs = await base44.entities.ApiRequestLog.filter({ client_id: clientId }, "-created_date", 6000);
      const monthStart = startOfMonth(new Date());
      const used = logs.filter((log) => log.created_date && new Date(log.created_date) >= monthStart).length;
      const plan = normalizeSubscriptionPlan(client?.subscription_plan);
      const monthlyLimit = getMonthlyApiLimit(plan);

      return {
        clientId,
        client,
        plan,
        used,
        monthlyLimit,
        remaining: Math.max(monthlyLimit - used, 0),
        isLimitReached: used >= monthlyLimit,
      };
    },
  });
}