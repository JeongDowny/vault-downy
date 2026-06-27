import { test } from "node:test";
import assert from "node:assert";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function fresh() {
  const d = mkdtempSync(join(tmpdir(), "vd-"));
  process.env.VAULT_DOWNYU_VAULT = d;
  mkdirSync(join(d, "notes"), { recursive: true });
  return { d, c: await import("../lib/consolidate.mjs?" + Math.random()),
           cand: await import("../lib/candidates.mjs?" + Math.random()) };
}

test("후보→노트 작성 + removeFirst", async () => {
  const { d, c, cand } = await fresh();
  cand.append({ text: "헥토로 가자", session: "s1", cwd: "/x/danbiPay" });
  const n = await c.run({
    extractFn: async () => [{ gist: "결제 헥토 결정", verbatim: "헥토로", type: "decision", tags: ["pg"] }],
    embedFn: async (t) => [t.length, 1],
  });
  assert.equal(n, 1);
  assert.equal(readdirSync(join(d, "notes")).length, 1);
  assert.equal(cand.loadAll().length, 0);
});

test("코사인>0.9 의미중복 스킵", async () => {
  const { d, c, cand } = await fresh();
  writeFileSync(join(d, "notes", "old.md"),
    "---\nid: old\norigin: user-originated\ntags: []\n---\n\n## gist\n결제는 헥토\n", "utf8");
  cand.append({ text: "x", session: "s", cwd: "/x" });
  // 모든 임베딩 동일 벡터 → 기존과 코사인 1.0 → 스킵
  const n = await c.run({
    extractFn: async () => [{ gist: "헥토로 결제한다(표현다름)", verbatim: "v", type: "decision", tags: [] }],
    embedFn: async () => [1, 0],
  });
  assert.equal(n, 0);
});

test("처리 중 append 된 후보 보존", async () => {
  const { c, cand } = await fresh();
  cand.append({ text: "first", session: "s", cwd: "/x" });
  const n = await c.run({
    extractFn: async () => { cand.append({ text: "during", session: "s", cwd: "/x" }); return []; },
    embedFn: async () => [1, 0],
  });
  // 추출 0개라도 removeFirst(1) → during 1개 남아야
  const left = cand.loadAll();
  assert.equal(left.length, 1);
  assert.equal(left[0].text, "during");
});
