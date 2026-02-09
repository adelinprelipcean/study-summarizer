import React from "react";
import { FileText, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import logoPng from "../assets/logo_summerey.png";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-samurai-black text-gray-900 dark:text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-500">
      <div className="fixed top-10 right-10 z-50">
        <ThemeToggle />
      </div>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div
          className="hidden dark:block absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[150px] animate-pulse-slow opacity-30"
          style={{ background: "rgba(212, 182, 111, 0.08)" }}
        ></div>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: -20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="mb-10 relative z-10 group"
      >
        <div className="relative flex items-center justify-center">
          {/* Logo */}
          <img
            src={logoPng}
            alt="Logo"
            className="w-56 h-56 object-contain relative z-10"
          />
        </div>
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-4xl md:text-7xl font-bold mb-6 tracking-[0.20em] text-center z-10 uppercase text-gray-800 dark:text-gray-200"
      >
        Summer<span className="text-samurai-gold">ey-I</span>
      </motion.h1>

      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: "60px", opacity: 0.5 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="h-[1px] bg-samurai-gold mb-10"
      ></motion.div>

      <motion.p className="text-gray-600 dark:text-gray-500 text-lg md:text-xl mb-14 text-center max-w-lg z-10 font-light tracking-wide leading-relaxed">
        Samurai precision for your documents.
        <br />
        <span className="text-samurai-gold font-medium dark:font-normal dark:text-samurai-gold/70">
          Analyze. Summarize. Dominate.
        </span>
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col sm:flex-row gap-6 z-10"
      >
        {/* BUTON DASHBOARD (GUEST MODE) */}
        <button
          onClick={() => navigate("/dashboard")}
          className="px-10 py-4 rounded-lg font-bold flex items-center justify-center gap-3 transition-all duration-300 hover:-translate-y-1 tracking-wider text-sm border 
                     border-samurai-gold/50 dark:border-samurai-gold/30 
                     bg-samurai-gold/10 dark:bg-[rgba(212,182,111,0.1)] 
                     text-samurai-gold hover:bg-samurai-gold hover:text-white dark:hover:text-black shadow-lg"
        >
          <Upload size={18} className="stroke-[2px]" />
          UPLOAD DOCUMENT
        </button>
      </motion.div>
    </div>
  );
}

export default Landing;
