import { NextResponse } from "next/server";
import { generateReveal } from "@/lib/reveal-engine";
import type { Pin } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { pins } = (await request.json()) as { pins: Pin[] };

    if (!pins || !Array.isArray(pins) || pins.length === 0) {
      return NextResponse.json(
        { error: "No pins provided" },
        { status: 400 }
      );
    }

    const result = await generateReveal(pins);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Reveal API error:", err);
    return NextResponse.json(
      { error: "Failed to generate reveal" },
      { status: 500 }
    );
  }
}
