// POST /api/submit
// Body: { team, method, cuts, totalCut, pct, ops, legal, pr, morale, crisisIndex, verdict }
// Saves (overwrites) one record per team name into a Redis hash "submissions".

const { upstash } = require("../lib/upstash");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = req.body || {};
    const team = (body.team || "").toString().trim();
    if (!team) {
      res.status(400).json({ error: "team is required" });
      return;
    }

    const record = {
      team: team.slice(0, 60),
      method: (body.method || "").toString().slice(0, 1000),
      cuts: body.cuts && typeof body.cuts === "object" ? body.cuts : {},
      totalCut: Number(body.totalCut) || 0,
      pct: Number(body.pct) || 0,
      ops: Number(body.ops) || 0,
      legal: Number(body.legal) || 0,
      pr: Number(body.pr) || 0,
      morale: Number(body.morale) || 0,
      crisisIndex: Number(body.crisisIndex) || 0,
      verdict: (body.verdict || "").toString().slice(0, 1000),
      ts: Date.now(),
    };

    const field = record.team.toLowerCase().replace(/\s+/g, "-");
    await upstash("HSET", "submissions", field, JSON.stringify(record));

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save submission" });
  }
};
