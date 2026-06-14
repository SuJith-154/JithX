"use client";

import React, { useState } from "react";
import { Code, Brain, Database, Wrench, Sparkles, Server, Layout } from "lucide-react";
import { motion } from "framer-motion";

interface SkillItem {
  name: string;
  level: string; // 'Expert' | 'Advanced' | 'Intermediate'
  yearsOfExperience: number;
}

interface SkillsData {
  programmingLanguages: SkillItem[];
  aiMLTechnologies: SkillItem[];
  frontendTechnologies: SkillItem[];
  backendTechnologies: SkillItem[];
  databases: SkillItem[];
  cloudPlatforms: SkillItem[];
  developerTools: SkillItem[];
  designTools: SkillItem[];
  softSkills: SkillItem[];
}

interface SkillsDashboardProps {
  skills: SkillsData;
}

export default function SkillsDashboard({ skills }: SkillsDashboardProps) {
  const [activeCategory, setActiveCategory] = useState<keyof SkillsData>("aiMLTechnologies");

  const categoryMetadata: Record<
    keyof SkillsData,
    { title: string; icon: React.ReactNode; color: string; description: string }
  > = {
    aiMLTechnologies: {
      title: "AI / ML & Agents",
      icon: <Brain className="w-4 h-4" />,
      color: "from-purple-500 to-indigo-500",
      description: "Core specialization in Large Language Models, RAG architectures, and Multi-Agent Orchestration.",
    },
    backendTechnologies: {
      title: "Backend Frameworks",
      icon: <Server className="w-4 h-4" />,
      color: "from-blue-500 to-cyan-500",
      description: "Building production-grade, asynchronous REST & FastMCP servers for tool-calling agents.",
    },
    programmingLanguages: {
      title: "Languages",
      icon: <Code className="w-4 h-4" />,
      color: "from-green-500 to-emerald-500",
      description: "General programming languages for algorithms, data science, and system operations.",
    },
    databases: {
      title: "Databases",
      icon: <Database className="w-4 h-4" />,
      color: "from-yellow-500 to-amber-500",
      description: "Graph databases (Neo4j) and Vector stores (ChromaDB) for high-performance retrieval.",
    },
    frontendTechnologies: {
      title: "Frontend & UI",
      icon: <Layout className="w-4 h-4" />,
      color: "from-pink-500 to-rose-500",
      description: "Creating modern, responsive user interfaces and glassmorphic dashboards.",
    },
    cloudPlatforms: {
      title: "Cloud & Ops",
      icon: <Wrench className="w-4 h-4" />,
      color: "from-sky-500 to-blue-500",
      description: "Deploying applications, handling async background workers, and orchestrating API pipelines.",
    },
    developerTools: {
      title: "Dev Tools",
      icon: <Wrench className="w-4 h-4" />,
      color: "from-slate-500 to-gray-500",
      description: "Version control and collaborative pipelines used in daily development workflows.",
    },
    designTools: {
      title: "Design",
      icon: <Layout className="w-4 h-4" />,
      color: "from-purple-500 to-pink-500",
      description: "User-centered design tools used to create high-fidelity UI prototypes.",
    },
    softSkills: {
      title: "Professional",
      icon: <Sparkles className="w-4 h-4" />,
      color: "from-orange-500 to-yellow-500",
      description: "Soft skills including leading teams and pitching environmental/financial solutions.",
    },
  };

  const getLevelPercentage = (level: string) => {
    switch (level.toLowerCase()) {
      case "expert":
        return 95;
      case "advanced":
        return 85;
      case "intermediate":
        return 70;
      default:
        return 50;
    }
  };

  const activeSkillsList = skills[activeCategory] || [];
  const activeMeta = categoryMetadata[activeCategory];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[480px]">
      {/* Category selector panel */}
      <div className="md:col-span-1 glass-panel rounded-xl p-3 border border-white/5 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-1">
          <h3 className="text-xs font-mono uppercase tracking-widest text-purple-400 pl-2 mb-3">
            Categories
          </h3>
          {Object.entries(categoryMetadata).map(([key, meta]) => {
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key as keyof SkillsData)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs font-mono transition-all cursor-pointer ${
                  isActive
                    ? "bg-purple-500/10 border border-purple-500/30 text-purple-200"
                    : "border border-transparent text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={isActive ? "text-purple-400" : "text-white/40"}>
                    {meta.icon}
                  </span>
                  <span>{meta.title}</span>
                </div>
                <span className="text-[10px] text-white/30">
                  {skills[key as keyof SkillsData]?.length || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Analytics Panel */}
      <div className="md:col-span-2 glass-panel glass-panel-glow-purple rounded-xl p-5 border border-purple-500/10 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
            <div>
              <h2 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                <span className="text-purple-400">{activeMeta.icon}</span> {activeMeta.title}
              </h2>
              <p className="text-[11px] text-white/40 font-mono mt-1">
                {activeMeta.description}
              </p>
            </div>
          </div>

          {/* Skill Bars */}
          <div className="space-y-4">
            {activeSkillsList.map((skill, index) => {
              const percentage = getLevelPercentage(skill.level);
              return (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white/80">{skill.name}</span>
                    <span className="text-white/40 text-[10px]">
                      {skill.level} • {skill.yearsOfExperience} {skill.yearsOfExperience === 1 ? "Year" : "Years"}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 p-[1px]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full bg-gradient-to-r ${activeMeta.color}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>


      </div>
    </div>
  );
}
