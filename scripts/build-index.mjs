#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { notesDir } from "../lib/config.mjs";
import { parseNote } from "../lib/schema.mjs";
import { rebuild } from "../lib/index.mjs";
import { embed } from "../lib/embed.mjs";
async function main() {
  let files = [];
  try { files = readdirSync(notesDir()).filter((f) => f.endsWith(".md")); } catch {}
  const notes = [];
  for (const f of files.sort()) {
    try { notes.push(parseNote(readFileSync(join(notesDir(), f), "utf8"), join(notesDir(), f))); }
    catch (e) { process.stderr.write(`skip ${f}: ${e}\n`); }
  }
  const n = await rebuild(notes, embed);
  process.stdout.write(`indexed ${n} notes\n`);
}
main();
