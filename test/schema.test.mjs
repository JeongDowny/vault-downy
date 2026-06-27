import { test } from "node:test";
import assert from "node:assert";
import { parseNote, noteEmbedText } from "../lib/schema.mjs";

const NOTE = `---
id: n1
created: 2026-06-26T14:03:11+09:00
origin: user-originated
scope:
  project: quant-agent-kr
tags: [decision, claude-code]
type: decision
valid_until: null
---

## verbatim
> 무거운 캡처는 SessionEnd 배치로.

## gist
캡처 게이트를 SessionEnd 1회 배치로 결정.
`;

test("기본 파싱", () => {
  const n = parseNote(NOTE, "/x/a.md");
  assert.equal(n.id, "n1");
  assert.equal(n.origin, "user-originated");
  assert.equal(n.scope.project, "quant-agent-kr");
  assert.deepEqual(n.tags, ["decision", "claude-code"]);
  assert.equal(n.type, "decision");
  assert.equal(n.validUntil, null);
  assert.ok(n.verbatim.includes("SessionEnd 배치"));
  assert.ok(n.gist.includes("1회 배치로 결정"));
});

test("블록 리스트 태그 + 키순서 무관 + 따옴표", () => {
  const t = `---\ntags:\n  - x\n  - y\nid: "n2"\norigin: model-only\n---\n\n## gist\ng\n`;
  const n = parseNote(t, "/x/n.md");
  assert.equal(n.id, "n2");
  assert.deepEqual(n.tags, ["x", "y"]);
  assert.equal(n.verbatim, "");
});

test("noteEmbedText: gist 우선 + verbatim 발췌 절단", () => {
  const t = `---\nid: n3\norigin: user-originated\ntags: []\n---\n\n## verbatim\n${"가".repeat(5000)}\n\n## gist\n짧은요약\n`;
  const n = parseNote(t, "/x/n3.md");
  const e = noteEmbedText(n);
  assert.ok(e.length <= 6000);
  assert.ok(e.startsWith("짧은요약"));
  assert.ok(e.length < 5000 + 200); // verbatim 통째가 아니라 1000자 발췌
});
