import type { Pin, RevealResult } from "./types";

/**
 * Reveal Engine — the cognitive core of Pin.
 * Takes a set of pins and finds the hidden thread.
 *
 * Uses Anthropic Claude API to:
 * 1. Detect 2-3 related pins
 * 2. Generate a connection (thread label)
 * 3. Generate ONE insight
 * 4. Generate ONE question
 */
export async function generateReveal(pins: Pin[]): Promise<RevealResult> {
  if (pins.length < 2) {
    return {
      thread: "Not enough thoughts",
      insight: "Add more pins to discover hidden connections.",
      question: "What else is on your mind?",
      connected_pin_ids: [],
    };
  }

  const pinTexts = pins.map((p, i) => `[${i + 1}] ${p.text}`).join("\n");

  const prompt = `You are a cognitive insight engine. The user has captured these thoughts as "pins":

${pinTexts}

Your task:
1. Find 2-3 pins that share a hidden connection (something the user might not see)
2. Name that connection in 2-4 words (the "thread")
3. Generate ONE insight — a single sentence that reveals something meaningful about the connection
4. Generate ONE question — that deepens the user's understanding

Rules:
- The insight must feel like a revelation, not a summary
- The question must provoke genuine curiosity
- Be concise. One sentence each.
- Do NOT list multiple insights
- Do NOT be generic or motivational

Respond in this exact JSON format:
{
  "thread": "thread label",
  "insight": "one sentence insight",
  "question": "one sentence question",
  "connected_indices": [1, 3]
}

connected_indices are the 1-based indices of the connected pins.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback: simple local reveal when no API key
    return localReveal(pins);
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Anthropic API error:", response.status, errBody);
      return localReveal(pins);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return localReveal(pins);

    const parsed = JSON.parse(jsonMatch[0]);
    const indices: number[] = parsed.connected_indices || [1, 2];
    const connectedIds = indices
      .map((i: number) => pins[i - 1]?.id)
      .filter(Boolean);

    return {
      thread: parsed.thread || "Hidden Thread",
      insight: parsed.insight || "A connection exists between your thoughts.",
      question: parsed.question || "What does this pattern tell you?",
      connected_pin_ids: connectedIds,
    };
  } catch (err) {
    console.error("Reveal engine error:", err);
    return localReveal(pins);
  }
}

/** Simple local fallback when no AI is available */
function localReveal(pins: Pin[]): RevealResult {
  // Pick 2-3 random pins as "connected"
  const shuffled = [...pins].sort(() => Math.random() - 0.5);
  const connected = shuffled.slice(0, Math.min(3, pins.length));
  const words = connected.flatMap((p) => p.text.toLowerCase().split(/\s+/));

  // Find most common meaningful word
  const freq: Record<string, number> = {};
  words
    .filter((w) => w.length > 3)
    .forEach((w) => {
      freq[w] = (freq[w] || 0) + 1;
    });

  const topWord =
    Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || "pattern";

  return {
    thread: `The ${topWord} thread`,
    insight: `Your thoughts about "${connected[0]?.text.slice(0, 40)}..." and "${connected[1]?.text.slice(0, 40)}..." share a deeper connection than you might realize.`,
    question: `What would change if you saw these as parts of the same story?`,
    connected_pin_ids: connected.map((p) => p.id),
  };
}
