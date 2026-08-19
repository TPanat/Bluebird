// POST /api/judge
// Body: { cutsSummary: string, methodText: string }
// Returns: { ops, pr, legal, morale, verdict }
//
// This runs server-side so the Anthropic API key never reaches the browser.

const SYSTEM_PROMPT = `คุณเป็นที่ปรึกษาด้าน HR กฎหมายแรงงาน และการบริหารความเสี่ยงองค์กร กำลังประเมิน "วิธีการ" ที่ทีมผู้เล่นในเกมจำลองสถานการณ์เขียนอธิบายว่าจะใช้เลิกจ้างพนักงานอย่างไร (บริบท: บริษัทโซเชียลมีเดีย กำลังปลดพนักงานจำนวนมาก คล้ายกรณีศึกษา Twitter ปี 2022)

หน้าที่ของคุณ: ประเมินผลกระทบ "เพิ่มเติม" ที่เกิดจากวิธีการที่อธิบาย (แยกจากผลกระทบที่เกิดจากจำนวนคนที่ถูกปลด ซึ่งระบบคำนวณแยกอยู่แล้ว) โดยให้คะแนนปรับ (modifier) เป็นตัวเลขในช่วง -30 ถึง 50 สำหรับแต่ละมิติ โดย 0 = เป็นไปตามมาตรฐานทั่วไปที่ไม่ดีไม่แย่ ค่าบวก = แย่ลง ค่าลบ = ดีขึ้นกว่ามาตรฐาน:
- ops: ผลต่อความต่อเนื่องของระบบ/การทำงาน (เช่น ตัดสิทธิ์กะทันหันจนไม่มีการส่งต่องาน)
- pr: ผลต่อภาพลักษณ์องค์กรและกระแสในโซเชียล/สื่อ
- legal: ความเสี่ยงทางกฎหมาย (เช่น ไม่แจ้งล่วงหน้าตามกฎหมาย เลือกปฏิบัติ ไม่มีค่าชดเชย)
- morale: ผลต่อขวัญกำลังใจพนักงานที่เหลืออยู่ (ค่าบวก = ขวัญกำลังใจแย่ลง)

ถ้าคำอธิบายที่ได้รับสั้นมาก คลุมเครือ หรือไม่สมเหตุสมผล ให้ประเมินอย่างสมเหตุสมผลที่สุดเท่าที่ทำได้ อย่าปฏิเสธที่จะให้คะแนน

ตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่นใดๆ นอกเหนือจาก JSON ห้ามมีคำนำ คำอธิบายก่อนหรือหลัง และห้ามใส่ markdown code fence เด็ดขาด คำตอบทั้งหมดของคุณต้องขึ้นต้นด้วยอักขระ { และจบด้วยอักขระ } เท่านั้น รูปแบบต้องเป็นดังนี้เป๊ะๆ:
{"ops": number, "pr": number, "legal": number, "morale": number, "verdict": "คำอธิบายสั้นๆ ภาษาไทย 2-3 ประโยค ให้เหตุผลโดยอ้างอิงหลักการ HR/กฎหมายแรงงาน/การบริหารภาพลักษณ์ที่เกี่ยวข้อง"}`;

function clampNum(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(-30, Math.min(50, n));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not configured on server" });
    return;
  }

  try {
    const { cutsSummary, methodText } = req.body || {};
    if (!methodText || typeof methodText !== "string" || methodText.trim().length < 5) {
      res.status(400).json({ error: "methodText is required" });
      return;
    }

    const userMsg = `รายละเอียดการปลดพนักงานของทีม:\n${(cutsSummary || "").slice(0, 2000)}\n\nคำอธิบายวิธีการแจ้งเลิกจ้างที่ทีมเขียน:\n"""${methodText.trim().slice(0, 1500)}"""`;

    // Ask Claude once. We rely on the system prompt's strict "JSON only" instruction
    // plus defensive extraction below — claude-sonnet-5 rejects assistant-message
    // prefill ("This model does not support assistant message prefill"), so the
    // conversation must end with a user message.
    async function askClaude() {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMsg }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Anthropic API error:", response.status, errText);
        throw new Error("Anthropic API request failed");
      }

      const data = await response.json();
      const textBlock = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      // Defensively slice out just the {...} object in case any preamble or
      // code fence slipped in before/after it.
      let raw = textBlock.replace(/```json|```/g, "");
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1 || end < start) {
        console.error("No JSON object found in Claude response:", textBlock);
        throw new Error("No JSON object in model response");
      }
      return JSON.parse(raw.slice(start, end + 1));
    }

    let parsed;
    let usedFallback = false;
    try {
      parsed = await askClaude();
    } catch (e1) {
      console.error("Judge attempt 1 failed, retrying once:", e1.message);
      try {
        parsed = await askClaude();
      } catch (e2) {
        console.error("Judge attempt 2 failed, using neutral fallback:", e2.message);
        usedFallback = true;
        parsed = {
          ops: 0,
          pr: 0,
          legal: 0,
          morale: 0,
          verdict:
            "ระบบวิเคราะห์คำอธิบายวิธีการไม่สำเร็จในครั้งนี้ จึงใช้ค่ากลาง (ไม่บวกไม่ลบ) แทนชั่วคราว ลองกด \"ลองใหม่อีกครั้ง\" เพื่อให้ Claude วิเคราะห์ใหม่อีกครั้งเพื่อผลที่แม่นยำกว่านี้",
        };
      }
    }

    res.status(200).json({
      ops: clampNum(parsed.ops),
      pr: clampNum(parsed.pr),
      legal: clampNum(parsed.legal),
      morale: clampNum(parsed.morale),
      verdict: typeof parsed.verdict === "string" ? parsed.verdict.slice(0, 800) : "",
      fallback: usedFallback,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to judge method" });
  }
};
