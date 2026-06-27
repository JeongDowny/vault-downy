// 노트 frontmatter 전용 미니 파서(부분집합). 외부 의존성 회피.
// 지원: key: scalar, 1단 중첩 맵, inline 배열 [a,b], 블록 리스트(- a), null/숫자/문자열.
function coerce(v) {
  const s = v.trim();
  if (s === "" ) return "";
  if (s === "null" || s === "~") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  const inner = (s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"));
  if (inner) return s.slice(1, -1);
  if (s.startsWith("[") && s.endsWith("]")) {
    const body = s.slice(1, -1).trim();
    if (!body) return [];
    return body.split(",").map((x) => coerce(x));
  }
  if (/^-?\d+$/.test(s)) return Number(s);
  return s;
}

export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error("frontmatter 없음");
  const lines = m[1].split(/\r?\n/);
  const fm = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const top = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!top) { i++; continue; }
    const key = top[1];
    const rest = top[2];
    if (rest === "") {
      // 블록 리스트 또는 중첩 맵
      const items = [];
      const map = {};
      let j = i + 1, isList = false, isMap = false;
      while (j < lines.length && /^\s+\S/.test(lines[j])) {
        const li = lines[j].match(/^\s+-\s+(.*)$/);
        const mi = lines[j].match(/^\s+([A-Za-z0-9_]+):\s*(.*)$/);
        if (li) { isList = true; items.push(coerce(li[1])); }
        else if (mi) { isMap = true; map[mi[1]] = coerce(mi[2]); }
        j++;
      }
      fm[key] = isList ? items : isMap ? map : null;
      i = j;
    } else {
      fm[key] = coerce(rest);
      i++;
    }
  }
  return { fm, body: m[2] };
}
