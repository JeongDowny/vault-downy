import { test } from "node:test";
import assert from "node:assert";
import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cheapScore } from "../lib/gate.mjs";
import { scan, redact } from "../lib/secrets.mjs";

test("gate 점수", () => {
  assert.ok(cheapScore("앞으로 결제는 헥토로 가기로 결정") >= 2);
  assert.ok(cheapScore("이거 고쳐") < 2);
});

test("secrets", () => {
  assert.ok(scan("sk-abcdefghijklmnopqrstuvwx").length);
  assert.ok(scan("901231-1234567").length);
  assert.deepEqual(scan("평범한 결정 문장"), []);
  assert.ok(redact("키 sk-abcdefghijklmnopqrstuvwx").includes("[REDACTED"));
});

test("candidates append/load/removeFirst", async () => {
  const d = mkdtempSync(join(tmpdir(), "vd-"));
  process.env.VAULT_DOWNY_VAULT = d;
  const c = await import("../lib/candidates.mjs?" + Math.random());
  c.append({ text: "a" }); c.append({ text: "b" }); c.append({ text: "c" });
  assert.equal(c.loadAll().length, 3);
  assert.equal(statSync(join(d, ".derived", "candidates.jsonl")).mode.toString(8).slice(-3), "600");
  c.removeFirst(2);
  const left = c.loadAll();
  assert.equal(left.length, 1);
  assert.equal(left[0].text, "c");
});
