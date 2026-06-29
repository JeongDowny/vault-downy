#!/usr/bin/env node
// 노트 파일명을 YYYYMMDD-<gist슬러그>.md 로 통일(Obsidian 가독 + gist 결정론 = 멱등).
// frontmatter id 도 파일명과 일치시킴. 같은 gist→같은 슬러그→같은 파일(자연 dedup).
import { readdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { notesDir } from "../lib/config.mjs";
import { parseNote } from "../lib/schema.mjs";
import { createHash } from "node:crypto";

export function slugify(gist) {
  const s = (gist || "").toLowerCase()
    .replace(/[^0-9a-z가-힣\s]/gi, " ")
    .trim().split(/\s+/).filter(Boolean).slice(0, 6).join("-").slice(0, 50).replace(/-+$/g, "");
  return s || "note";
}
export function noteStem(note) {
  const date = (note.created || "").slice(0, 10).replace(/-/g, "") || "00000000";
  return `${date}-${slugify(note.gist)}`;
}

function main() {
  const files = readdirSync(notesDir()).filter((f) => f.endsWith(".md"));
  const used = new Map(); // stem -> gisthash (충돌 감지)
  let renamed = 0, merged = 0;
  for (const f of files) {
    const p = join(notesDir(), f);
    const text = readFileSync(p, "utf8");
    let note;
    try { note = parseNote(text, p); } catch { continue; }
    let stem = noteStem(note);
    const gh = createHash("md5").update(note.gist).digest("hex").slice(0, 8);
    // 같은 stem 인데 다른 gist → 충돌 → 해시 suffix
    if (used.has(stem) && used.get(stem) !== gh) stem = `${stem}-${gh.slice(0, 4)}`;
    used.set(stem, gh);
    const target = `${stem}.md`;
    if (f === target) continue;
    // frontmatter id 갱신(파일명과 일치)
    const newText = text.replace(/^id:\s*.*$/m, `id: ${stem}`);
    const tp = join(notesDir(), target);
    // 타깃이 이미 있으면(같은 gist 멱등) 내용 갱신만 = 병합
    if (files.includes(target) && target !== f) { writeFileSync(tp, newText); merged++; }
    else { writeFileSync(p, newText); renameSync(p, tp); renamed++; }
  }
  process.stdout.write(`rename ${renamed}, merge(중복덮어쓰기) ${merged}, 최종 ${readdirSync(notesDir()).filter((f)=>f.endsWith(".md")).length}\n`);
}
main();
