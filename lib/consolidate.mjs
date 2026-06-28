import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { notesDir, vaultDir } from "./config.mjs";
import { loadAll, removeFirst } from "./candidates.mjs";
import { extractNotes } from "./extract.mjs";
import { scan, redact } from "./secrets.mjs";
import { withIndexLock } from "./lock.mjs";
import { embed as _embed } from "./embed.mjs";
import { parseNote } from "./schema.mjs";
import { rebuild } from "./index.mjs";

const norm = (s) => s.toLowerCase().replace(/\s+/g, "").slice(0, 40);
function cosine(a, b) {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return d / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}
function scopeLine(cwd) {
  if (cwd) { const p = basename(cwd.replace(/\/+$/, "")); if (p) return `  project: ${p}`; }
  return "  domain: general";
}
function existingNotes() {
  let files = [];
  try { files = readdirSync(notesDir()).filter((f) => f.endsWith(".md")); } catch { return []; }
  return files.map((f) => { try { return parseNote(readFileSync(join(notesDir(), f), "utf8"), join(notesDir(), f)); } catch { return null; } }).filter(Boolean);
}

export async function run({ extractFn = extractNotes, embedFn = _embed } = {}) {
  return withIndexLock(async () => {
    const recs = loadAll();
    if (!recs.length) return 0;
    const count = recs.length;
    const texts = recs.map((r) => r.text).filter(Boolean);
    const cwd = (recs.find((r) => r.cwd) || {}).cwd || null;
    const session = (recs.find((r) => r.session) || {}).session || "";

    const existing = existingNotes();
    const seenNorm = new Set(existing.map((n) => norm(n.gist)));
    // 기존 gist 임베딩(코사인 dedup용)
    const seenVecs = [];
    for (const n of existing) { if (n.gist) seenVecs.push(await embedFn(n.gist)); }

    let notes;
    try { notes = await extractFn(texts, existing.map((n) => n.gist)); }
    catch { return 0; } // 추출 실패(Ollama 다운/깨진 JSON) → 후보 보존, removeFirst 안 함

    mkdirSync(notesDir(), { recursive: true });
    const written = [];
    for (const nt of notes) {
      const gist = (nt.gist || "").trim();
      if (!gist || seenNorm.has(norm(gist))) continue;
      const gv = await embedFn(gist);
      if (seenVecs.some((v) => cosine(gv, v) > 0.9)) continue; // 의미중복 스킵
      seenNorm.add(norm(gist)); seenVecs.push(gv);
      let verb = (nt.verbatim || "").trim(); if (scan(verb).length) verb = redact(verb);
      let g = gist; if (scan(g).length) g = redact(g);
      const h = createHash("md5").update(g + session).digest("hex").slice(0, 6);
      const id = `auto-${Math.floor(Date.now() / 1000)}-${h}`;
      const tags = JSON.stringify((nt.tags || []).map(String));
      // 배치에 user-originated가 하나라도 있으면 user-originated, 전부 approved면 approved
      const batchOrigin = recs.some((r) => r.originHint === "user-originated")
        ? "user-originated"
        : "model-proposed-approved";
      const body = `---\nid: ${id}\ncreated: ${new Date().toISOString()}\norigin: ${batchOrigin}\nscope:\n${scopeLine(cwd)}\ntags: ${tags}\ntype: ${nt.type || "fact"}\nsource_session: ${session}\nsource: auto-capture\n---\n\n## verbatim\n> ${verb}\n\n## gist\n${g}\n`;
      writeFileSync(join(notesDir(), `${id}.md`), body, "utf8");
      written.push(id);
    }

    if (written.length) {
      const all = readdirSync(notesDir()).filter((f) => f.endsWith(".md"))
        .map((f) => parseNote(readFileSync(join(notesDir(), f), "utf8"), join(notesDir(), f)));
      await rebuild(all, embedFn);
      try {
        execFileSync("git", ["-C", vaultDir(), "add", "-A"], { stdio: "ignore" });
        execFileSync("git", ["-C", vaultDir(), "commit", "-m", `auto: 메모리 ${written.length}건`], { stdio: "ignore" });
      } catch {} // git 없거나 변경없음 → 무시
    }
    removeFirst(count); // 처리한 만큼만 제거(처리 중 append 보존)
    return written.length;
  });
}
