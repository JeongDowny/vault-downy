#!/usr/bin/env node
// 의미 중복 정리(유지보수). 노트 gist 임베딩 → 코사인>임계 클러스터 → 가장 풍부한 1개 남기고
// 나머지 .trash 로 이동 → 인덱스 재빌드. 백필 재실행 후 누적 중복 청소용.
import { readdirSync, readFileSync, renameSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { notesDir, vaultDir } from "../lib/config.mjs";
import { parseNote } from "../lib/schema.mjs";
import { embed } from "../lib/embed.mjs";
import { rebuild } from "../lib/index.mjs";

const THRESHOLD = Number(process.argv.find((a) => a.startsWith("--t="))?.slice(4) || 0.9);
const cos = (a, b) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return d / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9); };

async function main() {
  const files = readdirSync(notesDir()).filter((f) => f.endsWith(".md"));
  const notes = files.map((f) => { const p = join(notesDir(), f); const n = parseNote(readFileSync(p, "utf8"), p); n.file = f; n.rich = (n.gist || "").length + (n.verbatim || "").length; return n; }).filter((n) => n.gist);
  process.stdout.write(`임베딩 ${notes.length}개...\n`);
  for (const n of notes) n.vec = await embed(n.gist);
  // 풍부한 순으로 정렬 → 앞에서부터 keep, 뒤의 유사한 것 제거
  notes.sort((a, b) => b.rich - a.rich);
  const removed = [];
  const kept = [];
  for (const n of notes) {
    if (kept.some((k) => cos(k.vec, n.vec) > THRESHOLD)) removed.push(n);
    else kept.push(n);
  }
  if (removed.length) {
    mkdirSync(join(vaultDir(), ".trash"), { recursive: true });
    for (const n of removed) renameSync(join(notesDir(), n.file), join(vaultDir(), ".trash", n.file));
    const all = readdirSync(notesDir()).filter((f) => f.endsWith(".md")).map((f) => parseNote(readFileSync(join(notesDir(), f), "utf8"), join(notesDir(), f)));
    await rebuild(all, embed);
  }
  process.stdout.write(`유지 ${kept.length}, 중복제거 ${removed.length}(→.trash), 임계 ${THRESHOLD}\n`);
}
main();
