import { OLLAMA_URL, EMBED_MODEL } from "./config.mjs";
export class EmbedError extends Error {}

export async function embed(text, retries = 1) {
  let last;
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(`${OLLAMA_URL}/api/embed`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: EMBED_MODEL, input: text }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      return j.embeddings[0];
    } catch (e) { last = e; }
  }
  throw new EmbedError(String(last));
}
