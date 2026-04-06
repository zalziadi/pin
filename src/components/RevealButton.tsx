"use client";

import { motion } from "framer-motion";
import { Eye } from "lucide-react";

interface RevealButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  pinCount: number;
}

export function RevealButton({ onClick, disabled, loading, pinCount }: RevealButtonProps) {
  const ready = pinCount >= 2 && !disabled;

  return (
    <motion.button
      onClick={onClick}
      disabled={!ready || loading}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: ready ? 1 : 0.3,
        scale: ready ? 1 : 0.95,
      }}
      whileHover={ready ? { scale: 1.03 } : {}}
      whileTap={ready ? { scale: 0.97 } : {}}
      transition={{ duration: 0.3 }}
      className="group relative flex items-center gap-3 px-7 py-3.5 rounded-2xl
                 bg-[#a8a2ff]/10 border border-[#a8a2ff]/20
                 text-[#a8a2ff] font-mono text-sm tracking-wider
                 hover:bg-[#a8a2ff]/15 hover:border-[#a8a2ff]/30
                 disabled:cursor-not-allowed
                 transition-all duration-300"
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        >
          <Eye size={18} />
        </motion.div>
      ) : (
        <Eye size={18} className="group-hover:scale-110 transition-transform" />
      )}
      <span>{loading ? "Revealing..." : "Reveal"}</span>

      {/* Glow */}
      {ready && !loading && (
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="absolute inset-0 rounded-2xl bg-[#a8a2ff]/5 -z-10 blur-xl"
        />
      )}
    </motion.button>
  );
}
