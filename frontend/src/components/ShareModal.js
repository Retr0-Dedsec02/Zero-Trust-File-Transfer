import React, { useState, useEffect } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";

export default function ShareModal({ file, onClose, onShared }) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("view");
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [loadingPerms, setLoadingPerms] = useState(true);
  const [revokingId, setRevokingId] = useState(null);

  useEffect(() => {
    api.get(`/files/${file.id}/permissions`)
      .then((res) => setPermissions(res.data.permissions || []))
      .catch(() => {})
      .finally(() => setLoadingPerms(false));
  }, [file.id]);

  const handleShare = async () => {
    if (!email) return toast.error("Email required.");
    setLoading(true);
    try {
      await api.post(`/files/${file.id}/share`, { email, permission });
      toast.success(`Shared with ${email}!`);
      setEmail("");
      const res = await api.get(`/files/${file.id}/permissions`);
      setPermissions(res.data.permissions || []);
      onShared?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Share failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (userId, userEmail) => {
    setRevokingId(userId);
    try {
      await api.delete(`/files/${file.id}/share/${userId}`);
      toast.success(`Revoked access for ${userEmail}.`);
      setPermissions((prev) => prev.filter((p) => p.userId !== userId));
      onShared?.();
    } catch {
      toast.error("Failed to revoke access.");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal} className="fadeIn">
        {/* Header */}
        <div style={s.header}>
          <div>
            <h2 style={s.title}>Share File</h2>
            <p style={s.sub}>{file.originalName}</p>
          </div>
          <button style={s.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Share form */}
        <div style={s.form}>
          <input type="email" placeholder="Enter email address"
            value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleShare()} />
          <div style={s.row}>
            <select value={permission} onChange={(e) => setPermission(e.target.value)} style={s.select}>
              <option value="view">View only</option>
              <option value="download">Can download</option>
              <option value="manage">Can manage</option>
            </select>
            <button style={s.shareBtn} onClick={handleShare} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : "Share"}
            </button>
          </div>
        </div>

        {/* Current permissions */}
        <div style={s.permsSection}>
          <p style={s.permsTitle}>People with access</p>
          {loadingPerms ? (
            <div style={{ padding: "20px", display: "flex", justifyContent: "center" }}>
              <div className="spinner" />
            </div>
          ) : permissions.length === 0 ? (
            <p style={s.noPerms}>No one else has access yet.</p>
          ) : (
            <div style={s.permsList}>
              {permissions.map((p) => (
                <div key={p.userId} style={s.permRow}>
                  <div style={s.permAvatar}>{p.userEmail?.[0]?.toUpperCase()}</div>
                  <div style={s.permInfo}>
                    <span style={s.permEmail}>{p.userEmail}</span>
                    <span style={s.permLevel}>{p.level}</span>
                  </div>
                  <button style={s.revokeBtn} onClick={() => handleRevoke(p.userId, p.userEmail)}
                    disabled={revokingId === p.userId}>
                    {revokingId === p.userId ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "Revoke"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 200, padding: 20,
  },
  modal: {
    background: "var(--bg2)", border: "1px solid var(--border)",
    borderRadius: 12, width: "100%", maxWidth: 480,
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "24px 24px 20px", borderBottom: "1px solid var(--border)",
  },
  title: { fontSize: 17, fontWeight: 600, color: "var(--text)", marginBottom: 2 },
  sub: { fontSize: 13, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 },
  closeBtn: {
    background: "none", border: "none", color: "var(--text2)",
    cursor: "pointer", padding: 4, display: "flex",
  },
  form: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 },
  row: { display: "flex", gap: 8 },
  select: { flex: 1 },
  shareBtn: {
    padding: "10px 18px", background: "var(--accent)", color: "#0a0a0f",
    border: "none", borderRadius: "var(--radius)", fontWeight: 700, fontSize: 14,
    cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 72,
    fontFamily: "var(--font-mono)",
  },
  permsSection: { padding: "0 24px 24px" },
  permsTitle: { fontSize: 12, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12 },
  noPerms: { fontSize: 13, color: "var(--text2)", textAlign: "center", padding: "16px 0" },
  permsList: { display: "flex", flexDirection: "column", gap: 8 },
  permRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 12px", background: "var(--bg3)",
    borderRadius: 8, border: "1px solid var(--border)",
  },
  permAvatar: {
    width: 30, height: 30, borderRadius: "50%",
    background: "var(--accent2)", color: "white",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, flexShrink: 0,
  },
  permInfo: { flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  permEmail: { fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  permLevel: { fontSize: 11, color: "var(--accent2)", fontFamily: "var(--font-mono)", fontWeight: 600 },
  revokeBtn: {
    padding: "5px 10px", background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)",
    borderRadius: 6, color: "var(--danger)", fontSize: 12, cursor: "pointer", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
};
