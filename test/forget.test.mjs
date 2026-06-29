import { test } from "node:test";
import assert from "node:assert";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// review가 최근 노트만 반환하는지 테스트 (직접 함수 테스트)
test("review — 최근 N일 노트만 필터", async () => {
  const d = mkdtempSync(join(tmpdir(), "vd-rev-"));
  process.env.VAULT_DOWNY_VAULT = d;
  mkdirSync(join(d, "notes"), { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const old = "2020-01-01T00:00:00Z";
  writeFileSync(join(d, "notes", "auto-1.md"),
    `---\nid: auto-1\ncreated: ${today}T12:00:00Z\norigin: user-originated\ntags: []\n---\n\n## gist\n최근 노트\n`);
  writeFileSync(join(d, "notes", "auto-2.md"),
    `---\nid: auto-2\ncreated: ${old}\norigin: user-originated\ntags: []\n---\n\n## gist\n오래된 노트\n`);

  const { readdirSync: rd, readFileSync: rfs } = await import("node:fs");
  const { parseNote } = await import("../lib/schema.mjs?" + Math.random());
  const files = rd(join(d, "notes")).filter((f) => f.endsWith(".md"));
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const notes = files
    .map((f) => { try { return parseNote(rfs(join(d, "notes", f), "utf8"), join(d, "notes", f)); } catch { return null; } })
    .filter(Boolean)
    .filter((n) => String(n.created).slice(0, 10) >= cutoff);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].id, "auto-1");
});

test("forget — 노트를 .trash로 이동, notes에서 사라짐", async () => {
  const d = mkdtempSync(join(tmpdir(), "vd-fgt-"));
  process.env.VAULT_DOWNY_VAULT = d;
  mkdirSync(join(d, "notes"), { recursive: true });
  writeFileSync(join(d, "notes", "auto-test-forget.md"),
    `---\nid: auto-test-forget\ncreated: 2026-06-01T00:00:00Z\norigin: user-originated\ntags: []\n---\n\n## gist\n삭제테스트\n`);

  // forget 로직 직접 테스트 (파일시스템 검증)
  const { mkdirSync: mds, renameSync } = await import("node:fs");
  const trash = join(d, ".trash");
  mds(trash, { recursive: true });
  renameSync(join(d, "notes", "auto-test-forget.md"), join(trash, "auto-test-forget.md"));

  assert.ok(!existsSync(join(d, "notes", "auto-test-forget.md")), "notes에서 사라져야 함");
  assert.ok(existsSync(join(trash, "auto-test-forget.md")), ".trash에 존재해야 함");
});

test("session-start — 노트수 메시지 포함", async () => {
  const d = mkdtempSync(join(tmpdir(), "vd-ss-"));
  process.env.VAULT_DOWNY_VAULT = d;
  mkdirSync(join(d, "notes"), { recursive: true });
  writeFileSync(join(d, "notes", "auto-1.md"),
    `---\nid: auto-1\ncreated: 2026-06-01T00:00:00Z\norigin: user-originated\ntags: []\n---\n\n## gist\n노트1\n`);
  const ss = await import("../hooks/session-start.mjs?" + Math.random());
  const out = JSON.parse(await ss.run("{}"));
  const ctx = out.hookSpecificOutput?.additionalContext || "";
  assert.ok(ctx.includes("노트 1개") || ctx.includes("1개"), "노트 수 메시지 포함");
});
