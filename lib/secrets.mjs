const P = {
  openai: /sk-[A-Za-z0-9]{20,}/g,
  aws: /AKIA[0-9A-Z]{16}/g,
  github: /gh[pousr]_[A-Za-z0-9]{30,}/g,
  google: /AIza[0-9A-Za-z_\-]{30,}/g,
  slack: /xox[baprs]-[0-9A-Za-z\-]{10,}/g,
  jwt: /eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g,
  pem: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  dburl: /[a-z]+:\/\/[^:\s]+:[^@\s]+@[^/\s]+/g,
  bearer: /Bearer\s+[A-Za-z0-9._\-]{16,}/g,
  krrrn: /\b\d{6}-[1-4]\d{6}\b/g,
};
export function scan(text) {
  return Object.entries(P).filter(([, re]) => { re.lastIndex = 0; return re.test(text); }).map(([n]) => n);
}
export function redact(text) {
  let out = text;
  for (const [n, re] of Object.entries(P)) out = out.replace(re, `[REDACTED:${n}]`);
  return out;
}
