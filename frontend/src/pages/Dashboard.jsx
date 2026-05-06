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
  ShieldAlert,
  Download,
  FileDown,
} from "lucide-react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import logoPng from "../assets/logo_summerey.png";
import ThemeToggle from "../components/ThemeToggle";

const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [isGuest, setIsGuest] = useState(!localStorage.getItem("token"));
  const [guestLimit, setGuestLimit] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { groupId } = useParams();
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
  const [errorMessage, setErrorMessage] = useState("");
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [summaryTypes, setSummaryTypes] = useState({});
  const [shareSuccessMessage, setShareSuccessMessage] = useState("");
  const [sharedGroupIds, setSharedGroupIds] = useState([]);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [shareToRemove, setShareToRemove] = useState(null);
  const [groupToLeave, setGroupToLeave] = useState(null);
  const [downloadDoc, setDownloadDoc] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

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

    const currentPreference =
      typeof summaryTypes === "object" ? summaryTypes[publicId] : "Simple";
    const type = isGuest ? "Simple" : currentPreference || "Simple";

    setLoadingId(publicId);
    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        `http://127.0.0.1:8000/api/documents/${publicId}/summarize?summary_type=${type}`,
        {},
        { headers: { ...(token && { Authorization: `Bearer ${token}` }) } },
      );

      const generatedSummary = res.data.summary;
      const generatedType = res.data.summary_type;

      setDocuments((prevDocs) => {
        const updatedDocs = prevDocs.map((d) =>
          d.public_id === publicId
            ? { ...d, summary: generatedSummary, summary_type: generatedType }
            : d,
        );

        if (!token) {
          localStorage.setItem("guest_docs", JSON.stringify(updatedDocs));
        }
        return updatedDocs;
      });

      if (!token) {
        const limitRes = await axios.get(
          "http://127.0.0.1:8000/api/documents/guest-limit",
        );
        setGuestLimit(limitRes.data.usage_count);
      }

      setSelectedSummary(generatedSummary);
      setIsModalOpen(true);
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail || "The spirits are restless.";
      setErrorMessage(errorMessage);
      setIsErrorModalOpen(true);
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

    let cleanTitle = file.name;
    if (cleanTitle.endsWith(".pdf")) {
      cleanTitle = cleanTitle.replace(".pdf", "");
    } else if (cleanTitle.endsWith(".docx")) {
      cleanTitle = cleanTitle.replace(".docx", "");
    } else if (cleanTitle.endsWith(".txt")) {
      cleanTitle = cleanTitle.replace(".txt", "");
    }
    formData.append("title", cleanTitle);

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
        const limitRes = await axios.get(
          "http://127.0.0.1:8000/api/documents/guest-limit",
        );
        setGuestLimit(limitRes.data.usage_count);
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
      if (err.response && err.response.data && err.response.data.detail) {
        setErrorMessage(err.response.data.detail);
      } else if (!token) {
        setErrorMessage(
          "Too many attempts for today. Try again tomorrow or login to increase the limits.",
        );
      } else {
        setErrorMessage(
          "Upload failed. Ensure the file is not too large and try again.",
        );
      }
      setIsErrorModalOpen(true);
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
        setErrorMessage("The scroll resists change. Rename failed.");
        setIsErrorModalOpen(true);
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
      setErrorMessage("The scroll resists destruction.");
      setIsErrorModalOpen(true);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsGuest(true);
    setCurrentUser(null);
    setDocuments([]);
    setGroups([]);
    setActiveGroup(null);
    setViewMode("personal");
    navigate("/dashboard");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    const syncEnergy = async () => {
      try {
        const res = await axios.get(
          "http://127.0.0.1:8000/api/documents/guest-limit",
        );
        setGuestLimit(res.data.usage_count);
      } catch (err) {
        console.error("The energy spirits are silent (Sync failed)", err);
      }
    };

    const setupDashboard = async () => {
      if (token) {
        try {
          const res = await axios.get("http://127.0.0.1:8000/api/users/me", {
            headers: { Authorization: `Bearer ${token}` },
          });

          setCurrentUser({
            id: String(res.data.id),
            username: res.data.username || "",
            is_admin: res.data.is_admin,
          });
          setIsGuest(false);

          fetchGroups();
          if (!groupId) {
            fetchDocuments();
          }
        } catch (e) {
          console.error("Token expired.");
          localStorage.removeItem("token");

          setIsGuest(true);
          const localDocs = JSON.parse(
            localStorage.getItem("guest_docs") || "[]",
          );
          setDocuments(localDocs);
        }
      } else {
        setIsGuest(true);
        const localDocs = JSON.parse(
          localStorage.getItem("guest_docs") || "[]",
        );
        setDocuments(localDocs);
      }
    };

    syncEnergy();
    setupDashboard();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (groupId) {
      const gId = parseInt(groupId);
      if (groups.length > 0) {
        const group = groups.find((g) => g.id === gId);
        if (group && activeGroup?.id !== group.id) {
          setViewMode("group");
          setActiveGroup(group);

          const fetchGroupData = async () => {
            try {
              const resDocs = await axios.get(
                `http://127.0.0.1:8000/api/groups/${group.id}/documents`,
                { headers: { Authorization: `Bearer ${token}` } },
              );
              setDocuments(resDocs.data);

              const resAct = await axios.get(
                `http://127.0.0.1:8000/api/groups/${group.id}/activity`,
                { headers: { Authorization: `Bearer ${token}` } },
              );
              setActivities(resAct.data);
            } catch (err) {
              console.error("Could not enter War Room:", err);
            }
          };
          fetchGroupData();
        } else if (!group) {
          navigate("/dashboard");
        }
      }
    } else {
      if (viewMode !== "personal") {
        setViewMode("personal");
        setActiveGroup(null);
        fetchDocuments();
      }
    }
  }, [groupId, groups]);

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
      setErrorMessage("The War Room could not be established.");
      setIsErrorModalOpen(true);
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
      setErrorMessage("The spirits refuse to dismantle this chamber.");
      setIsErrorModalOpen(true);
    }
  };

  const switchToPersonal = () => {
    setSearchQuery("");
    navigate("/dashboard");
  };

  const switchToGroup = async (group) => {
    setSearchQuery("");
    navigate(`/dashboard/group/${group.id}`);
  };

  const promptShare = (doc) => {
    setDocToShare(doc);
    setSharedGroupIds([]);
    setIsShareModalOpen(true);
  };

  const executeShare = async (groupId) => {
    if (!docToShare || !docToShare.summary) {
      setIsShareModalOpen(false);
      setErrorMessage(
        "This scroll has no AI Insight yet. Summarize before sharing it with the War Room.",
      );
      setIsErrorModalOpen(true);
      setDocToShare(null);
      return;
    }

    const targetGroup = groups.find((g) => g.id === groupId);
    const groupName = targetGroup ? targetGroup.name : "the War Room";

    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `http://127.0.0.1:8000/api/documents/${docToShare.public_id}/share/${groupId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setShareSuccessMessage(`Shared successfully to ${groupName}!`);

      setSharedGroupIds((prev) => [...prev, groupId]);

      setTimeout(() => {
        setShareSuccessMessage("");
      }, 3000);
    } catch (err) {
      const backendError =
        err.response?.data?.detail || "Could not share the scroll.";

      if (backendError.toLowerCase().includes("already")) {
        setSharedGroupIds((prev) => [...prev, groupId]);
        setShareSuccessMessage(`Already shared to ${groupName}.`);
      } else {
        setErrorMessage(backendError);
        setIsErrorModalOpen(true);
      }
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

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) return;
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/api/groups/join/${joinCode.trim()}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSuccessMessage(res.data.message);
      setIsSuccessModalOpen(true);
      setJoinCode("");
      setIsJoinModalOpen(false);
      fetchGroups();
    } catch (err) {
      const msg = err.response?.data?.detail || "Infiltration failed.";
      setErrorMessage(msg);
      setIsErrorModalOpen(true);
    }
  };

  const handleRemoveShare = async (activityId) => {
    if (!window.confirm("Remove this scroll from the War Room?")) return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(
        `http://127.0.0.1:8000/api/groups/activity/${activityId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setActivities((prev) => prev.filter((act) => act.id !== activityId));
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "Failed to remove scroll");
      setIsErrorModalOpen(true);
    }
  };

  const promptDeleteGroup = () => {
    if (!activeGroup) return;
    setGroupToDelete(activeGroup);
  };

  const executeDeleteGroup = async () => {
    if (!groupToDelete) return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(
        `http://127.0.0.1:8000/api/groups/${groupToDelete.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setGroups((prev) => prev.filter((g) => g.id !== groupToDelete.id));
      switchToPersonal();
      setSuccessMessage(`You deleted "${groupToDelete.name}".`);
      setIsSuccessModalOpen(true);
    } catch (err) {
      setErrorMessage("The spirits refuse to dismantle this chamber.");
      setIsErrorModalOpen(true);
    } finally {
      setGroupToDelete(null);
    }
  };

  const promptLeaveGroup = () => {
    if (!activeGroup) return;
    setGroupToLeave(activeGroup);
  };

  const executeLeaveGroup = async () => {
    if (!groupToLeave) return;
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `http://127.0.0.1:8000/api/groups/leave/${groupToLeave.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setGroups((prev) => prev.filter((g) => g.id !== groupToLeave.id));
      switchToPersonal();

      setSuccessMessage(`You left "${groupToLeave.name}".`);
      setIsSuccessModalOpen(true);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.detail || "Could not leave the room.",
      );
      setIsErrorModalOpen(true);
    } finally {
      setGroupToLeave(null);
    }
  };

  const promptRemoveShare = (activity) => {
    setShareToRemove(activity);
  };

  const executeRemoveShare = async () => {
    if (!shareToRemove) return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(
        `http://127.0.0.1:8000/api/groups/activity/${shareToRemove.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setActivities((prev) =>
        prev.filter((act) => act.id !== shareToRemove.id),
      );
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "Failed to remove scroll");
      setIsErrorModalOpen(true);
    } finally {
      setShareToRemove(null);
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
        <div className="p-8 relative flex-1 overflow-y-auto custom-scrollbar">
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
                className="text-gray-700 dark:text-white font-black text-xl tracking-[0.2em] mt-2 select-none"
              >
                SUMMER<span className="text-samurai-gold">EY-I</span>
              </motion.span>

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
              {/* Admin Panel */}
              {currentUser?.is_admin && (
                <button
                  onClick={() => navigate("/admin")}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all duration-300 shadow-lg text-red-500 hover:bg-red-500/10 border border-red-500/20 mt-4"
                >
                  <ShieldAlert size={20} /> Admin Panel
                </button>
              )}
            </div>

            {/* War Rooms Section */}
            <div className="space-y-3">
              <div className="flex flex-col gap-3 px-2 mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                  War Rooms
                </h3>

                {!isGuest && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsGroupModalOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-samurai-gold/10 border border-samurai-gold/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-samurai-gold hover:bg-samurai-gold hover:text-black transition-all duration-300"
                    >
                      <Plus size={12} strokeWidth={3} />
                      Create
                    </button>
                    <button
                      onClick={() => setIsJoinModalOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-samurai-gold/50 hover:text-samurai-gold transition-all duration-300"
                    >
                      <Users size={12} />
                      Join
                    </button>
                  </div>
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

                {/* Group description & Access Code */}
                {viewMode === "group" && (
                  <div className="flex flex-col gap-2 mt-4">
                    {activeGroup?.description && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-gray-400 dark:text-gray-400 font-bold max-w-2xl leading-relaxed"
                      >
                        {activeGroup.description}
                      </motion.p>
                    )}

                    {/* Access Code Display */}
                    {activeGroup?.access_code && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 group/code cursor-pointer w-fit"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            activeGroup.access_code,
                          );
                          // Opțional: poți declanșa o notificare vizuală aici
                        }}
                      >
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-600">
                          Access Code:
                        </span>
                        <div className="flex items-center gap-2 bg-samurai-gold/5 border border-samurai-gold/20 px-3 py-1 rounded-lg group-hover/code:border-samurai-gold/50 transition-all">
                          <span className="text-xs font-mono font-black text-samurai-gold tracking-widest">
                            {activeGroup.access_code}
                          </span>
                          <Share2
                            size={12}
                            className="text-samurai-gold opacity-40 group-hover/code:opacity-100 transition-opacity"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Toggle + Delete*/}
            <div className="flex items-center gap-4">
              <ThemeToggle />

              {/* DELETE / LEAVE ROOM */}
              {viewMode === "group" &&
                activeGroup &&
                currentUser &&
                (String(activeGroup.created_by_id) ===
                String(currentUser.id) ? (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={promptDeleteGroup}
                    className="flex items-center gap-2 px-3 py-3 rounded-xl border border-red-500/30 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all duration-200 shadow-lg"
                  >
                    <Trash2 size={16} />
                    Delete Room
                  </motion.button>
                ) : (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={promptLeaveGroup}
                    className="flex items-center gap-2 px-3 py-3 rounded-xl border border-orange-500/30 text-orange-500 font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all duration-200 shadow-lg"
                  >
                    <LogOut size={16} />
                    Leave Room
                  </motion.button>
                ))}

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
                      : "PDF/DOCX/TXT up to 10MB"}
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.docx,.txt"
                />
              </label>
            </div>
          )}

          {/* Search Bar */}
          {viewMode === "personal" ? (
            <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  placeholder="Search scrolls by name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-samurai-gold/40 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
              </div>
            </div>
          ) : (
            <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  placeholder="Search shared scrolls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-samurai-gold/40 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
              </div>
            </div>
          )}

          {/* Grid Container & Activity Log Area */}
          <div className="pb-20">
            {viewMode === "personal" ? (
              <div className="bg-white dark:bg-[#121214] border border-samurai-gold/20 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {documents.filter((d) =>
                    d.title.toLowerCase().includes(searchQuery.toLowerCase()),
                  ).length === 0 && (
                    <div className="col-span-full py-10 flex flex-col items-center opacity-40">
                      <BrainCircuit size={48} className="mb-4 text-gray-400" />
                      <p className="text-center font-medium uppercase tracking-widest text-sm">
                        {documents.length === 0
                          ? "No scrolls discovered yet"
                          : "No matching scrolls found"}
                      </p>
                    </div>
                  )}
                  {documents
                    .filter((d) =>
                      d.title.toLowerCase().includes(searchQuery.toLowerCase()),
                    )
                    .slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage,
                    )
                    .map((doc) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={doc.public_id}
                        className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/5 p-6 rounded-[2rem] shadow-xl flex flex-col justify-between hover:border-samurai-gold/30 transition-all"
                      >
                        <div className="mb-6 group relative">
                          {editingId === doc.public_id ? (
                            <div className="flex items-center justify-between gap-2 border-b-2 border-samurai-gold py-1">
                              <input
                                autoFocus
                                className="bg-transparent outline-none min-w-0 flex-1 text-lg font-bold text-gray-900 dark:text-gray-100"
                                value={tempTitle}
                                onChange={(e) => setTempTitle(e.target.value)}
                                onBlur={() => handleRename(doc.public_id)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" &&
                                  handleRename(doc.public_id)
                                }
                              />
                              <button
                                onClick={() => handleRename(doc.public_id)}
                                className="text-samurai-gold hover:scale-125 active:scale-90 transition-all p-1 shrink-0"
                              >
                                <Check size={20} strokeWidth={3} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col min-[1228px]:flex-row min-[1228px]:items-start justify-between gap-4 min-[1228px]:gap-2">
                              <div
                                className="min-w-0 flex-1 pr-2 cursor-pointer w-full"
                                onClick={() => {
                                  setEditingId(doc.public_id);
                                  setTempTitle(doc.title);
                                }}
                              >
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 break-all leading-snug">
                                  {doc.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <p className="text-[10px] text-gray-400 uppercase tracking-widest truncate max-w-[120px]">
                                    Ref: {doc.public_id}
                                  </p>

                                  {doc.summary && (
                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-md text-[8px] font-black uppercase tracking-widest text-samurai-gold shrink-0">
                                      {doc.summary_type === "detailed"
                                        ? "Detailed"
                                        : "Simple"}
                                    </span>
                                  )}
                                </div>
                                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-samurai-gold font-bold uppercase tracking-tighter transition-opacity absolute -bottom-4 left-0">
                                  Click title to edit
                                </span>
                              </div>

                              {/* Share, Download & Delete*/}
                              <div className="flex gap-1 transition-opacity flex-shrink-0 self-end min-[1228px]:self-auto">
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
                                    setDownloadDoc(doc);
                                  }}
                                  className="text-gray-400 hover:text-blue-400 transition-all p-2 hover:bg-blue-400/10 rounded-lg"
                                  title="Download"
                                >
                                  <Download size={18} />
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

                        {!isGuest && !doc.summary && (
                          <div className="mb-4 mt-auto">
                            <div className="flex bg-gray-100 dark:bg-[#1a1a1c] p-1.5 rounded-[1rem] border border-gray-200 dark:border-white/5 shadow-inner">
                              <button
                                onClick={() =>
                                  setSummaryTypes((prev) => ({
                                    ...prev,
                                    [doc.public_id]: "Simple",
                                  }))
                                }
                                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                  (summaryTypes[doc.public_id] || "Simple") ===
                                  "Simple"
                                    ? "bg-white dark:bg-white/10 text-samurai-gold shadow-sm"
                                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                }`}
                              >
                                Simple
                              </button>
                              <button
                                onClick={() =>
                                  setSummaryTypes((prev) => ({
                                    ...prev,
                                    [doc.public_id]: "detailed",
                                  }))
                                }
                                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                  summaryTypes[doc.public_id] === "detailed"
                                    ? "bg-white dark:bg-white/10 text-samurai-gold shadow-sm"
                                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                }`}
                              >
                                Detailed
                              </button>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => handleSummarize(doc.public_id)}
                          disabled={loadingId !== null}
                          className="w-full bg-samurai-gold text-white dark:text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-samurai-gold/10"
                        >
                          {loadingId === doc.public_id
                            ? "Channeling AI..."
                            : doc.summary
                              ? "View Insight"
                              : "Summon AI Insight"}
                        </button>
                      </motion.div>
                    ))}

                  {/* Pagination Controls */}
                  {viewMode === "personal" &&
                    documents.filter((d) =>
                      d.title.toLowerCase().includes(searchQuery.toLowerCase()),
                    ).length > itemsPerPage && (
                      <div className="col-span-full mt-8 flex justify-center items-center gap-4">
                        <button
                          disabled={currentPage === 1}
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          className="px-4 py-2 border border-gray-200 dark:border-white/10 text-xs font-bold uppercase rounded-xl hover:border-samurai-gold/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 text-gray-800 dark:text-gray-200 hover:bg-white/10"
                        >
                          Previous
                        </button>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                          Page {currentPage} of{" "}
                          {Math.ceil(
                            documents.filter((d) =>
                              d.title
                                .toLowerCase()
                                .includes(searchQuery.toLowerCase()),
                            ).length / itemsPerPage,
                          )}
                        </span>
                        <button
                          disabled={
                            currentPage ===
                            Math.ceil(
                              documents.filter((d) =>
                                d.title
                                  .toLowerCase()
                                  .includes(searchQuery.toLowerCase()),
                              ).length / itemsPerPage,
                            )
                          }
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(
                                prev + 1,
                                Math.ceil(
                                  documents.filter((d) =>
                                    d.title
                                      .toLowerCase()
                                      .includes(searchQuery.toLowerCase()),
                                  ).length / itemsPerPage,
                                ),
                              ),
                            )
                          }
                          className="px-4 py-2 border border-gray-200 dark:border-white/10 text-xs font-bold uppercase rounded-xl hover:border-samurai-gold/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 text-gray-800 dark:text-gray-200 hover:bg-white/10"
                        >
                          Next
                        </button>
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
              >
                <div className="bg-white dark:bg-[#121214] border border-samurai-gold/20 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {activities.filter((act) =>
                      act.document_title
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()),
                    ).length > 0 ? (
                      activities
                        .filter((act) =>
                          act.document_title
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()),
                        )
                        .map((act) => {
                          const isMe =
                            currentUser &&
                            String(act.user_id) === String(currentUser.id);

                          return (
                            <div
                              key={act.id}
                              className="relative p-8 rounded-[2rem] border transition-all duration-300 flex flex-col justify-between min-h-[180px] bg-white/5 border-white/5 hover:border-samurai-gold/40 hover:bg-white/10 shadow-xl hover:shadow-samurai-gold/5"
                            >
                              {/* Header Card: User */}
                              <div className="flex items-center gap-2 mb-1 min-w-0">
                                <div className="w-2 h-2 rounded-full bg-samurai-gold animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.8)] shrink-0" />
                                <span
                                  className={`text-[10px] font-black uppercase tracking-widest truncate ${isMe ? "text-samurai-gold" : "text-gray-400"}`}
                                >
                                  @{act.username}
                                </span>
                              </div>

                              {/* Content: Title */}
                              <div className="flex-1 flex items-center pb-2">
                                <div className="w-full">
                                  <div className="w-full">
                                    <h4 className="text-lg font-bold dark:text-gray-100 group-hover:text-samurai-gold transition-colors line-clamp-2 leading-snug">
                                      {act.document_title}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1 mb-2">
                                      <span className="px-2 py-0.5 bg-black/20 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-md text-[8px] font-black uppercase tracking-widest text-samurai-gold">
                                        {act.summary_type === "detailed" ||
                                        act.document_summary_type === "detailed"
                                          ? "Detailed"
                                          : "Simple"}
                                      </span>
                                    </div>
                                    
                                    {/* Action buttons */}
                                    <div className="flex items-center gap-2 mb-3">
                                      {/* Download button */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const matchedDoc = documents.find(
                                            (d) =>
                                              d.public_id ===
                                              act.document_public_id,
                                          );
                                          if (matchedDoc) {
                                            setDownloadDoc(matchedDoc);
                                          } else {
                                            setDownloadDoc({
                                              public_id: act.document_public_id,
                                              title: act.document_title,
                                              summary: true,
                                              filetype: "unknown",
                                            });
                                          }
                                        }}
                                        className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                                        title="Download Scroll"
                                      >
                                        <Download size={14} />
                                      </button>

                                      {/* Delete button */}
                                      {currentUser &&
                                        String(act.user_id) ===
                                          String(currentUser.id) && (
                                          <button
                                            onClick={() => promptRemoveShare(act)}
                                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Remove scroll from War Room"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        )}
                                    </div>

                                    <div className="h-0.5 w-8 bg-samurai-gold/30 rounded-full group-hover:w-16 transition-all" />
                                  </div>
                                </div>
                              </div>

                              {/* Footer: Action Button */}
                              <div className="mt-4 pt-4 border-t border-white/5">
                                <button
                                  onClick={() =>
                                    handleViewSharedSummary(
                                      act.document_public_id,
                                    )
                                  }
                                  className="flex items-center justify-between w-full group/btn"
                                >
                                  <span className="text-[10px] font-black text-samurai-gold uppercase tracking-[0.2em] group-hover/btn:tracking-[0.25em] transition-all">
                                    VIEW DOCUMENT
                                  </span>
                                  <BrainCircuit
                                    size={16}
                                    className="text-samurai-gold opacity-40 group-hover/btn:opacity-100 group-hover/btn:scale-110 transition-all"
                                  />
                                </button>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="col-span-full py-24 flex flex-col items-center opacity-30">
                        <Users size={48} className="mb-4 text-gray-400" />
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">
                          No scrolls shared yet
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black uppercase tracking-tighter text-samurai-gold">
                  Scroll Insight
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-8 right-8 text-gray-400 hover:text-samurai-gold transition-colors p-1"
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
                className="w-full mt-8 bg-samurai-gold text-white dark:text-black font-bold py-4 rounded-2xl uppercase tracking-widest"
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
              onClick={() => {
                setIsShareModalOpen(false);
                setDocToShare(null);
                setShareSuccessMessage("");
              }}
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

              {/* Mesajul elegant de succes */}
              <AnimatePresence>
                {shareSuccessMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2">
                      <Check size={14} strokeWidth={3} /> {shareSuccessMessage}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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
                onClick={() => {
                  setIsShareModalOpen(false);
                  setDocToShare(null);
                  setShareSuccessMessage("");
                }}
                className="w-full mt-6 py-3 bg-gray-200 dark:bg-white/10 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isErrorModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsErrorModalOpen(false)}
              className="absolute inset-0 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#121214] border border-red-500/30 w-full max-w-sm p-8 rounded-[2.5rem] relative z-10 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-black font-white uppercase tracking-tighter mb-2 dark:text-white">
                Access Denied
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                {errorMessage}
              </p>
              <button
                onClick={() => setIsErrorModalOpen(false)}
                className="w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-white hover:scale-105 duration-200 bg-gray-900 dark:bg-white/5 dark:text-white transition-transform"
              >
                Understood
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsJoinModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#121214] border border-samurai-gold/30 w-full max-w-md p-8 rounded-[2rem] relative z-10 shadow-2xl"
            >
              <h3 className="text-xl font-black uppercase tracking-tighter text-samurai-gold mb-6">
                Infiltrate War Room
              </h3>
              <p className="text-gray-400 text-xs mb-6 uppercase tracking-widest font-bold">
                Enter the secret access code to join the alliance.
              </p>
              <input
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-samurai-gold transition-colors mb-6"
                placeholder="Access Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setIsJoinModalOpen(false)}
                  className="flex-1 py-3 font-bold text-xs uppercase tracking-widest border border-gray-200 dark:border-white/10 rounded-xl"
                >
                  Abort
                </button>
                <button
                  onClick={handleJoinGroup}
                  className="flex-1 py-3 font-bold text-xs uppercase tracking-widest bg-samurai-gold text-black rounded-xl shadow-lg shadow-samurai-gold/20"
                >
                  Join Room
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dismantle Room Confirmation */}
      <AnimatePresence>
        {groupToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGroupToDelete(null)}
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
              <h3 className="text-xl font-black uppercase tracking-tighter mb-2 dark:text-white">
                Dismantle Room?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                Are you sure you want to dismantle "{groupToDelete.name}"? This
                action is final.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setGroupToDelete(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase border border-gray-200 dark:border-white/10 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDeleteGroup}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase bg-red-500 text-white shadow-lg shadow-red-500/20"
                >
                  Dismantle
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Remove Share Confirmation */}
      <AnimatePresence>
        {shareToRemove && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShareToRemove(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#121214] border border-red-500/30 w-full max-w-sm p-8 rounded-[2rem] relative z-10 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter mb-2 dark:text-white">
                Remove Scroll?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                Remove "{shareToRemove.document_title}" from the War Room?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShareToRemove(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase border border-gray-200 dark:border-white/10 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={executeRemoveShare}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase bg-red-500 text-white shadow-lg shadow-red-500/20"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Successful Group Join Modal */}
      <AnimatePresence>
        {isSuccessModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSuccessModalOpen(false)}
              className="absolute inset-0 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#121214] border border-green-500/30 w-full max-w-sm p-8 rounded-[2.5rem] relative z-10 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="text-green-500" size={32} strokeWidth={3} />
              </div>
              <h3 className="text-xl font-black font-white uppercase tracking-tighter mb-2 dark:text-white">
                Success
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                {successMessage}
              </p>
              <button
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-white hover:scale-105 duration-200 bg-gray-900 dark:bg-white/5 dark:text-white transition-transform"
              >
                Continue
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Leave Room Confirmation */}
      <AnimatePresence>
        {groupToLeave && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGroupToLeave(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#121214] border border-orange-500/30 w-full max-w-sm p-8 rounded-[2rem] relative z-10 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="text-orange-500" size={32} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter mb-2 dark:text-white">
                Leave Room?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                Are you sure you want to leave "{groupToLeave.name}"? You will
                need the access code to rejoin.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setGroupToLeave(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase border border-gray-200 dark:border-white/10 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={executeLeaveGroup}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Download Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {downloadDoc && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDownloadDoc(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative z-10 bg-white dark:bg-[#0e0e0f] border border-white/10 w-full max-w-sm p-8 rounded-[2rem] shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="pr-10">
                  <h3 className="text-lg font-black uppercase tracking-tighter dark:text-white">
                    Download Scroll
                  </h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5 truncate max-w-[250px]">
                    {downloadDoc.title}
                  </p>
                </div>
                <button
                  onClick={() => setDownloadDoc(null)}
                  className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Gold divider */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-samurai-gold/40 to-transparent mb-6" />

              {/* Options */}
              <div className="space-y-3">
                {/* Original Document */}
                <a
                  href={`http://127.0.0.1:8000/api/documents/${downloadDoc.public_id}/download-original`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setDownloadDoc(null)}
                  className="group flex items-center gap-4 w-full p-4 rounded-2xl border border-gray-200 dark:border-white/10 hover:border-samurai-gold/50 hover:bg-samurai-gold/5 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-samurai-gold/10 transition-colors shrink-0">
                    <FileDown size={20} className="text-samurai-gold" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-black text-sm dark:text-white uppercase tracking-tight">
                      Original Document
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                      {downloadDoc.filetype?.toUpperCase()} · Raw file
                    </p>
                  </div>
                  <Download
                    size={14}
                    className="ml-auto text-gray-400 group-hover:text-samurai-gold transition-colors shrink-0"
                  />
                </a>

                {/* Summarized PDF */}
                {downloadDoc.summary ? (
                  <a
                    href={`http://127.0.0.1:8000/api/documents/${downloadDoc.public_id}/download-summary`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setDownloadDoc(null)}
                    className="group flex items-center gap-4 w-full p-4 rounded-2xl border border-gray-200 dark:border-white/10 hover:border-samurai-gold/50 hover:bg-samurai-gold/5 transition-all duration-300"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-samurai-gold/10 transition-colors shrink-0">
                      <BrainCircuit size={20} className="text-samurai-gold" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-black text-sm dark:text-white uppercase tracking-tight">
                        Summarized Content
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                        PDF · AI-generated insight
                      </p>
                    </div>
                    <Download
                      size={14}
                      className="ml-auto text-gray-400 group-hover:text-samurai-gold transition-colors shrink-0"
                    />
                  </a>
                ) : (
                  <div className="flex items-center gap-4 w-full p-4 rounded-2xl border border-dashed border-gray-200 dark:border-white/5 opacity-40 cursor-not-allowed">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                      <BrainCircuit size={20} className="text-gray-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm dark:text-white uppercase tracking-tight">
                        Summarized Content
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                        Summon AI Insight first
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer note */}
              <p className="mt-6 text-center text-[9px] text-gray-500 uppercase tracking-widest">
                Files are served securely from the archive
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
