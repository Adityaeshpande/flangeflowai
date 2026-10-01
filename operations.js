import { calculatePlanningMetrics } from "./lib/planning.js";

const STORAGE_KEY = "flangeflow_operations_v3";
const ROLES = {
  stores_manager: { label:"Stores Manager", help:"Full inventory control and approved adjustments.", permissions:["receipt","quality","issue","completion","dispatch","adjust-raw","adjust-fg","new-order","new-supplier","create-wo","import"] },
  stores_executive: { label:"Stores Executive", help:"Receipts, issues and dispatch transactions.", permissions:["receipt","issue","dispatch"] },
  quality_inspector: { label:"Quality Inspector", help:"Release or reject quarantined material lots.", permissions:["quality"] },
  production_supervisor: { label:"Production Supervisor", help:"Plan work orders and record output or scrap.", permissions:["completion","create-wo"] },
  procurement_executive: { label:"Procurement Executive", help:"Maintain supplier candidates and qualification status.", permissions:["new-supplier"] },
  sales_coordinator: { label:"Sales Coordinator", help:"Record confirmed customer orders.", permissions:["new-order"] },
  administrator: { label:"Administrator", help:"Full demo access.", permissions:["*"] },
};

const seedState = () => ({
  version: 3,
  currentRole: "stores_manager",
  materials: [
    { code:"A105", specification:"ASTM A105/A105M", description:"Carbon-steel forging stock", reorderKg:900, leadDays:12 },
    { code:"F304", specification:"ASTM A182/A182M F304", description:"Stainless-steel forging stock", reorderKg:500, leadDays:21 },
    { code:"F316", specification:"ASTM A182/A182M F316", description:"Stainless-steel forging stock", reorderKg:350, leadDays:24 },
  ],
  products: [
    { sku:"FF-B16.5-2-150-WN-A105", standard:"ASME B16.5-2025", description:'NPS 2 Class 150 weld-neck', material:"A105", blankKg:4.8, yieldPct:86, dailyCapacity:75, safetyStock:45, forecast14:35, fgOnHand:140, fgReserved:80, bin:"FG-A-01" },
    { sku:"FF-B16.5-4-150-SO-A105", standard:"ASME B16.5-2025", description:'NPS 4 Class 150 slip-on', material:"A105", blankKg:7.6, yieldPct:88, dailyCapacity:50, safetyStock:50, forecast14:28, fgOnHand:85, fgReserved:70, bin:"FG-A-03" },
    { sku:"FF-B16.5-3-300-BL-A105", standard:"ASME B16.5-2025", description:'NPS 3 Class 300 blind', material:"A105", blankKg:9.2, yieldPct:90, dailyCapacity:40, safetyStock:24, forecast14:14, fgOnHand:42, fgReserved:20, bin:"FG-A-04" },
    { sku:"FF-B16.5-2-150-WN-F304", standard:"ASME B16.5-2025", description:'NPS 2 Class 150 weld-neck', material:"F304", blankKg:5.1, yieldPct:82, dailyCapacity:30, safetyStock:20, forecast14:12, fgOnHand:28, fgReserved:25, bin:"FG-S-01" },
    { sku:"FF-ISO7005-DN50-PN16-F304", standard:"ISO 7005-1:2011", description:"DN 50 PN 16 steel flange", material:"F304", blankKg:4.6, yieldPct:84, dailyCapacity:35, safetyStock:18, forecast14:8, fgOnHand:36, fgReserved:15, bin:"FG-S-02" },
    { sku:"FF-ISO7005-DN80-PN16-F316", standard:"ISO 7005-1:2011", description:"DN 80 PN 16 steel flange", material:"F316", blankKg:7.9, yieldPct:80, dailyCapacity:24, safetyStock:16, forecast14:10, fgOnHand:18, fgReserved:12, bin:"FG-S-04" },
  ],
  suppliers: [
    { id:"SUP-001", name:"Demo Carbon Forging Supplier", region:"Maharashtra", materials:"A105 forging stock — verify scope", leadDays:12, moq:"500 kg", qms:"ISO 9001 certificate to verify", mtc:"Required", status:"APPROVED", url:"https://indianforging.org/members-directory/" },
    { id:"SUP-002", name:"Demo Stainless Supply Candidate", region:"India", materials:"F304/F316 stock — verify form", leadDays:21, moq:"250 kg", qms:"Under verification", mtc:"Required", status:"UNDER QUALIFICATION", url:"https://www.stainlessindia.org/associatemembers.cfm?CHR=S" },
  ],
  lots: [
    { id:"LOT-A105-260812-01", material:"A105", heat:"H26-A105-014", supplierId:"SUP-001", receivedDate:"2026-08-12", onHandKg:930, reservedKg:320, bin:"RM-A-01", qualityStatus:"RELEASED", mtc:"MTC-A105-014" },
    { id:"LOT-A105-260905-02", material:"A105", heat:"H26-A105-022", supplierId:"SUP-001", receivedDate:"2026-09-05", onHandKg:920, reservedKg:400, bin:"RM-A-02", qualityStatus:"RELEASED", mtc:"MTC-A105-022" },
    { id:"LOT-F304-260821-01", material:"F304", heat:"H26-F304-009", supplierId:"SUP-002", receivedDate:"2026-08-21", onHandKg:480, reservedKg:210, bin:"RM-S-01", qualityStatus:"RELEASED", mtc:"MTC-F304-009" },
    { id:"LOT-F304-260927-02", material:"F304", heat:"H26-F304-017", supplierId:"SUP-002", receivedDate:"2026-09-27", onHandKg:300, reservedKg:0, bin:"QC-HOLD-01", qualityStatus:"QUARANTINE", mtc:"MTC-F304-017" },
    { id:"LOT-F316-260815-01", material:"F316", heat:"H26-F316-006", supplierId:"SUP-002", receivedDate:"2026-08-15", onHandKg:420, reservedKg:180, bin:"RM-S-03", qualityStatus:"RELEASED", mtc:"MTC-F316-006" },
  ],
  orders: [
    { id:"SO-260921-01", customer:"Demo Process Systems", sku:"FF-B16.5-2-150-WN-A105", qty:80, dispatchedQty:0, reservedQty:80, dueDate:"2026-10-05", status:"CONFIRMED" },
    { id:"SO-260924-02", customer:"Demo Water Projects", sku:"FF-B16.5-4-150-SO-A105", qty:70, dispatchedQty:0, reservedQty:70, dueDate:"2026-10-03", status:"CONFIRMED" },
    { id:"SO-260926-03", customer:"Demo Specialty Piping", sku:"FF-B16.5-2-150-WN-F304", qty:25, dispatchedQty:0, reservedQty:25, dueDate:"2026-10-08", status:"CONFIRMED" },
    { id:"SO-260928-04", customer:"Demo Utilities Contractor", sku:"FF-ISO7005-DN80-PN16-F316", qty:12, dispatchedQty:0, reservedQty:12, dueDate:"2026-10-06", status:"CONFIRMED" },
  ],
  workOrders: [
    { id:"WO-260928-01", sku:"FF-B16.5-4-150-SO-A105", plannedQty:65, producedQty:0, issuedKg:0, scrapKg:0, createdDate:"2026-09-28", dueDate:"2026-10-02", status:"PLANNED", reservations:[{ lotId:"LOT-A105-260812-01", kg:320 },{ lotId:"LOT-A105-260905-02", kg:240 }] },
    { id:"WO-260929-02", sku:"FF-B16.5-2-150-WN-F304", plannedQty:29, producedQty:0, issuedKg:0, scrapKg:0, createdDate:"2026-09-29", dueDate:"2026-10-06", status:"PLANNED", reservations:[{ lotId:"LOT-F304-260821-01", kg:180 }] },
  ],
  transactions: [
    { id:"TX-0005", at:"2026-09-29T11:20:00+05:30", type:"RESERVATION", reference:"WO-260929-02", item:"F304", quantity:180, uom:"kg", role:"Production Supervisor", note:"Reserved released stock for planned work order" },
    { id:"TX-0004", at:"2026-09-28T16:10:00+05:30", type:"RESERVATION", reference:"WO-260928-01", item:"A105", quantity:560, uom:"kg", role:"Production Supervisor", note:"Reserved released stock for planned work order" },
    { id:"TX-0003", at:"2026-09-27T14:30:00+05:30", type:"RECEIPT", reference:"LOT-F304-260927-02", item:"F304", quantity:300, uom:"kg", role:"Stores Executive", note:"Received into quarantine pending quality review" },
  ],
  audit: [
    { at:"2026-09-29T11:20:00+05:30", role:"Production Supervisor", action:"CREATE WORK ORDER", entity:"work_order", reference:"WO-260929-02", details:"Planned 29 units and reserved 180 kg" },
    { at:"2026-09-28T16:10:00+05:30", role:"Production Supervisor", action:"CREATE WORK ORDER", entity:"work_order", reference:"WO-260928-01", details:"Planned 65 units and reserved 560 kg" },
    { at:"2026-09-27T14:30:00+05:30", role:"Stores Executive", action:"RECEIVE MATERIAL", entity:"material_lot", reference:"LOT-F304-260927-02", details:"300 kg received in QUARANTINE" },
  ],
});

const clone = (value) => JSON.parse(JSON.stringify(value));
let state = loadState();
let activeView = "dashboard";
let inventoryTab = "raw";
let dialogHandler = null;
let lastPlan = null;
let scannerStream = null;
let cloudStats = { available:false, totalRequests:0, criticalPlans:0 };

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed?.version === 3 ? parsed : seedState();
  } catch { return seedState(); }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[char]));
const fmt = (value, digits = 0) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits:digits, maximumFractionDigits:digits });
const todayIso = () => new Date().toISOString().slice(0,10);
const nowIso = () => new Date().toISOString();
const displayDate = (value) => value ? new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value + (value.length===10 ? "T00:00:00" : ""))) : "—";
const displayTime = (value) => new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
const roleLabel = () => ROLES[state.currentRole].label;
const hasPermission = (action) => ROLES[state.currentRole].permissions.includes("*") || ROLES[state.currentRole].permissions.includes(action);
const getProduct = (sku) => state.products.find((p) => p.sku === sku);
const getMaterial = (code) => state.materials.find((m) => m.code === code);
const getSupplier = (id) => state.suppliers.find((s) => s.id === id);
const getLot = (id) => state.lots.find((l) => l.id === id);
const getOrder = (id) => state.orders.find((o) => o.id === id);
const getWorkOrder = (id) => state.workOrders.find((w) => w.id === id);
const lotAvailable = (lot) => lot.qualityStatus === "RELEASED" ? Math.max(0, lot.onHandKg - lot.reservedKg) : 0;
const materialAvailable = (code) => state.lots.filter((l) => l.material === code).reduce((sum,l) => sum + lotAvailable(l),0);
const fgAvailable = (product) => Math.max(0, product.fgOnHand - product.fgReserved);
const openOrderQty = (order) => Math.max(0, order.qty - order.dispatchedQty);
const nextId = (prefix, list) => prefix + "-" + String(list.length + 1).padStart(4,"0");
const statusClass = (value) => String(value).toLowerCase().replaceAll(" ","-");

function audit(action, entity, reference, details) {
  state.audit.unshift({ at:nowIso(), role:roleLabel(), action, entity, reference, details });
}
function transaction(type, reference, item, quantity, uom, note) {
  state.transactions.unshift({ id:nextId("TX",state.transactions), at:nowIso(), type, reference, item, quantity, uom, role:roleLabel(), note });
}
function commit(message) { saveState(); renderAll(); toast(message); }
function toast(message) {
  const box = $("#toast"); box.textContent = message; box.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => box.classList.remove("show"), 2600);
}
function status(value, override) { return '<span class="status ' + (override || statusClass(value)) + '">' + esc(value) + "</span>"; }
function daysUntil(date) { return Math.ceil((new Date(date+"T23:59:59") - new Date()) / 86400000); }
function matchesSearch(...values) {
  const q = $("#globalSearch").value.trim().toLowerCase();
  return !q || values.some((v) => String(v ?? "").toLowerCase().includes(q));
}

function setRoleOptions() {
  $("#roleSelect").innerHTML = Object.entries(ROLES).map(([key,r]) => '<option value="'+key+'">'+esc(r.label)+'</option>').join("");
  $("#roleSelect").value = state.currentRole;
  $("#roleHelp").textContent = ROLES[state.currentRole].help;
}

function renderKpis() {
  const rawAvailable = state.materials.reduce((sum,m) => sum + materialAvailable(m.code),0);
  const fgUnits = state.products.reduce((sum,p) => sum + p.fgOnHand,0);
  const quarantine = state.lots.filter((l)=>l.qualityStatus==="QUARANTINE").reduce((sum,l)=>sum+l.onHandKg,0);
  const reorderAlerts = state.materials.filter((m)=>materialAvailable(m.code)<m.reorderKg).length;
  const openWos = state.workOrders.filter((w)=>w.status!=="COMPLETED").length;
  const cards = [
    ["Available raw material",fmt(rawAvailable)+" kg","Released stock after reservations",""],
    ["Finished goods",fmt(fgUnits)+" units","Accepted on-hand quantity",""],
    ["Quality hold",fmt(quarantine)+" kg","Quarantined material","alert"],
    ["Reorder alerts",reorderAlerts,"Material families below ROP",reorderAlerts?"alert":""],
    ["Open work orders",openWos,"Planned or released production",""],
    ["AI plans logged",cloudStats.available?fmt(cloudStats.totalRequests):"Local",cloudStats.available?fmt(cloudStats.criticalPlans)+" critical plans in Supabase":"Connect Supabase to activate",""],
  ];
  $("#dashboardKpis").innerHTML = cards.map(([label,value,note,cls]) => '<article class="kpi-card '+cls+'"><span>'+label+'</span><strong>'+value+'</strong><small>'+note+'</small></article>').join("");
}

function getAlerts() {
  const alerts = [];
  state.materials.forEach((m) => {
    const available = materialAvailable(m.code);
    if (available < m.reorderKg) alerts.push({ level:available < m.reorderKg*.65?"critical":"watch", title:m.code+" raw material below reorder point", detail:fmt(available)+" kg available versus "+fmt(m.reorderKg)+" kg reorder point.", view:"inventory" });
  });
  state.lots.filter((l)=>l.qualityStatus==="QUARANTINE").forEach((l)=>alerts.push({ level:"watch", title:l.id+" awaiting quality decision", detail:fmt(l.onHandKg)+" kg in "+l.bin+" is excluded from available inventory.", view:"transactions" }));
  state.orders.filter((o)=>o.status!=="COMPLETED").forEach((o)=>{
    const p=getProduct(o.sku), open=openOrderQty(o);
    if(open>fgAvailable(p)) alerts.push({ level:daysUntil(o.dueDate)<=3?"critical":"watch", title:o.id+" has insufficient available finished stock", detail:fmt(open)+" units open; "+fmt(fgAvailable(p))+" units available. Due "+displayDate(o.dueDate)+".", view:"production" });
  });
  state.workOrders.filter((w)=>w.status!=="COMPLETED" && daysUntil(w.dueDate)<0).forEach((w)=>alerts.push({ level:"critical", title:w.id+" is overdue", detail:"Due "+displayDate(w.dueDate)+" with "+fmt(w.plannedQty-w.producedQty)+" units remaining.", view:"production" }));
  return alerts;
}

function renderDashboard() {
  renderKpis();
  const alerts=getAlerts();
  $("#alertCount").textContent=alerts.length;
  $("#alertList").innerHTML = alerts.length ? alerts.slice(0,7).map((a)=>'<div class="alert-item"><span class="alert-dot '+a.level+'"></span><div><strong>'+esc(a.title)+'</strong><p>'+esc(a.detail)+'</p></div><button data-jump="'+a.view+'">Open</button></div>').join("") : '<div class="alert-item"><span class="alert-dot info"></span><div><strong>No current exceptions</strong><p>All monitored controls are within their demo thresholds.</p></div></div>';
  $("#materialBars").innerHTML=state.materials.map((m)=>{
    const available=materialAvailable(m.code), pct=Math.min(100,available/Math.max(m.reorderKg,1)*100), cls=available<m.reorderKg*.65?"critical":available<m.reorderKg?"watch":"";
    return '<div class="material-bar"><div><strong>'+m.code+' · '+esc(m.specification)+'</strong><span>'+fmt(available)+' / '+fmt(m.reorderKg)+' kg</span></div><div class="bar-track"><div class="bar-fill '+cls+'" style="width:'+pct+'%"></div></div></div>';
  }).join("");
  $("#dashboardOrderRows").innerHTML=state.orders.filter((o)=>o.status!=="COMPLETED").slice(0,6).map(orderRowCompact).join("");
}

function orderRisk(o) {
  const open=openOrderQty(o), available=fgAvailable(getProduct(o.sku));
  if(open===0) return ["COMPLETED","completed"];
  if(daysUntil(o.dueDate)<0) return ["OVERDUE","overdue"];
  if(open>available) return [daysUntil(o.dueDate)<=3?"CRITICAL":"AT RISK",daysUntil(o.dueDate)<=3?"critical":"watch"];
  return ["COVERED","ok"];
}
function orderRowCompact(o) {
  const risk=orderRisk(o), p=getProduct(o.sku);
  return '<tr><td><strong>'+o.id+'</strong><br><small>'+esc(o.customer)+'</small></td><td>'+o.sku+'</td><td>'+displayDate(o.dueDate)+'</td><td>'+fmt(openOrderQty(o))+'</td><td>'+fmt(fgAvailable(p))+'</td><td>'+status(risk[0],risk[1])+'</td></tr>';
}

function renderInventory() {
  $("#rawLotRows").innerHTML=state.lots.filter((l)=>matchesSearch(l.id,l.heat,l.material,l.bin,getSupplier(l.supplierId)?.name)).map((l)=>{
    const supplier=getSupplier(l.supplierId);
    const actions=l.qualityStatus==="QUARANTINE"?'<button class="mini-button" data-action="quality" data-id="'+l.id+'">Quality</button>':'<button class="mini-button" data-action="issue" data-id="'+l.id+'">Issue</button>';
    return '<tr><td><strong>'+l.id+'</strong><br><small>'+displayDate(l.receivedDate)+'</small></td><td>'+l.material+'<br><small>'+getMaterial(l.material).specification+'</small></td><td>'+esc(l.heat)+'</td><td>'+esc(supplier?.name||"Unknown")+'</td><td>'+fmt(l.onHandKg,1)+' kg</td><td>'+fmt(l.reservedKg,1)+' kg</td><td>'+fmt(lotAvailable(l),1)+' kg</td><td>'+esc(l.bin)+'</td><td>'+status(l.qualityStatus)+'</td><td class="row-actions">'+actions+'</td></tr>';
  }).join("");
  $("#finishedRows").innerHTML=state.products.filter((p)=>matchesSearch(p.sku,p.description,p.material,p.bin)).map((p)=>{
    const available=fgAvailable(p), level=available<p.safetyStock?"watch":"ok";
    return '<tr><td><strong>'+p.sku+'</strong><br><small>'+p.standard+'</small></td><td>'+p.description+'</td><td>'+p.material+'</td><td>'+fmt(p.fgOnHand)+'</td><td>'+fmt(p.fgReserved)+'</td><td>'+fmt(available)+'</td><td>'+fmt(p.safetyStock)+'</td><td>'+p.bin+'</td><td>'+status(level==="ok"?"HEALTHY":"BELOW SAFETY",level)+'</td></tr>';
  }).join("");
}

function renderTransactions() {
  $("#transactionRows").innerHTML=state.transactions.filter((t)=>matchesSearch(t.id,t.reference,t.item,t.type,t.note)).map((t)=>'<tr><td>'+displayTime(t.at)+'</td><td>'+status(t.type,"info")+'</td><td>'+esc(t.reference)+'</td><td>'+esc(t.item)+'</td><td>'+fmt(t.quantity,1)+' '+t.uom+'</td><td>'+esc(t.role)+'</td><td>'+esc(t.note)+'</td></tr>').join("");
}

function renderProduction() {
  $("#plannerSku").innerHTML=state.products.map((p)=>'<option value="'+esc(p.sku)+'">'+esc(p.sku)+' · '+esc(p.description)+'</option>').join("");
  $("#workOrderRows").innerHTML=state.workOrders.filter((w)=>matchesSearch(w.id,w.sku,w.status)).map((w)=>'<tr><td><strong>'+w.id+'</strong></td><td>'+w.sku+'</td><td>'+fmt(w.plannedQty)+'</td><td>'+fmt(w.producedQty)+'</td><td>'+fmt(w.issuedKg,1)+' kg</td><td>'+displayDate(w.dueDate)+'</td><td>'+status(w.status,w.status==="RELEASED"?"released-wo":undefined)+'</td></tr>').join("");
}

function renderOrders() {
  $("#orderRows").innerHTML=state.orders.filter((o)=>matchesSearch(o.id,o.customer,o.sku,o.status)).map((o)=>{
    const risk=orderRisk(o), action=openOrderQty(o)>0?'<button class="mini-button" data-action="dispatch" data-id="'+o.id+'">Dispatch</button>':"—";
    return '<tr><td><strong>'+o.id+'</strong></td><td>'+esc(o.customer)+'</td><td>'+o.sku+'</td><td>'+fmt(o.qty)+'</td><td>'+fmt(o.dispatchedQty)+'</td><td>'+fmt(openOrderQty(o))+'</td><td>'+displayDate(o.dueDate)+'</td><td>'+status(risk[0],risk[1])+'</td><td>'+action+'</td></tr>';
  }).join("");
}

function renderSuppliers() {
  $("#supplierRows").innerHTML=state.suppliers.filter((s)=>matchesSearch(s.id,s.name,s.region,s.materials,s.status)).map((s)=>'<tr><td><strong>'+esc(s.name)+'</strong><br><small>'+s.id+'</small></td><td>'+esc(s.region)+'</td><td>'+esc(s.materials)+'</td><td>'+fmt(s.leadDays)+' days</td><td>'+esc(s.moq)+'</td><td>'+esc(s.qms)+'</td><td>'+esc(s.mtc)+'</td><td>'+status(s.status)+'</td><td><a class="mini-button" href="'+esc(s.url||"#")+'" target="_blank" rel="noreferrer">Official link</a></td></tr>').join("");
}

function renderAudit() {
  $("#auditRows").innerHTML=state.audit.filter((a)=>matchesSearch(a.action,a.entity,a.reference,a.details,a.role)).map((a)=>'<tr><td>'+displayTime(a.at)+'</td><td>'+esc(a.role)+'</td><td><strong>'+esc(a.action)+'</strong></td><td>'+esc(a.entity)+'</td><td>'+esc(a.reference)+'</td><td>'+esc(a.details)+'</td></tr>').join("");
}

function renderAll() {
  renderDashboard(); renderInventory(); renderTransactions(); renderProduction(); renderOrders(); renderSuppliers(); renderAudit();
  setRoleOptions();
}

const field = (name,label,type="text",extra={}) => ({name,label,type,...extra});
function options(items,valueKey,labeler){return items.map((item)=>({value:item[valueKey],label:labeler(item)}));}
function fieldHtml(f) {
  const cls="dialog-field"+(f.full?" full":"");
  const help=f.help?'<small>'+esc(f.help)+'</small>':"";
  if(f.type==="select") return '<div class="'+cls+'"><label>'+esc(f.label)+'</label><select name="'+f.name+'">'+f.options.map((o)=>'<option value="'+esc(o.value)+'" '+(String(f.value)===String(o.value)?"selected":"")+'>'+esc(o.label)+'</option>').join("")+'</select>'+help+'</div>';
  if(f.type==="textarea") return '<div class="'+cls+'"><label>'+esc(f.label)+'</label><textarea name="'+f.name+'" '+(f.required?"required":"")+'>'+esc(f.value||"")+'</textarea>'+help+'</div>';
  return '<div class="'+cls+'"><label>'+esc(f.label)+'</label><input name="'+f.name+'" type="'+f.type+'" value="'+esc(f.value??"")+'" '+(f.min!==undefined?'min="'+f.min+'"':"")+' '+(f.max!==undefined?'max="'+f.max+'"':"")+' '+(f.step?'step="'+f.step+'"':"")+' '+(f.required?"required":"")+'>'+help+'</div>';
}
function openDialog(config) {
  if(!hasPermission(config.permission)){toast("This demo role cannot perform that transaction.");return;}
  $("#dialogEyebrow").textContent=config.eyebrow||"Inventory transaction";
  $("#dialogTitle").textContent=config.title;
  $("#dialogFields").innerHTML=config.fields.map(fieldHtml).join("");
  $("#dialogError").hidden=true;
  $("#dialogSubmit").textContent=config.submitLabel||"Save transaction";
  dialogHandler=config.handler;
  $("#actionDialog").showModal();
}
function dialogData(){return Object.fromEntries(new FormData($("#actionForm")).entries());}
function dialogError(message){$("#dialogError").textContent=message;$("#dialogError").hidden=false;}
function closeDialog(){ $("#actionDialog").close(); dialogHandler=null; }

function actionReceipt() {
  openDialog({ permission:"receipt", eyebrow:"Stores transaction", title:"Receive raw material", submitLabel:"Receive into quarantine", fields:[
    field("lotId","Lot ID","text",{value:"LOT-"+todayIso().replaceAll("-","")+"-",required:true,full:true}),
    field("material","Material family","select",{options:options(state.materials,"code",(m)=>m.code+" · "+m.specification)}),
    field("heat","Heat number","text",{required:true}), field("supplierId","Supplier","select",{options:options(state.suppliers,"id",(s)=>s.name+" · "+s.status)}),
    field("quantity","Received quantity (kg)","number",{min:0.01,step:"0.01",required:true}), field("bin","Quarantine bin","text",{value:"QC-HOLD-01",required:true}),
    field("mtc","MTC / CMTR reference","text",{required:true}), field("receivedDate","Received date","date",{value:todayIso(),required:true}),
  ], handler:(d)=>{
    const qty=Number(d.quantity);
    if(!d.lotId||getLot(d.lotId))throw Error("Enter a unique lot ID.");
    if(!Number.isFinite(qty)||qty<=0)throw Error("Received quantity must be positive.");
    state.lots.unshift({id:d.lotId.trim(),material:d.material,heat:d.heat.trim(),supplierId:d.supplierId,receivedDate:d.receivedDate,onHandKg:qty,reservedKg:0,bin:d.bin.trim(),qualityStatus:"QUARANTINE",mtc:d.mtc.trim()});
    transaction("RECEIPT",d.lotId,d.material,qty,"kg","Received into quarantine pending quality review");
    audit("RECEIVE MATERIAL","material_lot",d.lotId,fmt(qty,1)+" kg received in QUARANTINE");
    closeDialog();commit("Material received into quarantine.");
  }});
}
function actionQuality(prefill) {
  const lots=state.lots.filter((l)=>l.qualityStatus==="QUARANTINE");
  if(!lots.length){toast("There are no quarantined lots awaiting a decision.");return;}
  openDialog({permission:"quality",eyebrow:"Quality control",title:"Record quality decision",fields:[
    field("lotId","Quarantined lot","select",{value:prefill,options:options(lots,"id",(l)=>l.id+" · "+l.material+" · "+fmt(l.onHandKg)+" kg")}),
    field("decision","Decision","select",{options:[{value:"RELEASED",label:"Release for use"},{value:"REJECTED",label:"Reject / block"}]}),
    field("note","Inspection note","textarea",{required:true,full:true,help:"Record the inspection reference or reason. Do not enter confidential customer data."}),
  ],handler:(d)=>{
    const lot=getLot(d.lotId); if(!lot||lot.qualityStatus!=="QUARANTINE")throw Error("Select a valid quarantined lot.");
    lot.qualityStatus=d.decision; if(d.decision==="REJECTED")lot.reservedKg=0;
    transaction("QUALITY_"+d.decision,lot.id,lot.material,lot.onHandKg,"kg",d.note.trim());
    audit("QUALITY "+d.decision,"material_lot",lot.id,d.note.trim());
    closeDialog();commit("Quality decision recorded.");
  }});
}
function actionIssue(prefillLot) {
  const workOrders=state.workOrders.filter((w)=>w.status!=="COMPLETED");
  const releasedLots=state.lots.filter((l)=>l.qualityStatus==="RELEASED"&&l.onHandKg>0);
  if(!workOrders.length||!releasedLots.length){toast("An open work order and released material are required.");return;}
  openDialog({permission:"issue",eyebrow:"Stores transaction",title:"Issue raw material to production",fields:[
    field("workOrderId","Work order","select",{options:options(workOrders,"id",(w)=>w.id+" · "+w.sku)}),
    field("lotId","Released material lot","select",{value:prefillLot,options:options(releasedLots,"id",(l)=>l.id+" · "+l.material+" · "+fmt(l.onHandKg)+" kg physical")}),
    field("quantity","Issue quantity (kg)","number",{min:0.01,step:"0.01",required:true}),
    field("note","Issue note","text",{value:"Issued against work order",full:true}),
  ],handler:(d)=>{
    const wo=getWorkOrder(d.workOrderId), lot=getLot(d.lotId), p=getProduct(wo.sku), qty=Number(d.quantity);
    if(lot.material!==p.material)throw Error("The selected lot material does not match the work-order BOM.");
    if(qty<=0||qty>lot.onHandKg)throw Error("Issue quantity exceeds physical lot stock.");
    lot.onHandKg-=qty; lot.reservedKg=Math.max(0,lot.reservedKg-qty); wo.issuedKg+=qty; wo.status="RELEASED";
    const res=wo.reservations?.find((r)=>r.lotId===lot.id); if(res)res.kg=Math.max(0,res.kg-qty);
    transaction("MATERIAL ISSUE",wo.id,lot.id,qty,"kg",d.note.trim());
    audit("ISSUE MATERIAL","work_order",wo.id,fmt(qty,1)+" kg issued from "+lot.id);
    closeDialog();commit("Material issued to production.");
  }});
}
function actionCompletion() {
  const workOrders=state.workOrders.filter((w)=>w.status!=="COMPLETED");
  if(!workOrders.length){toast("There are no open work orders.");return;}
  openDialog({permission:"completion",eyebrow:"Production transaction",title:"Record production completion",fields:[
    field("workOrderId","Work order","select",{options:options(workOrders,"id",(w)=>w.id+" · "+w.sku+" · "+(w.plannedQty-w.producedQty)+" remaining")}),
    field("completedQty","Accepted finished quantity","number",{min:1,step:"1",required:true}),
    field("scrapKg","Scrap / process loss (kg)","number",{min:0,step:"0.01",value:0,required:true}),
    field("note","Production note","text",{value:"Accepted after production inspection",full:true}),
  ],handler:(d)=>{
    const wo=getWorkOrder(d.workOrderId), p=getProduct(wo.sku), qty=Number(d.completedQty), scrap=Number(d.scrapKg);
    if(!Number.isInteger(qty)||qty<=0||qty>wo.plannedQty-wo.producedQty)throw Error("Completed quantity must be a whole number within the open work-order quantity.");
    const minimumIssued=qty*p.blankKg/(p.yieldPct/100);
    if(wo.issuedKg+0.001<minimumIssued)throw Error("Insufficient raw material has been issued to support this completion.");
    wo.producedQty+=qty; wo.scrapKg+=scrap; p.fgOnHand+=qty;
    if(wo.producedQty>=wo.plannedQty){wo.status="COMPLETED";releaseReservations(wo);} else wo.status="RELEASED";
    transaction("PRODUCTION COMPLETION",wo.id,p.sku,qty,"units",d.note.trim()+"; scrap "+fmt(scrap,1)+" kg");
    audit("COMPLETE PRODUCTION","work_order",wo.id,fmt(qty)+" accepted units; "+fmt(scrap,1)+" kg scrap");
    closeDialog();commit("Finished goods added to inventory.");
  }});
}
function actionDispatch(prefillOrder) {
  const orders=state.orders.filter((o)=>openOrderQty(o)>0);
  if(!orders.length){toast("There are no open orders to dispatch.");return;}
  openDialog({permission:"dispatch",eyebrow:"Dispatch transaction",title:"Dispatch finished goods",fields:[
    field("orderId","Sales order","select",{value:prefillOrder,options:options(orders,"id",(o)=>o.id+" · "+o.customer+" · "+openOrderQty(o)+" open")}),
    field("quantity","Dispatch quantity (units)","number",{min:1,step:"1",required:true}),
    field("reference","Dispatch reference","text",{value:"DN-"+todayIso().replaceAll("-","")+"-",required:true}),
  ],handler:(d)=>{
    const order=getOrder(d.orderId), p=getProduct(order.sku), qty=Number(d.quantity), open=openOrderQty(order);
    if(!Number.isInteger(qty)||qty<=0||qty>open)throw Error("Dispatch quantity must be within the open order quantity.");
    if(qty>p.fgOnHand)throw Error("Dispatch quantity exceeds physical finished-goods stock.");
    p.fgOnHand-=qty; const reservedRelease=Math.min(qty,order.reservedQty||0); p.fgReserved=Math.max(0,p.fgReserved-reservedRelease); order.reservedQty=Math.max(0,(order.reservedQty||0)-reservedRelease); order.dispatchedQty+=qty; order.status=openOrderQty(order)===0?"COMPLETED":"PART DISPATCHED";
    transaction("DISPATCH",order.id,p.sku,qty,"units",d.reference.trim());
    audit("DISPATCH ORDER","sales_order",order.id,fmt(qty)+" units dispatched; reference "+d.reference.trim());
    closeDialog();commit("Dispatch recorded and finished stock reduced.");
  }});
}
function actionAdjustRaw() {
  openDialog({permission:"adjust-raw",eyebrow:"Controlled adjustment",title:"Adjust raw-material stock",fields:[
    field("lotId","Material lot","select",{options:options(state.lots,"id",(l)=>l.id+" · "+fmt(l.onHandKg,1)+" kg")}),
    field("newQuantity","Counted physical quantity (kg)","number",{min:0,step:"0.01",required:true}),
    field("reason","Adjustment reason","textarea",{required:true,full:true}),
  ],handler:(d)=>{
    const lot=getLot(d.lotId), qty=Number(d.newQuantity), delta=qty-lot.onHandKg;
    if(!Number.isFinite(qty)||qty<0)throw Error("Counted quantity must be zero or greater.");
    lot.onHandKg=qty; lot.reservedKg=Math.min(lot.reservedKg,qty);
    transaction("STOCK ADJUSTMENT",lot.id,lot.material,delta,"kg",d.reason.trim());
    audit("ADJUST RAW STOCK","material_lot",lot.id,"Adjusted by "+fmt(delta,1)+" kg: "+d.reason.trim());
    closeDialog();commit("Raw-material adjustment recorded.");
  }});
}
function actionAdjustFg() {
  openDialog({permission:"adjust-fg",eyebrow:"Controlled adjustment",title:"Adjust finished-goods stock",fields:[
    field("sku","Finished-goods SKU","select",{options:options(state.products,"sku",(p)=>p.sku+" · "+fmt(p.fgOnHand)+" units")}),
    field("newQuantity","Counted physical quantity (units)","number",{min:0,step:"1",required:true}),
    field("reason","Adjustment reason","textarea",{required:true,full:true}),
  ],handler:(d)=>{
    const p=getProduct(d.sku), qty=Number(d.newQuantity), delta=qty-p.fgOnHand;
    if(!Number.isInteger(qty)||qty<0)throw Error("Counted quantity must be a whole number of zero or greater.");
    p.fgOnHand=qty; p.fgReserved=Math.min(p.fgReserved,qty);
    transaction("FG ADJUSTMENT",p.sku,p.sku,delta,"units",d.reason.trim());
    audit("ADJUST FG STOCK","product",p.sku,"Adjusted by "+fmt(delta)+" units: "+d.reason.trim());
    closeDialog();commit("Finished-goods adjustment recorded.");
  }});
}
function actionNewOrder() {
  openDialog({permission:"new-order",eyebrow:"Sales demand",title:"Create confirmed sales order",fields:[
    field("orderId","Order ID","text",{value:"SO-"+todayIso().replaceAll("-","")+"-",required:true}),
    field("customer","Customer reference","text",{required:true}),
    field("sku","SKU","select",{options:options(state.products,"sku",(p)=>p.sku+" · "+p.description),full:true}),
    field("quantity","Ordered quantity (units)","number",{min:1,step:"1",required:true}),
    field("dueDate","Required delivery date","date",{value:todayIso(),required:true}),
  ],handler:(d)=>{
    if(getOrder(d.orderId))throw Error("Enter a unique order ID.");
    const qty=Number(d.quantity), p=getProduct(d.sku); if(!Number.isInteger(qty)||qty<=0)throw Error("Order quantity must be a positive whole number.");
    const reserve=Math.min(fgAvailable(p),qty); p.fgReserved+=reserve;
    state.orders.unshift({id:d.orderId.trim(),customer:d.customer.trim(),sku:d.sku,qty,dispatchedQty:0,reservedQty:reserve,dueDate:d.dueDate,status:"CONFIRMED"});
    transaction("ORDER RESERVATION",d.orderId,p.sku,reserve,"units","Reserved available finished goods");
    audit("CREATE SALES ORDER","sales_order",d.orderId,fmt(qty)+" units; "+fmt(reserve)+" reserved");
    closeDialog();commit("Sales order created.");
  }});
}
function actionNewSupplier() {
  openDialog({permission:"new-supplier",eyebrow:"Procurement qualification",title:"Add supplier candidate",fields:[
    field("name","Supplier name","text",{required:true}),field("region","Region","text",{required:true}),
    field("materials","Material capability claimed","text",{required:true,full:true}),
    field("leadDays","Quoted lead time (days)","number",{min:1,step:"1",required:true}),field("moq","MOQ","text",{required:true}),
    field("qms","Quality-management evidence","text",{value:"Certificate to verify",required:true}),
    field("mtc","MTC / traceability capability","select",{options:[{value:"Required — pending verification",label:"Pending verification"},{value:"Verified for approved scope",label:"Verified"}]}),
    field("status","Qualification status","select",{options:[{value:"CANDIDATE",label:"Candidate"},{value:"UNDER QUALIFICATION",label:"Under qualification"},{value:"APPROVED",label:"Approved"}]}),
    field("url","Official contact URL","url",{required:true,full:true}),
  ],handler:(d)=>{
    const id=nextId("SUP",state.suppliers); state.suppliers.push({id,name:d.name.trim(),region:d.region.trim(),materials:d.materials.trim(),leadDays:Number(d.leadDays),moq:d.moq.trim(),qms:d.qms.trim(),mtc:d.mtc,status:d.status,url:d.url.trim()});
    audit("ADD SUPPLIER","supplier",id,d.name.trim()+" added as "+d.status);
    closeDialog();commit("Supplier record added.");
  }});
}
function releaseReservations(wo) {
  (wo.reservations||[]).forEach((r)=>{const lot=getLot(r.lotId);if(lot)lot.reservedKg=Math.max(0,lot.reservedKg-r.kg);});
  wo.reservations=[];
}

function performAction(action,id) {
  const actions={"receipt":actionReceipt,"quality":()=>actionQuality(id),"issue":()=>actionIssue(id),"completion":actionCompletion,"dispatch":()=>actionDispatch(id),"adjust-raw":actionAdjustRaw,"adjust-fg":actionAdjustFg,"new-order":actionNewOrder,"new-supplier":actionNewSupplier};
  actions[action]?.();
}

function dueDemand(sku,horizon) {
  const end=new Date();end.setDate(end.getDate()+horizon);
  return state.orders.filter((o)=>o.sku===sku&&openOrderQty(o)>0&&new Date(o.dueDate+"T23:59:59")<=end).reduce((sum,o)=>sum+openOrderQty(o),0);
}
function calculatePlan(sku,horizon,additionalForecast) {
  const p=getProduct(sku), confirmed=dueDemand(sku,horizon), forecast=Math.round(p.forecast14*horizon/14)+additionalForecast, availableFg=fgAvailable(p);
  return calculatePlanningMetrics({sku,horizon,confirmed,forecast,safetyStock:p.safetyStock,availableFg,blankKg:p.blankKg,yieldPct:p.yieldPct,dailyCapacity:p.dailyCapacity,rawAvailable:materialAvailable(p.material),material:p.material});
}
function planActions(plan) {
  if(!plan.batch)return ["Do not release a new batch for this horizon.","Recheck forecast and reservations at the next planning cycle.","Keep available raw material uncommitted for higher-priority SKUs."];
  const actions=["Plan "+fmt(plan.batch)+" units across "+fmt(plan.productionDays)+" working day"+(plan.productionDays===1?"":"s")+".","Reserve "+fmt(plan.rawRequired,1)+" kg of "+plan.material+" released material.","Confirm the approved drawing, routing and inspection plan before work-order release."];
  if(plan.rawShortage>0)actions[1]="Procure or expedite "+fmt(plan.rawShortage,1)+" kg of "+plan.material+" before full release.";
  return actions;
}
function renderPlannerResult(plan,narrative) {
  const actions=narrative?.actions||planActions(plan), summary=narrative?.summary||("The recommendation combines confirmed demand, separate forecast demand, safety stock, released raw material and stated daily capacity.");
  $("#plannerResult").classList.remove("empty");
  $("#plannerResult").innerHTML='<div class="plan-top"><div><h3>'+esc(narrative?.headline||(plan.batch?"Plan "+fmt(plan.batch)+" units":"No batch required"))+'</h3><p>'+esc(summary)+'</p></div>'+status(plan.risk,plan.risk==="BALANCED"?"ok":plan.risk==="WATCH"?"watch":"critical")+'</div><div class="plan-metrics"><div><span>Confirmed + forecast</span><strong>'+fmt(plan.confirmed+plan.forecast)+'</strong></div><div><span>Recommended batch</span><strong>'+fmt(plan.batch)+'</strong></div><div><span>Gross raw material</span><strong>'+fmt(plan.rawRequired,1)+' kg</strong></div><div><span>Raw-material shortage</span><strong>'+fmt(plan.rawShortage,1)+' kg</strong></div><div><span>Production time</span><strong>'+fmt(plan.productionDays)+' days</strong></div><div><span>Projected closing</span><strong>'+fmt(plan.projectedClosing)+'</strong></div></div><ol class="plan-actions">'+actions.map((a)=>"<li>"+esc(a)+"</li>").join("")+'</ol><button class="button" id="createWorkOrder" '+(plan.batch===0?"disabled":"")+'>Create work order and reserve material</button>';
  $("#createWorkOrder")?.addEventListener("click",()=>createWorkOrder(plan));
}
async function getAiNarrative(plan) {
  const visitorKey="flangeflow_visitor";let visitorId=localStorage.getItem(visitorKey);if(!visitorId){visitorId=crypto.randomUUID();localStorage.setItem(visitorKey,visitorId);}
  const response=await fetch("/api/plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...plan,visitorId})});
  if(!response.ok)throw Error("Cloud planner unavailable");
  return response.json();
}
async function loadCloudStats() {
  try {
    const response=await fetch("/api/stats",{headers:{Accept:"application/json"}});
    if(!response.ok)return;
    const data=await response.json();
    cloudStats={available:true,totalRequests:Number(data.totalRequests)||0,criticalPlans:Number(data.criticalPlans)||0};
    renderKpis();
  } catch {}
}
function reserveMaterial(code,required) {
  let remaining=required;const reservations=[];
  const lots=state.lots.filter((l)=>l.material===code&&l.qualityStatus==="RELEASED"&&lotAvailable(l)>0).sort((a,b)=>a.receivedDate.localeCompare(b.receivedDate));
  for(const lot of lots){const qty=Math.min(remaining,lotAvailable(lot));if(qty>0){lot.reservedKg+=qty;reservations.push({lotId:lot.id,kg:qty});remaining-=qty;}if(remaining<=.001)break;}
  return {reservations,shortage:Math.max(0,remaining)};
}
function createWorkOrder(plan) {
  if(!hasPermission("create-wo")){toast("Switch to Production Supervisor, Stores Manager or Administrator.");return;}
  if(plan.batch<=0)return;
  const allocation=reserveMaterial(plan.material,plan.rawRequired);
  const id="WO-"+todayIso().replaceAll("-","")+"-"+String(state.workOrders.length+1).padStart(2,"0"),due=new Date();due.setDate(due.getDate()+plan.horizon);
  state.workOrders.unshift({id,sku:plan.sku,plannedQty:plan.batch,producedQty:0,issuedKg:0,scrapKg:0,createdDate:todayIso(),dueDate:due.toISOString().slice(0,10),status:allocation.shortage>0?"PLANNED":"MATERIAL RESERVED",reservations:allocation.reservations});
  const reserved=plan.rawRequired-allocation.shortage;
  transaction("RESERVATION",id,plan.material,reserved,"kg",allocation.shortage>0?"Partial reservation; shortage "+fmt(allocation.shortage,1)+" kg":"Raw material reserved for work order");
  audit("CREATE WORK ORDER","work_order",id,fmt(plan.batch)+" units; "+fmt(reserved,1)+" kg reserved");
  commit(allocation.shortage>0?"Work order created with a material shortage.":"Work order created and material reserved.");
}

function csvEscape(value){return '"'+String(value??"").replaceAll('"','""')+'"';}
function downloadCsv(filename,rows){const csv=rows.map((r)=>r.map(csvEscape).join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}
function exportInventory() {
  const rows=[["record_type","code","description","lot_id","heat_number","quantity","reserved","available","uom","bin","quality_status","supplier","received_date"]];
  state.lots.forEach((l)=>rows.push(["RAW",l.material,getMaterial(l.material).description,l.id,l.heat,l.onHandKg,l.reservedKg,lotAvailable(l),"kg",l.bin,l.qualityStatus,getSupplier(l.supplierId)?.name||"",l.receivedDate]));
  state.products.forEach((p)=>rows.push(["FG",p.sku,p.description,"","",p.fgOnHand,p.fgReserved,fgAvailable(p),"units",p.bin,"ACCEPTED","",""]));
  downloadCsv("flangeflow-inventory.csv",rows);
}
function parseCsv(text) {
  const rows=[];let row=[],cell="",quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&quoted&&n==='"'){cell+='"';i++;}else if(c==='"'){quoted=!quoted;}else if(c===","&&!quoted){row.push(cell);cell="";}else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&n==="\n")i++;row.push(cell);if(row.some((v)=>v!==""))rows.push(row);row=[];cell="";}else cell+=c;}row.push(cell);if(row.some((v)=>v!==""))rows.push(row);return rows;
}
async function importInventory(file) {
  if(!hasPermission("import")){toast("Only Stores Manager or Administrator can import opening balances.");return;}
  const rows=parseCsv(await file.text());if(rows.length<2)throw Error("CSV contains no data rows.");
  const headers=rows[0].map((h)=>h.trim().toLowerCase()),idx=(name)=>headers.indexOf(name);let imported=0;
  for(const r of rows.slice(1)){const type=r[idx("record_type")]?.trim().toUpperCase(),code=r[idx("code")]?.trim(),qty=Number(r[idx("quantity")]);
    if(!Number.isFinite(qty)||qty<0)continue;
    if(type==="RAW"&&getMaterial(code)){const lotId=r[idx("lot_id")]?.trim();if(!lotId||getLot(lotId))continue;const quality=(r[idx("quality_status")]?.trim().toUpperCase()||"QUARANTINE");if(!["RELEASED","QUARANTINE","REJECTED"].includes(quality))continue;state.lots.push({id:lotId,material:code,heat:r[idx("heat_number")]?.trim()||"UNSPECIFIED",supplierId:state.suppliers[0]?.id||"",receivedDate:r[idx("received_date")]?.trim()||todayIso(),onHandKg:qty,reservedKg:0,bin:r[idx("bin")]?.trim()||"UNASSIGNED",qualityStatus:quality,mtc:"Imported opening balance"});imported++;}
    if(type==="FG"&&getProduct(code)){getProduct(code).fgOnHand+=qty;imported++;}
  }
  audit("IMPORT INVENTORY","workbook","CSV IMPORT",imported+" inventory records imported");commit(imported+" inventory records imported.");
}

async function startScanner() {
  if(!("BarcodeDetector" in window)){const manual=prompt("Camera barcode detection is not supported in this browser. Enter or scan the code using a keyboard-wedge scanner:");if(manual){$("#globalSearch").value=manual;renderAll();}return;}
  try {
    scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    $("#scanVideo").srcObject=scannerStream;$("#scanDialog").showModal();
    const detector=new BarcodeDetector({formats:["qr_code","code_128","code_39","ean_13"]});
    const scan=async()=>{if(!$("#scanDialog").open)return;const codes=await detector.detect($("#scanVideo"));if(codes.length){$("#globalSearch").value=codes[0].rawValue;stopScanner();renderAll();toast("Code captured.");return;}requestAnimationFrame(scan);};scan();
  } catch { toast("Camera access was unavailable. Use the scan/enter field instead."); }
}
function stopScanner(){scannerStream?.getTracks().forEach((t)=>t.stop());scannerStream=null;$("#scanDialog").close();}

const viewMeta={dashboard:["Operations overview","Inventory control dashboard"],inventory:["Inventory control","Raw materials and finished goods"],transactions:["Traceable movements","Inventory transaction centre"],production:["Production planning","Capacity and material planning"],orders:["Demand control","Confirmed customer orders"],suppliers:["Procurement","Supplier qualification register"],audit:["Governance","Immutable demo audit trail"]};
function setView(view){activeView=view;$$(".view").forEach((v)=>v.classList.toggle("active",v.dataset.view===view));$$(".nav-item").forEach((b)=>b.classList.toggle("active",b.dataset.viewTarget===view));$("#viewEyebrow").textContent=viewMeta[view][0];$("#viewTitle").textContent=viewMeta[view][1];}

$("#roleSelect").addEventListener("change",(e)=>{state.currentRole=e.target.value;saveState();setRoleOptions();toast("Role switched to "+roleLabel()+".");});
$("#globalSearch").addEventListener("input",renderAll);
$("#dismissBanner").addEventListener("click",()=>$(".mode-banner").remove());
$("#scanButton").addEventListener("click",startScanner);$("#closeScanner").addEventListener("click",stopScanner);
$("#dialogSubmit").addEventListener("click",()=>{try{const form=$("#actionForm");if(!form.reportValidity())return;dialogHandler?.(dialogData());}catch(error){dialogError(error.message);}});
document.addEventListener("click",(e)=>{const action=e.target.closest("[data-action]");if(action)performAction(action.dataset.action,action.dataset.id);const jump=e.target.closest("[data-jump]");if(jump)setView(jump.dataset.jump);});
$$(".nav-item").forEach((b)=>b.addEventListener("click",()=>setView(b.dataset.viewTarget)));
$$("[data-inventory-tab]").forEach((b)=>b.addEventListener("click",()=>{inventoryTab=b.dataset.inventoryTab;$$("[data-inventory-tab]").forEach((x)=>x.classList.toggle("active",x===b));$$("[data-inventory-panel]").forEach((p)=>p.classList.toggle("active",p.dataset.inventoryPanel===inventoryTab));}));
$("#plannerForm").addEventListener("submit",async(e)=>{e.preventDefault();const plan=calculatePlan($("#plannerSku").value,Number($("#plannerHorizon").value),Number($("#plannerForecast").value));lastPlan=plan;renderPlannerResult(plan);$("#aiMode").textContent="Local calculation";try{const cloud=await getAiNarrative(plan);$("#aiMode").textContent="Gemini + Supabase";renderPlannerResult(cloud.plan||plan,cloud.narrative);await loadCloudStats();}catch{}});
$("#downloadTemplate").addEventListener("click",()=>downloadCsv("flangeflow-opening-balance-template.csv",[["record_type","code","lot_id","heat_number","quantity","bin","quality_status","supplier","received_date"],["RAW","A105","LOT-EXAMPLE","HEAT-EXAMPLE",500,"QC-HOLD-01","QUARANTINE","Supplier name",todayIso()],["FG","FF-B16.5-2-150-WN-A105","","",25,"FG-A-01","ACCEPTED","",todayIso()]]));
$("#importInventory").addEventListener("click",()=>$("#inventoryFile").click());$("#inventoryFile").addEventListener("change",async(e)=>{try{if(e.target.files[0])await importInventory(e.target.files[0]);}catch(error){toast(error.message);}e.target.value="";});
$("#exportInventory").addEventListener("click",exportInventory);
$("#exportTransactions").addEventListener("click",()=>downloadCsv("flangeflow-transactions.csv",[["time","type","reference","item","quantity","uom","role","note"],...state.transactions.map((t)=>[t.at,t.type,t.reference,t.item,t.quantity,t.uom,t.role,t.note])]));
$("#exportAudit").addEventListener("click",()=>downloadCsv("flangeflow-audit.csv",[["time","role","action","entity","reference","details"],...state.audit.map((a)=>[a.at,a.role,a.action,a.entity,a.reference,a.details])]));
$("#resetDemo").addEventListener("click",()=>{if(confirm("Reset all local demo data to its original state?")){state=seedState();saveState();renderAll();toast("Demo data reset.");}});

setRoleOptions();renderAll();setView("dashboard");loadCloudStats();
