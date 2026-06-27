import { test } from "node:test";
import assert from "node:assert";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lastUserTurn } from "../lib/transcript.mjs";

test("마지막 user 턴", () => {
  const d = mkdtempSync(join(tmpdir(), "vd-"));
  const p = join(d, "t.jsonl");
  writeFileSync(p, [
    JSON.stringify({ type: "user", message: { role: "user", content: "첫 발화 충분히 김" } }),
    JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "tool_result", content: "x" }] } }),
    JSON.stringify({ type: "user", message: { role: "user", content: "마지막 결정 내용" } }),
  ].join("\n"));
  assert.equal(lastUserTurn(p), "마지막 결정 내용");
});
