"use client";

import React, { useState, useMemo } from "react";
import { Calendar, Briefcase, GraduationCap, Trophy, Award, Filter } from "lucide-react";
import { motion } from "framer-motion";

interface EducationItem {
  institution: string;
  degree: string;
  department: string;
  startYear: string;
  endYear: string;
  score: string;
}

interface ExperienceItem {
  company: string;
  role: string;
  duration: string;
  responsibilities: string[];
  technologiesUsed: string[];
  achievements: string[];
}

interface CertificationItem {
  name: string;
  issuer: string;
  date: string;
  credentialUrl: string;
}

interface HackathonItem {
  name: string;
  date: string;
  teamSize: number;
  role: string;
  outcome: string;
}

interface CompetitionItem {
  competitionName: string;
  position: string;
  date: string;
  description: string;
}

interface TimelineProps {
  education: EducationItem[];
  experience: ExperienceItem[];
  certifications: CertificationItem[];
  hackathons: HackathonItem[];
  competitions: CompetitionItem[];
}

interface TimelineNode {
  type: "experience" | "education" | "hackathon" | "competition" | "certification";
  title: string;
  subtitle: string;
  dateText: string;
  year: number; // For sorting
  details: string[];
  meta?: string[];
}

export default function Timeline({
  education,
  experience,
  certifications,
  hackathons,
  competitions,
}: TimelineProps) {
  const [filter, setFilter] = useState<"all" | "experience" | "education" | "achievements">("all");

  const timelineNodes = useMemo(() => {
    const nodes: TimelineNode[] = [];

    // 1. Add Experience
    experience.forEach((exp) => {
      // Parse year (e.g., "May 2025 – Present" -> 2025)
      const isPresent = exp.duration.toLowerCase().includes("present");
      const yearMatch = exp.duration.match(/\b(20\d{2})\b/);
      const year = isPresent ? 9999 : (yearMatch ? parseInt(yearMatch[1]) : 2025);
      nodes.push({
        type: "experience",
        title: exp.role,
        subtitle: exp.company,
        dateText: exp.duration,
        year: year,
        details: exp.responsibilities,
        meta: exp.technologiesUsed,
      });
    });

    // 2. Add Education
    education.forEach((edu) => {
      const year = parseInt(edu.endYear) || 2026;
      nodes.push({
        type: "education",
        title: `${edu.degree} in ${edu.department.replace(" (CSD)", "")}`,
        subtitle: edu.institution,
        dateText: `${edu.startYear} – ${edu.endYear}`,
        year: year,
        details: [`Score achieved: ${edu.score}`],
      });
    });

    // 3. Add Hackathons
    hackathons.forEach((hack) => {
      const yearMatch = hack.date.match(/\b(20\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : 2023;
      nodes.push({
        type: "hackathon",
        title: `${hack.role} — ${hack.name}`,
        subtitle: "Hackathon Event",
        dateText: hack.date,
        year: year,
        details: [hack.outcome],
        meta: [`Team Size: ${hack.teamSize}`],
      });
    });

    // 4. Add Competitions
    competitions.forEach((comp) => {
      const yearMatch = comp.date.match(/\b(20\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : 2023;
      nodes.push({
        type: "competition",
        title: `${comp.position} — ${comp.competitionName}`,
        subtitle: "UI/UX & Frontend Challenge",
        dateText: comp.date,
        year: year,
        details: [comp.description],
      });
    });

    // 5. Add Certifications
    certifications.forEach((cert) => {
      const yearMatch = cert.date.match(/\b(20\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : 2024;
      nodes.push({
        type: "certification",
        title: cert.name,
        subtitle: `Issued by ${cert.issuer}`,
        dateText: cert.date,
        year: year,
        details: ["Successfully certified in domain capabilities."],
      });
    });

    // Sort nodes chronologically in descending order (newest first)
    return nodes.sort((a, b) => b.year - a.year);
  }, [education, experience, certifications, hackathons, competitions]);

  const filteredNodes = useMemo(() => {
    if (filter === "all") return timelineNodes;
    if (filter === "experience") return timelineNodes.filter((n) => n.type === "experience");
    if (filter === "education") return timelineNodes.filter((n) => n.type === "education");
    if (filter === "achievements") {
      return timelineNodes.filter((n) => ["hackathon", "competition", "certification"].includes(n.type));
    }
    return timelineNodes;
  }, [timelineNodes, filter]);

  const nodeIcons = {
    experience: <Briefcase className="w-3.5 h-3.5" />,
    education: <GraduationCap className="w-3.5 h-3.5" />,
    hackathon: <Trophy className="w-3.5 h-3.5" />,
    competition: <Trophy className="w-3.5 h-3.5" />,
    certification: <Award className="w-3.5 h-3.5" />,
  };

  const nodeColors = {
    experience: "border-blue-500 text-blue-400 bg-blue-500/10",
    education: "border-green-500 text-green-400 bg-green-500/10",
    hackathon: "border-purple-500 text-purple-400 bg-purple-500/10",
    competition: "border-yellow-500 text-yellow-400 bg-yellow-500/10",
    certification: "border-pink-500 text-pink-400 bg-pink-500/10",
  };

  return (
    <div className="space-y-6">
      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5 border-b border-white/5 pb-4">
        <button
          onClick={() => setFilter("all")}
          className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
            filter === "all" ? "bg-purple-500/10 border-purple-500/30 text-purple-300" : "border-white/5 text-white/50 hover:text-white"
          }`}
        >
          All Nodes
        </button>
        <button
          onClick={() => setFilter("experience")}
          className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
            filter === "experience" ? "bg-blue-500/10 border-blue-500/30 text-blue-300" : "border-white/5 text-white/50 hover:text-white"
          }`}
        >
          Work Experience
        </button>
        <button
          onClick={() => setFilter("education")}
          className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
            filter === "education" ? "bg-green-500/10 border-green-500/30 text-green-300" : "border-white/5 text-white/50 hover:text-white"
          }`}
        >
          Education
        </button>
        <button
          onClick={() => setFilter("achievements")}
          className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
            filter === "achievements" ? "bg-purple-500/10 border-purple-500/30 text-purple-300" : "border-white/5 text-white/50 hover:text-white"
          }`}
        >
          Certifications & Awards
        </button>
      </div>

      {/* Timeline view */}
      <div className="relative border-l border-white/10 pl-6 space-y-6 ml-3">
        {filteredNodes.map((node, idx) => (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            key={idx}
            className="relative"
          >
            {/* Timeline dot */}
            <div
              className={`absolute -left-[33px] top-1.5 w-6.5 h-6.5 rounded-full border flex items-center justify-center shrink-0 shadow-md ${
                nodeColors[node.type]
              }`}
            >
              {nodeIcons[node.type]}
            </div>

            {/* Content card */}
            <div className="glass-panel hover:border-white/15 rounded-xl p-4.5 space-y-2.5 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 border-b border-white/5 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-white font-mono">{node.title}</h4>
                  <p className="text-[10px] text-white/40 font-mono mt-0.5">{node.subtitle}</p>
                </div>
                <span className="text-[10px] font-mono text-purple-400 bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10 shrink-0 self-start md:self-center">
                  {node.dateText}
                </span>
              </div>

              {/* Details lists */}
              <ul className="space-y-1 pl-4 list-disc text-white/60 font-mono text-[10.5px] leading-relaxed">
                {node.details.map((detail, dIdx) => (
                  <li key={dIdx}>{detail}</li>
                ))}
              </ul>

              {/* Meta tags (technologies, team details etc) */}
              {node.meta && node.meta.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1.5">
                  {node.meta.map((m, mIdx) => (
                    <span
                      key={mIdx}
                      className="text-[9px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {filteredNodes.length === 0 && (
          <p className="text-white/30 italic font-mono text-xs py-4 pl-2">
            No events match current filter conditions.
          </p>
        )}
      </div>
    </div>
  );
}
