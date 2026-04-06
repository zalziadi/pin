"use client";

import { useState, useCallback } from "react";
import { PinInput } from "@/components/PinInput";
import { PinCard } from "@/components/PinCard";
import { RevealButton } from "@/components/RevealButton";
import { RevealOverlay } from "@/components/RevealOverlay";
import { ThreadConnector } from "@/components/ThreadConnector";
import type { Pin, RevealResult } from "@/lib/types";

function generateId(): string {
  return `pin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function PinPage() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  const addPin = useCallback((text: string) => {
    const newPin: Pin = {
      id: generateId(),
      text,
      created_at: new Date().toISOString(),
    };
    setPins((prev) => [...prev, newPin]);
    // Clear previous reveal state
    setHighlightedIds(new Set());
    setReveal(null);
  }, []);

  const handleReveal = useCallback(async () => {
    if (pins.length < 2 || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/pin/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pins }),
      });

      if (!res.ok) throw new Error("Reveal failed");

      const result: RevealResult = await res.json();
      setHighlightedIds(new Set(result.connected_pin_ids));

      // Small delay before showing overlay for the highlight to register
      setTimeout(() => {
        setReveal(result);
      }, 600);
    } catch (err) {
      console.error("Reveal error:", err);
    } finally {
      setLoading(false);
    }
  }, [pins, loading]);

  const closeReveal = useCallback(() => {
    setReveal(null);
  }, []);

  return (
    <div className="min-h-screen bg-[#08090c] text-white flex flex-col">
      {/* Header */}
      <header className="pt-12 pb-2 text-center">
        <h1 className="text-lg font-mono font-light tracking-[0.3em] text-white/40 uppercase">
          Pin
        </h1>
        <p className="text-[11px] text-white/15 mt-1 font-mono">
          {pins.length === 0
            ? "capture your thoughts"
            : `${pins.length} pin${pins.length !== 1 ? "s" : ""} captured`}
        </p>
      </header>

      {/* Main area */}
      <main className="flex-1 flex flex-col items-center px-4 pb-32">
        {/* Pins list */}
        {pins.length > 0 && (
          <div className="w-full max-w-xl mt-8 space-y-3 relative">
            <ThreadConnector
              visible={highlightedIds.size > 0}
              count={highlightedIds.size}
            />
            {pins.map((pin, i) => (
              <PinCard
                key={pin.id}
                pin={pin}
                index={i}
                isHighlighted={highlightedIds.has(pin.id)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {pins.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/10 text-sm font-mono">
              thoughts become pins. pins become threads. threads reveal insight.
            </p>
          </div>
        )}

        {/* Reveal button */}
        {pins.length >= 2 && (
          <div className="mt-10">
            <RevealButton
              onClick={handleReveal}
              disabled={loading}
              loading={loading}
              pinCount={pins.length}
            />
          </div>
        )}
      </main>

      {/* Input — fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-[#08090c] via-[#08090c] to-transparent">
        <PinInput onSubmit={addPin} disabled={loading} />
      </div>

      {/* Reveal overlay */}
      <RevealOverlay reveal={reveal} onClose={closeReveal} />
    </div>
  );
}
