import { parseFrontmatter } from "./yaml.mjs";
import { MAX_EMBED_CHARS, VERBATIM_EXCERPT_CHARS } from "./config.mjs";

// split 방식으로 ## 섹션 파싱 — 견고하고 단순
function sections(body) {
  const parts = body.split(/^##\s+(\w+)\s*$/m);
  const res = {};
  for (let i = 1; i < parts.length; i += 2) res[parts[i].toLowerCase()] = (parts[i + 1] || "").trim();
  return res;
}

export function parseNote(text, path) {
  const { fm, body } = parseFrontmatter(text);
  const sec = sections(body);
  return {
    id: String(fm.id ?? ""),
    created: String(fm.created ?? ""),
    origin: String(fm.origin ?? "model-only"),
    scope: fm.scope && typeof fm.scope === "object" ? fm.scope : {},
    tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
    type: fm.type ? String(fm.type) : "fact",
    validUntil: fm.valid_until ?? null,
    supersededBy: fm.superseded_by ?? null,
    gist: sec.gist || "",
    verbatim: (sec.verbatim || "").replace(/^>\s?/gm, "").trim(),
    path,
  };
}

export function noteEmbedText(note) {
  const vb = note.verbatim.slice(0, VERBATIM_EXCERPT_CHARS);
  const text = [note.gist, vb, note.tags.join(" ")].filter(Boolean).join("\n").trim();
  return text.slice(0, MAX_EMBED_CHARS);
}
