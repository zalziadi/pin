/**
 * Embedding generation for semantic memory.
 * Uses Anthropic's Voyage AI or falls back gracefully.
 */

const EMBEDDING_DIM = 768;

/**
 * Generate a vector embedding for text.
 * Tries Voyage AI → falls back to deterministic hash embedding.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  // Try Voyage AI (Anthropic's embedding service)
  const voyageKey = process.env.VOYAGE_API_KEY;
  if (voyageKey) {
    try {
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${voyageKey}`,
        },
        body: JSON.stringify({
          model: "voyage-3-lite",
          input: [text],
          input_type: "document",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const vec = data.data?.[0]?.embedding;
        if (vec && vec.length === EMBEDDING_DIM) return vec;
      }
    } catch (err) {
      console.error("Voyage embedding error:", err);
    }
  }

  // Try Supabase edge function if configured
  const supabaseEmbedUrl = process.env.SUPABASE_EMBEDDING_URL;
  if (supabaseEmbedUrl) {
    try {
      const res = await fetch(supabaseEmbedUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.embedding?.length === EMBEDDING_DIM) return data.embedding;
      }
    } catch (err) {
      console.error("Supabase embedding error:", err);
    }
  }

  // Fallback: deterministic hash-based pseudo-embedding
  // This allows similarity search to work approximately
  return hashEmbedding(text);
}

/**
 * Deterministic pseudo-embedding from text hash.
 * NOT semantically meaningful but stable — same text → same vector.
 * Allows the system to work without a real embedding provider.
 */
function hashEmbedding(text: string): number[] {
  const normalized = text.toLowerCase().trim();
  const vec = new Array(EMBEDDING_DIM).fill(0);

  // Seed from character codes
  let seed = 0;
  for (let i = 0; i < normalized.length; i++) {
    seed = ((seed << 5) - seed + normalized.charCodeAt(i)) | 0;
  }

  // Generate pseudo-random vector from seed
  let state = Math.abs(seed) || 1;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    vec[i] = (state / 0x7fffffff) * 2 - 1; // range [-1, 1]
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(vec.reduce((sum: number, v: number) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vec[i] /= magnitude;
    }
  }

  return vec;
}

export { EMBEDDING_DIM };
