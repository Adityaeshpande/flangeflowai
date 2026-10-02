import test from "node:test";
import assert from "node:assert/strict";
import { calculatePlanningMetrics } from "../lib/planning.js";

const base = { sku:"TEST-SKU", material:"A105", horizon:14, confirmed:80, forecast:20, safetyStock:40, availableFg:60, blankKg:5, yieldPct:80, dailyCapacity:20, rawAvailable:1000 };

test("planner calculates gross material using yield", () => {
  const plan = calculatePlanningMetrics(base);
  assert.equal(plan.batch, 80);
  assert.equal(plan.rawRequired, 500);
  assert.equal(plan.productionDays, 4);
  assert.equal(plan.risk, "HIGH");
});

test("planner flags material shortage as critical", () => {
  const plan = calculatePlanningMetrics({ ...base, rawAvailable:300 });
  assert.equal(plan.rawShortage, 200);
  assert.equal(plan.risk, "CRITICAL");
});

test("planner recommends no batch when stock covers target", () => {
  const plan = calculatePlanningMetrics({ ...base, availableFg:150 });
  assert.equal(plan.batch, 0);
  assert.equal(plan.risk, "BALANCED");
});

test("planner rejects invalid yield", () => {
  assert.throws(() => calculatePlanningMetrics({ ...base, yieldPct:0 }), /Yield must be/);
});
