import { test } from "node:test";
import assert from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function fresh() {
  const d = mkdtempSync(join(tmpdir(), "vd-"));
  process.env.VAULT_DOWNYU_VAULT = d;
  return await import("../lib/index.mjs?" + Math.random());
}

test("코사인 순위", async () => {
  const idx = await fresh();
  await idx.rebuild(
    [{ id: "a", path: "/a", created: "c", origin: "user-originated", scope: {}, tags: [], gist: "g1", verbatim: "" },
     { id: "b", path: "/b", created: "c", origin: "user-originated", scope: {}, tags: [], gist: "g2", verbatim: "" }],
    async (t) => (t.includes("g1") ? [1, 0] : [0, 1])
  );
  const loaded = idx.loadIndex();
  const top = idx.cosineTopK([1, 0], loaded, 2);
  assert.equal(top[0].i, 0);
  assert.ok(top[0].score > top[1].score);
});

test("빈 인덱스", async () => {
  const idx = await fresh();
  const loaded = idx.loadIndex();
  assert.deepEqual(idx.cosineTopK([1, 0], loaded, 3), []);
});
