import fs from "fs/promises";
import path from "path";
import { Cpu, MapPin, Briefcase, Award, GraduationCap, ChevronRight, Terminal, RefreshCw, Sparkles, BookOpen } from "lucide-react";
import ChatTerminal from "@/components/ChatTerminal";
import SkillsDashboard from "@/components/SkillsDashboard";
import ProjectUniverse from "@/components/ProjectUniverse";
import RecruiterConsole from "@/components/RecruiterConsole";
import InterviewConsole from "@/components/InterviewConsole";
import Timeline from "@/components/Timeline";
import ContactConsole from "@/components/ContactConsole";
import GenerateStoryButton from "@/components/GenerateStoryButton"; // Let's make a quick button component for dynamic story fetching!


// Type Definitions
interface PersonalData {
  fullName: string;
  tagline: string;
  currentRole: string;
  location: string;
  professionalSummary: string;
  careerGoal: string;
  dreamCompany: string;
  longTermVision: string;
}

interface ContactData {
  github: string;
  linkedin: string;
  portfolio: string;
  email: string;
  resumeUrl: string;
}

async function getLocalData(filename: string) {
  const filePath = path.join(process.cwd(), "data", filename);
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read data file ${filename}:`, error);
    return null;
  }
}

export default async function Home() {
  // Read local database JSON files on the server
  const personal: PersonalData = await getLocalData("personal.json");
  const education = await getLocalData("education.json") || [];
  const skills = await getLocalData("skills.json") || {};
  const projects = await getLocalData("projects.json") || [];
  const experience = await getLocalData("experience.json") || [];
  const certifications = await getLocalData("certifications.json") || [];
  const achievements = await getLocalData("achievements.json") || [];
  const hackathons = await getLocalData("hackathons.json") || [];
  const competitions = await getLocalData("competitions.json") || [];
  const contact: ContactData = await getLocalData("contact.json") || {
    github: "",
    linkedin: "",
    portfolio: "",
    email: "",
    resumeUrl: ""
  };

  return (
    <div className="min-h-screen grid-bg relative selection:bg-purple-500/30 selection:text-white">
      {/* Glow overlays */}
      <div className="absolute inset-0 radial-overlay pointer-events-none z-0" />
      <div className="absolute inset-0 radial-overlay-blue pointer-events-none z-0" />

      {/* Main Container */}
      <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 z-10">

        {/* Top App Header */}
        <div className="border-b border-white/10 pb-4 mb-2">
          <h1 className="text-xl md:text-2xl font-black font-mono tracking-widest text-cyan-400 uppercase text-glow-blue">
            JithX - Meet Sujith&apos;s AI Twin
          </h1>
        </div>

        {/* Futuristic Dashboard Header */}
        <header className="glass-panel rounded-2xl p-6 border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          <div className="space-y-2.5">
            <div className="space-y-1">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-mono uppercase">
                {personal?.fullName || "Sujith Senthilraj"}
              </h2>
              <p className="text-xs md:text-sm text-cyan-400 font-mono tracking-wide font-medium">
                {personal?.tagline || "AI Engineer | LLM & Agent Developer"}
              </p>
            </div>

            {/* Micro Details info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10.5px] text-white/40 font-mono pt-1">
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-purple-400/80" /> {personal?.currentRole}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-400/80" /> {personal?.location}
              </span>
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-purple-400/80" /> Karpagam College of Engineering &apos;26
              </span>
            </div>
          </div>

          {/* Call to Actions */}
          <div className="flex items-center gap-3 shrink-0 self-stretch md:self-auto">
            <a
              href={contact?.resumeUrl}
              download="SUJITH_JithX.pdf"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-mono font-bold text-xs py-3 px-5 rounded-xl transition-all shadow-[0_0_20px_rgba(191,90,242,0.25)] hover:shadow-[0_0_25px_rgba(191,90,242,0.4)] cursor-pointer"
            >
              <Award className="w-4 h-4" /> Download Resume
            </a>
          </div>
        </header>

        {/* Dashboard Grid Layout */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT SECTION: AI twin Chatbot (lg:col-span-7) */}
          <section className="lg:col-span-7 space-y-2 flex flex-col">
            <h2 className="text-xs font-mono uppercase tracking-widest text-purple-400 pl-1 shrink-0">
              Sujith's AI Twin
            </h2>
            <div className="flex-1 flex flex-col min-h-0">
              <ChatTerminal />
            </div>
          </section>

          {/* RIGHT SECTION: Quick status console, matchers (lg:col-span-5) */}
          <section className="lg:col-span-5 space-y-6 flex flex-col">
            {/* Quick stats board */}
            <div className="glass-panel rounded-xl p-4.5 border border-white/5 grid grid-cols-3 gap-3 text-center font-mono shrink-0">
              <div className="space-y-0.5 border-r border-white/5">
                <span className="text-xs text-white/40 block">LeetCode</span>
                <span className="text-sm font-bold text-white block">240+ Solved</span>
              </div>
              <div className="space-y-0.5 border-r border-white/5">
                <span className="text-xs text-white/40 block">MCP Server</span>
                <span className="text-sm font-bold text-cyan-400 block">15+ Tools</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-xs text-white/40 block">Core Stack</span>
                <span className="text-xs font-bold text-purple-400 block tracking-tight">AI/Agentic development</span>
              </div>
            </div>

            {/* Recruiter fit scoring console */}
            <div className="flex-1 flex flex-col min-h-0">
              <RecruiterConsole />
            </div>

            {/* Interview Console - Commented out for now
            <InterviewConsole />
            */}
          </section>

          {/* CENTERED FULL WIDTH: Career Journey */}
          <section className="col-span-1 lg:col-span-12 flex justify-center py-2">
            <div className="glass-panel rounded-xl p-5 border border-white/5 space-y-4 max-w-3xl w-full text-center">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" /> Career Journey
                </h4>
                <span className="text-[9px] text-white/30 font-mono">Sujith&apos;s Story</span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed font-mono max-w-2xl mx-auto">
                Synthesize a fluid, storytelling narrative of Sujith&apos;s journey, drawing connections between his academic background, self-learning, and professional RAG work at Prayag.ai.
              </p>
              <div className="max-w-md mx-auto pt-1">
                <GenerateStoryButton />
              </div>
            </div>
          </section>

          {/* FULL WIDTH: Skills Intelligence Matrix */}
          <section className="col-span-1 shadow-inner lg:col-span-12 space-y-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-purple-400 pl-1">
              Skills &amp; Expertise
            </h2>
            <SkillsDashboard skills={skills} />
          </section>

          {/* FULL WIDTH: Project Universe */}
          <section className="col-span-1 lg:col-span-12 space-y-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-purple-400 pl-1">
              Project Showcase
            </h2>
            <ProjectUniverse projects={projects} />
          </section>

          {/* FULL WIDTH: Interactive Chronology Timeline */}
          <section className="col-span-1 lg:col-span-12 space-y-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-purple-400 pl-1">
              Career Timeline
            </h2>
            <div className="glass-panel rounded-2xl p-6 border border-white/5">
              <Timeline
                education={education}
                experience={experience}
                certifications={certifications}
                hackathons={hackathons}
                competitions={competitions}
              />
            </div>
          </section>

          {/* FULL WIDTH: Contact Hub */}
          <footer className="col-span-1 lg:col-span-12 space-y-6 pt-6">
            <div className="space-y-2">
              <h2 className="text-xs font-mono uppercase tracking-widest text-purple-400 pl-1">
                Contact Sujith
              </h2>
              <ContactConsole contact={contact} />
            </div>
            <div className="border-t border-white/5 pt-6 pb-2 text-center font-mono text-[10px] text-white/30">
              <p>© {new Date().getFullYear()} JithX. All rights reserved. All rights belongs to JithX.</p>
            </div>
          </footer>

        </main>
      </div>
    </div>
  );
}
