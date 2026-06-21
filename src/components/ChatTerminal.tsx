"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Terminal, Cpu, Bot, User, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownFormatter from "./MarkdownFormatter";

interface Message {
  role: "user" | "model";
  parts: string;
}

export default function ChatTerminal({ isPage = false }: { isPage?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      parts: "Welcome to my neural interface. I am the AI Digital Twin of Sujith Senthilraj. Ask me anything about my journey, skills, projects at Prayag.ai, or coding experience.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "Who is Sujith?",
    "Explain his work at Prayag.ai.",
    "Tell me about the PMT MCP project.",
    "Why is he unique as an AI Engineer?"
  ];

  // Auto scroll to bottom with stability during streaming
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scroll to bottom smoothly when a user message is added
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "user") {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // Scroll automatically but stably when streaming the response
    const threshold = 150; // px
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;

    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", parts: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Append an empty bot message that we will stream into
    setMessages((prev) => [...prev, { role: "model", parts: "" }]);

    try {
      const historyPayload = messages.slice(1).map((m) => ({
        role: m.role,
        parts: m.parts,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
        }),
      });

      if (!response.ok) {
        throw new Error("API Route failure");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        throw new Error("No reader found on response body");
      }

      setIsLoading(false);

      let accumulatedText = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = { role: "model", parts: accumulatedText };
          }
          return updated;
        });
      }
    } catch (error) {
      setIsLoading(false);
      setMessages((prev) => {
        const updated = [...prev];
        // If the last model message is empty or half-done, write error there
        if (updated.length > 0 && updated[updated.length - 1].role === "model") {
          updated[updated.length - 1] = {
            role: "model",
            parts: "Connection error: Failed to connect to my database. Please try again shortly.",
          };
        } else {
          updated.push({
            role: "model",
            parts: "Connection error: Failed to connect to my database. Please try again shortly.",
          });
        }
        return updated;
      });
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "model",
        parts: "Chat history cleared. Neural link re-established. How can I assist you now?",
      },
    ]);
  };

  return (
    <div className={`glass-panel glass-panel-glow-blue flex flex-col border border-cyan-500/20 overflow-hidden relative scanlines ${
      isPage 
        ? "flex-1 h-full w-full rounded-2xl" 
        : "rounded-xl h-[500px]"
    }`}>
      {/* Terminal Header */}
      <div className="bg-black/60 px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 animate-pulse"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
          <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5 pl-2">
            <Terminal className="w-3.5 h-3.5" /> Ask about Sujith
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={clearChat}
            className="text-white/40 hover:text-cyan-400 transition-colors p-1 cursor-pointer"
            title="Reset Connection"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {!isPage ? (
            <button
              onClick={() => window.open("/chat", "_blank")}
              className="text-white/40 hover:text-cyan-400 transition-colors p-1 cursor-pointer"
              title="Open in new tab"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => window.close()}
              className="text-white/40 hover:text-cyan-400 transition-colors p-1 cursor-pointer"
              title="Close window"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages viewport */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-start space-x-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role !== "user" && (
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-3.5 py-2.5 border text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"
                    : "bg-black/40 border-white/5 text-white/90"
                }`}
              >
                {msg.role === "user" ? (
                  msg.parts
                ) : msg.parts === "" ? (
                  <div className="flex items-center space-x-2 text-white/50 italic animate-pulse">
                    <Cpu className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    <span>Querying database vectors...</span>
                  </div>
                ) : (
                  <MarkdownFormatter text={msg.parts} />
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={scrollRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 bg-black/20 border-t border-white/5 flex flex-wrap gap-1.5 shrink-0">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="text-[10px] font-mono border border-cyan-500/25 bg-cyan-500/5 text-cyan-400 rounded-full px-2.5 py-1 hover:bg-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input controls */}
      <div className="p-3 bg-black/40 border-t border-white/5 flex items-center space-x-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend(input);
          }}
          placeholder="Ask something (e.g. Why should I hire Sujith?)..."
          className="flex-1 bg-black/55 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors"
          disabled={isLoading}
        />
        <button
          onClick={() => handleSend(input)}
          className="bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg p-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          disabled={isLoading || !input.trim()}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
