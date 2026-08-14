// Minimal client for the Upstash Redis REST API.
// Docs: https://upstash.com/docs/redis/features/restapi
// We POST the command as a JSON array to the database's REST URL,
// which avoids URL-encoding issues with JSON payloads (vs the GET-style
// /command/arg1/arg2 form).

async function upstash(...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN environment variables"
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
