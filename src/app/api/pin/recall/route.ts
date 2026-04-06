import { NextResponse } from "next/server";
import { recallSimilar } from "@/lib/memory";

export async function POST(request: Request) {
  try {
    const { text, limit } = (await request.json()) as {
      text: string;
      limit?: number;
    };

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const results = await recallSimilar(text, limit || 5);
    return NextResponse.json(results);
  } catch (err) {
    console.error("Recall API error:", err);
    return NextResponse.json(
      { error: "Recall failed" },
      { status: 500 }
    );
  }
}
