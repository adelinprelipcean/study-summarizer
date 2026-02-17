import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
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
  Trash2,
  Check,
  Plus,
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
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [tempTitle, setTempTitle] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [viewMode, setViewMode] = useState("personal");
  const [activeGroup, setActiveGroup] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [docToShare, setDocToShare] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const getCurrentUserId = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return String(payload.sub);
    } catch (e) {
      return null;
    }
  };

  const currentUserId = getCurrentUserId();

  const handleSummarize = async (publicId) => {
    const existingDoc = documents.find((d) => d.public_id === publicId);

    if (existingDoc && existingDoc.summary) {
      setSelectedSummary(existingDoc.summary);
      setIsModalOpen(true);
      return;
    }

    setLoadingId(publicId);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `http://127.0.0.1:8000/api/documents/${publicId}/summarize`,
        { summary_type: "concise" },
        { headers: { ...(token && { Authorization: `Bearer ${token}` }) } },
      );

      const generatedSummary = res.data.summary;

      setDocuments((prevDocs) => {
        const updatedDocs = prevDocs.map((d) =>
          d.public_id === publicId ? { ...d, summary: generatedSummary } : d,
        );

        const token = localStorage.getItem("token");
        if (!token) {
          localStorage.setItem("guest_docs", JSON.stringify(updatedDocs));
        }

        return updatedDocs;
      });

      setSelectedSummary(generatedSummary);
      setIsModalOpen(true);
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail || "The spirits are restless.";
      alert(errorMessage);
    } finally {
      setLoadingId(null);
    }
  };

  const fetchDocuments = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      const localDocs = JSON.parse(localStorage.getItem("guest_docs") || "[]");
      setDocuments(localDocs);
      return;
    }

    try {
      const res = await axios.get("http://127.0.0.1:8000/api/documents/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(res.data.documents);
    } catch (err) {
      console.error("Error fetching scrolls:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(".pdf", ""));

    setIsUploading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://127.0.0.1:8000/api/documents/",
        formData,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const newDoc = res.data;

      setDocuments((prevDocs) => [newDoc, ...prevDocs]);

      if (!token) {
        setGuestLimit((prev) => prev + 1);
        const currentLocalDocs = JSON.parse(
          localStorage.getItem("guest_docs") || "[]",
        );
        localStorage.setItem(
          "guest_docs",
          JSON.stringify([newDoc, ...currentLocalDocs]),
        );
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("The gates are barred. Upload failed.");
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const handleRename = async (publicId) => {
    if (!tempTitle.trim()) {
      setEditingId(null);
      return;
    }

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("new_title", tempTitle);

    try {
      await axios.patch(
        `http://127.0.0.1:8000/api/documents/${publicId}/rename`,
        formData,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setDocuments((docs) =>
        docs.map((d) =>
          d.public_id === publicId ? { ...d, title: tempTitle } : d,
        ),
      );
    } catch (err) {
      if (!token) {
        setDocuments((docs) =>
          docs.map((d) =>
            d.public_id === publicId ? { ...d, title: tempTitle } : d,
          ),
        );
      } else {
        alert("The scroll resists change. Rename failed.");
      }
    } finally {
      setEditingId(null);
    }
  };

  const promptDelete = (publicId) => {
    setDeleteConfirmId(publicId);
  };

  const executeDelete = async () => {
    const publicId = deleteConfirmId;
    const token = localStorage.getItem("token");
    try {
      if (token) {
        await axios.delete(`http://127.0.0.1:8000/api/documents/${publicId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setDocuments((prev) => prev.filter((d) => d.public_id !== publicId));
    } catch (err) {
      alert("The scroll resists destruction.");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsGuest(true);
    setDocuments([]);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        // Salvăm tot obiectul utilizator (id, username etc.)
        setCurrentUser({
          id: String(payload.sub),
          username: payload.username || "", // Presupunând că ai username în token
        });
      } catch (e) {
        console.error("Token decoding failed");
      }
    }

    fetchDocuments();

    if (!isGuest) {
      fetchGroups();
    }

    if (isGuest) {
      const syncEnergy = async () => {
        try {
          const res = await axios.get(
            "http://127.0.0.1:8000/api/documents/guest-limit",
          );
          setGuestLimit(res.data.usage_count);
        } catch (err) {
          console.error("The energy couldn't be synchronized", err);
        }
      };
      syncEnergy();
    }
  }, [isGuest]);

  const fetchGroups = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/groups/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroups(res.data);
    } catch (err) {
      console.error("Error fetching war rooms:", err);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/groups/",
        { name: newGroupName, description: newGroupDesc },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setGroups((prev) => [...prev, res.data]);
      setIsGroupModalOpen(false);
      setNewGroupName("");
      setNewGroupDesc("");
    } catch (err) {
      alert("The War Room could not be established.");
    }
  };

  const handleDeleteActiveGroup = async () => {
    if (!activeGroup) return;

    const confirmMessage = `Are you sure you want to dismantle "${activeGroup.name}"? This action is final.`;
    if (!window.confirm(confirmMessage)) return;

    const token = localStorage.getItem("token");
    try {
      await axios.delete(`http://127.0.0.1:8000/api/groups/${activeGroup.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setGroups((prev) => prev.filter((g) => g.id !== activeGroup.id));
      switchToPersonal();
    } catch (err) {
      alert("The spirits refuse to dismantle this chamber.");
    }
  };

  const switchToPersonal = () => {
    setViewMode("personal");
    setActiveGroup(null);
    fetchDocuments();
  };

  const switchToGroup = async (group) => {
    setViewMode("group");
    setActiveGroup(group);
    const token = localStorage.getItem("token");
    try {
      const resDocs = await axios.get(
        `http://127.0.0.1:8000/api/groups/${group.id}/documents`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setDocuments(resDocs.data);

      const resAct = await axios.get(
        `http://127.0.0.1:8000/api/groups/${group.id}/activity`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setActivities(resAct.data);
    } catch (err) {
      console.error("Could not enter War Room:", err);
    }
  };

  const promptShare = (doc) => {
    setDocToShare(doc);
    setIsShareModalOpen(true);
  };

  const executeShare = async (groupId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `http://127.0.0.1:8000/api/documents/${docToShare.public_id}/share/${groupId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setIsShareModalOpen(false);
      setDocToShare(null);
      alert("Scroll shared successfully!");
    } catch (err) {
      alert("Could not share the scroll.");
    }
  };

  const handleViewSharedSummary = (publicId) => {
    const doc = documents.find((d) => d.public_id === publicId);
    if (doc && doc.summary) {
      setSelectedSummary(doc.summary);
      setIsModalOpen(true);
    } else {
      handleSummarize(publicId);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#0c0c0d] text-gray-900 dark:text-gray-100 flex transition-colors duration-300 font-sans relative">
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
        flex flex-col justify-between bg-white dark:bg-[#0e0e0f] z-50 transition-all duration-300
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
      >
        <div className="p-8 relative">
          <div className="flex justify-between items-center mb-12">
            <motion.button
              onClick={() => navigate("/")}
              initial="initial"
              whileHover="hover"
              className="relative flex flex-col items-center w-full group overflow-hidden"
            >
              <motion.img
                src={logoPng}
                alt="Logo"
                className="w-auto h-auto object-contain z-10 transition-all"
              />

              <motion.span
                variants={{
                  initial: { y: 20, opacity: 0 },
                  hover: { y: 0, opacity: 1 },
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-gray-400 dark:text-white font-black text-xl tracking-[0.2em] mt-2 select-none"
              >
                SUMMER<span className="text-samurai-gold">EY-I</span>
              </motion.span>

              {/* Subliniere subtilă animată */}
              <motion.div
                variants={{
                  initial: { width: 0, opacity: 0 },
                  hover: { width: "40%", opacity: 1 },
                }}
                className="h-0.5 bg-samurai-gold mt-1 rounded-full"
              />
            </motion.button>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden absolute top-6 right-6 text-gray-400 hover:text-samurai-gold transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="space-y-6">
            {/* My Scrolls */}
            <div className="space-y-2">
              <button
                onClick={switchToPersonal}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all duration-300 shadow-lg ${
                  viewMode === "personal"
                    ? "bg-samurai-gold text-white shadow-samurai-gold/20 dark:text-black"
                    : "text-gray-400 hover:bg-white/5"
                }`}
              >
                <FileText size={20} /> My Scrolls
              </button>
            </div>

            {/* War Rooms Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                  War Rooms
                </h3>
                {!isGuest && (
                  <button
                    onClick={() => setIsGroupModalOpen(true)} // ADAUGĂ ASTA
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-samurai-gold"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {isGuest ? (
                  <div className="flex items-center gap-4 px-5 py-4 rounded-2xl opacity-30 cursor-not-allowed border border-dashed border-gray-300 dark:border-white/10">
                    <Lock size={20} />
                    <span className="text-sm font-bold uppercase tracking-widest">
                      Locked
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {groups.length > 0 ? (
                        groups.map((group) => (
                          <button
                            key={group.id}
                            onClick={() => switchToGroup(group)}
                            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-300 group border uppercase tracking-tighter font-bold text-[11px] ${
                              activeGroup?.id === group.id
                                ? "bg-samurai-gold/10 border-samurai-gold/30 text-samurai-gold shadow-lg shadow-samurai-gold/5"
                                : "border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300"
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                                activeGroup?.id === group.id
                                  ? "bg-samurai-gold shadow-[0_0_8px_rgba(212,175,55,0.8)] scale-125"
                                  : "bg-gray-600 group-hover:bg-samurai-gold/50"
                              }`}
                            />
                            <span className="truncate">{group.name}</span>
                          </button>
                        ))
                      ) : (
                        <p className="text-[10px] text-center text-gray-500 py-4 italic tracking-widest uppercase opacity-50">
                          No rooms joined
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </nav>
        </div>

        <div className="p-8 border-t border-gray-100 dark:border-white/5 transition-all duration-300">
          <button
            onClick={isGuest ? () => navigate("/login") : handleLogout}
            className={`w-full flex items-center gap-4 px-5 py-4 font-bold hover:scale-110 transition-all duration-300 ${
              isGuest
                ? "text-samurai-gold"
                : "text-samurai-gold hover:scale-105"
            }`}
          >
            <LogOut size={20} />
            {isGuest ? "Login/Register" : "Sign Out"}
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
          <div className="w-10"></div>
        </div>

        <div className="p-6 md:p-12 flex-1 overflow-y-auto">
          <header className="mb-10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase dark:text-white leading-none">
                  {viewMode === "personal" ? "The Archive" : activeGroup?.name}
                </h2>
                <div className="h-1.5 w-12 bg-samurai-gold mt-3 rounded-full"></div>
              </div>
            </div>

            {/* Zona de butoane de control (Toggle + Delete) */}
            <div className="flex items-center gap-4">
              <ThemeToggle />

              {/* Buton DELETE*/}
              {viewMode === "group" &&
                activeGroup &&
                currentUser &&
                String(activeGroup.created_by_id) ===
                  String(currentUser.id) && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleDeleteActiveGroup}
                    className="flex items-center gap-2 px-3 py-3 rounded-xl border border-red-500/30 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all duration-200 shadow-lg"
                  >
                    <Trash2 size={16} />
                    Delete Room
                  </motion.button>
                )}

              {isGuest && (
                <div className="bg-samurai-gold/10 border border-samurai-gold/30 px-5 py-2.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-samurai-gold/5 transition-all">
                  <Zap
                    size={16}
                    className="text-samurai-gold fill-samurai-gold"
                  />
                  <span className="text-xs font-bold text-samurai-gold uppercase tracking-widest whitespace-nowrap">
                    Energy: {2 - guestLimit}/2
                  </span>
                </div>
              )}
            </div>
          </header>

          {/* Quick Action Box */}
          {viewMode === "personal" && (
            <div className="mb-10">
              <label className="group relative flex flex-col items-center justify-center w-full h-40 md:h-48 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-[2rem] bg-gray-50/50 dark:bg-white/5 transition-all cursor-pointer hover:border-samurai-gold">
                <div className="flex flex-col items-center p-4">
                  <Upload className="text-samurai-gold mb-2" size={28} />
                  <p className="font-bold text-center">
                    {isUploading
                      ? "Invoking Spirits (Uploading...)"
                      : "Invoke a New Document"}
                  </p>
                  <p className="text-xs text-gray-500 text-center">
                    {isUploading
                      ? "Wait for the scroll to manifest"
                      : "PDF up to 10MB"}
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf"
                />
              </label>
            </div>
          )}

          {/* Grid Container & Activity Log Area */}
          <div className="pb-20">
            {viewMode === "personal" ? (
              /* MODUL PERSONAL */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={doc.public_id}
                    className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/5 p-6 rounded-[2rem] shadow-xl flex flex-col justify-between hover:border-samurai-gold/30 transition-all"
                  >
                    <div className="mb-6 group relative">
                      {editingId === doc.public_id ? (
                        <div className="flex items-center gap-2 border-b-2 border-samurai-gold py-1">
                          <input
                            autoFocus
                            className="bg-transparent outline-none flex-1 text-lg font-bold text-gray-900 dark:text-gray-100"
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            onBlur={() => handleRename(doc.public_id)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleRename(doc.public_id)
                            }
                          />
                          <button
                            onClick={() => handleRename(doc.public_id)}
                            className="text-samurai-gold hover:scale-125 active:scale-90 transition-all p-1"
                          >
                            <Check size={20} strokeWidth={3} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div
                            className="flex-1 pr-4 cursor-pointer"
                            onClick={() => {
                              setEditingId(doc.public_id);
                              setTempTitle(doc.title);
                            }}
                          >
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white break-words">
                              {doc.title}
                            </h3>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">
                              Ref: {doc.public_id}
                            </p>
                            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-samurai-gold font-bold uppercase tracking-tighter transition-opacity absolute -bottom-4 left-0">
                              Click title to edit
                            </span>
                          </div>

                          {/* Share & Delete*/}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                promptShare(doc);
                              }}
                              className="text-gray-400 hover:text-samurai-gold transition-all p-2 hover:bg-samurai-gold/10 rounded-lg"
                              title="Share to War Room"
                            >
                              <Share2 size={18} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                promptDelete(doc.public_id);
                              }}
                              className="text-gray-400 hover:text-red-500 transition-all p-2 hover:bg-red-500/10 rounded-lg"
                              title="Destroy Scroll"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleSummarize(doc.public_id)}
                      disabled={loadingId !== null}
                      className="w-full bg-gray-900 dark:bg-samurai-gold text-white dark:text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-samurai-gold/10"
                    >
                      {loadingId === doc.public_id
                        ? "Channeling AI..."
                        : doc.summary
                          ? "View Insight"
                          : "Summon AI Insight"}
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
              >
                <div className="bg-white dark:bg-[#121214] border border-samurai-gold/20 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                  {/* Grilă de carduri - Optimizată pentru vizibilitate */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {activities.length > 0 ? (
                      activities.map((act) => {
                        const isMe =
                          currentUser &&
                          String(act.user_id) === String(currentUser.id);
                        const isRemoved =
                          !act.document_title ||
                          act.document_title === "Unknown Scroll";

                        return (
                          <div
                            key={act.id}
                            className={`relative p-8 rounded-[2rem] border transition-all duration-300 flex flex-col justify-between min-h-[180px] ${
                              isRemoved
                                ? "bg-red-500/5 border-red-500/10 opacity-60 shadow-inner"
                                : "bg-white/5 border-white/5 hover:border-samurai-gold/40 hover:bg-white/10 shadow-xl hover:shadow-samurai-gold/5"
                            }`}
                          >
                            {/* Header Card: User & Timestamp */}
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-2.5 h-2.5 rounded-full ${isRemoved ? "bg-red-600" : "bg-samurai-gold animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.6)]"}`}
                                />
                                <span
                                  className={`text-xs font-black uppercase tracking-widest ${isMe ? "text-samurai-gold" : "text-gray-400"}`}
                                >
                                  @{isMe ? "You" : act.username}
                                </span>
                              </div>
                              <div className="bg-gray-100 dark:bg-[#121214] px-3 py-1 rounded-full border border-white/5 shadow-inner">
                                <span className="text-[14px] font-mono text-black dark:text-white tracking-tighter">
                                  {new Date(act.created_at).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Content: Title or Redacted Message */}
                            <div className="flex-1 flex items-center py-2">
                              {isRemoved ? (
                                <div className="flex items-center gap-3">
                                  <Lock size={16} className="text-red-600" />
                                  <p className="text-sm text-red-600 italic font-medium leading-relaxed">
                                    "This scroll has been permanently retracted
                                    by the owner."
                                  </p>
                                </div>
                              ) : (
                                <div className="w-full">
                                  <h4 className="text-lg font-bold text-black dark:text-white group-hover:text-samurai-gold transition-colors line-clamp-2 leading-snug mb-1">
                                    {act.document_title}
                                  </h4>
                                  <div className="h-0.5 w-8 bg-samurai-gold/30 rounded-full group-hover:w-16 transition-all" />
                                </div>
                              )}
                            </div>

                            {/* Footer: Action Button */}
                            <div className="mt-4 pt-4 border-t border-white/5">
                              {!isRemoved ? (
                                <button
                                  onClick={() =>
                                    handleViewSharedSummary(
                                      act.document_public_id,
                                    )
                                  }
                                  className="flex items-center justify-between w-full group/btn"
                                >
                                  <span className="text-[10px] font-black text-samurai-gold uppercase tracking-[0.2em] group-hover/btn:tracking-[0.25em] transition-all">
                                    View Document
                                  </span>
                                  <BrainCircuit
                                    size={16}
                                    className="text-samurai-gold opacity-40 group-hover/btn:opacity-100 group-hover/btn:scale-110 transition-all"
                                  />
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 opacity-30">
                                  <X size={14} className="text-gray-500" />
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    Access Denied
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-24 flex flex-col items-center opacity-30">
                        <Users size={48} className="mb-4 text-gray-400" />
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">
                          No briefings shared yet
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Background Dim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#121214] border border-samurai-gold/30 w-full max-w-2xl p-8 rounded-[2.5rem] relative z-10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 pr-12">
                <h2 className="text-xl font-black uppercase tracking-tighter text-samurai-gold">
                  Scroll Insight
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-samurai-gold transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div
                  className="prose prose-sm max-w-none 
                           text-gray-900 dark:text-gray-100 
                             prose-p:leading-relaxed prose-li:my-2
                             dark:prose-invert"
                >
                  <ReactMarkdown>{selectedSummary}</ReactMarkdown>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full mt-8 bg-samurai-gold text-black font-bold py-4 rounded-2xl uppercase tracking-widest"
              >
                Return to Archive
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#121214] border border-red-500/30 w-full max-w-sm p-8 rounded-[2rem] relative z-10 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter mb-2">
                Destroy Scroll?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                This action is final. The knowledge within will be lost to the
                void.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    promptShare(doc);
                  }}
                  className="text-gray-400 hover:text-samurai-gold hover:scale-125 transition-all p-2"
                >
                  <Share2 size={18} />
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGroupModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGroupModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#121214] border border-samurai-gold/30 w-full max-w-md p-8 rounded-[2rem] relative z-10 shadow-2xl"
            >
              <h3 className="text-xl font-black uppercase tracking-tighter text-samurai-gold mb-6">
                Establish War Room
              </h3>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2">
                    Room Name
                  </label>
                  <input
                    required
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-samurai-gold transition-colors"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="E.g. Quantum Physics 101"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2">
                    Description
                  </label>
                  <textarea
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-samurai-gold transition-colors h-24 resize-none"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="Topic of study..."
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsGroupModalOpen(false)}
                    className="flex-1 py-3 font-bold text-xs uppercase tracking-widest border border-gray-200 dark:border-white/10 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 font-bold text-xs uppercase tracking-widest bg-samurai-gold text-black rounded-xl shadow-lg shadow-samurai-gold/20"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShareModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#121214] border border-samurai-gold/30 w-full max-w-sm p-6 rounded-[2rem] relative z-10 shadow-2xl"
            >
              <h3 className="text-lg font-black uppercase text-samurai-gold mb-4 text-center">
                Share to War Room
              </h3>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {groups.length > 0 ? (
                  groups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => executeShare(g.id)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent hover:border-samurai-gold/20 transition-all group"
                    >
                      <span className="text-gray-700 dark:text-gray-300 font-bold text-sm group-hover:text-samurai-gold">
                        {g.name}
                      </span>
                      <Share2
                        size={14}
                        className="text-gray-400 group-hover:text-samurai-gold"
                      />
                    </button>
                  ))
                ) : (
                  <p className="text-center text-gray-500 text-xs italic py-4">
                    No War Rooms found. Create one first!
                  </p>
                )}
              </div>

              <button
                onClick={() => setIsShareModalOpen(false)}
                className="w-full mt-6 py-3 bg-gray-200 dark:bg-white/10 rounded-xl font-bold text-xs uppercase hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
