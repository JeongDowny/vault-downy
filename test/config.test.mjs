import { test } from "node:test";
import assert from "node:assert";
import { homedir } from "node:os";
import { join } from "node:path";

test("vaultDir 기본값", async () => {
  delete process.env.VAULT_DOWNY_VAULT;
  const { vaultDir } = await import("../lib/config.mjs?" + Date.now());
  assert.equal(vaultDir(), join(homedir(), "vault-downy"));
});

test("vaultDir env override + 파생 경로", async () => {
  process.env.VAULT_DOWNY_VAULT = "/tmp/vd";
  const c = await import("../lib/config.mjs?" + Date.now());
  assert.equal(c.vaultDir(), "/tmp/vd");
  assert.equal(c.notesDir(), "/tmp/vd/notes");
  assert.equal(c.vectorsPath(), "/tmp/vd/.derived/vectors.bin");
  assert.equal(c.TOP_K, 3);
});
