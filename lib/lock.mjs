import { mkdirSync, openSync, closeSync, rmSync, existsSync, statSync } from "node:fs";
import { derivedDir, lockPath } from "./config.mjs";

const STALE_MS = 130000; // consolidate timeout(120s)보다 약간 김

export async function withIndexLock(fn) {
  mkdirSync(derivedDir(), { recursive: true });
  const p = lockPath();
  for (let i = 0; i < 600; i++) {
    try {
      const fd = openSync(p, "wx"); // O_EXCL
      closeSync(fd);
      try { return await fn(); }
      finally { try { rmSync(p); } catch {} }
    } catch (e) {
      if (existsSync(p)) {
        try { if (Date.now() - statSync(p).mtimeMs > STALE_MS) { rmSync(p); continue; } } catch {}
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  // 락 못 잡으면 그냥 실행(데드락 회피, 최후수단)
  return await fn();
}
