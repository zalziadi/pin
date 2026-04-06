import type { Pin, RevealResult, UserProfile } from "./types";
import { recallSimilar, getRecentInsights } from "./memory";
import { getProfile, detectPatterns } from "./identity";

/**
 * Reveal Engine v2 — the cognitive core of Pin.
 *
 * Layers:
 * 1. Memory   — recalls similar pins + past insights
 * 2. Identity — injects user profile (themes, patterns, goals)
 * 3. Action   — every reveal produces insight + question + action
 * 4. Behavior — depth scoring evolves with use
 */

interface RevealContext {
  similarPins: Array<{ text: string; similarity: number }>;
  pastInsights: Array<{ insight: string; question: string; action: string }>;
  profile: UserProfile | null;
}

/**
 * Gather cognitive context from memory + identity layers.
 */
async function gatherContext(pins: Pin[]): Promise<RevealContext> {
  const combinedText = pins.map((p) => p.text).join(" ");

  // Parallel: recall memory + get profile + get recent insights
  const [memoryResult, profile, recentInsights] = await Promise.all([
    recallSimilar(combinedText, 5).catch(() => ({ pins: [], insights: [] })),
    getProfile().catch(() => null),
    getRecentInsights(5).catch(() => []),
  ]);

  return {
    similarPins: memoryResult.pins.map((p) => ({ text: p.text, similarity: p.similarity })),
    pastInsights: [
      ...memoryResult.insights.map((i) => ({ insight: i.insight, question: i.question, action: i.action })),
      ...recentInsights.map((i) => ({ insight: i.insight, question: i.question, action: i.action })),
    ].slice(0, 5),
    profile,
  };
}

/**
 * Build the cognitive prompt with all layers injected.
 */
function buildPrompt(pins: Pin[], ctx: RevealContext): string {
  const pinTexts = pins.map((p, i) => `[${i + 1}] ${p.text}`).join("\n");

  let prompt = `You are a cognitive insight engine. The user has captured these thoughts as "pins":

${pinTexts}
`;

  // Identity Layer — inject profile
  if (ctx.profile) {
    const p = ctx.profile;
    prompt += `
--- USER PROFILE ---
Recurring themes: ${p.recurring_themes.length > 0 ? p.recurring_themes.join(", ") : "not yet detected"}
Emotional patterns: ${p.emotional_patterns.length > 0 ? p.emotional_patterns.join(", ") : "not yet detected"}
Active goals: ${p.active_goals.length > 0 ? p.active_goals.join(", ") : "none set"}
Depth level: ${p.depth_level}/10 (${p.depth_level <= 3 ? "surface — be gentle" : p.depth_level <= 6 ? "developing — be direct" : "deep — be challenging"})
Total reveals: ${p.total_reveals}
${p.cognitive_signature ? `Cognitive signature: ${p.cognitive_signature}` : ""}
`;
  }

  // Memory Layer — inject similar past pins
  if (ctx.similarPins.length > 0) {
    prompt += `
--- MEMORY: SIMILAR PAST THOUGHTS ---
${ctx.similarPins.map((p) => `- "${p.text}" (similarity: ${(p.similarity * 100).toFixed(0)}%)`).join("\n")}
`;
  }

  // Memory Layer — inject past insights
  if (ctx.pastInsights.length > 0) {
    prompt += `
--- MEMORY: PAST INSIGHTS (do NOT repeat these) ---
${ctx.pastInsights.map((i) => `- Insight: "${i.insight}" | Action: "${i.action || "none"}"`).join("\n")}
`;
  }

  // Action Layer — require action output
  prompt += `
--- YOUR TASK ---
1. Find 2-3 pins that share a hidden connection (something the user might not see)
2. Name that connection in 2-4 words (the "thread")
3. Generate ONE insight — a single sentence that reveals something meaningful
4. Generate ONE question — that deepens the user's understanding
5. Generate ONE action — a concrete next step the user can take

Rules:
- The insight must feel like a revelation, not a summary
- The question must provoke genuine curiosity
- The action must be specific and doable (not vague like "reflect more")
- Be concise. One sentence each.
- Do NOT repeat past insights
- Do NOT be generic or motivational
${ctx.profile && ctx.profile.depth_level >= 5 ? "- This user is experienced — go deeper, be more challenging" : ""}

Respond in this exact JSON format:
{
  "thread": "thread label (2-4 words)",
  "insight": "one sentence insight",
  "question": "one sentence question",
  "action": "one concrete action",
  "action_type": "task|goal|reflection",
  "connected_indices": [1, 3],
  "depth_score": ${ctx.profile ? Math.min(ctx.profile.depth_level + 1, 10) : 3}
}

action_type must be one of: "task" (something to do), "goal" (something to aim for), "reflection" (something to think about).
connected_indices are the 1-based indices of the connected pins.`;

  return prompt;
}

/**
 * Call AI provider to generate reveal.
 */
async function callAI(prompt: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // Try Groq first
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 400,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      }
      console.error("Groq error:", res.status, await res.text());
    } catch (err) {
      console.error("Groq error:", err);
    }
  }

  // Fallback to Anthropic
  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 400,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.content?.[0]?.text || "";
      }
      console.error("Anthropic error:", res.status, await res.text());
    } catch (err) {
      console.error("Anthropic error:", err);
    }
  }

  return "";
}

/**
 * Main reveal function — orchestrates all layers.
 */
export async function generateReveal(pins: Pin[]): Promise<RevealResult> {
  if (pins.length < 2) {
    return {
      thread: "Not enough thoughts",
      insight: "Add more pins to discover hidden connections.",
      question: "What else is on your mind?",
      action: "Write down one more thought that's been lingering.",
      action_type: "reflection",
      connected_pin_ids: [],
    };
  }

  // Layer 1+2: Gather context (memory + identity)
  const ctx = await gatherContext(pins);

  // Build cognitive prompt with all layers
  const prompt = buildPrompt(pins, ctx);

  // Call AI
  const text = await callAI(prompt);
  if (!text) return localReveal(pins);

  // Parse response
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return localReveal(pins);

    const parsed = JSON.parse(jsonMatch[0]);
    const indices: number[] = parsed.connected_indices || [1, 2];
    const connectedIds = indices
      .map((i: number) => pins[i - 1]?.id)
      .filter(Boolean);

    const result: RevealResult = {
      thread: parsed.thread || "Hidden Thread",
      insight: parsed.insight || "A connection exists between your thoughts.",
      question: parsed.question || "What does this pattern tell you?",
      action: parsed.action || "Sit with this insight for 5 minutes.",
      action_type: ["task", "goal", "reflection"].includes(parsed.action_type)
        ? parsed.action_type
        : "reflection",
      connected_pin_ids: connectedIds,
      depth_score: parsed.depth_score || 1,
      memory_context: {
        similar_pins: ctx.similarPins.length,
        past_insights: ctx.pastInsights.length,
        profile_injected: !!ctx.profile,
      },
    };

    // System Behavior: update patterns after reveal
    if (ctx.profile) {
      detectPatterns(pins, [result]).catch(() => {});
    }

    return result;
  } catch (err) {
    console.error("Parse error:", err);
    return localReveal(pins);
  }
}

/** Local fallback when no AI is available */
function localReveal(pins: Pin[]): RevealResult {
  const shuffled = [...pins].sort(() => Math.random() - 0.5);
  const connected = shuffled.slice(0, Math.min(3, pins.length));
  const words = connected.flatMap((p) => p.text.toLowerCase().split(/\s+/));

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
    question: "What would change if you saw these as parts of the same story?",
    action: "Write down what these two thoughts have in common.",
    action_type: "reflection",
    connected_pin_ids: connected.map((p) => p.id),
  };
}
