#!/usr/bin/env node
// Stop — 저장가치 신호면 후보 적재(LLM 0). fail-open.
import { lastUserTurn, sessionDigest } from "../lib/transcript.mjs";
import { cheapScore, CHEAP_SCORE_MIN } from "../lib/gate.mjs";
import { scan, redact } from "../lib/secrets.mjs";
import { append } from "../lib/candidates.mjs";

export async function run(stdinText) {
  let ev; try { ev = JSON.parse(stdinText || "{}"); } catch { return; }
  const tp = ev.transcript_path; if (!tp) return;
  try {
    let text = lastUserTurn(tp);
    if (!text || cheapScore(text) < CHEAP_SCORE_MIN) return;
    if (scan(text).length) text = redact(text);
    append({ text, session: ev.session_id || "", cwd: ev.cwd, digest: sessionDigest(tp) });
  } catch (e) { process.stderr.write(`capture: ${e}\n`); }
}
async function main() { const c = []; for await (const x of process.stdin) c.push(x); await run(c.join("")); process.exit(0); }
if (import.meta.url === `file://${process.argv[1]}`) main();
