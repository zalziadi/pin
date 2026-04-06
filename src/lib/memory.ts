import { getSupabaseServer } from "./supabase-server";
import { generateEmbedding } from "./embeddings";
import type { Pin, RevealResult } from "./types";

const USER_ID = "default"; // single-user for now

/**
 * Save pins to Supabase with embeddings.
 */
export async function savePins(
  pins: Pin[],
  sessionId?: string
): Promise<{ saved: number; error?: string }> {
  const sb = getSupabaseServer();
  if (!sb) return { saved: 0, error: "No Supabase connection" };

  let saved = 0;

  for (const pin of pins) {
    const embedding = await generateEmbedding(pin.text);

    const { error } = await sb.from("brain_pins").upsert(
      {
        id: pin.id.startsWith("pin_") ? undefined : pin.id, // let DB generate if client-side ID
        user_id: USER_ID,
        text: pin.text,
        session_id: sessionId || null,
        embedding,
        created_at: pin.created_at,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );

    if (error) {
      console.error("Save pin error:", error.message);
    } else {
      saved++;
    }
  }

  // Update profile pin count (non-critical)
  try {
    await sb.rpc("increment_profile_pins", { p_user_id: USER_ID, p_count: saved });
  } catch { /* RPC might not exist yet */ }

  return { saved };
}

/**
 * Save a reveal result (thread + insight + action) to Supabase.
 */
export async function saveReveal(
  reveal: RevealResult,
  pins: Pin[]
): Promise<{ thread_id?: string; insight_id?: string; action_id?: string; error?: string }> {
  const sb = getSupabaseServer();
  if (!sb) return { error: "No Supabase connection" };

  // Combine text for embedding
  const revealText = `${reveal.thread}: ${reveal.insight} ${reveal.question}`;
  const embedding = await generateEmbedding(revealText);

  // 1. Save thread
  const { data: thread, error: threadErr } = await sb
    .from("brain_pin_threads")
    .insert({
      user_id: USER_ID,
      label: reveal.thread,
      pin_ids: reveal.connected_pin_ids,
      is_primary: true,
      insight: reveal.insight,
      question: reveal.question,
      action: reveal.action || null,
      action_type: reveal.action_type || null,
      embedding,
    })
    .select("id")
    .single();

  if (threadErr) {
    console.error("Save thread error:", threadErr.message);
    return { error: threadErr.message };
  }

  // 2. Save insight
  const { data: insight, error: insightErr } = await sb
    .from("brain_pin_insights")
    .insert({
      user_id: USER_ID,
      thread_id: thread.id,
      insight: reveal.insight,
      question: reveal.question,
      action: reveal.action || null,
      action_type: reveal.action_type || null,
      source_pin_ids: reveal.connected_pin_ids,
      depth_score: reveal.depth_score || 1,
      embedding,
    })
    .select("id")
    .single();

  if (insightErr) {
    console.error("Save insight error:", insightErr.message);
  }

  // 3. Save action if present
  let action_id: string | undefined;
  if (reveal.action) {
    const { data: action, error: actionErr } = await sb
      .from("brain_pin_actions")
      .insert({
        user_id: USER_ID,
        insight_id: insight?.id || null,
        thread_id: thread.id,
        text: reveal.action,
        action_type: reveal.action_type || "reflection",
        status: "pending",
      })
      .select("id")
      .single();

    if (actionErr) {
      console.error("Save action error:", actionErr.message);
    } else {
      action_id = action.id;
    }
  }

  // 4. Update profile reveal count
  try {
    await sb.rpc("increment_profile_reveals", { p_user_id: USER_ID });
  } catch { /* non-critical */ }

  return {
    thread_id: thread.id,
    insight_id: insight?.id,
    action_id,
  };
}

/**
 * Recall similar pins from memory using vector search.
 */
export async function recallSimilar(
  text: string,
  limit: number = 5
): Promise<{ pins: Array<{ id: string; text: string; similarity: number }>; insights: Array<{ id: string; insight: string; question: string; action: string; similarity: number }> }> {
  const sb = getSupabaseServer();
  if (!sb) return { pins: [], insights: [] };

  const embedding = await generateEmbedding(text);
  if (!embedding) return { pins: [], insights: [] };

  // Parallel: search similar pins + insights
  const [pinsResult, insightsResult] = await Promise.all([
    sb.rpc("match_pins", {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: limit,
      p_user_id: USER_ID,
    }),
    sb.rpc("match_insights", {
      query_embedding: embedding,
      match_threshold: 0.4,
      match_count: 3,
      p_user_id: USER_ID,
    }),
  ]);

  return {
    pins: pinsResult.data || [],
    insights: insightsResult.data || [],
  };
}

/**
 * Get recent pins for context.
 */
export async function getRecentPins(limit: number = 20): Promise<Pin[]> {
  const sb = getSupabaseServer();
  if (!sb) return [];

  const { data } = await sb
    .from("brain_pins")
    .select("id, text, created_at, thread_id")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []) as Pin[];
}

/**
 * Get recent insights for context injection.
 */
export async function getRecentInsights(limit: number = 5): Promise<Array<{ insight: string; question: string; action: string; created_at: string }>> {
  const sb = getSupabaseServer();
  if (!sb) return [];

  const { data } = await sb
    .from("brain_pin_insights")
    .select("insight, question, action, created_at")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}
