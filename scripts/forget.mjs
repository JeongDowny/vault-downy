#!/usr/bin/env node
import { mkdirSync, renameSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { notesDir, vaultDir } from "../lib/config.mjs";
import { parseNote } from "../lib/schema.mjs";
import { rebuild } from "../lib/index.mjs";
import { embed } from "../lib/embed.mjs";

const id = process.argv[2];
if (!id) { process.stderr.write("usage: forget.mjs <id>\n"); process.exit(1); }

const trash = join(vaultDir(), ".trash");
mkdirSync(trash, { recursive: true });
mkdirSync(notesDir(), { recursive: true });

const files = readdirSync(notesDir()).filter((f) => f.endsWith(".md"));
const match = files.find((f) => f.startsWith(id));
if (!match) { process.stderr.write(`not found: ${id}\n`); process.exit(1); }

renameSync(join(notesDir(), match), join(trash, match));
process.stdout.write(`moved to .trash: ${match}\n`);

// 인덱스 재빌드
const remaining = readdirSync(notesDir()).filter((f) => f.endsWith(".md"))
  .map((f) => { try { return parseNote(readFileSync(join(notesDir(), f), "utf8"), join(notesDir(), f)); } catch { return null; } })
  .filter(Boolean);
await rebuild(remaining, embed);
process.stdout.write(`index rebuilt: ${remaining.length} notes\n`);
