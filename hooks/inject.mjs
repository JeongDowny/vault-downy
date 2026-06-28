#!/usr/bin/env node
// UserPromptSubmit — 인출·주입. 어떤 실패에도 exit 0(fail-visible).
import { embed as _embed } from "../lib/embed.mjs";
import { loadIndex } from "../lib/index.mjs";
import { buildQuery, rank, formatInjection } from "../lib/retrieve.mjs";
import { logRetrieval } from "../lib/metrics.mjs";

function wrap(text) {
  const o = { hookSpecificOutput: { hookEventName: "UserPromptSubmit" } };
  if (text) o.hookSpecificOutput.additionalContext = text;
  return JSON.stringify(o);
}

export async function run(stdinText, embedFn = _embed) {
  let ev;
  try { ev = JSON.parse(stdinText || "{}"); } catch { return wrap(""); }
  const prompt = (ev.prompt || "").trim();
  if (!prompt) return wrap("");
  let qv;
  try { qv = await embedFn(buildQuery(prompt)); }
  catch { return wrap("[memory: DEGRADED — embedder down]"); }
  try {
    const idx = loadIndex();
    const top = rank(qv, idx, ev.cwd);
    logRetrieval({
      corpus_size: idx.meta.length,
      candidates: top.slice(0, 5).map((m) => ({ id: m.id, score: m.score })),
      injected_ids: top.map((m) => m.id),
    });
    return wrap(formatInjection(top));
  } catch { return wrap("[memory: DEGRADED — index error]"); }
}

async function main() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  process.stdout.write(await run(chunks.join("")));
  process.exit(0);
}
if (import.meta.url === `file://${process.argv[1]}`) main();
