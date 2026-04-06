import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

const USER_ID = "default";

/** GET — list pending actions */
export async function GET() {
  try {
    const sb = getSupabaseServer();
    if (!sb) return NextResponse.json({ error: "No Supabase" }, { status: 503 });

    const { data, error } = await sb
      .from("brain_pin_actions")
      .select("id, text, action_type, status, created_at")
      .eq("user_id", USER_ID)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return NextResponse.json({ actions: data || [] });
  } catch (err) {
    console.error("Actions GET error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST — update action status (done/skipped) */
export async function POST(request: Request) {
  try {
    const { action_id, status } = (await request.json()) as {
      action_id: string;
      status: "done" | "skipped";
    };

    if (!action_id || !["done", "skipped"].includes(status)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const sb = getSupabaseServer();
    if (!sb) return NextResponse.json({ error: "No Supabase" }, { status: 503 });

    const updateData: Record<string, unknown> = { status };
    if (status === "done") {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await sb
      .from("brain_pin_actions")
      .update(updateData)
      .eq("id", action_id)
      .eq("user_id", USER_ID);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Actions POST error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
