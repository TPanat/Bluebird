// POST /api/admin-reset
// Body or header must include the admin password.
// Deletes ALL saved submissions — use between class sessions.

const { upstash } = require("../lib/upstash");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!process.env.ADMIN_PASSWORD) {
    res.status(500).json({ error: "ADMIN_PASSWORD not configured on server" });
    return;
  }

  const password = req.headers["x-admin-password"] || (req.body && req.body.password);
  if (password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    await upstash("DEL", "submissions");
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reset data" });
  }
};
