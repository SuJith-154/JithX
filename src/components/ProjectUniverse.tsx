"use client";

import React, { useState } from "react";
import { Folder, Link, Github, ExternalLink, X, FileCode, Layers, ShieldAlert, BookOpen, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Project {
  projectName: string;
  category: string;
  problemSolved: string;
  features: string[];
  techStack: string[];
  architecture: string;
  myContribution: string;
  challenges: string;
  learnings: string;
  githubLink: string;
  demoLink: string;
  images: string[];
}

interface ProjectUniverseProps {
  projects: Project[];
}

export default function ProjectUniverse({ projects }: ProjectUniverseProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");

  const categories = ["All", "AI Agent Projects", "RAG Projects", "Generative AI Projects", "LLM Projects", "Full Stack Projects"];

  const filteredProjects = activeFilter === "All"
    ? projects
    : projects.filter((p) => p.category === activeFilter);

  return (
    <div className="space-y-6">
      {/* Filtering list */}
      <div className="flex flex-wrap gap-1.5 border-b border-white/5 pb-4">
        {categories.map((cat) => {
          // Simplify filter display labels
          const label = cat.replace(" Projects", "");
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`text-xs font-mono px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                activeFilter === cat
                  ? "bg-purple-500/10 border-purple-500/40 text-purple-300 shadow-[0_0_10px_rgba(191,90,242,0.1)]"
                  : "border-white/5 bg-black/20 text-white/50 hover:border-white/15 hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((project, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              key={project.projectName}
              onClick={() => setSelectedProject(project)}
              className="glass-panel border border-white/5 hover:border-purple-500/30 rounded-xl p-5 cursor-pointer flex flex-col justify-between hover:shadow-[0_0_15px_rgba(191,90,242,0.05)] transition-all group duration-300"
            >
              <div className="space-y-3">
                {/* Category & Folder */}
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[10px] text-purple-400 bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/15">
                    {project.category.replace(" Projects", "")}
                  </span>
                  <Folder className="w-4 h-4 text-white/30 group-hover:text-purple-400 transition-colors" />
                </div>

                {/* Project Title */}
                <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors font-mono">
                  {project.projectName}
                </h3>

                {/* Short description / Problem solved preview */}
                <p className="text-[11px] text-white/50 line-clamp-3 leading-relaxed font-mono">
                  {project.problemSolved}
                </p>
              </div>

              {/* Tech pill previews & overlay indicator */}
              <div className="mt-5 pt-4 border-t border-white/5">
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.techStack.slice(0, 3).map((tech) => (
                    <span
                      key={tech}
                      className="text-[9px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded"
                    >
                      {tech}
                    </span>
                  ))}
                  {project.techStack.length > 3 && (
                    <span className="text-[9px] font-mono text-purple-400">
                      +{project.techStack.length - 3} more
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-purple-400 group-hover:text-purple-300 font-bold flex items-center gap-1">
                  Explore Project &rarr;
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Expanded Project Side-Drawer/Overlay */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-sm">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={() => setSelectedProject(null)} />

            {/* Content Drawer */}
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl h-screen max-h-screen bg-[#06060c] border-l border-white/10 p-6 flex flex-col justify-between font-mono z-10 scanlines"
            >
              {/* Header: Fixed */}
              <div className="flex items-start justify-between border-b border-white/5 pb-4 shrink-0">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20 font-bold uppercase tracking-wider">
                    {selectedProject.category}
                  </span>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {selectedProject.projectName}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="p-1.5 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 text-white/50 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Details Section */}
              <div className="flex-1 overflow-y-auto py-5 pr-2 space-y-5 text-xs text-white/80 leading-relaxed scrollbar-thin">
                {/* Problem solved */}
                <div className="space-y-1">
                  <h4 className="text-white font-bold flex items-center gap-2 text-purple-400">
                    <ShieldAlert className="w-3.5 h-3.5" /> PROBLEM SOLVED
                  </h4>
                  <p className="text-white/60 pl-5">{selectedProject.problemSolved}</p>
                </div>

                {/* Architecture */}
                <div className="space-y-1">
                  <h4 className="text-white font-bold flex items-center gap-2 text-purple-400">
                    <Layers className="w-3.5 h-3.5" /> ARCHITECTURE / STACK
                  </h4>
                  <p className="text-white/60 pl-5 mb-2">{selectedProject.architecture}</p>
                  <div className="flex flex-wrap gap-1 pl-5">
                    {selectedProject.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="text-[10px] font-mono text-purple-200 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/15"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-1.5">
                  <h4 className="text-white font-bold flex items-center gap-2 text-purple-400">
                    <FileCode className="w-3.5 h-3.5" /> KEY FEATURES
                  </h4>
                  <ul className="list-disc list-inside pl-5 space-y-1 text-white/60">
                    {selectedProject.features.map((feat, i) => (
                      <li key={i}>{feat}</li>
                    ))}
                  </ul>
                </div>

                {/* Contribution */}
                <div className="space-y-1">
                  <h4 className="text-white font-bold flex items-center gap-2 text-purple-400">
                    <Sparkles className="w-3.5 h-3.5" /> MY CONTRIBUTION
                  </h4>
                  <p className="text-white/60 pl-5">{selectedProject.myContribution}</p>
                </div>

                {/* Challenges & Learnings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1 bg-red-950/10 border border-red-500/10 rounded-lg p-3">
                    <h4 className="text-red-400 font-bold flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" /> CHALLENGE
                    </h4>
                    <p className="text-white/50 text-[11px]">{selectedProject.challenges}</p>
                  </div>
                  <div className="space-y-1 bg-green-950/10 border border-green-500/10 rounded-lg p-3">
                    <h4 className="text-green-400 font-bold flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> LEARNING
                    </h4>
                    <p className="text-white/50 text-[11px]">{selectedProject.learnings}</p>
                  </div>
                </div>
              </div>

              {/* Action Links: Fixed Footer */}
              <div className="mt-4 pt-4 border-t border-white/5 flex gap-3 shrink-0">
                {selectedProject.githubLink && (
                  <a
                    href={selectedProject.githubLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-white/20 text-white rounded-lg py-2.5 text-xs transition-all cursor-pointer font-bold"
                  >
                    <Github className="w-3.5 h-3.5" /> Repository
                  </a>
                )}
                {selectedProject.demoLink && (
                  <a
                    href={selectedProject.demoLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-400 text-black rounded-lg py-2.5 text-xs transition-all cursor-pointer font-bold shadow-[0_0_15px_rgba(191,90,242,0.2)]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Launch Demo
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
