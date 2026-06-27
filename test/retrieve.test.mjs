import { test } from "node:test";
import assert from "node:assert";
import { buildQuery, rank, formatInjection } from "../lib/retrieve.mjs";

test("buildQuery 직전턴 포함", () => {
  assert.ok(buildQuery("왜안돼?", ["앞맥락"]).includes("앞맥락"));
});

test("rank scope 강등", () => {
  const idx = { dim: 2, rows: new Float32Array([1, 0, 1, 0]),
    meta: [{ id: "m", scope: { project: "quant" }, created: "c", origin: "user-originated", gist: "g1", tags: [] },
           { id: "o", scope: { project: "fin" }, created: "c", origin: "user-originated", gist: "g2", tags: [] }] };
  const out = rank([1, 0], idx, "/x/quant", 2);
  assert.equal(out[0].id, "m");
  assert.ok(out[0].score > out[1].score);
});

test("formatInjection 빈/계약", () => {
  assert.equal(formatInjection([]), "");
  const t = formatInjection([{ id: "a", gist: "삼성 SHORT", origin: "user-originated", created: "2026-06-08", score: 0.9 }]);
  assert.ok(t.includes("과거") && t.includes("무시해도") && t.includes("삼성 SHORT") && t.includes("2026-06-08"));
});
