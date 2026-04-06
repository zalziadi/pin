"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import type { RevealResult } from "@/lib/types";

interface RevealOverlayProps {
  reveal: RevealResult | null;
  onClose: () => void;
}

export function RevealOverlay({ reveal, onClose }: RevealOverlayProps) {
  return (
    <AnimatePresence>
      {reveal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          {/* Background */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 max-w-md w-full mx-6"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 p-2 text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Thread label */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 mb-6"
            >
              <div className="w-2 h-2 rounded-full bg-[#a8a2ff] animate-pulse" />
              <span className="text-xs font-mono text-[#a8a2ff]/70 uppercase tracking-wider">
                {reveal.thread}
              </span>
            </motion.div>

            {/* Insight */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="text-xl leading-relaxed text-white/90 font-light"
            >
              {reveal.insight}
            </motion.p>

            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="h-px bg-gradient-to-r from-transparent via-[#a8a2ff]/30 to-transparent my-8 origin-left"
            />

            {/* Question */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="flex items-start gap-3"
            >
              <Sparkles size={16} className="text-[#a8a2ff]/50 mt-0.5 shrink-0" />
              <p className="text-sm text-white/50 italic leading-relaxed">
                {reveal.question}
              </p>
            </motion.div>

            {/* Connected count */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
              className="mt-8 text-[10px] font-mono text-white/15 text-center"
            >
              {reveal.connected_pin_ids.length} pins connected
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
