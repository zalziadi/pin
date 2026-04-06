"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

interface PinInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function PinInput({ onSubmit, disabled }: PinInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setText("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="What's on your mind?"
        disabled={disabled}
        rows={2}
        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pr-14
                   text-white/90 placeholder:text-white/25
                   focus:outline-none focus:border-white/20 focus:bg-white/[0.07]
                   resize-none transition-all duration-300
                   disabled:opacity-40 disabled:cursor-not-allowed"
      />
      <button
        onClick={handleSubmit}
        disabled={!text.trim() || disabled}
        className="absolute right-3 bottom-3 p-2 rounded-xl
                   bg-white/10 text-white/50 hover:bg-white/15 hover:text-white/80
                   disabled:opacity-20 disabled:cursor-not-allowed
                   transition-all duration-200"
      >
        <Send size={18} />
      </button>
    </div>
  );
}
