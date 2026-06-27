import { mkdirSync, appendFileSync, readFileSync, existsSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { candidatesPath, derivedDir } from "./config.mjs";

export function append(rec) {
  mkdirSync(derivedDir(), { recursive: true });
  appendFileSync(candidatesPath(), JSON.stringify(rec) + "\n");
  chmodSync(candidatesPath(), 0o600);
}
export function loadAll() {
  if (!existsSync(candidatesPath())) return [];
  return readFileSync(candidatesPath(), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
}
export function removeFirst(n) {
  if (!existsSync(candidatesPath())) return;
  const lines = readFileSync(candidatesPath(), "utf8").split("\n").filter((l) => l.trim());
  const rest = lines.slice(n);
  if (rest.length) { writeFileSync(candidatesPath(), rest.join("\n") + "\n"); chmodSync(candidatesPath(), 0o600); }
  else rmSync(candidatesPath());
}
export function clear() { if (existsSync(candidatesPath())) rmSync(candidatesPath()); }
