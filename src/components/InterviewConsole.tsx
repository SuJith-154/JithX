"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Play, Square, Volume2, HelpCircle, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function InterviewConsole() {
  const [activeQuestion, setActiveQuestion] = useState("");
  const [inputQuestion, setInputQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  const sampleQuestions = [
    "Tell me about yourself.",
    "Explain your strongest project.",
    "Why AI Engineering?",
    "What makes you unique as a candidate?",
    "Describe a complex technical challenge you solved."
  ];

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleAsk = async (questionText: string) => {
    if (!questionText.trim() || isLoading) return;

    // Stop speaking previous answer
    handleStopSpeech();

    setActiveQuestion(questionText);
    setInputQuestion("");
    setIsLoading(true);
    setAnswer("");

    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionText }),
      });

      if (!response.ok) {
        throw new Error("Interview service error");
      }

      const data = await response.json();
      setAnswer(data.answer || "No response received.");
    } catch (error) {
      setAnswer(
        "Connection Error: Failed to load answers from my database. Please try again shortly."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSpeech = () => {
    if (!window.speechSynthesis || !answer) return;

    window.speechSynthesis.cancel(); // Stop any current speech
    
    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(answer);
    
    // Configure voice properties
    utterance.rate = 1.05; // Slightly faster to sound natural
    utterance.pitch = 0.95; // Slightly deeper masculine pitch
    
    // Try to find a nice English voice
    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(
      (v) =>
        v.lang.startsWith("en-") &&
        (v.name.toLowerCase().includes("google") || v.name.toLowerCase().includes("natural"))
    ) || voices.find((v) => v.lang.startsWith("en-"));
    
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    speechUtterance.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  return (
    <div className="glass-panel glass-panel-glow-purple rounded-xl p-5 border border-purple-500/10 font-mono text-xs space-y-5">
      {/* Header */}
      <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
        <Mic className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mock Interview Mode</h3>
      </div>

      <p className="text-white/50 leading-relaxed">
        Select a standard interview question below, or type your own. Sujith's AI twin will formulate a targeted response based on his historical achievements, which can be read or narrated using browser-native text-to-speech.
      </p>

      {/* Grid of sample questions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleAsk(q)}
            disabled={isLoading}
            className={`text-left p-3 rounded-lg border text-[10.5px] font-mono leading-relaxed transition-all cursor-pointer ${
              activeQuestion === q
                ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                : "border-white/5 bg-black/30 text-white/60 hover:border-white/10 hover:text-white"
            }`}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Custom Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          placeholder="Ask a custom interview question (e.g. Tell me about your Neo4j integration)..."
          className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-white placeholder-white/20 focus:outline-none focus:border-purple-400/50"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAsk(inputQuestion);
          }}
          disabled={isLoading}
        />
        <button
          onClick={() => handleAsk(inputQuestion)}
          disabled={isLoading || !inputQuestion.trim()}
          className="bg-purple-500 hover:bg-purple-400 text-black px-4 rounded-lg flex items-center justify-center font-bold cursor-pointer disabled:opacity-50 transition-all shadow-[0_0_12px_rgba(191,90,242,0.15)]"
        >
          Ask
        </button>
      </div>

      {/* Answer Board */}
      <AnimatePresence mode="wait">
        {(isLoading || answer) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border border-white/5 bg-black/40 rounded-xl p-4.5 space-y-4 relative overflow-hidden scanlines"
          >
            {/* Answer Header & Controls */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Answer Terminal Output
              </span>
              
              {answer && !isLoading && (
                <div className="flex items-center space-x-1.5">
                  {!isSpeaking ? (
                    <button
                      onClick={handleStartSpeech}
                      className="flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/20 text-purple-300 rounded px-2.5 py-1 text-[9px] cursor-pointer transition-all"
                    >
                      <Play className="w-2.5 h-2.5" /> Synthesize Audio
                    </button>
                  ) : (
                    <button
                      onClick={handleStopSpeech}
                      className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-300 rounded px-2.5 py-1 text-[9px] cursor-pointer transition-all animate-pulse"
                    >
                      <Square className="w-2.5 h-2.5" /> Stop Audio
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Content view */}
            {isLoading ? (
              <div className="flex items-center space-x-2.5 text-white/40 italic py-4">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>Interrogating semantic databases...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[11.5px] leading-relaxed text-white/95">{answer}</p>
                
                {/* Voice sound waves indicator */}
                {isSpeaking && (
                  <div className="flex items-center space-x-1.5 pt-2 border-t border-white/5">
                    <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[9px] text-purple-400 font-mono">Audio Stream Active</span>
                    <div className="flex items-center space-x-0.5 ml-2 h-3">
                      <div className="w-[1.5px] bg-purple-400 animate-bounce h-2" style={{ animationDelay: "0.1s" }} />
                      <div className="w-[1.5px] bg-purple-400 animate-bounce h-3" style={{ animationDelay: "0.3s" }} />
                      <div className="w-[1.5px] bg-purple-400 animate-bounce h-1.5" style={{ animationDelay: "0.5s" }} />
                      <div className="w-[1.5px] bg-purple-400 animate-bounce h-2.5" style={{ animationDelay: "0.2s" }} />
                      <div className="w-[1.5px] bg-purple-400 animate-bounce h-1.5" style={{ animationDelay: "0.4s" }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
