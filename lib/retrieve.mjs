import { basename } from "node:path";
import { TOP_K, INJECT_BUDGET, SCOPE_DEMOTE } from "./config.mjs";
import { cosineTopK } from "./index.mjs";

const HEADER =
  "## 관련 과거 경험 (자동 인출)\n" +
  "아래는 사용자의 과거 결정·선호다. 우선 고려하되, 현재 작업 맥락(프로젝트·규모·시점)과 " +
  "맞지 않으면 무시해도 된다. `AI제안수락`/`참고` 라벨은 가중이 낮다.\n";
const LABEL = { "user-originated": "내결정", "model-proposed-approved": "AI제안수락", "model-only": "참고" };
const approxTokens = (s) => Math.max(1, Math.floor(s.length / 3));

export function buildQuery(prompt, prevTurns = []) {
  return [...prevTurns, prompt].join("\n").trim();
}

export function rank(queryVec, idx, cwd, k = TOP_K) {
  const pairs = cosineTopK(queryVec, idx, Math.max(k * 3, k));
  if (!pairs.length) return [];
  const proj = cwd ? basename(cwd.replace(/\/+$/, "")) : null;
  const scored = pairs.map(({ i, score }) => {
    const m = { ...idx.meta[i] };
    const np = (m.scope || {}).project;
    m.score = proj && np && np !== proj ? score * SCOPE_DEMOTE : score;
    return m;
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

export function formatInjection(results) {
  if (!results.length) return "";
  const lines = [HEADER];
  let budget = INJECT_BUDGET - approxTokens(HEADER);
  for (const m of results) {
    const label = LABEL[m.origin] || "참고";
    const line = `- [${label}·${m.created || ""}·${(m.score ?? 0).toFixed(2)}] ${m.gist || ""}`;
    const t = approxTokens(line);
    if (t > budget) break;
    budget -= t;
    lines.push(line);
  }
  return lines.length === 1 ? "" : lines.join("\n");
}
