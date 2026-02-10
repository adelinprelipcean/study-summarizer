import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Sparkles, X, AlertCircle } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

const Register = () => {
  const [feedback, setFeedback] = useState({
    show: false,
    message: "",
    type: "",
  });

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
      setFeedback({
        show: true,
        message: "The Ranks have accepted you. Redirecting...",
        type: "success",
      });

      // Redirect după un scurt delay pentru a vedea confirmarea
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setFeedback({
        show: true,
        message: "The registration failed. Try again.",
        type: "error",
      });
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
            <Link
              to="/login"
              className="text-black dark:text-samurai-gold  hover:underline"
            >
              Log In
            </Link>
          </p>

          {/* BUTON BACK */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-black dark:text-samurai-gold hover:scale-[1.05] text-[16px] font-bold uppercase tracking-[0.2em] flex items-center gap-1 transition-all group"
            >
              Go back
            </button>
          </div>
        </div>
      </motion.div>

      {/* Feedback Modal */}
      <AnimatePresence>
        {feedback.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFeedback({ ...feedback, show: false })}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Message box */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className={`w-full max-w-sm p-8 rounded-[2.5rem] relative z-10 shadow-2xl text-center border ${
                feedback.type === "success"
                  ? "bg-white dark:bg-[#0e0e0f] border-samurai-gold/30"
                  : "bg-white dark:bg-[#121214] border-red-500/30"
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  feedback.type === "success"
                    ? "bg-samurai-gold/10"
                    : "bg-red-500/10"
                }`}
              >
                {feedback.type === "success" ? (
                  <Sparkles className="text-samurai-gold" size={32} />
                ) : (
                  <AlertCircle className="text-red-500" size={32} />
                )}
              </div>

              <h3
                className={`text-xl font-black uppercase tracking-tighter mb-2 ${
                  feedback.type === "success"
                    ? "text-gray-900 dark:text-white"
                    : "text-red-500"
                }`}
              >
                {feedback.type === "success"
                  ? "Welcome, Warrior"
                  : "Access Denied"}
              </h3>

              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                {feedback.message}
              </p>

              <button
                onClick={() => setFeedback({ ...feedback, show: false })}
                className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-gray-900 dark:bg-white/5 text-white hover:bg-black transition-colors"
              >
                {feedback.type === "success" ? "Understood" : "Try Again"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Register;
