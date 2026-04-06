"use client";

import { motion } from "framer-motion";

interface ThreadConnectorProps {
  visible: boolean;
  count: number;
}

export function ThreadConnector({ visible, count }: ThreadConnectorProps) {
  if (!visible || count < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute left-[22px] top-0 bottom-0 pointer-events-none"
    >
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: "100%" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-px bg-gradient-to-b from-[#a8a2ff]/40 via-[#a8a2ff]/20 to-transparent"
      />
    </motion.div>
  );
}
