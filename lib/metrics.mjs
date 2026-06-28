// 인출·캡처 계측 로그 — fail-silent (메인 플로우에 영향 없어야 함)
import { mkdirSync, appendFileSync } from "node:fs";
import { derivedDir } from "./config.mjs";
import { join } from "node:path";

export function logRetrieval(rec) {
  try {
    const dir = derivedDir();
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, "retrieval.jsonl"), JSON.stringify({ ts: new Date().toISOString(), ...rec }) + "\n");
  } catch {}
}

export function logCapture(rec) {
  try {
    const dir = derivedDir();
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, "capture.jsonl"), JSON.stringify({ ts: new Date().toISOString(), ...rec }) + "\n");
  } catch {}
}
