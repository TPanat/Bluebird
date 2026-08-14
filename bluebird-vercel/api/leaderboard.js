// GET /api/leaderboard
// Public, read-only, trimmed summary of every team's latest submission.
// Used to render the in-game comparison table for the whole class.

const { upstash } = require("../lib/upstash");

module.exports = async (req, res) => {
  try {
    const raw = (await upstash("HGETALL", "submissions")) || [];
    const rows = [];
    for (let i = 0; i < raw.length; i += 2) {
      try {
        const r = JSON.parse(raw[i + 1]);
        rows.push({
          team: r.team,
          methodPreview: (r.method || "").slice(0, 60),
          totalCut: r.totalCut,
          pct: r.pct,
          ops: r.ops,
          legal: r.legal,
          pr: r.pr,
          morale: r.morale,
          crisisIndex: r.crisisIndex,
        });
      } catch (e) {
        // skip malformed record
      }
    }
    rows.sort((a, b) => a.crisisIndex - b.crisisIndex);
    res.status(200).json({ rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
};
