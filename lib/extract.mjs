import { OLLAMA_URL, EXTRACT_MODEL } from "./config.mjs";
export class ExtractError extends Error {}

const PROMPT = (cands, existing) =>
`다음은 한 작업 세션에서 사용자가 한 발화 모음이다. 미래에 재사용할 가치가 있는 메모리만 추출하라.
- 포함: 결정/교훈/선호/중요사실/참고. 제외: 일회성 지시·잡담. 가치 없으면 빈 배열.
- 이미 있는 메모리(중복) 제외: ${existing}
- 각 노트: gist(문제프레이밍 한 줄, 일반화), verbatim(원문 발췌, 재작성 금지), type(decision|lesson|preference|fact|reference), tags(2~4).
반드시 JSON만: {"notes":[{"gist":"","verbatim":"","type":"decision","tags":[]}]}

발화:
${cands}`;

function parseJson(s) {
  let t = s.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) t = fence[1];
  else { const b = t.match(/\{[\s\S]*\}/); if (b) t = b[0]; }
  return JSON.parse(t); // 실패시 throw → 호출부서 ExtractError
}

export async function extractNotes(candTexts, existingGists) {
  const cands = candTexts.join("\n---\n").slice(0, 12000);
  const existing = existingGists.slice(0, 40).join("; ").slice(0, 3000);
  let content;
  try {
    const r = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: EXTRACT_MODEL, messages: [{ role: "user", content: PROMPT(cands, existing) }], stream: false, format: "json" }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    content = (await r.json()).message.content;
  } catch (e) { throw new ExtractError(String(e)); }
  let data;
  try { data = parseJson(content); } catch (e) { throw new ExtractError("parse: " + e); }
  return (data.notes || []).filter((n) => n && n.gist).map((n) => ({
    gist: String(n.gist).trim(), verbatim: String(n.verbatim || "").trim(),
    type: n.type || "fact", tags: (n.tags || []).map(String),
  }));
}
