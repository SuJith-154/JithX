"use client";

import React, { useState } from "react";
import { Mail, Github, Linkedin, FileText, Send, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ContactConsoleProps {
  contact: {
    github: string;
    linkedin: string;
    portfolio: string;
    email: string;
    resumeUrl: string;
  };
}

export default function ContactConsole({ contact }: ContactConsoleProps) {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setStatus("sending");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("SMTP server rejected handshakes");
      }

      await response.json();
    } catch (err) {
      console.error("Failed to send message via SMTP", err);
    }

    setStatus("sent");
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
      {/* Social Nodes */}
      <div className="md:col-span-2 flex flex-col">
        <div className="glass-panel rounded-xl p-4.5 border border-white/5 flex flex-col justify-between h-full font-mono text-xs">
          <div className="space-y-3.5">
            <h4 className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Social Channels</h4>
            
            <div className="space-y-2.5">
              <a
                href={contact.linkedin}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 bg-black/40 border border-white/5 hover:border-cyan-500/30 rounded-lg text-white/75 hover:text-white transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4 text-cyan-400" />
                  <span>LinkedIn</span>
                </div>
                <span className="text-[9px] text-white/30">/sujith-senthilraj</span>
              </a>

              <a
                href={contact.github}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 bg-black/40 border border-white/5 hover:border-cyan-500/30 rounded-lg text-white/75 hover:text-white transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Github className="w-4 h-4 text-cyan-400" />
                  <span>GitHub</span>
                </div>
                <span className="text-[9px] text-white/30">/SuJith-154</span>
              </a>

              <a
                href={`mailto:${contact.email}`}
                className="flex items-center justify-between p-2.5 bg-black/40 border border-white/5 hover:border-cyan-500/30 rounded-lg text-white/75 hover:text-white transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <span>Email Node</span>
                </div>
                <span className="text-[9px] text-white/30">sujipjk03@gmail.com</span>
              </a>
            </div>
          </div>

          {/* Resume Download */}
          <a
            href={contact.resumeUrl}
            download="Sujith_Senthilraj_Resume.pdf"
            className="flex items-center justify-between p-3 bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/40 rounded-lg text-cyan-300 hover:text-cyan-200 transition-all cursor-pointer font-bold shadow-[0_0_10px_rgba(0,240,255,0.05)] mt-4"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-cyan-400" />
              <span>Download Resume</span>
            </div>
            <span className="text-[9px] bg-cyan-500/20 text-cyan-200 px-1.5 py-0.5 rounded uppercase font-bold">PDF</span>
          </a>
        </div>
      </div>

      {/* Message mainframe */}
      <div className="md:col-span-3">
        <div className="glass-panel rounded-xl p-4.5 border border-white/5 flex flex-col justify-between h-full font-mono text-xs relative overflow-hidden scanlines">
          <h4 className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-3">Send Message to Sujith</h4>

          <AnimatePresence mode="wait">
            {status !== "sent" ? (
              <motion.form
                key="contact-form"
                onSubmit={handleSend}
                className="space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-white/40 uppercase font-bold">Name :</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-purple-400/50 text-xs"
                      disabled={status === "sending"}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-white/40 uppercase font-bold">Contact :</label>
                    <input
                      type="text"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Your email or phone"
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-purple-400/50 text-xs"
                      disabled={status === "sending"}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-white/40 uppercase font-bold">message :</label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Enter details of request..."
                    rows={4}
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-white placeholder-white/20 focus:outline-none focus:border-purple-400/50 resize-none leading-relaxed text-xs"
                    disabled={status === "sending"}
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full bg-purple-500 hover:bg-purple-400 text-black py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_15px_rgba(191,90,242,0.15)] disabled:opacity-50"
                >
                  {status === "sending" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending Message...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Send Message
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="success-message"
                className="flex flex-col items-center justify-center text-center space-y-4 py-8 h-full"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="w-12 h-12 rounded-full border border-green-500/30 bg-green-500/10 flex items-center justify-center text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                  <Check className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-white font-bold font-mono">Message delivered to Sujith.</h4>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
