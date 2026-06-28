#!/usr/bin/env node
// SessionStart — 크래시 후보 백필 + 헬스 1줄. fail-open.
import { loadAll } from "../lib/candidates.mjs";
import { run as _consolidate } from "../lib/consolidate.mjs";
import { readdirSync } from "node:fs";
import { notesDir } from "../lib/config.mjs";

export async function run(stdinText) {
  let msg = "";
  try { if (loadAll().length) { const n = await _consolidate(); if (n) msg = `[memory] 이전 세션 후보 ${n}건 정리됨`; } }
  catch (e) { process.stderr.write(`session-start: ${e}\n`); }

  // 보유 노트 수를 세어 리뷰 안내 포함
  let noteCount = 0;
  try { noteCount = readdirSync(notesDir()).filter((f) => f.endsWith(".md")).length; } catch {}
  const noteMsg = noteCount > 0 ? `[memory] 노트 ${noteCount}개. /vault-review 로 최근 항목 검토 가능.` : "";

  const finalMsg = [msg, noteMsg].filter(Boolean).join(" ");
  const o = { hookSpecificOutput: { hookEventName: "SessionStart" } };
  if (finalMsg) o.hookSpecificOutput.additionalContext = finalMsg;
  return JSON.stringify(o);
}
async function main() { const c = []; for await (const x of process.stdin) c.push(x); process.stdout.write(await run(c.join(""))); process.exit(0); }
if (import.meta.url === `file://${process.argv[1]}`) main();
