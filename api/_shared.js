import crypto from "node:crypto";

export const json = (res, status, body) => res.status(status).json(body);

export function allowPost(req, res) {
  if (req.method === "POST") return true;
  res.setHeader("Allow", "POST");
  json(res, 405, { error: "Method not allowed" });
  return false;
}

export function safeVisitorId(req, supplied) {
  const clean = String(supplied || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "anonymous";
  const forwarded = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  return crypto.createHash("sha256").update(`${clean}|${forwarded}`).digest("hex");
}

function supabaseConfig() {
  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY || "";
  if (!url || !key) throw new Error("Supabase is not configured.");
  return { url, key };
}

const supabaseHeaders = (key, prefer) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  ...(prefer ? { Prefer: prefer } : {}),
});

async function exactCount(endpoint) {
  const { key } = supabaseConfig();
  const response = await fetch(endpoint, { method: "HEAD", headers: supabaseHeaders(key, "count=exact") });
  if (!response.ok) throw new Error("Could not read Supabase statistics.");
  return Number((response.headers.get("content-range") || "*/0").split("/").pop()) || 0;
}

export async function countRequests(visitorId) {
  const { url } = supabaseConfig();
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return exactCount(`${url}/rest/v1/ai_planning_requests?select=id&visitor_id=eq.${encodeURIComponent(visitorId)}&created_at=gte.${encodeURIComponent(start.toISOString())}&created_at=lt.${encodeURIComponent(end.toISOString())}`);
}

export async function insertRequest(row) {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/ai_planning_requests`, {
    method: "POST",
    headers: supabaseHeaders(key, "return=minimal"),
    body: JSON.stringify(row),
  });
  if (!response.ok) throw new Error("Could not save the planning request.");
}

export async function countAll(risk) {
  const { url } = supabaseConfig();
  const suffix = risk ? `&risk_level=eq.${encodeURIComponent(risk)}` : "";
  return exactCount(`${url}/rest/v1/ai_planning_requests?select=id${suffix}`);
}
