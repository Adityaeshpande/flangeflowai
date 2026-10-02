const number = (value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
  return parsed;
};

export function calculatePlanningMetrics(input) {
  const sku = String(input.sku || "").trim().slice(0, 120);
  const material = String(input.material || "").trim().slice(0, 24);
  if (!sku || !material) throw new Error("SKU and material are required.");

  const horizon = number(input.horizon, "Planning horizon", { min: 1, max: 90 });
  const confirmed = number(input.confirmed, "Confirmed demand", { max: 1000000 });
  const forecast = number(input.forecast, "Forecast demand", { max: 1000000 });
  const safetyStock = number(input.safetyStock, "Safety stock", { max: 1000000 });
  const availableFg = number(input.availableFg, "Available finished goods", { max: 1000000 });
  const blankKg = number(input.blankKg, "Blank weight", { min: 0.001, max: 100000 });
  const yieldPct = number(input.yieldPct, "Yield", { min: 1, max: 100 });
  const dailyCapacity = number(input.dailyCapacity, "Daily capacity", { min: 0.001, max: 1000000 });
  const rawAvailable = number(input.rawAvailable, "Available raw material", { max: 1000000000 });

  const target = confirmed + forecast + safetyStock;
  const batch = Math.max(0, Math.ceil(target - availableFg));
  const rawRequired = batch * blankKg / (yieldPct / 100);
  const rawShortage = Math.max(0, rawRequired - rawAvailable);
  const productionDays = batch ? Math.ceil(batch / dailyCapacity) : 0;
  let risk = "BALANCED";
  if (rawShortage > 0 || productionDays > horizon) risk = "CRITICAL";
  else if (availableFg < confirmed) risk = "HIGH";
  else if (batch > 0) risk = "WATCH";

  return {
    sku, material, horizon, confirmed, forecast, safetyStock, availableFg,
    blankKg, yieldPct, dailyCapacity, rawAvailable, target, batch,
    rawRequired, rawShortage, productionDays, risk,
    projectedClosing: availableFg + batch - confirmed - forecast,
  };
}
