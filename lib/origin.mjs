// turn-인접성 기반 provenance 분류 — 외부 LLM 없이 결정론적으로 동작
function tokens(s) { return new Set(s.toLowerCase().split(/\s+/).filter((w) => w.length > 1)); }

function jaccard(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export function classifyOrigin(userText, prevAssistant) {
  if (!prevAssistant) return "user-originated";
  const ov = jaccard(userText, prevAssistant);
  const short = userText.trim().length < 60;
  // 직전 assistant 발화와 의미 중복이 크면 model이 제안한 내용을 수락한 것
  if (ov > 0.5 || (short && ov > 0.3)) return "model-proposed-approved";
  return "user-originated";
}
