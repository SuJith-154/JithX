import AdminConsole from "@/components/AdminConsole";

export const metadata = {
  title: "Admin Dashboard | JithX Analytics",
  description: "Secure gateway for monitoring profile traffic metrics, system visits, and chat history of Sujith Senthilraj's digital twin.",
};

export default function AdminPage() {
  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 relative selection:bg-purple-500/30 selection:text-white">
      {/* Glow overlays */}
      <div className="absolute inset-0 radial-overlay pointer-events-none z-0" />
      <div className="absolute inset-0 radial-overlay-blue pointer-events-none z-0" />

      {/* Admin Panel container */}
      <main className="relative z-10 flex-1 flex flex-col max-w-7xl mx-auto w-full h-full min-h-[85vh]">
        <AdminConsole />
      </main>
    </div>
  );
}
