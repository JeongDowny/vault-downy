import { test } from "node:test";
import assert from "node:assert";
import { embed, EmbedError } from "../lib/embed.mjs";

function mockFetch(seq) {
  let i = 0;
  return async () => {
    const r = seq[i++];
    if (r instanceof Error) throw r;
    return { ok: true, json: async () => ({ embeddings: [r] }) };
  };
}

test("성공", async () => {
  global.fetch = mockFetch([[0.1, 0.2]]);
  assert.deepEqual(await embed("hi"), [0.1, 0.2]);
});

test("콜드 재시도 후 성공", async () => {
  global.fetch = mockFetch([new Error("cold"), [1.0]]);
  assert.deepEqual(await embed("hi", 1), [1.0]);
});

test("실패 시 EmbedError", async () => {
  global.fetch = mockFetch([new Error("down"), new Error("down")]);
  await assert.rejects(() => embed("hi", 1), EmbedError);
});
