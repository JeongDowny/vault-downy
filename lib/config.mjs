// 경로·상수 해결. vault 경로만 env override, 하드코딩 금지.
import { homedir } from "node:os";
import { join } from "node:path";

export const vaultDir = () =>
  process.env.VAULT_DOWNY_VAULT || join(homedir(), "vault-downy");
export const notesDir = () => join(vaultDir(), "notes");
export const derivedDir = () => join(vaultDir(), ".derived");
export const vectorsPath = () => join(derivedDir(), "vectors.bin");
export const metaPath = () => join(derivedDir(), "meta.jsonl");
export const candidatesPath = () => join(derivedDir(), "candidates.jsonl");
export const lockPath = () => join(derivedDir(), ".lock");

export const OLLAMA_URL = process.env.VAULT_DOWNY_OLLAMA_URL || "http://localhost:11434";
export const EMBED_MODEL = process.env.VAULT_DOWNY_EMBED_MODEL || "bge-m3";
export const EXTRACT_MODEL = process.env.VAULT_DOWNY_EXTRACT_MODEL || "qwen2.5:7b";
export const TOP_K = Number(process.env.VAULT_DOWNY_TOP_K || 3);
export const MAX_EMBED_CHARS = 6000;
export const VERBATIM_EXCERPT_CHARS = 1000;
export const INJECT_BUDGET = 1200;
export const CHEAP_SCORE_MIN = 2;
export const SCOPE_DEMOTE = 0.5;
export const ORIGIN_WEIGHT = { "user-originated": 1.0, "model-proposed-approved": 0.85, "model-only": 0.7 };
