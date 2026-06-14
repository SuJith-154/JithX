"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, BookOpen, RotateCcw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownFormatter from "./MarkdownFormatter";

export default function GenerateStoryButton() {
  const [story, setStory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleGenerate = async () => {
    setIsOpen(true);
    setIsLoading(true);
    setError("");
    setStory("");

    try {
      const response = await fetch("/api/story");
      if (!response.ok) {
        throw new Error("Story generation pipeline failed");
      }
      const data = await response.json();
      setStory(data.story || "Failed to load narrative.");
    } catch (err: any) {
      setError(
        "Failed to generate career story. Please ensure the Python FastAPI and ChromaDB are configured."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleGenerate}
        className="w-full flex items-center justify-center gap-2 border border-purple-500/30 hover:border-purple-500/50 bg-purple-500/5 hover:bg-purple-500/10 text-purple-300 font-mono py-2.5 rounded-lg text-xs cursor-pointer transition-all hover:shadow-[0_0_10px_rgba(191,90,242,0.1)]"
      >
        <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Know about Sujith&apos;s journey
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-3xl bg-[#06060c] border border-purple-500/20 rounded-2xl p-6 md:p-8 flex flex-col justify-between font-mono max-h-[85vh] overflow-hidden scanlines shadow-[0_0_50px_rgba(191,90,242,0.15)] z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  <h2 className="text-sm md:text-base font-bold text-white tracking-tight font-mono uppercase">
                    Sujith&apos;s Career Journey
                  </h2>
                </div>
                
                <div className="flex items-center gap-3">
                  {story && !isLoading && (
                    <button
                      onClick={handleGenerate}
                      className="text-white/40 hover:text-white p-2 hover:bg-white/5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono"
                      title="Regenerate Narrative"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Regenerate</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 bg-white/5 border border-white/10 rounded-lg hover:border-purple-500/30 text-white/50 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Body Content */}
              <div className="flex-1 overflow-y-auto py-6 pr-2 scrollbar-thin">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4 text-white/40 font-mono">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                    <span className="text-xs tracking-wider animate-pulse">Synthesizing narrative from resume vectors...</span>
                  </div>
                ) : error ? (
                  <div className="text-red-400 border border-red-500/20 bg-red-500/5 p-4 rounded-lg flex items-center gap-2 text-xs">
                    <span>{error}</span>
                  </div>
                ) : (
                  <MarkdownFormatter text={story} />
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-white/5 flex justify-end shrink-0">
                <button
                  onClick={() => setIsOpen(false)}
                  className="bg-purple-500 hover:bg-purple-400 text-black font-bold py-2.5 px-6 rounded-xl text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(191,90,242,0.25)]"
                >
                  Close Narrative
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
