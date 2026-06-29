import { test } from "node:test";
import assert from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function fresh() {
  const d = mkdtempSync(join(tmpdir(), "vd-"));
  process.env.VAULT_DOWNY_VAULT = d;
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

test("Float32 byteOffset 미정렬 버퍼 안전 로드 (dim=2 소형 파일)", async () => {
  // Node Buffer 풀링으로 byteOffset이 4의 배수가 아닐 때 Float32Array 생성이
  // RangeError를 던지는 문제를 buf.buffer.slice()로 복사해 방어하는지 검증
  const idx = await fresh();
  await idx.rebuild(
    [{ id: "x", path: "/x", created: "c", origin: "user-originated", scope: {}, tags: [], gist: "tiny", verbatim: "" }],
    async () => [1, 0]
  );
  let loaded;
  assert.doesNotThrow(() => { loaded = idx.loadIndex(); });
  const top = idx.cosineTopK([1, 0], loaded, 1);
  assert.equal(top.length, 1);
  assert.ok(top[0].score > 0.99, "코사인 유사도가 1에 근접해야 함");
});
