#!/usr/bin/env node
// SessionStart — 크래시 후보 백필 + 헬스 1줄. fail-open.
import { loadAll } from "../lib/candidates.mjs";
import { run as _consolidate } from "../lib/consolidate.mjs";
export async function run(stdinText) {
  let msg = "";
  try { if (loadAll().length) { const n = await _consolidate(); if (n) msg = `[memory] 이전 세션 후보 ${n}건 정리됨`; } }
  catch (e) { process.stderr.write(`session-start: ${e}\n`); }
  const o = { hookSpecificOutput: { hookEventName: "SessionStart" } };
  if (msg) o.hookSpecificOutput.additionalContext = msg;
  return JSON.stringify(o);
}
async function main() { const c = []; for await (const x of process.stdin) c.push(x); process.stdout.write(await run(c.join(""))); process.exit(0); }
if (import.meta.url === `file://${process.argv[1]}`) main();
