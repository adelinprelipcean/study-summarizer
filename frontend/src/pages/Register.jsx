import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { UserPlus, Sparkles } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

const Register = () => {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://127.0.0.1:8000/api/users/register", formData);
      navigate("/login");
    } catch (err) {
      alert("Registration failed.");
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
              <UserPlus className="text-samurai-gold" size={40} />
            </div>
            <h2 className="text-3xl font-black tracking-tighter uppercase text-gray-900 dark:text-white">
              Join the Ranks
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              Start summarizing with honor.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="USERNAME"
              className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:border-samurai-gold outline-none transition-all dark:text-white shadow-inner"
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
            />
            <input
              type="email"
              placeholder="EMAIL"
              className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:border-samurai-gold outline-none transition-all dark:text-white shadow-inner"
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <input
              type="password"
              placeholder="PASSWORD"
              className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:border-samurai-gold outline-none transition-all dark:text-white shadow-inner"
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
            <button className="w-full bg-gray-900 dark:bg-samurai-gold text-white dark:text-black font-black py-4 rounded-2xl hover:scale-[1.02] transition-all uppercase tracking-widest flex items-center justify-center gap-2 mt-4 shadow-xl shadow-samurai-gold/20">
              Become a Member <Sparkles size={18} />
            </button>
          </form>

          <p className="mt-8 text-center text-gray-500 text-xs font-medium tracking-widest uppercase">
            Already recognized?{" "}
            <Link to="/login" className="text-samurai-gold hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
