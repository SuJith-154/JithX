"use client";

import React, { useState } from "react";
import { Send, FileText, CheckCircle, AlertCircle, Award, Target, HelpCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AnalysisResult {
  match_score: number;
  matching_skills: string[];
  matching_projects: string[];
  relevant_experience: string;
  missing_skills: string[];
  recommendations: string[];
}

export default function RecruiterConsole() {
  const [jd, setJd] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  const handleMatch = async () => {
    if (!jd.trim()) return;

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/recruiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: jd }),
      });

      if (!response.ok) {
        throw new Error("Match calculation failed");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setResult(data);
    } catch (err: any) {
      setError(
        err.message || "Failed to analyze the Job Description. Please try again shortly."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileUploading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/recruiter/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to parse document text.");
      }

      const data = await response.json();
      if (data.text) {
        setJd(data.text);
        
        // Immediately run match analysis
        setIsLoading(true);
        try {
          const matchResponse = await fetch("/api/recruiter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_description: data.text }),
          });

          if (!matchResponse.ok) {
            throw new Error("Match calculation failed");
          }

          const matchData = await matchResponse.json();
          if (matchData.error) {
            throw new Error(matchData.error);
          }
          setResult(matchData);
        } catch (err: any) {
          setError(
            err.message || "Failed to analyze the Job Description. Please try again shortly."
          );
        } finally {
          setIsLoading(false);
        }
      } else {
        throw new Error("No readable text found in document.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to parse file.");
    } finally {
      setIsFileUploading(false);
      e.target.value = "";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/5";
    if (score >= 60) return "text-yellow-400 border-yellow-500/30 bg-yellow-500/5";
    return "text-red-400 border-red-500/30 bg-red-500/5";
  };

  return (
    <div className="glass-panel glass-panel-glow-blue rounded-xl p-5 border border-cyan-500/10 font-mono text-xs h-full flex flex-col justify-between overflow-hidden relative">
      <div className="flex items-center space-x-2 mb-4 border-b border-white/5 pb-2 shrink-0">
        <Target className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Does Sujith fit for your role?</h3>
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-0">
        <div className="space-y-4 overflow-y-auto pr-1 scrollbar-thin">
          <p className="text-white/50 leading-relaxed text-[11px] text-center">
            Upload your Job Description (PDF or DOCX) to receive an JithX-powered compatibility analysis, including fit score, strengths, and hire recommendations.
          </p>
          <div className="space-y-3">
            <label className={`group flex flex-col items-center justify-center border border-dashed rounded-xl p-6 text-center transition-all min-h-[140px] relative overflow-hidden ${
              isFileUploading || isLoading 
                ? "border-cyan-500/30 bg-cyan-950/5 cursor-not-allowed" 
                : "border-cyan-500/25 hover:border-cyan-500/50 bg-cyan-950/5 hover:bg-cyan-950/10 cursor-pointer"
            }`}>
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isFileUploading || isLoading}
              />
              
              {isFileUploading || isLoading ? (
                <div className="flex flex-col items-center space-y-2">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  <span className="text-[10px] text-cyan-300 font-mono tracking-widest uppercase animate-pulse">
                    {isFileUploading ? "Extracting JD text..." : "Calculating match fit..."}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <FileText className="w-7 h-7 text-cyan-400/50 group-hover:text-cyan-400 transition-colors" />
                  <span className="text-[11px] text-white/80 font-bold uppercase tracking-wider">
                    Upload Job Description
                  </span>
                  <span className="text-[9px] text-white/30 tracking-normal font-normal">
                    Supports PDF, DOCX, or DOC formats
                  </span>
                </div>
              )}
            </label>
          </div>
          {error && (
            <div className="flex items-center space-x-2 text-red-400 border border-red-500/20 bg-red-500/5 p-3 rounded-lg text-[10px] font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* POPUP MODAL FOR ANALYSIS RESULTS */}
      <AnimatePresence>
        {result && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setResult(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-950/90 border border-cyan-500/25 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,240,255,0.15)] max-h-[85vh] flex flex-col overflow-hidden font-mono text-xs z-10 scanlines"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 shrink-0">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Evaluation Results</h3>
                </div>
                <button
                  onClick={() => setResult(null)}
                  className="text-white/40 hover:text-white transition-colors p-1 cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable details wrapper */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                {/* Scoreboard Circle & Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-black/40 border border-white/5 rounded-xl p-4">
                  <div className="md:col-span-1 flex flex-col items-center justify-center py-1">
                    <div
                      className={`w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center ${getScoreColor(
                        result.match_score
                      )}`}
                    >
                      <span className="text-xl font-bold font-mono">{result.match_score}%</span>
                      <span className="text-[7.5px] uppercase tracking-wider opacity-60">Fit Score</span>
                    </div>
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <h4 className="text-white font-bold flex items-center gap-1.5 text-cyan-400 text-xs">
                      <Award className="w-3.5 h-3.5" /> PROFILE FIT SUMMARY
                    </h4>
                    <p className="text-white/70 leading-relaxed text-[11px]">{result.relevant_experience}</p>
                  </div>
                </div>

                {/* Matching & Missing Skills */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-green-500/15 bg-green-950/5 rounded-xl p-4 space-y-2.5">
                    <h4 className="text-green-400 font-bold flex items-center gap-1.5 text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5" /> MATCHING CAPABILITIES
                    </h4>
                    {result.matching_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {result.matching_skills.map((skill) => (
                          <span
                            key={skill}
                            className="bg-green-500/10 text-green-300 border border-green-500/25 rounded px-2 py-0.5 text-[10px]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/30 italic text-[10px]">No direct matches extracted.</p>
                    )}
                  </div>

                  <div className="border border-red-500/15 bg-red-950/5 rounded-xl p-4 space-y-2.5">
                    <h4 className="text-red-400 font-bold flex items-center gap-1.5 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" /> GAPS IDENTIFIED
                    </h4>
                    {result.missing_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {result.missing_skills.map((skill) => (
                          <span
                            key={skill}
                            className="bg-red-500/10 text-red-300 border border-red-500/25 rounded px-2 py-0.5 text-[10px]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/30 italic text-[10px]">No major skill gaps identified.</p>
                    )}
                  </div>
                </div>

                {/* Relevant Projects */}
                {result.matching_projects.length > 0 && (
                  <div className="border border-white/5 bg-black/20 rounded-xl p-4 space-y-2">
                    <h4 className="text-purple-400 font-bold flex items-center gap-1.5 text-[11px]">
                      <FileText className="w-3.5 h-3.5" /> RELEVANT PROJECTS
                    </h4>
                    <div className="pl-1 text-white/70 space-y-1 text-[11px]">
                      {result.matching_projects.map((proj, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-purple-400 mt-0.5">&bull;</span>
                          <span>{proj}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                <div className="border border-cyan-500/15 bg-cyan-950/5 rounded-xl p-4 space-y-2">
                  <h4 className="text-cyan-400 font-bold flex items-center gap-1.5 text-[11px]">
                    <HelpCircle className="w-3.5 h-3.5" /> WHY HIRE SUJITH?
                  </h4>
                  <ul className="space-y-1.5 pl-4 list-decimal list-outside text-white/70 text-[11px] leading-relaxed">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
