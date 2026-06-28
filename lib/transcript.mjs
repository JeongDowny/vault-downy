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

// 마지막 user 발화와 그 직전 assistant 발화를 한 쌍으로 반환
export function lastTurnPair(path) {
  let raw;
  try { raw = readFileSync(path, "utf8"); } catch { return { user: "", prevAssistant: "" }; }
  const turns = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const msg = o.message || {};
    const role = msg.role;
    if (role !== "user" && role !== "assistant") continue;
    const c = msg.content;
    let t;
    if (typeof c === "string") t = c.trim();
    else if (Array.isArray(c)) {
      // tool_result 포함된 user 턴은 스킵(capture와 동일한 필터)
      if (role === "user" && c.some((b) => b && b.type === "tool_result")) continue;
      t = c.filter((b) => b && b.type === "text").map((b) => b.text || "").join("\n").trim();
    } else continue;
    if (t && !t.startsWith("<")) turns.push({ role, text: t });
  }
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].role === "user") {
      const user = turns[i].text;
      let prevAssistant = "";
      for (let j = i - 1; j >= 0; j--) {
        if (turns[j].role === "assistant") { prevAssistant = turns[j].text; break; }
      }
      return { user, prevAssistant };
    }
  }
  return { user: "", prevAssistant: "" };
}
