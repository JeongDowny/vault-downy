// 파일명/ID 슬러그 — gist 결정론적(같은 gist=같은 슬러그=멱등). Obsidian 가독.
export function slugify(gist) {
  const s = (gist || "").toLowerCase()
    .replace(/[^0-9a-z가-힣\s]/gi, " ")
    .trim().split(/\s+/).filter(Boolean).slice(0, 6).join("-").slice(0, 50).replace(/-+$/g, "");
  return s || "note";
}
// 날짜(YYYYMMDD) + 슬러그
export function noteStem(created, gist) {
  const date = (created || "").slice(0, 10).replace(/-/g, "") || "00000000";
  return `${date}-${slugify(gist)}`;
}
