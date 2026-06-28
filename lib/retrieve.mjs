import { basename } from "node:path";
import { TOP_K, INJECT_BUDGET, SCOPE_DEMOTE, ORIGIN_WEIGHT } from "./config.mjs";
import { cosineTopK } from "./index.mjs";

// HEADER: 라벨별 실제 score 가중 적용 사실을 정직하게 안내
const HEADER =
  "## 관련 과거 경험 (자동 인출)\n" +
  "아래는 사용자의 과거 결정·선호다. 우선 고려하되, 현재 작업 맥락(프로젝트·규모·시점)과 " +
  "맞지 않으면 무시해도 된다. `내결정`(score×1.0) > `AI제안수락`(×0.85) > `참고`(×0.7) 순으로 가중된다.\n";
const LABEL = { "user-originated": "내결정", "model-proposed-approved": "AI제안수락", "model-only": "참고" };
const approxTokens = (s) => Math.max(1, Math.floor(s.length / 3));

export function buildQuery(prompt, prevTurns = []) {
  return [...prevTurns, prompt].join("\n").trim();
}

export function rank(queryVec, idx, cwd, k = TOP_K) {
  const pairs = cosineTopK(queryVec, idx, Math.max(k * 3, k));
  if (!pairs.length) return [];
  const proj = cwd ? basename(cwd.replace(/\/+$/, "")) : null;
  const today = new Date().toISOString().slice(0, 10);
  const scored = pairs
    .filter(({ i }) => {
      const m = idx.meta[i];
      // superseded 노트 제외
      if (m.superseded_by) return false;
      // 만료된 노트 제외
      if (m.valid_until && String(m.valid_until).slice(0, 10) < today) return false;
      return true;
    })
    .map(({ i, score }) => {
      const m = { ...idx.meta[i] };
      const np = (m.scope || {}).project;
      // 1단계: scope 강등
      m.score = proj && np && np !== proj ? score * SCOPE_DEMOTE : score;
      // 2단계: origin 가중(user-originated > model-proposed-approved > model-only)
      m.score *= (ORIGIN_WEIGHT[m.origin] ?? 1.0);
      return m;
    });
  // 점수 내림차순, 동점이면 최신 생성순
  scored.sort((a, b) => b.score - a.score || String(b.created).localeCompare(String(a.created)));
  return scored.slice(0, k);
}

export function formatInjection(results) {
  if (!results.length) return "";
  const lines = [HEADER];
  let budget = INJECT_BUDGET - approxTokens(HEADER);
  for (const m of results) {
    const label = LABEL[m.origin] || "참고";
    const vb = (m.verbatim || "").replace(/\s+/g, " ").slice(0, 120);
    const line = `- [${label}·${m.created || ""}·${(m.score ?? 0).toFixed(2)}] ${m.gist || ""}`;
    const verbatimLine = vb ? `\n    ↳ "${vb}"` : "";
    const t = approxTokens(line + verbatimLine);
    if (t > budget) break;
    budget -= t;
    lines.push(line + verbatimLine);
  }
  return lines.length === 1 ? "" : lines.join("\n");
}
