import { countAll, json } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
  try {
    const [totalRequests, criticalPlans] = await Promise.all([countAll(), countAll("CRITICAL")]);
    return json(res, 200, { totalRequests, criticalPlans });
  } catch (error) {
    return json(res, 503, { error: error.message || "Cloud statistics unavailable." });
  }
}
