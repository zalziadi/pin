import { NextResponse } from "next/server";
import { generateReveal } from "@/lib/reveal-engine";
import { savePins, saveReveal } from "@/lib/memory";
import { runFractalLoop } from "@/lib/fractal";
import type { Pin } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { pins, session_id } = (await request.json()) as {
      pins: Pin[];
      session_id?: string;
    };

    if (!pins || !Array.isArray(pins) || pins.length === 0) {
      return NextResponse.json(
        { error: "No pins provided" },
        { status: 400 }
      );
    }

    // 1. Generate reveal (uses memory + identity + action layers internally)
    const result = await generateReveal(pins);

    // 2. Persist to memory (non-blocking — don't fail the request)
    const persistPromise = Promise.all([
      savePins(pins, session_id).catch((e) => console.error("Save pins:", e)),
      saveReveal(result, pins).catch((e) => console.error("Save reveal:", e)),
    ]);

    // 3. Fractal loop — sync to brain (non-blocking)
    const fractalPromise = runFractalLoop(result).catch((e) =>
      console.error("Fractal loop:", e)
    );

    // Wait for persistence (important) but don't block on fractal
    await persistPromise;
    fractalPromise; // fire and forget

    return NextResponse.json(result);
  } catch (err) {
    console.error("Reveal API error:", err);
    return NextResponse.json(
      { error: "Failed to generate reveal" },
      { status: 500 }
    );
  }
}
