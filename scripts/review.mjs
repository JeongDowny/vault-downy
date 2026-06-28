#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { notesDir } from "../lib/config.mjs";
import { parseNote } from "../lib/schema.mjs";

const args = process.argv.slice(2);
const daysIdx = args.indexOf("--days");
const days = daysIdx >= 0 ? Number(args[daysIdx + 1]) || 7 : 7;
const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

let files = [];
try { files = readdirSync(notesDir()).filter((f) => f.endsWith(".md")); } catch {}
const notes = files
  .map((f) => { try { return parseNote(readFileSync(join(notesDir(), f), "utf8"), join(notesDir(), f)); } catch { return null; } })
  .filter(Boolean)
  .filter((n) => String(n.created).slice(0, 10) >= cutoff)
  .sort((a, b) => String(b.created).localeCompare(String(a.created)));

for (const n of notes) {
  process.stdout.write(`${n.id}\t${String(n.created).slice(0, 10)}\t${n.origin}\t${n.gist}\n`);
}
