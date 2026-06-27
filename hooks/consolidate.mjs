#!/usr/bin/env node
// SessionEnd — 후보 정제·저장. fail-open.
import { run as _run } from "../lib/consolidate.mjs";
export async function runHook() { try { return await _run(); } catch (e) { process.stderr.write(`consolidate: ${e}\n`); return 0; } }
async function main() { for await (const _ of process.stdin) {} await runHook(); process.exit(0); }
if (import.meta.url === `file://${process.argv[1]}`) main();
