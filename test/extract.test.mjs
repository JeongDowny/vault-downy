import { test } from "node:test";
import assert from "node:assert";
import { extractNotes, ExtractError } from "../lib/extract.mjs";

const mock = (content) => async () => ({ ok: true, json: async () => ({ message: { content } }) });

test("노트 파싱", async () => {
  global.fetch = mock(JSON.stringify({ notes: [{ gist: "헥토 결정", verbatim: "헥토로", type: "decision", tags: ["pg"] }] }));
  const n = await extractNotes(["헥토로"], []);
  assert.equal(n[0].gist, "헥토 결정");
});

test("정상 빈배열", async () => {
  global.fetch = mock(JSON.stringify({ notes: [] }));
  assert.deepEqual(await extractNotes(["x"], []), []);
});

test("깨진 JSON → ExtractError", async () => {
  global.fetch = mock("이건 JSON 아님 {");
  await assert.rejects(() => extractNotes(["x"], []), ExtractError);
});

test("호출 실패 → ExtractError", async () => {
  global.fetch = async () => { throw new Error("down"); };
  await assert.rejects(() => extractNotes(["x"], []), ExtractError);
});
