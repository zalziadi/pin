import { getSupabaseServer } from "./supabase-server";
import type { Pin, RevealResult, UserProfile } from "./types";

const USER_ID = "default";

/**
 * Get or create user profile.
 */
export async function getProfile(userId?: string): Promise<UserProfile | null> {
  const sb = getSupabaseServer();
  if (!sb) return null;

  const id = userId || USER_ID;

  const { data, error } = await sb
    .from("user_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    // Create default profile
    const { data: newProfile } = await sb
      .from("user_profiles")
      .upsert({ id, recurring_themes: [], emotional_patterns: [], active_goals: [] })
      .select("*")
      .single();

    return newProfile as UserProfile | null;
  }

  return data as UserProfile;
}

/**
 * Update user profile fields.
 */
export async function updateProfile(
  data: Partial<UserProfile>,
  userId?: string
): Promise<UserProfile | null> {
  const sb = getSupabaseServer();
  if (!sb) return null;

  const id = userId || USER_ID;

  const { data: updated, error } = await sb
    .from("user_profiles")
    .update({ ...data, updated_at: new Date().toISOString(), last_active: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Update profile error:", error.message);
    return null;
  }

  return updated as UserProfile;
}

/**
 * Detect recurring patterns from pins and insights.
 * Called after each reveal to evolve the profile.
 */
export async function detectPatterns(
  pins: Pin[],
  insights: RevealResult[]
): Promise<void> {
  const sb = getSupabaseServer();
  if (!sb) return;

  const profile = await getProfile();
  if (!profile) return;

  // Extract themes from pin text
  const allText = [
    ...pins.map((p) => p.text),
    ...insights.map((i) => `${i.thread} ${i.insight}`),
  ].join(" ").toLowerCase();

  // Simple theme extraction: frequent meaningful words
  const words = allText.split(/\s+/).filter((w) => w.length > 4);
  const freq: Record<string, number> = {};
  words.forEach((w) => {
    freq[w] = (freq[w] || 0) + 1;
  });

  const newThemes = Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  // Detect emotional patterns from keywords
  const emotionKeywords: Record<string, string[]> = {
    anxiety: ["worried", "anxious", "fear", "scared", "nervous", "stress", "stuck"],
    ambition: ["goal", "achieve", "build", "grow", "success", "dream", "want"],
    avoidance: ["postpone", "avoid", "later", "procrastinate", "delay", "can't"],
    curiosity: ["wonder", "explore", "discover", "learn", "understand", "why"],
    frustration: ["frustrated", "angry", "annoyed", "tired", "exhausted", "enough"],
    longing: ["miss", "wish", "hope", "someday", "travel", "freedom"],
  };

  const detectedEmotions: string[] = [];
  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    if (keywords.some((k) => allText.includes(k))) {
      detectedEmotions.push(emotion);
    }
  }

  // Extract goals from action-type insights
  const newGoals = insights
    .filter((i) => i.action_type === "goal")
    .map((i) => i.action)
    .filter(Boolean);

  // Merge with existing profile (don't overwrite — accumulate)
  const mergedThemes = [...new Set([...profile.recurring_themes, ...newThemes])].slice(0, 20);
  const mergedEmotions = [...new Set([...profile.emotional_patterns, ...detectedEmotions])].slice(0, 10);
  const mergedGoals = [...new Set([...profile.active_goals, ...newGoals])].slice(0, 10);

  // Increment depth level every 5 reveals
  const newReveals = profile.total_reveals + 1;
  const newDepth = Math.min(10, Math.floor(newReveals / 5) + 1);

  // Generate cognitive signature every 10 reveals
  let cognitiveSignature = profile.cognitive_signature;
  if (newReveals % 10 === 0 && mergedThemes.length > 0) {
    cognitiveSignature = await generateSignature(mergedThemes, mergedEmotions, mergedGoals);
  }

  await updateProfile({
    recurring_themes: mergedThemes,
    emotional_patterns: mergedEmotions,
    active_goals: mergedGoals,
    total_reveals: newReveals,
    depth_level: newDepth,
    cognitive_signature: cognitiveSignature,
  });
}

/**
 * Generate a cognitive signature — a natural language summary of the user's thinking patterns.
 */
async function generateSignature(
  themes: string[],
  emotions: string[],
  goals: string[]
): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return `Themes: ${themes.slice(0, 5).join(", ")}. Patterns: ${emotions.join(", ")}.`;
  }

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
        max_tokens: 100,
        messages: [{
          role: "user",
          content: `Write a 1-2 sentence cognitive profile summary for someone whose recurring thoughts involve: ${themes.slice(0, 5).join(", ")}. Their emotional patterns include: ${emotions.join(", ")}. Their goals: ${goals.join(", ") || "undefined"}. Be insightful and concise.`,
        }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.content?.[0]?.text || `Themes: ${themes.slice(0, 3).join(", ")}`;
    }
  } catch (err) {
    console.error("Signature generation error:", err);
  }

  return `Themes: ${themes.slice(0, 5).join(", ")}. Patterns: ${emotions.join(", ")}.`;
}
