// GET /api/admin-data
// Header: x-admin-password: <ADMIN_PASSWORD>   (or ?password=... query string)
// Returns every field of every team's latest submission, newest first.

const { upstash } = require("../lib/upstash");

module.exports = async (req, res) => {
  if (!process.env.ADMIN_PASSWORD) {
    res.status(500).json({ error: "ADMIN_PASSWORD not configured on server" });
    return;
  }

  const password = req.headers["x-admin-password"] || req.query.password;
  if (password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const raw = (await upstash("HGETALL", "submissions")) || [];
    const rows = [];
    for (let i = 0; i < raw.length; i += 2) {
      try {
        rows.push(JSON.parse(raw[i + 1]));
      } catch (e) {
        // skip malformed record
      }
    }
    rows.sort((a, b) => b.ts - a.ts);
    res.status(200).json({ rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load admin data" });
  }
};
