import { test } from "node:test";
import assert from "node:assert";
import { mkdtempSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("logRetrieval — jsonl 파일 append, 디렉터리 자동생성", async () => {
  const d = mkdtempSync(join(tmpdir(), "vd-met-"));
  process.env.VAULT_DOWNYU_VAULT = d;
  const { logRetrieval } = await import("../lib/metrics.mjs?" + Math.random());
  logRetrieval({ corpus_size: 10, candidates: [{ id: "a", score: 0.9 }], injected_ids: ["a"] });
  const p = join(d, ".derived", "retrieval.jsonl");
  assert.ok(existsSync(p));
  const line = JSON.parse(readFileSync(p, "utf8").trim());
  assert.ok(line.ts);
  assert.equal(line.corpus_size, 10);
});

test("logCapture — jsonl 파일 append", async () => {
  const d = mkdtempSync(join(tmpdir(), "vd-met2-"));
  process.env.VAULT_DOWNYU_VAULT = d;
  const { logCapture } = await import("../lib/metrics.mjs?" + Math.random());
  logCapture({ session: "s1", written: ["id1"], dedup_skipped: 0 });
  const p = join(d, ".derived", "capture.jsonl");
  assert.ok(existsSync(p));
  const line = JSON.parse(readFileSync(p, "utf8").trim());
  assert.deepEqual(line.written, ["id1"]);
});

test("logRetrieval — 예외 안 남 (fail-silent)", async () => {
  const d = mkdtempSync(join(tmpdir(), "vd-met3-"));
  process.env.VAULT_DOWNYU_VAULT = d;
  const { logRetrieval } = await import("../lib/metrics.mjs?" + Math.random());
  assert.doesNotThrow(() => logRetrieval({ corpus_size: 0 }));
});

test("consolidate — content_hash frontmatter 포함", async () => {
  const d = mkdtempSync(join(tmpdir(), "vd-ch-"));
  process.env.VAULT_DOWNYU_VAULT = d;
  mkdirSync(join(d, "notes"), { recursive: true });
  const cand = await import("../lib/candidates.mjs?" + Math.random());
  const c = await import("../lib/consolidate.mjs?" + Math.random());
  cand.append({ text: "결정", session: "s1", cwd: "/x", originHint: "user-originated" });
  await c.run({
    extractFn: async () => [{ gist: "해시테스트", verbatim: "해시원문", type: "decision", tags: [] }],
    embedFn: async () => [1, 0],
  });
  const { readdirSync, readFileSync } = await import("node:fs");
  const fname = readdirSync(join(d, "notes"))[0];
  const content = readFileSync(join(d, "notes", fname), "utf8");
  assert.ok(content.includes("content_hash:"), "content_hash frontmatter 존재");
});
