import { readFileSync } from "node:fs";
function userTexts(path) {
  let raw;
  try { raw = readFileSync(path, "utf8"); } catch { return []; }
  const out = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.type !== "user") continue;
    const msg = o.message || {};
    if (msg.role !== "user") continue;
    const c = msg.content;
    let t;
    if (typeof c === "string") t = c.trim();
    else if (Array.isArray(c)) {
      if (c.some((b) => b && b.type === "tool_result")) continue;
      t = c.filter((b) => b && b.type === "text").map((b) => b.text || "").join("\n").trim();
    } else continue;
    if (t && !t.startsWith("<")) out.push(t);
  }
  return out;
}
export function lastUserTurn(path) { const t = userTexts(path); return t.length ? t[t.length - 1] : ""; }
export function sessionDigest(path, max = 5) { return userTexts(path).slice(-max).join("\n---\n").slice(0, 4000); }
