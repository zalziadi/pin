"use client";

import { motion } from "framer-motion";
import type { Pin } from "@/lib/types";

interface PinCardProps {
  pin: Pin;
  index: number;
  isHighlighted?: boolean;
}

export function PinCard({ pin, index, isHighlighted }: PinCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        borderColor: isHighlighted ? "rgba(168, 162, 255, 0.5)" : "rgba(255,255,255,0.06)",
        boxShadow: isHighlighted
          ? "0 0 24px rgba(168, 162, 255, 0.15)"
          : "none",
      }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="relative px-5 py-4 rounded-xl border bg-white/[0.03] transition-all duration-500"
    >
      {isHighlighted && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#a8a2ff]"
        />
      )}

      <p className={`text-sm leading-relaxed transition-colors duration-500 ${
        isHighlighted ? "text-white" : "text-white/60"
      }`}>
        {pin.text}
      </p>

      <span className="block mt-2 text-[10px] text-white/20 font-mono">
        pin #{index + 1}
      </span>
    </motion.div>
  );
}
