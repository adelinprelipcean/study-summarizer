import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  UserX,
  UserCheck,
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("username"); // "username", "status", "safety"
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      alert("Unauthorized Access, Warrior.");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBan = async (userId, isCurrentlyBanned) => {
    const reason = isCurrentlyBanned ? "" : prompt("Reason for suspension:");
    if (!isCurrentlyBanned && reason === null) return;

    try {
      await axios.patch(
        `http://127.0.0.1:8000/api/admin/users/${userId}/ban`,
        { reason: reason },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      fetchUsers(); // Refresh list
    } catch (err) {
      alert(err.response?.data?.detail || "Action failed.");
    }
  };

  // --- LOGICA DE FILTRARE ȘI SORTARE ---
  const getFilteredAndSortedUsers = () => {
    let result = users.filter(
      (user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    result.sort((a, b) => {
      if (sortBy === "username") {
        return a.username.localeCompare(b.username);
      } else if (sortBy === "status") {
        // Suspendatii apar primii
        if (a.is_banned === b.is_banned) return 0;
        return a.is_banned ? -1 : 1;
      } else if (sortBy === "safety") {
        // Cei cu probleme de siguranta apar primii
        if (a.has_dangerous_docs === b.has_dangerous_docs) return 0;
        return a.has_dangerous_docs ? -1 : 1;
      }
      return 0;
    });

    return result;
  };

  const displayUsers = getFilteredAndSortedUsers();

  return (
    <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#0c0c0d] p-4 md:p-8 text-gray-900 dark:text-white transition-colors">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-samurai-gold mb-4 hover:underline text-sm md:text-base font-bold"
            >
              <ArrowLeft size={16} /> Return to Archive
            </button>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">
              Admin Citadel
            </h1>
            <div className="h-1.5 w-20 bg-samurai-gold mt-2 rounded-full"></div>
          </div>
          <div className="bg-samurai-gold/10 p-3 md:p-4 rounded-2xl border border-samurai-gold/30">
            <ShieldAlert className="text-samurai-gold" size={28} />
          </div>
        </header>

        {/* CONTROALE: SEARCH & SORT */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Live Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search warrior by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-4 bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-2xl focus:border-samurai-gold outline-none transition-all shadow-lg text-sm font-medium"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <SlidersHorizontal size={18} className="text-gray-400" />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full pl-11 pr-10 py-4 bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-2xl appearance-none focus:border-samurai-gold outline-none transition-all shadow-lg text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 cursor-pointer"
            >
              <option value="username">Sort: Username</option>
              <option value="status">Sort: Status</option>
              <option value="safety">Sort: Safety</option>
            </select>
          </div>
        </div>

        {/* --- VIEW PENTRU DESKTOP (TABEL) --- */}
        <div className="hidden md:block bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 border-b dark:border-white/10">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Warrior
                </th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Email Scroll
                </th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">
                  Safety Alert
                </th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">
                  <div className="w-28 mx-auto">Status</div>
                </th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="p-6 font-bold">
                    @{user.username} {user.is_admin && "👑"}
                  </td>
                  <td className="p-6 text-gray-500 text-sm">{user.email}</td>

                  <td className="p-6 text-center">
                    {user.has_dangerous_docs ? (
                      <div className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-500 px-3 py-1.5 rounded-xl border border-red-500/20">
                        <AlertTriangle size={14} strokeWidth={3} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          Dangerous
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-500 px-3 py-1.5 rounded-xl border border-green-500/20 opacity-80">
                        <ShieldCheck size={14} strokeWidth={3} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          Safe
                        </span>
                      </div>
                    )}
                  </td>

                  <td className="p-6 w-32 text-center">
                    <span
                      className={`inline-block w-full px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-center ${user.is_banned ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}
                    >
                      {user.is_banned ? "Suspended" : "Active"}
                    </span>
                  </td>

                  <td className="p-6 w-24 text-right">
                    {!user.is_admin && (
                      <button
                        onClick={() => handleToggleBan(user.id, user.is_banned)}
                        className={`p-3 rounded-xl transition-all ${user.is_banned ? "bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white" : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"}`}
                      >
                        {user.is_banned ? (
                          <UserCheck size={18} />
                        ) : (
                          <UserX size={18} />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {displayUsers.length === 0 && (
            <div className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest text-sm">
              No warriors found.
            </div>
          )}
        </div>

        {/* --- VIEW PENTRU MOBIL (CARDURI COMPACTE) --- */}
        <div className="md:hidden space-y-4">
          {displayUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/5 rounded-[2rem] p-5 shadow-lg flex flex-col gap-4"
            >
              {/* Header Card: Username + Actiune */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg leading-none mb-1">
                    @{user.username} {user.is_admin && "👑"}
                  </h3>
                  <p className="text-xs text-gray-500 truncate max-w-[200px]">
                    {user.email}
                  </p>
                </div>
                {!user.is_admin && (
                  <button
                    onClick={() => handleToggleBan(user.id, user.is_banned)}
                    className={`p-2.5 rounded-xl transition-all shadow-md ${user.is_banned ? "bg-green-500/10 text-green-500 active:bg-green-500 active:text-white" : "bg-red-500/10 text-red-500 active:bg-red-500 active:text-white"}`}
                  >
                    {user.is_banned ? (
                      <UserCheck size={16} />
                    ) : (
                      <UserX size={16} />
                    )}
                  </button>
                )}
              </div>

              {/* Badges Container */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                <span
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center ${user.is_banned ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}
                >
                  {user.is_banned ? "Suspended" : "Active"}
                </span>

                {user.has_dangerous_docs ? (
                  <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 flex items-center gap-1.5 border border-red-500/20">
                    <AlertTriangle size={12} strokeWidth={3} /> Dangerous
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-500 flex items-center gap-1.5 border border-green-500/20 opacity-80">
                    <ShieldCheck size={12} strokeWidth={3} /> Safe
                  </span>
                )}
              </div>
            </div>
          ))}
          {displayUsers.length === 0 && (
            <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-gray-200 dark:border-white/10 rounded-[2rem]">
              No warriors found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
