import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Users,
  Upload,
  Share2,
  BrainCircuit,
  LogOut,
  Lock,
  Zap,
  Menu,
  X,
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import logoPng from "../assets/logo_summerey.png";
import ThemeToggle from "../components/ThemeToggle";

const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [isGuest, setIsGuest] = useState(!localStorage.getItem("token"));
  const [guestLimit, setGuestLimit] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#0c0c0d] text-gray-900 dark:text-gray-100 flex transition-colors duration-500 font-sans relative">
      {/* Overlay - Mobile*/}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
        fixed md:relative w-72 h-full border-r border-gray-200 dark:border-white/5 
        flex flex-col justify-between bg-white dark:bg-[#0e0e0f] z-50 transition-transform duration-300
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-12">
            <img
              src={logoPng}
              alt="Logo"
              className="w-32 h-auto object-contain"
            />
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-gray-400"
            >
              <X />
            </button>
          </div>

          <nav className="space-y-3">
            <button className="w-full flex items-center gap-4 px-5 py-4 bg-samurai-gold text-black rounded-2xl font-bold">
              <FileText size={20} /> My Scrolls
            </button>
            <button
              disabled={isGuest}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl opacity-30 cursor-not-allowed"
            >
              <Lock size={20} /> War Rooms
            </button>
          </nav>
        </div>

        <div className="p-8 border-t border-gray-200 dark:border-white/5">
          <button
            onClick={() => navigate("/login")}
            className="w-full flex items-center gap-4 px-5 py-4 text-samurai-gold font-bold"
          >
            <LogOut size={20} /> {isGuest ? "Identify" : "Retreat"}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Mobile Bar */}
        <div className="md:hidden flex items-center justify-between p-4 border-b dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-md">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-samurai-gold"
          >
            <Menu />
          </button>
          <h2 className="font-black uppercase tracking-tighter">Archive</h2>
          <div className="w-10"></div> {/* Spacer */}
        </div>

        <div className="p-6 md:p-12 flex-1 overflow-y-auto">
          <header className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase dark:text-white leading-none">
                The Archive
              </h2>
              <div className="h-1.5 w-12 bg-samurai-gold mt-3 rounded-full"></div>
            </div>

            {/* Container comun pentru Energy și Toggle - aliniate TOP */}
            <div className="flex items-start gap-4">
              {isGuest && (
                <div className="bg-samurai-gold/10 border border-samurai-gold/30 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-samurai-gold/5 transition-all">
                  <Zap
                    size={18}
                    className="text-samurai-gold fill-samurai-gold"
                  />
                  <span className="text-sm font-bold text-samurai-gold uppercase tracking-widest whitespace-nowrap">
                    Energy: {2 - guestLimit}/2
                  </span>
                </div>
              )}

              {/* Apare în header doar pe Desktop, aliniat la top cu Energy */}
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Quick Action Box */}
          <div className="mb-10">
            <label className="group relative flex flex-col items-center justify-center w-full h-40 md:h-48 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-[2rem] bg-gray-50/50 dark:bg-white/5 transition-all cursor-pointer">
              <div className="flex flex-col items-center p-4">
                <Upload className="text-samurai-gold mb-2" size={28} />
                <p className="font-bold text-center">Invoke a New Document</p>
                <p className="text-xs text-gray-500 text-center">
                  PDF, TXT up to 10MB
                </p>
              </div>
              <input type="file" className="hidden" />
            </label>
          </div>

          {/* Grid Container*/}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
            {isGuest && documents.length === 0 && (
              <div className="col-span-full py-10 flex flex-col items-center opacity-40">
                <BrainCircuit size={48} className="mb-4 text-gray-400" />
                <p className="text-center font-medium uppercase tracking-widest text-sm">
                  No scrolls discovered yet
                </p>
              </div>
            )}

            {documents.map((doc) => (
              <motion.div
                key={doc.public_id}
                className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/5 p-6 rounded-[2rem] shadow-xl"
              >
                <h3 className="text-lg font-bold mb-6 truncate">{doc.title}</h3>
                <button className="w-full bg-gray-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest">
                  Summon AI Insight
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
