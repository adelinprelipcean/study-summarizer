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

      setDocuments((prevDocs) =>
        prevDocs.map((d) =>
          d.public_id === publicId ? { ...d, summary: generatedSummary } : d,
        ),
      );

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
    if (!token) return;

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

      setDocuments((prevDocs) => [res.data, ...prevDocs]);

      if (!token) {
        setGuestLimit((prev) => prev + 1);
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
    fetchDocuments();

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
            {/* Logo */}
            <button
              onClick={() => navigate("/")}
              className="hover:opacity-80 hover:scale-105 transition-all duration-300"
            >
              <img
                src={logoPng}
                alt="Logo"
                className="w-auto h-auto object-contain"
              />
            </button>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden absolute top-6 right-6 text-gray-400 hover:text-samurai-gold transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="space-y-3">
            <button className="w-full flex items-center gap-4 px-5 py-4 bg-samurai-gold text-black rounded-2xl font-bold hover:scale-110 transition-all duration-300">
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
                  The Archive
                </h2>
                <div className="h-1.5 w-12 bg-samurai-gold mt-3 rounded-full"></div>
              </div>
            </div>

            {/* Toggle / Energy */}
            <div className="flex items-center gap-3">
              <ThemeToggle />

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
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                key={doc.public_id}
                className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/5 p-6 rounded-[2rem] shadow-xl flex flex-col justify-between"
              >
                <div className="mb-6 group/title relative min-h-[60px]">
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
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleRename(doc.public_id)}
                        className="text-samurai-gold hover:scale-125 active:scale-90 transition-all p-1"
                      >
                        <Check size={20} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between group">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          setEditingId(doc.public_id);
                          setTempTitle(doc.title);
                        }}
                      >
                        <h3 className="text-lg font-bold text-white mb-2 break-words whitespace-normal">
                          {doc.title}
                        </h3>
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-samurai-gold font-bold uppercase tracking-tighter transition-opacity">
                          Click title to edit
                        </span>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          promptDelete(doc.public_id);
                        }}
                        className="text-gray-400 hover:text-red-500 hover:scale-125 active:scale-90 transition-all duration-200 p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">
                    Ref: {doc.public_id}
                  </p>
                </div>

                <button
                  onClick={() => handleSummarize(doc.public_id)}
                  disabled={loadingId !== null}
                  className="w-full bg-gray-900 dark:bg-samurai-gold text-white dark:text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
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
                  onClick={executeDelete}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  Destroy
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
