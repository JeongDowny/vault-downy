import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { vectorsPath, metaPath, derivedDir } from "./config.mjs";
import { noteEmbedText } from "./schema.mjs";

function normalize(vec) {
  let n = 0; for (const x of vec) n += x * x;
  n = Math.sqrt(n) + 1e-9;
  return vec.map((x) => x / n);
}

export function saveIndex(vectors, meta) {
  mkdirSync(derivedDir(), { recursive: true });
  const dim = vectors.length ? vectors[0].length : 0;
  const flat = new Float32Array(vectors.length * dim);
  vectors.forEach((v, r) => normalize(v).forEach((x, c) => { flat[r * dim + c] = x; }));
  writeFileSync(vectorsPath(), Buffer.from(flat.buffer));
  writeFileSync(metaPath(), meta.map((m) => JSON.stringify(m)).join("\n") + (meta.length ? "\n" : ""));
  writeFileSync(vectorsPath() + ".dim", String(dim));
}

export function loadIndex() {
  if (!existsSync(vectorsPath()) || !existsSync(metaPath())) return { dim: 0, rows: new Float32Array(0), meta: [] };
  const dim = Number(readFileSync(vectorsPath() + ".dim", "utf8"));
  const buf = readFileSync(vectorsPath());
  // Node Buffer 풀링으로 byteOffset이 4의 배수가 아닐 수 있어 slice로 복사 후 뷰 생성
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const rows = new Float32Array(ab);
  const meta = readFileSync(metaPath(), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  return { dim, rows, meta };
}

export function cosineTopK(queryVec, idx, k) {
  const { dim, rows, meta } = idx;
  if (!dim || !meta.length) return [];
  const q = normalize(queryVec);
  const sims = [];
  for (let r = 0; r < meta.length; r++) {
    let s = 0;
    for (let c = 0; c < dim; c++) s += rows[r * dim + c] * (q[c] || 0);
    sims.push({ i: r, score: s });
  }
  sims.sort((a, b) => b.score - a.score);
  return sims.slice(0, k);
}

export async function rebuild(notes, embedFn) {
  if (!notes.length) { saveIndex([], []); return 0; }
  const vectors = [];
  const meta = [];
  for (const n of notes) {
    vectors.push(await embedFn(noteEmbedText(n)));
    meta.push({ id: n.id, path: n.path, created: n.created, origin: n.origin, scope: n.scope, tags: n.tags, gist: n.gist, verbatim: n.verbatim, valid_until: n.validUntil ?? null, superseded_by: n.supersededBy ?? null });
  }
  saveIndex(vectors, meta);
  return notes.length;
}
