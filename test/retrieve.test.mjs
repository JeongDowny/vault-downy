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

test("origin 가중 — model-proposed-approved가 user-originated보다 낮은 score", () => {
  const idx = {
    dim: 2, rows: new Float32Array([1, 0, 1, 0]),
    meta: [
      { id: "u", scope: {}, created: "2026-01-01", origin: "user-originated", gist: "g1", tags: [] },
      { id: "m", scope: {}, created: "2026-01-01", origin: "model-proposed-approved", gist: "g2", tags: [] },
    ]
  };
  const out = rank([1, 0], idx, null, 2);
  assert.equal(out[0].id, "u");
  assert.ok(out[0].score > out[1].score);
});

test("formatInjection — verbatim 발췌 포함", () => {
  const results = [{ id: "a", gist: "헥토 결정", origin: "user-originated", created: "2026-06-08", score: 0.9, verbatim: "헥토로 결제 진행하기로 했음" }];
  const t = formatInjection(results);
  assert.ok(t.includes("↳"), "verbatim 발췌 포함");
  assert.ok(t.includes("헥토로 결제"), "verbatim 내용 포함");
});

test("formatInjection — verbatim 없으면 ↳ 없음", () => {
  const results = [{ id: "b", gist: "결정사항", origin: "user-originated", created: "2026-06-08", score: 0.8, verbatim: "" }];
  const t = formatInjection(results);
  assert.ok(!t.includes("↳"), "verbatim 없으면 ↳ 미포함");
});

test("superseded_by 있는 노트 제외", () => {
  const idx = {
    dim: 2, rows: new Float32Array([1, 0, 1, 0]),
    meta: [
      { id: "old", scope: {}, created: "2026-01-01", origin: "user-originated", gist: "old", tags: [], superseded_by: "new" },
      { id: "new", scope: {}, created: "2026-06-01", origin: "user-originated", gist: "new", tags: [], superseded_by: null },
    ]
  };
  const out = rank([1, 0], idx, null, 5);
  assert.ok(out.every((m) => m.id !== "old"), "superseded 노트는 제외");
  assert.ok(out.some((m) => m.id === "new"));
});

test("created 최신이 동점에서 우선", () => {
  const idx = {
    dim: 2, rows: new Float32Array([1, 0, 1, 0]),
    meta: [
      { id: "older", scope: {}, created: "2026-01-01", origin: "user-originated", gist: "g", tags: [] },
      { id: "newer", scope: {}, created: "2026-06-01", origin: "user-originated", gist: "g", tags: [] },
    ]
  };
  const out = rank([1, 0], idx, null, 2);
  assert.equal(out[0].id, "newer", "최신이 앞에 와야 함");
});
