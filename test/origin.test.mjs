import { test } from "node:test";
import assert from "node:assert";
import { mkdtempSync, writeFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// classifyOrigin 단위 테스트
test("prevAssistant 없음 → user-originated", async () => {
  const { classifyOrigin } = await import("../lib/origin.mjs?" + Math.random());
  assert.equal(classifyOrigin("나는 내일 산에 가려고 결정했다", ""), "user-originated");
});

test("긴 독립 발화 → user-originated", async () => {
  const { classifyOrigin } = await import("../lib/origin.mjs?" + Math.random());
  const user = "앞으로 결제는 헥토로만 사용한다. 포트원은 레거시라 이 프로젝트에서 완전히 제외하기로 결정했다.";
  const prev = "React 컴포넌트 분리에 대해 설명할게요.";
  assert.equal(classifyOrigin(user, prev), "user-originated");
});

test("짧고 직전 제안과 overlap 큼 → model-proposed-approved", async () => {
  const { classifyOrigin } = await import("../lib/origin.mjs?" + Math.random());
  const prev = "헥토 포트원 결제 모듈을 사용하는 것을 추천드립니다";
  const user = "헥토 포트원 결제 모듈 사용"; // 짧고 겹침
  assert.equal(classifyOrigin(user, prev), "model-proposed-approved");
});

// lastTurnPair 테스트
test("lastTurnPair — user+assistant 교대", async () => {
  const { lastTurnPair } = await import("../lib/transcript.mjs?" + Math.random());
  const d = mkdtempSync(join(tmpdir(), "vd-tp-"));
  const p = join(d, "t.jsonl");
  writeFileSync(p, [
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: "첫 assistant 발화" } }),
    JSON.stringify({ type: "user", message: { role: "user", content: "두번째 user 발화" } }),
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: "두번째 assistant 발화" } }),
    JSON.stringify({ type: "user", message: { role: "user", content: "세번째 user 발화" } }),
  ].join("\n"));
  const pair = lastTurnPair(p);
  assert.equal(pair.user, "세번째 user 발화");
  assert.equal(pair.prevAssistant, "두번째 assistant 발화");
});

test("lastTurnPair — assistant 없음", async () => {
  const { lastTurnPair } = await import("../lib/transcript.mjs?" + Math.random());
  const d = mkdtempSync(join(tmpdir(), "vd-tp2-"));
  const p = join(d, "t.jsonl");
  writeFileSync(p, JSON.stringify({ type: "user", message: { role: "user", content: "첫 발화" } }));
  const pair = lastTurnPair(p);
  assert.equal(pair.user, "첫 발화");
  assert.equal(pair.prevAssistant, "");
});

// capture originHint 저장 테스트
test("capture — originHint 저장", async () => {
  const d = mkdtempSync(join(tmpdir(), "vd-cap-"));
  process.env.VAULT_DOWNYU_VAULT = d;
  const tp = join(d, "t.jsonl");
  // user 발화는 assistant 제안과 무관 → user-originated
  writeFileSync(tp, [
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: "뭔가 다른 주제" } }),
    JSON.stringify({ type: "user", message: { role: "user", content: "앞으로 결제는 헥토로 결정했다" } }),
  ].join("\n"));
  const cap = await import("../hooks/capture.mjs?" + Math.random());
  await cap.run(JSON.stringify({ transcript_path: tp, session_id: "s1", cwd: "/x" }));
  const cand = await import("../lib/candidates.mjs?" + Math.random());
  const recs = cand.loadAll();
  assert.equal(recs.length, 1);
  assert.ok("originHint" in recs[0], "originHint 필드 존재해야 함");
});

// consolidate 배치 origin 규칙 테스트
test("consolidate — user-originated 하나라도 있으면 user-originated", async () => {
  const d = mkdtempSync(join(tmpdir(), "vd-con-"));
  process.env.VAULT_DOWNYU_VAULT = d;
  mkdirSync(join(d, "notes"), { recursive: true });
  const cand = await import("../lib/candidates.mjs?" + Math.random());
  const c = await import("../lib/consolidate.mjs?" + Math.random());
  cand.append({ text: "결정내용", session: "s1", cwd: "/x", originHint: "user-originated" });
  cand.append({ text: "수락내용", session: "s1", cwd: "/x", originHint: "model-proposed-approved" });
  const n = await c.run({
    extractFn: async () => [{ gist: "헥토 결정", verbatim: "헥토로", type: "decision", tags: [] }],
    embedFn: async () => [1, 0],
  });
  assert.equal(n, 1);
  const fname = readdirSync(join(d, "notes"))[0];
  const content = readFileSync(join(d, "notes", fname), "utf8");
  assert.ok(content.includes("origin: user-originated"), "배치에 user-originated가 하나라도 있으면 user-originated");
});

test("consolidate — 전부 model-proposed-approved면 approved", async () => {
  const d = mkdtempSync(join(tmpdir(), "vd-con2-"));
  process.env.VAULT_DOWNYU_VAULT = d;
  mkdirSync(join(d, "notes"), { recursive: true });
  const cand = await import("../lib/candidates.mjs?" + Math.random());
  const c = await import("../lib/consolidate.mjs?" + Math.random());
  cand.append({ text: "수락1", session: "s1", cwd: "/x", originHint: "model-proposed-approved" });
  cand.append({ text: "수락2", session: "s1", cwd: "/x", originHint: "model-proposed-approved" });
  const n = await c.run({
    extractFn: async () => [{ gist: "수락된 제안", verbatim: "제안수락", type: "decision", tags: [] }],
    embedFn: async () => [1, 0],
  });
  assert.equal(n, 1);
  const fname = readdirSync(join(d, "notes"))[0];
  const content = readFileSync(join(d, "notes", fname), "utf8");
  assert.ok(content.includes("origin: model-proposed-approved"), "전부 수락이면 model-proposed-approved");
});
