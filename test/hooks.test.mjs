import { test } from "node:test";
import assert from "node:assert";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("capture 신호 있으면 적재, 잡담 스킵", async () => {
  const d = mkdtempSync(join(tmpdir(), "vd-"));
  process.env.VAULT_DOWNYU_VAULT = d;
  const tp = join(d, "t.jsonl");
  writeFileSync(tp, JSON.stringify({ type: "user", message: { role: "user", content: "앞으로 결제는 헥토로 결정" } }));
  const cap = await import("../hooks/capture.mjs?" + Math.random());
  await cap.run(JSON.stringify({ transcript_path: tp, session_id: "s1", cwd: "/x" }));
  const cand = await import("../lib/candidates.mjs?" + Math.random());
  assert.equal(cand.loadAll().length, 1);
});

test("capture bad input fail-open", async () => {
  const cap = await import("../hooks/capture.mjs?" + Math.random());
  await cap.run("not json"); // throw 안 나야
});
