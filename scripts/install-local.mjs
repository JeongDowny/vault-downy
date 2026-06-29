#!/usr/bin/env node
// 로컬 개발 설치 — ~/.claude/settings.json(user 스코프)에 이 플러그인의 4개 Node 훅을
// 안전 등록(기존 보존 append + 마커 멱등 + .bak 백업). --remove 로 제거.
// 정식 배포는 /plugin install 사용. 이건 마켓플레이스 없이 즉시 로컬 활성화용.
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "# vault-downy";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SETTINGS = join(homedir(), ".claude", "settings.json");
const HOOKS = {
  SessionStart: { script: "session-start.mjs", timeout: 120 },
  UserPromptSubmit: { script: "inject.mjs", timeout: 12 },
  Stop: { script: "capture.mjs", timeout: 12 },
  SessionEnd: { script: "consolidate.mjs", timeout: 120 },
};

const cmd = (s) => `node "${join(ROOT, "hooks", s)}"  ${MARKER}`;
const data = JSON.parse(readFileSync(SETTINGS, "utf8"));
const bak = `${SETTINGS}.bak.${Math.floor(Date.now() / 1000)}`;
copyFileSync(SETTINGS, bak);
data.hooks = data.hooks || {};

if (process.argv.includes("--remove")) {
  for (const ev of Object.keys(HOOKS)) {
    const grps = data.hooks[ev] || [];
    for (const g of grps) g.hooks = (g.hooks || []).filter((h) => !(h.command || "").includes(MARKER));
    data.hooks[ev] = grps.filter((g) => (g.hooks || []).length);
  }
  writeFileSync(SETTINGS, JSON.stringify(data, null, 2) + "\n");
  console.log(`제거 완료. backup=${bak}`);
} else {
  const added = [];
  for (const [ev, { script, timeout }] of Object.entries(HOOKS)) {
    const grps = (data.hooks[ev] = data.hooks[ev] || []);
    if (grps.some((g) => (g.hooks || []).some((h) => (h.command || "").includes(MARKER)))) continue;
    grps.push({ hooks: [{ type: "command", command: cmd(script), timeout }] });
    added.push(ev);
  }
  writeFileSync(SETTINGS, JSON.stringify(data, null, 2) + "\n");
  console.log(`등록(append): ${added.length ? added.join(", ") : "이미 전부"}. backup=${bak}`);
}
