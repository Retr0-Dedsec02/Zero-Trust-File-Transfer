import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { formatBytes, decryptFile, downloadDecryptedFile } from "../utils/crypto";
import toast from "react-hot-toast";
import { format } from "date-fns";
import ShareModal from "../components/ShareModal";

const FileIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const ShareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myFiles, setMyFiles] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("mine");
  const [shareFile, setShareFile] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchFiles = useCallback(async () => {
    try {
      const [myRes, sharedRes] = await Promise.all([
        api.get("/files/my-files"),
        api.get("/files/shared-with-me"),
      ]);
      setMyFiles(myRes.data.files || []);
      setSharedFiles(sharedRes.data.files || []);
    } catch {
      toast.error("Failed to load files.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleDownload = async (file) => {
    const password = window.prompt(`Enter decryption password for "${file.originalName}":`);
    if (!password) return;
    setDownloadingId(file.id);
    try {
      const { data: { signedUrl, iv, salt } } = await api.get(`/files/${file.id}/signed-url`);
      const response = await fetch(`http://localhost:5000${signedUrl}`);
      if (!response.ok) throw new Error("Download failed.");
      const encBuffer = await response.arrayBuffer();
      const decrypted = await decryptFile(encBuffer, password, iv, salt);
      downloadDecryptedFile(decrypted, file.originalName);
      toast.success("File decrypted and downloaded!");
    } catch (err) {
      if (err.name === "OperationError") toast.error("Wrong password — decryption failed.");
      else toast.error(err.message || "Download failed.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete "${file.originalName}"? This cannot be undone.`)) return;
    setDeletingId(file.id);
    try {
      await api.delete(`/files/${file.id}`);
      toast.success("File deleted.");
      fetchFiles();
    } catch {
      toast.error("Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const stats = [
    { label: "My Files", value: myFiles.length, color: "var(--accent)" },
    { label: "Shared With Me", value: sharedFiles.length, color: "var(--accent2)" },
    { label: "Total Size", value: formatBytes(myFiles.reduce((a, f) => a + (f.size || 0), 0)), color: "var(--success)" },
    { label: "Downloads", value: myFiles.reduce((a, f) => a + (f.downloadCount || 0), 0), color: "var(--warning)" },
  ];

  const activeFiles = activeTab === "mine" ? myFiles : sharedFiles;

  return (
    <div className="fadeIn">
      {/* Welcome */}
      <div style={s.welcomeRow}>
        <div>
          <h1 style={s.welcomeTitle}>Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
          <p style={s.welcomeSub}>Your files are end-to-end encrypted and safe.</p>
        </div>
        <button style={s.uploadBtn} onClick={() => navigate("/upload")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Upload File
        </button>
      </div>

      {/* Stats */}
      <div style={s.statsGrid}>
        {stats.map((stat) => (
          <div key={stat.label} style={s.statCard}>
            <div style={{ ...s.statValue, color: stat.color }}>{stat.value}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={s.tabRow}>
        {["mine", "shared"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}>
            {tab === "mine" ? "My Files" : "Shared With Me"}
            <span style={{ ...s.tabBadge, background: activeTab === tab ? "var(--accent)" : "var(--border)" }}>
              {tab === "mine" ? myFiles.length : sharedFiles.length}
            </span>
          </button>
        ))}
      </div>

      {/* File list */}
      {loading ? (
        <div style={s.emptyState}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
      ) : activeFiles.length === 0 ? (
        <div style={s.emptyState}>
          <FileIcon size={40} />
          <p style={{ color: "var(--text2)", marginTop: 12 }}>
            {activeTab === "mine" ? "No files uploaded yet." : "No files shared with you."}
          </p>
          {activeTab === "mine" && (
            <button style={s.emptyBtn} onClick={() => navigate("/upload")}>Upload your first file</button>
          )}
        </div>
      ) : (
        <div style={s.fileList}>
          {activeFiles.map((file) => (
            <div key={file.id} style={s.fileCard}>
              <div style={s.fileIcon}><FileIcon size={20} /></div>
              <div style={s.fileMeta}>
                <div style={s.fileName}>{file.originalName}</div>
                <div style={s.fileDetails}>
                  <span>{formatBytes(file.size)}</span>
                  <span style={s.dot}>·</span>
                  <span>{format(new Date(file.createdAt), "MMM d, yyyy")}</span>
                  {activeTab === "mine" && (
                    <>
                      <span style={s.dot}>·</span>
                      <span>{file.downloadCount || 0} downloads</span>
                    </>
                  )}
                  {file.permission && (
                    <>
                      <span style={s.dot}>·</span>
                      <span style={s.permBadge}>{file.permission}</span>
                    </>
                  )}
                </div>
              </div>
              <div style={s.fileActions}>
                <button style={s.actionBtn} title="Download & Decrypt"
                  onClick={() => handleDownload(file)}
                  disabled={downloadingId === file.id}>
                  {downloadingId === file.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <DownloadIcon />}
                </button>
                {activeTab === "mine" && (
                  <>
                    <button style={s.actionBtn} title="Share" onClick={() => setShareFile(file)}>
                      <ShareIcon />
                    </button>
                    <button style={{ ...s.actionBtn, ...s.dangerBtn }} title="Delete"
                      onClick={() => handleDelete(file)}
                      disabled={deletingId === file.id}>
                      {deletingId === file.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <TrashIcon />}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share modal */}
      {shareFile && (
        <ShareModal file={shareFile} onClose={() => setShareFile(null)} onShared={fetchFiles} />
      )}
    </div>
  );
}

const s = {
  welcomeRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 },
  welcomeTitle: { fontSize: 24, fontWeight: 600, color: "var(--text)", marginBottom: 4 },
  welcomeSub: { color: "var(--text2)", fontSize: 14 },
  uploadBtn: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 18px", background: "var(--accent)", color: "#0a0a0f",
    border: "none", borderRadius: "var(--radius)", fontWeight: 700, fontSize: 14,
    cursor: "pointer", flexShrink: 0, fontFamily: "var(--font-mono)",
  },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 32 },
  statCard: {
    background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10,
    padding: "20px 20px",
  },
  statValue: { fontSize: 26, fontWeight: 700, fontFamily: "var(--font-mono)", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.08em" },
  tabRow: { display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 0 },
  tab: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 16px", background: "none", border: "none",
    color: "var(--text2)", fontSize: 14, fontWeight: 500, cursor: "pointer",
    borderBottom: "2px solid transparent", marginBottom: -1,
    transition: "all 0.15s",
  },
  tabActive: { color: "var(--accent)", borderBottomColor: "var(--accent)" },
  tabBadge: {
    fontSize: 11, padding: "2px 7px", borderRadius: 20,
    color: "var(--bg)", fontWeight: 700, fontFamily: "var(--font-mono)",
  },
  emptyState: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "60px 20px", color: "var(--text3)",
  },
  emptyBtn: {
    marginTop: 16, padding: "10px 20px", background: "var(--bg3)",
    border: "1px solid var(--border)", borderRadius: "var(--radius)",
    color: "var(--accent)", fontSize: 14, cursor: "pointer",
  },
  fileList: { display: "flex", flexDirection: "column", gap: 8 },
  fileCard: {
    display: "flex", alignItems: "center", gap: 14,
    background: "var(--bg2)", border: "1px solid var(--border)",
    borderRadius: 10, padding: "14px 16px",
    transition: "border-color 0.15s",
  },
  fileIcon: {
    width: 40, height: 40, background: "var(--bg3)",
    border: "1px solid var(--border)", borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--accent)", flexShrink: 0,
  },
  fileMeta: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  fileDetails: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text2)", flexWrap: "wrap" },
  dot: { opacity: 0.4 },
  permBadge: {
    background: "rgba(124,58,237,0.15)", color: "var(--accent2)",
    padding: "1px 7px", borderRadius: 4, fontSize: 11, fontWeight: 600,
  },
  fileActions: { display: "flex", gap: 6, flexShrink: 0 },
  actionBtn: {
    width: 32, height: 32, background: "var(--bg3)",
    border: "1px solid var(--border)", borderRadius: 6,
    color: "var(--text2)", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "all 0.15s",
  },
  dangerBtn: { color: "var(--danger)" },
};
