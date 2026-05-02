import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  ShieldAlert,
  UserX,
  UserCheck,
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("username");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [hoveredUserId, setHoveredUserId] = useState(null);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [userToBan, setUserToBan] = useState(null);
  const [banReason, setBanReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

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
      setErrorMessage("Unauthorized Access, Warrior.");
      setIsErrorModalOpen(true);
      setTimeout(() => navigate("/dashboard"), 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInsight = async (userId) => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/api/admin/users/${userId}/dangerous-documents`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setSelectedDocs(response.data);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching documents:", error.response?.data || error);
      setErrorMessage("Failed to load insights. Check console.");
      setIsErrorModalOpen(true);
    }
  };

  const handleMarkSafe = async (docPublicId, userId) => {
    try {
      await axios.patch(
        `http://127.0.0.1:8000/api/admin/documents/${docPublicId}/verify-safe`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const updatedDocs = selectedDocs.filter(
        (d) => d.public_id !== docPublicId,
      );
      setSelectedDocs(updatedDocs);
      if (updatedDocs.length === 0) setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      setErrorMessage("Failed to mark document as safe.");
      setIsErrorModalOpen(true);
    }
  };

  const handleToggleBanClick = (user) => {
    if (user.is_banned) {
      executeBanStatusChange(user.id, "");
    } else {
      setUserToBan(user);
      setBanReason("");
      setIsBanModalOpen(true);
    }
  };

  const executeBanStatusChange = async (userId, reason) => {
    try {
      await axios.patch(
        `http://127.0.0.1:8000/api/admin/users/${userId}/ban`,
        { reason: reason },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setIsBanModalOpen(false);
      setUserToBan(null);
      fetchUsers();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "Action failed.");
      setIsErrorModalOpen(true);
    }
  };

  {
    /* Filter logic */
  }
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
        if (a.is_banned === b.is_banned) return 0;
        return a.is_banned ? -1 : 1;
      } else if (sortBy === "safety") {
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
              Admin Panel
            </h1>
            <div className="h-1.5 w-20 bg-samurai-gold mt-2 rounded-full"></div>
          </div>
          <ThemeToggle />
        </header>

        {/* SEARCH & SORT */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Live Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search user by username or email..."
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

        {/* Desktop View */}
        <div className="hidden md:block bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 border-b dark:border-white/10">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Username
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

                  <td className="p-6">
                    <div className="flex justify-center">
                      {user.has_dangerous_docs ? (
                        <button
                          onClick={() => handleViewInsight(user.id)}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 flex items-center gap-1.5 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-300 shadow-sm"
                        >
                          <AlertTriangle size={12} strokeWidth={3} /> Review
                          Suspect
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-500 flex items-center gap-1.5 border border-green-500/20 opacity-80">
                          <ShieldCheck size={12} strokeWidth={3} /> Safe
                        </span>
                      )}
                    </div>
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
                        onClick={() => handleToggleBanClick(user)}
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

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {displayUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/5 rounded-[2rem] p-5 shadow-lg flex flex-col gap-4"
            >
              {/* Header Card: Username + Action */}
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
                    onClick={() => handleToggleBanClick(user)}
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

              {/* Badges */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                <span
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center ${user.is_banned ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}
                >
                  {user.is_banned ? "Suspended" : "Active"}
                </span>

                {user.has_dangerous_docs ? (
                  <button
                    onClick={() => handleViewInsight(user.id)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 flex items-center gap-1.5 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-300 shadow-sm active:scale-95"
                  >
                    <AlertTriangle size={12} strokeWidth={3} /> Review Suspect
                  </button>
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

      {/* Review Document */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#121214] border border-red-500/30 w-full max-w-2xl p-8 rounded-[2.5rem] relative z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3 text-red-500">
                  <ShieldAlert className="text-red-500" /> Security Review
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-8">
                {selectedDocs.map((doc) => (
                  <div
                    key={doc.public_id}
                    className="pb-8 border-b border-gray-100 dark:border-white/5 last:border-0 last:pb-0"
                  >
                    <h3 className="font-bold text-samurai-gold mb-4 text-sm uppercase tracking-widest">
                      {doc.title}
                    </h3>

                    <div className="prose prose-sm max-w-none text-gray-900 dark:text-gray-100 prose-p:leading-relaxed prose-li:my-2 dark:prose-invert mb-6">
                      <ReactMarkdown>{doc.summary}</ReactMarkdown>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          handleMarkSafe(doc.public_id, doc.owner_id)
                        }
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500/10 text-green-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all shadow-sm"
                      >
                        <UserCheck size={16} /> Mark as Safe
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ban User Modal */}
      <AnimatePresence>
        {isBanModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBanModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#121214] border border-red-500/30 w-full max-w-md p-8 rounded-[2rem] relative z-10 shadow-2xl"
            >
              <h3 className="text-xl font-black uppercase tracking-tighter text-red-500 mb-6 flex items-center gap-2">
                <UserX size={24} /> Suspend Warrior
              </h3>
              <p className="text-gray-400 text-xs mb-6 uppercase tracking-widest font-bold">
                State the reason for suspending @{userToBan?.username}.
              </p>

              <input
                autoFocus
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-red-500 transition-colors mb-6 text-gray-900 dark:text-white"
                placeholder="Reason for suspension..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  executeBanStatusChange(userToBan.id, banReason)
                }
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setIsBanModalOpen(false)}
                  className="flex-1 py-3 font-bold text-xs uppercase tracking-widest border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    executeBanStatusChange(userToBan.id, banReason)
                  }
                  className="flex-1 py-3 font-bold text-xs uppercase tracking-widest bg-red-500 text-white rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors"
                >
                  Suspend
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Modal */}
      <AnimatePresence>
        {isErrorModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsErrorModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#121214] border border-red-500/30 w-full max-w-sm p-8 rounded-[2.5rem] relative z-10 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter mb-2 text-red-500">
                Action Failed
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                {errorMessage}
              </p>
              <button
                onClick={() => setIsErrorModalOpen(false)}
                className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-gray-900 dark:bg-white/5 text-white hover:bg-black transition-colors"
              >
                Understood
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
