import { CHEAP_SCORE_MIN } from "./config.mjs";
export { CHEAP_SCORE_MIN };
const KW = /(결정|하기로|가자|이걸로|앞으로|무조건|선호|싫|좋아하|규칙|원칙|배웠|알고보니|결국|하지\s?마|하면\s?안|대신|방침|항상|never|always|말고|정정|바꾸자|기준)/;
const FP = /(나는|내가|우리는|난\s|제\s|저는)/;
export function cheapScore(text) {
  const t = (text || "").trim();
  let s = 0;
  if (KW.test(t)) s += 2;
  if (t.length > 80) s += 1;
  if (FP.test(t)) s += 1;
  return s;
}
