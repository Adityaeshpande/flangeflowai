const rawMaterials = {
  A105: { code: "RM-A105", specification: "ASTM A105/A105M", onHandKg: 1850, reservedKg: 720, reorderKg: 900, leadDays: 12 },
  F304: { code: "RM-F304", specification: "ASTM A182/A182M F304", onHandKg: 780, reservedKg: 310, reorderKg: 500, leadDays: 21 },
  F316: { code: "RM-F316", specification: "ASTM A182/A182M F316", onHandKg: 420, reservedKg: 180, reorderKg: 350, leadDays: 24 },
};

const products = [
  { sku:"FF-B16.5-2-150-WN-A105", standard:"ASME B16.5", description:'NPS 2 Class 150 weld-neck', material:"A105", finishedStock:140, confirmedDemand:110, forecastDemand:35, safetyStock:45, dailyCapacity:75, blankKg:4.8, yieldPct:86 },
  { sku:"FF-B16.5-4-150-SO-A105", standard:"ASME B16.5", description:'NPS 4 Class 150 slip-on', material:"A105", finishedStock:85, confirmedDemand:92, forecastDemand:28, safetyStock:50, dailyCapacity:50, blankKg:7.6, yieldPct:88 },
  { sku:"FF-B16.5-3-300-BL-A105", standard:"ASME B16.5", description:'NPS 3 Class 300 blind', material:"A105", finishedStock:42, confirmedDemand:38, forecastDemand:14, safetyStock:24, dailyCapacity:40, blankKg:9.2, yieldPct:90 },
  { sku:"FF-B16.5-2-150-WN-F304", standard:"ASME B16.5", description:'NPS 2 Class 150 weld-neck', material:"F304", finishedStock:28, confirmedDemand:30, forecastDemand:12, safetyStock:20, dailyCapacity:30, blankKg:5.1, yieldPct:82 },
  { sku:"FF-ISO7005-DN50-PN16-F304", standard:"ISO 7005-1", description:"DN 50 PN 16 steel flange", material:"F304", finishedStock:36, confirmedDemand:22, forecastDemand:8, safetyStock:18, dailyCapacity:35, blankKg:4.6, yieldPct:84 },
  { sku:"FF-ISO7005-DN80-PN16-F316", standard:"ISO 7005-1", description:"DN 80 PN 16 steel flange", material:"F316", finishedStock:18, confirmedDemand:20, forecastDemand:10, safetyStock:16, dailyCapacity:24, blankKg:7.9, yieldPct:80 },
];

let lastPlan = null;
const $ = (selector) => document.querySelector(selector);
const integer = (value) => Math.round(Number(value));
const fmt = (value, digits = 0) => Number(value).toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const materialAvailable = (key) => rawMaterials[key].onHandKg - rawMaterials[key].reservedKg;
const targetFor = (p) => p.confirmedDemand + p.forecastDemand + p.safetyStock;
const gapFor = (p) => Math.max(0, targetFor(p) - p.finishedStock);

function statusChip(label, level) {
  return '<span class="status-chip status-' + level + '">' + label + "</span>";
}

function renderDashboard() {
  $("#skuCount").textContent = products.length;
  $("#productionCount").textContent = products.filter((p) => gapFor(p) > 0).length;
  $("#rawAvailable").textContent = fmt(Object.keys(rawMaterials).reduce((sum, key) => sum + materialAvailable(key), 0)) + " kg";
  const rawAlerts = Object.keys(rawMaterials).filter((key) => materialAvailable(key) < rawMaterials[key].reorderKg).length;
  $("#rawAlertCount").textContent = rawAlerts;
  $("#heroFgRisk").textContent = products.filter((p) => p.finishedStock < p.confirmedDemand + p.forecastDemand).length + " SKUs";
  $("#heroRmRisk").textContent = rawAlerts + " families";
  $("#heroStatus").textContent = rawAlerts ? "Action needed" : "Controlled";
  $("#heroSub").textContent = rawAlerts ? "review raw-material cover" : "inventory position";

  $("#finishedGoodsRows").innerHTML = products.map((p) => {
    const demand = p.confirmedDemand + p.forecastDemand;
    const gap = gapFor(p);
    const level = p.finishedStock < p.confirmedDemand ? "critical" : gap > 0 ? "watch" : "ok";
    const label = level === "critical" ? "Order risk" : gap > 0 ? "Plan batch" : "Covered";
    return '<tr><td><strong>' + p.sku + '</strong><br><small>' + p.description + '</small></td><td>' + p.standard + '</td><td>' + rawMaterials[p.material].specification + '</td><td>' + fmt(p.finishedStock) + '</td><td>' + fmt(demand) + '</td><td>' + fmt(p.safetyStock) + '</td><td>' + fmt(gap) + '</td><td>' + statusChip(label, level) + '</td></tr>';
  }).join("");

  $("#rawMaterialRows").innerHTML = Object.entries(rawMaterials).map(([key, m]) => {
    const available = materialAvailable(key);
    const level = available < m.reorderKg ? (available < m.reorderKg * .65 ? "critical" : "watch") : "ok";
    const label = level === "critical" ? "Expedite" : level === "watch" ? "Reorder" : "Healthy";
    return '<tr><td><strong>' + m.code + '</strong></td><td>' + m.specification + '</td><td>' + fmt(m.onHandKg) + ' kg</td><td>' + fmt(m.reservedKg) + ' kg</td><td>' + fmt(available) + ' kg</td><td>' + fmt(m.reorderKg) + ' kg</td><td>' + m.leadDays + ' days</td><td>' + statusChip(label, level) + '</td></tr>';
  }).join("");
}

function populateSkuOptions() {
  $("#sku").innerHTML = products.map((p, i) => '<option value="' + i + '">' + p.sku + " · " + p.description + "</option>").join("");
  loadProduct(0);
}

function loadProduct(index) {
  const p = products[index];
  ["finishedStock","confirmedDemand","forecastDemand","safetyStock","dailyCapacity","blankKg","yieldPct"].forEach((key) => $("#" + key).value = p[key]);
  const m = rawMaterials[p.material];
  $("#materialFamily").textContent = m.specification;
  $("#materialStock").textContent = fmt(materialAvailable(p.material)) + " kg available after reservations · " + m.leadDays + "-day demo lead time";
}

function calculatePlan(values, product) {
  const demand = values.confirmedDemand + values.forecastDemand;
  const targetStock = demand + values.safetyStock;
  const batch = Math.max(0, targetStock - values.finishedStock);
  const grossRawKg = batch === 0 ? 0 : batch * values.blankKg / (values.yieldPct / 100);
  const availableRawKg = materialAvailable(product.material);
  const rawShortageKg = Math.max(0, grossRawKg - availableRawKg);
  const productionDays = batch === 0 ? 0 : Math.ceil(batch / values.dailyCapacity);
  const projectedClosing = values.finishedStock + batch - demand;
  const capacityLate = productionDays > values.horizonDays;
  let riskLevel = "BALANCED";
  if (rawShortageKg > 0 || (values.finishedStock < values.confirmedDemand && capacityLate)) riskLevel = "CRITICAL";
  else if (values.finishedStock < values.confirmedDemand || capacityLate) riskLevel = "HIGH";
  else if (batch > 0) riskLevel = "WATCH";
  return { ...values, sku: product.sku, description: product.description, standard: product.standard, material: rawMaterials[product.material].specification, batch, demand, targetStock, grossRawKg, availableRawKg, rawShortageKg, productionDays, projectedClosing, riskLevel };
}

function resultNarrative(plan) {
  if (plan.batch === 0) return {
    headline: "No production batch is required",
    summary: "Current finished stock covers confirmed demand, forecast demand and the selected safety-stock target for this horizon.",
    actions: ["Hold the SKU at review status rather than releasing production.", "Validate forecast demand before the next planning cycle.", "Keep existing raw material unallocated unless another SKU requires it."]
  };
  const actions = [
    "Release a batch of " + fmt(plan.batch) + " units after confirming the approved BOM and routing.",
    "Reserve " + fmt(plan.grossRawKg,1) + " kg of " + plan.material + " for this batch.",
    "Schedule " + plan.productionDays + " working day" + (plan.productionDays === 1 ? "" : "s") + " of capacity within the " + plan.horizonDays + "-day horizon."
  ];
  if (plan.rawShortageKg > 0) actions[1] = "Expedite or procure " + fmt(plan.rawShortageKg,1) + " kg of " + plan.material + " before releasing the full batch.";
  return {
    headline: "Plan " + fmt(plan.batch) + " units of " + plan.sku,
    summary: "The plan restores projected closing stock to the selected safety-stock target. It requires " + fmt(plan.grossRawKg,1) + " kg of gross input material at the entered process yield.",
    actions
  };
}

function showPlan(plan, aiNarrative = null) {
  plan = {
    ...plan,
    riskLevel: plan.riskLevel || plan.risk,
    grossRawKg: plan.grossRawKg ?? plan.rawRequired,
  };
  const narrative = aiNarrative || resultNarrative(plan);
  $("#riskBadge").textContent = plan.riskLevel + " planning status";
  $("#riskBadge").className = "status-chip status-" + (plan.riskLevel === "BALANCED" ? "ok" : plan.riskLevel === "WATCH" ? "watch" : "critical");
  $("#resultHeadline").textContent = narrative.headline;
  $("#resultSummary").textContent = narrative.summary;
  $("#batchResult").textContent = fmt(plan.batch);
  $("#rawResult").textContent = fmt(plan.grossRawKg,1);
  $("#daysResult").textContent = fmt(plan.productionDays);
  $("#closingResult").textContent = fmt(plan.projectedClosing);
  $("#actionList").innerHTML = narrative.actions.map((action) => "<li>" + action + "</li>").join("");
  $("#planForm").hidden = true;
  $("#resultPanel").hidden = false;
}

async function getAiPlan(plan) {
  const response = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "The cloud planner is temporarily unavailable.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function loadCloudStats() {
  try {
    const response = await fetch("/api/stats", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error();
    const data = await response.json();
    const risk = data.byRisk || {};
    $("#cloudProof").textContent = `${fmt(data.totalRequests)} AI plans logged in Supabase · ${fmt((risk.CRITICAL || 0) + (risk.HIGH || 0))} high/critical plans`;
  } catch {
    $("#cloudProof").textContent = "Live Supabase usage is temporarily unavailable.";
  }
}

$("#sku").addEventListener("change", (event) => loadProduct(Number(event.target.value)));
$("#planForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#formError").hidden = true;
  const keys = ["finishedStock","confirmedDemand","forecastDemand","safetyStock","dailyCapacity","horizonDays","blankKg","yieldPct"];
  const values = Object.fromEntries(keys.map((key) => [key, Number($("#" + key).value)]));
  if (keys.some((key) => !Number.isFinite(values[key])) || values.dailyCapacity <= 0 || values.horizonDays <= 0 || values.blankKg <= 0 || values.yieldPct <= 0 || values.yieldPct > 100) {
    $("#formError").textContent = "Enter valid non-negative quantities, positive capacity and blank weight, and a yield between 1% and 100%.";
    $("#formError").hidden = false;
    return;
  }
  const submit = event.submitter;
  submit.disabled = true;
  submit.textContent = "Generating verified plan…";
  $("#aiMode").textContent = "Calling Gemini";
  try {
    const product = products[Number($("#sku").value)];
    const verifiedInput = {
      sku: product.sku,
      material: product.material,
      horizon: values.horizonDays,
      confirmed: values.confirmedDemand,
      forecast: values.forecastDemand,
      safetyStock: values.safetyStock,
      availableFg: values.finishedStock,
      blankKg: values.blankKg,
      yieldPct: values.yieldPct,
      dailyCapacity: values.dailyCapacity,
      rawAvailable: materialAvailable(product.material),
    };
    const cloud = await getAiPlan(verifiedInput);
    lastPlan = cloud.plan;
    $("#aiMode").textContent = "Gemini + Supabase";
    showPlan(lastPlan, cloud.narrative);
    $("#cloudProof").textContent = `${cloud.remaining} AI plan${cloud.remaining === 1 ? "" : "s"} remaining today for this network`;
    await loadCloudStats();
  } catch (error) {
    $("#aiMode").textContent = error.status === 429 ? "Daily limit reached" : "Cloud unavailable";
    $("#formError").textContent = error.message;
    $("#formError").hidden = false;
  } finally {
    submit.disabled = false;
    submit.textContent = "Generate AI-assisted plan";
  }
});

$("#editPlan").addEventListener("click", () => { $("#resultPanel").hidden = true; $("#planForm").hidden = false; });
$("#downloadPlan").addEventListener("click", () => {
  if (!lastPlan) return;
  const rows = [["Field","Value"], ...Object.entries(lastPlan)];
  const csv = rows.map((row) => row.map((v) => '"' + String(v).replaceAll('"','""') + '"').join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
  link.download = "flangeflow-batch-plan.csv";
  link.click();
  URL.revokeObjectURL(link.href);
});

renderDashboard();
populateSkuOptions();
loadCloudStats();
