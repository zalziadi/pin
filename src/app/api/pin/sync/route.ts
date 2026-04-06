import { NextResponse } from "next/server";
import { savePins, saveReveal } from "@/lib/memory";
import type { Pin, RevealResult } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pins, reveal, session_id } = body as {
      pins?: Pin[];
      reveal?: RevealResult;
      session_id?: string;
    };

    const result: Record<string, unknown> = {};

    // Save pins if provided
    if (pins && pins.length > 0) {
      result.pins = await savePins(pins, session_id);
    }

    // Save reveal if provided
    if (reveal && pins) {
      result.reveal = await saveReveal(reveal, pins);
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Sync API error:", err);
    return NextResponse.json(
      { error: "Sync failed", detail: String(err) },
      { status: 500 }
    );
  }
}
