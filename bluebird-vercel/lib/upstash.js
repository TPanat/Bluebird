// Minimal client for the Upstash Redis REST API.
// Docs: https://upstash.com/docs/redis/features/restapi
// We POST the command as a JSON array to the database's REST URL,
// which avoids URL-encoding issues with JSON payloads (vs the GET-style
// /command/arg1/arg2 form).

async function upstash(...args) {
  // Vercel KV (created from Vercel's own Storage tab) uses KV_REST_API_URL /
  // KV_REST_API_TOKEN. A direct Upstash integration uses UPSTASH_REDIS_REST_URL /
  // UPSTASH_REDIS_REST_TOKEN. Both point to the same kind of REST endpoint
  // (Vercel KV is Upstash under the hood), so we accept whichever is present.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing Redis REST credentials: set either UPSTASH_REDIS_REST_URL / " +
      "UPSTASH_REDIS_REST_TOKEN, or KV_REST_API_URL / KV_REST_API_TOKEN"
    );
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Upstash error: ${data.error}`);
  }
  return data.result;
}

module.exports = { upstash };
