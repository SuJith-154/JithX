import ChatTerminal from "@/components/ChatTerminal";
import ThemeToggle from "@/components/ThemeToggle";

export default function ChatPage() {
  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 relative selection:bg-purple-500/30 selection:text-white">
      {/* Glow overlays */}
      <div className="absolute inset-0 radial-overlay pointer-events-none z-0" />
      <div className="absolute inset-0 radial-overlay-blue pointer-events-none z-0" />
      
      {/* Chat Terminal in Full View */}
      <main className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full h-full min-h-[80vh]">
        <div className="flex-1 flex flex-col space-y-2.5 h-full w-full">
          <div className="flex items-center justify-between px-1 shrink-0">
            <h1 className="text-sm font-mono text-cyan-400 uppercase tracking-widest">
              Sujith&apos;s AI Twin // Fullscreen Terminal
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-white/30 font-mono">Secure Node Connected</span>
              <ThemeToggle />
            </div>
          </div>
          <ChatTerminal isPage={true} />
        </div>
      </main>
    </div>
  );
}
