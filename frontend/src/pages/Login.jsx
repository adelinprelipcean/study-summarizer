import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/users/login",
        formData,
      );
      localStorage.setItem("token", res.data.access_token);
      navigate("/dashboard");
    } catch (err) {
      alert("Invalid credentials, warrior.");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-samurai-black flex items-center justify-center p-6 transition-colors duration-500 relative">
      <div className="fixed top-10 right-10 z-50">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-samurai-gold/20 p-10 rounded-[3rem] backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-block p-4 bg-samurai-gold/10 rounded-3xl mb-4">
              <ShieldCheck className="text-samurai-gold" size={40} />
            </div>
            <h2 className="text-3xl font-black tracking-tighter uppercase text-gray-900 dark:text-white">
              Welcome Back
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              Resume your path to mastery.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">
                Email Scroll
              </label>
              <input
                type="email"
                placeholder="samurai@academy.com"
                className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:border-samurai-gold outline-none transition-all dark:text-white shadow-inner"
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">
                Secret Code
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:border-samurai-gold outline-none transition-all dark:text-white shadow-inner"
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
            <button className="w-full bg-gray-900 dark:bg-samurai-gold text-white dark:text-black font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-2 mt-4 shadow-xl shadow-samurai-gold/20">
              Continue Journey <ArrowRight size={18} />
            </button>
          </form>

          <p className="mt-8 text-center text-gray-400 text-xs font-medium uppercase tracking-widest">
            New aspirant?{" "}
            <Link
              to="/register"
              className="text-black dark:text-samurai-gold  hover:underline"
            >
              Register here
            </Link>
          </p>

          {/* BUTON BACK */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-black dark:text-samurai-gold hover:scale-[1.05] text-[16px] font-bold uppercase tracking-[0.2em] flex items-center gap-1 transition-all group"
            >
              Go Back
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
