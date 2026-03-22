export function normalizeSubscriptionPlan(plan) {
  const normalized = String(plan || "free").toLowerCase();
  return ["paid", "premium", "enterprise"].includes(normalized) ? "paid" : "free";
}

export function getMonthlyApiLimit(plan) {
  return normalizeSubscriptionPlan(plan) === "paid" ? 5000 : 1000;
}