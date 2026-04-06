import type { RevealResult } from "./types";

/**
 * Fractal Loop — connects Pin with external cognitive systems.
 *
 * Integrations:
 * 1. ziyad-brain MCP (DBOS) — ingest insights as knowledge, create goals
 * 2. Future: Idea File, other systems
 *
 * The loop: Pin → Insight → brain_ingest → brain_goal → feeds back into Pin context
 */

const BRAIN_MCP_URL = process.env.BRAIN_MCP_URL; // Optional: direct HTTP to ziyad-brain

/**
 * Sync a reveal result into the brain as knowledge.
 * Uses brain_ingest to store the insight in the knowledge base.
 */
export async function syncToBrain(reveal: RevealResult): Promise<{ synced: boolean; error?: string }> {
  if (!BRAIN_MCP_URL) {
    return { synced: false, error: "BRAIN_MCP_URL not configured" };
  }

  try {
    // Ingest insight as a knowledge chunk
    const content = [
      `Thread: ${reveal.thread}`,
      `Insight: ${reveal.insight}`,
      `Question: ${reveal.question}`,
      `Action: ${reveal.action} (${reveal.action_type})`,
    ].join("\n");

    const res = await fetch(`${BRAIN_MCP_URL}/brain_ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        source: "pin",
        tags: ["pin-insight", reveal.thread.toLowerCase().replace(/\s+/g, "-")],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { synced: false, error: err };
    }

    return { synced: true };
  } catch (err) {
    return { synced: false, error: String(err) };
  }
}

/**
 * Convert a reveal action into a brain goal.
 * Uses brain_goal to create a trackable goal in DBOS.
 */
export async function convertToGoal(reveal: RevealResult): Promise<{ created: boolean; error?: string }> {
  if (!BRAIN_MCP_URL) {
    return { created: false, error: "BRAIN_MCP_URL not configured" };
  }

  if (reveal.action_type !== "goal") {
    return { created: false, error: "Not a goal-type action" };
  }

  try {
    const res = await fetch(`${BRAIN_MCP_URL}/brain_goal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        title: reveal.action,
        description: `From Pin insight: "${reveal.insight}"`,
        priority: "medium",
        status: "active",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { created: false, error: err };
    }

    return { created: true };
  } catch (err) {
    return { created: false, error: String(err) };
  }
}

/**
 * Query the brain for relevant knowledge to enrich context.
 * Uses brain_search to find related knowledge chunks.
 */
export async function queryBrain(query: string): Promise<string[]> {
  if (!BRAIN_MCP_URL) return [];

  try {
    const res = await fetch(`${BRAIN_MCP_URL}/brain_search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 3 }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.results || []).map((r: { content: string }) => r.content).slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * Run the full fractal loop after a reveal.
 * Non-blocking — errors don't break the flow.
 */
export async function runFractalLoop(reveal: RevealResult): Promise<{
  brain_synced: boolean;
  goal_created: boolean;
}> {
  const [syncResult, goalResult] = await Promise.all([
    syncToBrain(reveal).catch(() => ({ synced: false })),
    reveal.action_type === "goal"
      ? convertToGoal(reveal).catch(() => ({ created: false }))
      : Promise.resolve({ created: false }),
  ]);

  return {
    brain_synced: syncResult.synced,
    goal_created: goalResult.created,
  };
}
