"use client";

import React, { useState, useEffect } from "react";
import { 
  Terminal, ShieldAlert, Key, Check, AlertTriangle, 
  ShieldCheck, RefreshCw, LogOut, Database, Clock, 
  Globe, Eye, MessageSquare, Mail, User, Calendar, 
  Trash2, Shield, Search, ArrowRight, Smartphone, Laptop, Tablet
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownFormatter from "./MarkdownFormatter";

interface VisitRecord {
  id: number;
  ip_address: string;
  country: string;
  region: string;
  city: string;
  user_agent: string;
  device_type?: string;
  referer?: string;
  endpoint_visited: string;
  created_at: string;
}

interface ChatRecord {
  id: number;
  message: string;
  response: string;
  country: string;
  city: string;
  created_at: string;
}

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

export default function AdminConsole() {
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Data states
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [chats, setChats] = useState<ChatRecord[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"visits" | "chats" | "messages">("visits");
  
  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [isPruning, setIsPruning] = useState(false);
  const [pruneSuccess, setPruneSuccess] = useState("");

  // Check if passcode is saved in session storage
  useEffect(() => {
    const savedPasscode = sessionStorage.getItem("jithx_admin_passcode");
    if (savedPasscode) {
      verifyAndFetch(savedPasscode);
    }
  }, []);

  const verifyAndFetch = async (code: string) => {
    setIsLoading(true);
    setError("");
    try {
      // Fetch visits to verify passcode
      const res = await fetch("/api/admin/visits", {
        headers: { "X-Admin-Passcode": code }
      });

      if (res.status === 401) {
        throw new Error("Invalid passcode. Access Denied.");
      }
      if (!res.ok) {
        throw new Error("Server error verifying passcode.");
      }

      const visitsData = await res.json();
      setVisits(visitsData);
      sessionStorage.setItem("jithx_admin_passcode", code);
      setIsAuthenticated(true);

      // Fetch other data
      fetchRemainingData(code);
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
      setIsAuthenticated(false);
      sessionStorage.removeItem("jithx_admin_passcode");
    } finally {
      setIsLoading(false);
      setIsLoggingIn(false);
    }
  };

  const fetchRemainingData = async (code: string) => {
    try {
      const chatsRes = await fetch("/api/admin/chats", {
        headers: { "X-Admin-Passcode": code }
      });
      if (chatsRes.ok) {
        const chatsData = await chatsRes.json();
        setChats(chatsData);
      }

      const msgRes = await fetch("/api/admin/messages", {
        headers: { "X-Admin-Passcode": code }
      });
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        setMessages(msgData);
      }
    } catch (e) {
      console.error("Failed to fetch related dashboard metrics", e);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    setIsLoggingIn(true);
    verifyAndFetch(passcode);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("jithx_admin_passcode");
    setIsAuthenticated(false);
    setPasscode("");
    setVisits([]);
    setChats([]);
    setMessages([]);
  };

  const handleRefresh = () => {
    const code = sessionStorage.getItem("jithx_admin_passcode");
    if (code) {
      verifyAndFetch(code);
    }
  };

  const handleManualPrune = async () => {
    const code = sessionStorage.getItem("jithx_admin_passcode");
    if (!code) return;

    if (!window.confirm("Are you sure you want to delete visits older than 12 months and chats older than 3 months?")) {
      return;
    }

    setIsPruning(true);
    setPruneSuccess("");
    try {
      const res = await fetch("/api/admin/cleanup", {
        method: "POST",
        headers: { "X-Admin-Passcode": code }
      });

      if (!res.ok) {
        throw new Error("Manual database prune failed.");
      }

      const data = await res.json();
      setPruneSuccess("Cleanup completed. Older data purged successfully!");
      // Reload logs after deletion
      verifyAndFetch(code);
      
      setTimeout(() => setPruneSuccess(""), 5000);
    } catch (e: any) {
      alert(e.message || "Failed to prune database.");
    } finally {
      setIsPruning(false);
    }
  };

  // Filter lists based on search query
  const filteredVisits = visits.filter(v => 
    v.ip_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.endpoint_visited?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.referer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredChats = chats.filter(c => 
    c.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.response?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.country?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMessages = messages.filter(m => 
    m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType?.toLowerCase()) {
      case "mobile":
        return <Smartphone className="w-3.5 h-3.5 text-cyan-400" />;
      case "tablet":
        return <Tablet className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Laptop className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-panel glass-panel-glow-purple w-full max-w-md rounded-2xl p-6 md:p-8 font-mono border border-purple-500/20"
        >
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-3 text-purple-400 shadow-[0_0_15px_rgba(191,90,242,0.15)] animate-pulse-slow">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white uppercase tracking-widest text-glow-purple">
              Admin Authentication
            </h2>
            <p className="text-[10px] text-white/40 mt-1 uppercase">
              Secure Interface // Decryption Protocol Active
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase text-purple-400 font-bold block tracking-wider">
                System Passcode
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  placeholder="ENTER ACCESS CODE..."
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs font-mono tracking-widest text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all text-center uppercase"
                  disabled={isLoggingIn}
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg flex items-start gap-2.5 text-[10px] text-red-400"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <div>
                  <span className="font-bold block uppercase">Access Denied</span>
                  {error}
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || !passcode}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 disabled:from-white/5 disabled:to-white/5 disabled:text-white/20 text-white font-mono font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(191,90,242,0.15)] hover:shadow-[0_0_25px_rgba(191,90,242,0.35)] flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" /> Establish Link <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-white/5 pt-4 text-center text-[8.5px] text-white/20 uppercase tracking-widest">
            IP Address & Location logs logged on connection
          </div>
        </motion.div>
      </div>
    );
  }

  // Calculate some simple dashboard metrics
  const uniqueIpCount = new Set(visits.map(v => v.ip_address)).size;
  const popularReferer = visits.reduce((acc, curr) => {
    const ref = curr.referer || "direct";
    acc[ref] = (acc[ref] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topReferer = Object.entries(popularReferer).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

  return (
    <div className="space-y-6">
      {/* Admin Top Dashboard Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4 shrink-0 font-mono">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
            <h2 className="text-base font-extrabold tracking-widest text-cyan-400 uppercase text-glow-blue">
              JithX Secure Control Center
            </h2>
          </div>
          <p className="text-[10px] text-white/40 uppercase">
            Data Core Manager // System Admin Session
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={handleManualPrune}
            disabled={isPruning}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl px-4 py-2 text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isPruning ? "Pruning..." : "Prune Old Data"}
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center justify-center h-8.5 w-8.5 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 rounded-xl transition-all cursor-pointer"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 rounded-xl px-4 py-2 text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            Disconnect
          </button>
        </div>
      </div>

      {pruneSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-[10px] text-emerald-400 font-mono"
        >
          <Check className="w-4 h-4" />
          <span>{pruneSuccess}</span>
        </motion.div>
      )}

      {/* KPI Stats Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="glass-panel glass-panel-glow-blue rounded-xl p-4 border border-white/5 relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-5">
            <Eye className="w-16 h-16 text-cyan-400" />
          </div>
          <span className="text-[9px] uppercase text-white/40 tracking-wider">Total Profile Visits</span>
          <span className="text-xl font-bold text-cyan-400 block text-glow-blue mt-1.5">{visits.length}</span>
          <span className="text-[8.5px] text-white/20 block uppercase mt-1">Unique IPs: {uniqueIpCount}</span>
        </div>

        <div className="glass-panel glass-panel-glow-purple rounded-xl p-4 border border-white/5 relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-5">
            <MessageSquare className="w-16 h-16 text-purple-400" />
          </div>
          <span className="text-[9px] uppercase text-white/40 tracking-wider">AI Twin Conversations</span>
          <span className="text-xl font-bold text-purple-400 block text-glow-purple mt-1.5">{chats.length}</span>
          <span className="text-[8.5px] text-white/20 block uppercase mt-1">Prune: 3 month validity</span>
        </div>

        <div className="glass-panel glass-panel-glow-purple rounded-xl p-4 border border-white/5 relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-5">
            <Mail className="w-16 h-16 text-purple-400" />
          </div>
          <span className="text-[9px] uppercase text-white/40 tracking-wider">Contact Enquiries</span>
          <span className="text-xl font-bold text-white block mt-1.5">{messages.length}</span>
          <span className="text-[8.5px] text-white/20 block uppercase mt-1">Inbox database messages</span>
        </div>

        <div className="glass-panel glass-panel-glow-blue rounded-xl p-4 border border-white/5 relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-5">
            <Globe className="w-16 h-16 text-cyan-400" />
          </div>
          <span className="text-[9px] uppercase text-white/40 tracking-wider">Top Referral Link</span>
          <span className="text-xs font-bold text-cyan-400 block truncate mt-2">{topReferer}</span>
          <span className="text-[8.5px] text-white/20 block uppercase mt-1">Primary traffic origin</span>
        </div>
      </div>

      {/* Tabs and Filtering Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 border border-white/10 p-2 rounded-2xl font-mono">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => { setActiveTab("visits"); setSearchQuery(""); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10.5px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
              activeTab === "visits"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(0,240,255,0.05)]"
                : "text-white/60 hover:text-white border border-transparent"
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Visits feed ({filteredVisits.length})
          </button>
          <button
            onClick={() => { setActiveTab("chats"); setSearchQuery(""); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10.5px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
              activeTab === "chats"
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(191,90,242,0.05)]"
                : "text-white/60 hover:text-white border border-transparent"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Chats Feed ({filteredChats.length})
          </button>
          <button
            onClick={() => { setActiveTab("messages"); setSearchQuery(""); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10.5px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
              activeTab === "messages"
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(191,90,242,0.05)]"
                : "text-white/60 hover:text-white border border-transparent"
            }`}
          >
            <Mail className="w-3.5 h-3.5" /> Contact submissions ({filteredMessages.length})
          </button>
        </div>

        {/* Search bar */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            placeholder={`SEARCH ${activeTab.toUpperCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-xl py-2 pl-9.5 pr-4 text-[10px] font-mono tracking-widest text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20"
          />
        </div>
      </div>

      {/* Main Logs Board Content */}
      <div className="glass-panel rounded-2xl border border-white/5 p-4.5 overflow-x-auto min-h-[40vh] relative">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-xs z-20">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : null}

          {/* TAB 1: VISITS FEED */}
          {activeTab === "visits" && (
            <motion.div
              key="visits"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 min-w-[700px] md:min-w-0"
            >
              <table className="w-full text-left font-mono text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 uppercase tracking-widest text-[9px] font-bold">
                    <th className="py-2.5 pr-2">Device</th>
                    <th className="py-2.5 px-2">IP Address</th>
                    <th className="py-2.5 px-2">Location</th>
                    <th className="py-2.5 px-2">Traffic Referer</th>
                    <th className="py-2.5 px-2">Endpoint</th>
                    <th className="py-2.5 pl-2 text-right">Visited At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-white/20 uppercase tracking-wider">
                        No matching visit logs recorded.
                      </td>
                    </tr>
                  ) : (
                    filteredVisits.map((visit) => (
                      <tr key={visit.id} className="border-b border-white/5 hover:bg-white/2.5 transition-all text-white/70">
                        <td className="py-3 pr-2">
                          <div 
                            className="flex items-center justify-center bg-white/5 border border-white/10 h-7 w-7 rounded-lg cursor-help"
                            title={visit.device_type ? `${visit.device_type} Device` : "Desktop Device"}
                          >
                            {getDeviceIcon(visit.device_type)}
                          </div>
                        </td>
                        <td className="py-3 px-2 font-semibold text-white/90">
                          {visit.ip_address}
                        </td>
                        <td className="py-3 px-2">
                          {visit.city !== "unknown" || visit.country !== "unknown" ? (
                            <span className="flex items-center gap-1">
                              <span className="text-[11px] text-cyan-400 font-bold">
                                {visit.city !== "unknown" ? visit.city : ""}
                              </span>
                              {visit.city !== "unknown" && visit.country !== "unknown" ? "," : ""}
                              <span className="text-white/40">
                                {visit.country !== "unknown" ? visit.country : ""}
                              </span>
                            </span>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 truncate max-w-[150px] text-purple-300" title={visit.referer}>
                          {visit.referer || "direct"}
                        </td>
                        <td className="py-3 px-2">
                          <span className="bg-white/5 border border-white/10 text-[9px] px-1.5 py-0.5 rounded text-white/50">
                            {visit.endpoint_visited}
                          </span>
                        </td>
                        <td className="py-3 pl-2 text-right text-white/40">
                          {formatDate(visit.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="flex justify-between items-center text-[9px] text-white/20 uppercase tracking-widest pt-2.5">
                <span>Showing {filteredVisits.length} of {visits.length} logs</span>
                <span>Visits auto-prune TTL: 12 Months</span>
              </div>
            </motion.div>
          )}

          {/* TAB 2: AI CHATS FEED */}
          {activeTab === "chats" && (
            <motion.div
              key="chats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 font-mono"
            >
              {filteredChats.length === 0 ? (
                <div className="py-12 text-center text-white/20 uppercase tracking-wider">
                  No matching chat conversations recorded.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {filteredChats.map((chat) => (
                    <div 
                      key={chat.id} 
                      className="border border-white/10 bg-black/20 rounded-xl p-4.5 space-y-3 shadow-inner hover:border-purple-500/20 transition-all"
                    >
                      {/* Meta information row */}
                      <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-2 text-[9.5px]">
                        <div className="flex items-center gap-2">
                          <span className="bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                            Session #{chat.id}
                          </span>
                          <span className="text-white/40 flex items-center gap-1 uppercase">
                            <Globe className="w-3 h-3 text-cyan-400" />
                            {chat.city !== "unknown" ? chat.city : ""}{chat.city !== "unknown" && chat.country !== "unknown" ? ", " : ""}{chat.country !== "unknown" ? chat.country : "Unknown Location"}
                          </span>
                        </div>
                        <span className="text-white/20 flex items-center gap-1 uppercase">
                          <Calendar className="w-3 h-3 text-purple-400/50" /> {formatDate(chat.created_at)}
                        </span>
                      </div>

                      {/* Chat dialog bubble logic */}
                      <div className="space-y-3 text-xs leading-relaxed">
                        {/* User Prompt */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-white/40">
                            <User className="w-3 h-3 text-cyan-400" /> Visitor Query:
                          </div>
                          <div className="bg-white/5 border border-white/5 p-3 rounded-lg text-white font-medium select-text">
                            {chat.message}
                          </div>
                        </div>

                        {/* AI Digital Twin Response */}
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-purple-400">
                            <Terminal className="w-3 h-3 text-glow-purple" /> Twin Response:
                          </div>
                          <div className="border border-purple-500/10 bg-purple-950/5 p-3 rounded-lg text-white/90 select-text overflow-x-auto">
                            <MarkdownFormatter text={chat.response} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center text-[9px] text-white/20 uppercase tracking-widest pt-2">
                <span>Showing {filteredChats.length} of {chats.length} conversations</span>
                <span>Chats auto-prune TTL: 3 Months</span>
              </div>
            </motion.div>
          )}

          {/* TAB 3: CONTACT FORM SUBMISSIONS */}
          {activeTab === "messages" && (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 font-mono"
            >
              {filteredMessages.length === 0 ? (
                <div className="py-12 text-center text-white/20 uppercase tracking-wider">
                  No matching contact submissions found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className="border border-white/10 bg-black/25 rounded-xl p-4.5 flex flex-col justify-between hover:border-purple-500/20 transition-all relative"
                    >
                      <div className="space-y-3.5 text-xs">
                        {/* Header Details */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[9px]">
                          <span className="text-white/30 uppercase flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-cyan-400" /> {formatDate(msg.created_at)}
                          </span>
                          <span className="bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">
                            Received
                          </span>
                        </div>

                        {/* Sender info */}
                        <div className="grid grid-cols-1 gap-1">
                          <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Sender Info</span>
                          <span className="text-white font-semibold flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-cyan-400" /> {msg.name}
                          </span>
                          <a 
                            href={`mailto:${msg.email}`}
                            className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1.5 truncate max-w-full font-medium"
                          >
                            <Mail className="w-3.5 h-3.5" /> {msg.email}
                          </a>
                        </div>

                        {/* Content message */}
                        <div className="grid grid-cols-1 gap-1">
                          <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Message Details</span>
                          <div className="bg-white/5 border border-white/5 p-3 rounded-lg text-white/95 leading-relaxed italic select-text whitespace-pre-wrap">
                            "{msg.message}"
                          </div>
                        </div>
                      </div>

                      {/* Call to actions */}
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center">
                        <a 
                          href={`mailto:${msg.email}?subject=Regarding JithX Inquiry`}
                          className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-[10px] uppercase py-2 px-4 rounded-lg transition-all cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5" /> Compose Reply
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center text-[9px] text-white/20 uppercase tracking-widest pt-2">
                <span>Showing {filteredMessages.length} of {messages.length} inquiries</span>
                <span>Contact submissions logged persistently</span>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
