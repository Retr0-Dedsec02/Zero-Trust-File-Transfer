import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { format } from "date-fns";
import toast from "react-hot-toast";

const ACTION_COLORS = {
  UPLOAD: "var(--success)",
  DOWNLOAD: "var(--accent)",
  SHARE: "var(--accent2)",
  DELETE: "var(--danger)",
  GENERATE_LINK: "var(--warning)",
  REVOKE_ACCESS: "var(--danger)",
};

const ACTION_ICONS = {
  UPLOAD: "↑",
  DOWNLOAD: "↓",
  SHARE: "⤷",
  DELETE: "✕",
  GENERATE_LINK: "⌁",
  REVOKE_ACCESS: "⊗",
};

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    api.get("/audit/my-logs")
      .then((res) => setLogs(res.data.logs || []))
      .catch(() => toast.error("Failed to load audit logs."))
      .finally(() => setLoading(false));
  }, []);

  const actions = ["ALL", "UPLOAD", "DOWNLOAD", "SHARE", "DELETE", "GENERATE_LINK", "REVOKE_ACCESS"];
  const filtered = filter === "ALL" ? logs : logs.filter((l) => l.action === filter);

  return (
    <div className="fadeIn">
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Audit Logs</h1>
          <p style={s.sub}>Complete activity trail for your account — every action, timestamped.</p>
        </div>
        <div style={s.badge}>
          <span style={s.badgeDot} />
          <span style={{ fontSize: 12, color: "var(--success)", fontFamily: "var(--font-mono)" }}>
            {logs.length} events recorded
          </span>
        </div>
      </div>

      {/* Filter chips */}
      <div style={s.filterRow}>
        {actions.map((a) => (
          <button key={a} onClick={() => setFilter(a)}
            style={{ ...s.chip, ...(filter === a ? { background: ACTION_COLORS[a] || "var(--accent)", color: "#0a0a0f", borderColor: "transparent" } : {}) }}>
            {a === "ALL" ? "All" : a.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Log table */}
      {loading ? (
        <div style={s.center}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
      ) : filtered.length === 0 ? (
        <div style={s.center}>
          <p style={{ color: "var(--text2)" }}>No audit logs found.</p>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Action", "File ID", "IP Address", "Status", "Timestamp"].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} style={s.tr}>
                  <td style={s.td}>
                    <span style={{ ...s.actionBadge, color: ACTION_COLORS[log.action] || "var(--text2)", borderColor: ACTION_COLORS[log.action] || "var(--border)" }}>
                      <span>{ACTION_ICONS[log.action] || "·"}</span>
                      {log.action.replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ ...s.td, ...s.mono }}>
                    {log.fileId ? log.fileId.substring(0, 8) + "..." : "—"}
                  </td>
                  <td style={{ ...s.td, ...s.mono }}>{log.ipAddress || "—"}</td>
                  <td style={s.td}>
                    <span style={{
                      ...s.statusBadge,
                      background: log.success ? "rgba(0,200,150,0.1)" : "rgba(255,71,87,0.1)",
                      color: log.success ? "var(--success)" : "var(--danger)",
                    }}>
                      {log.success ? "✓ Success" : "✕ Failed"}
                    </span>
                  </td>
                  <td style={{ ...s.td, ...s.mono, color: "var(--text2)" }}>
                    {format(new Date(log.timestamp), "MMM d, HH:mm:ss")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const s = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  title: { fontSize: 22, fontWeight: 600, color: "var(--text)", marginBottom: 4 },
  sub: { color: "var(--text2)", fontSize: 14 },
  badge: {
    display: "flex", alignItems: "center", gap: 8,
    background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.2)",
    borderRadius: 6, padding: "8px 12px",
  },
  badgeDot: { width: 7, height: 7, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 6px var(--success)" },
  filterRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 },
  chip: {
    padding: "6px 12px", background: "var(--bg2)", border: "1px solid var(--border)",
    borderRadius: 20, color: "var(--text2)", fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "var(--font-mono)", transition: "all 0.15s",
  },
  center: { display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 20px" },
  tableWrap: {
    background: "var(--bg2)", border: "1px solid var(--border)",
    borderRadius: 10, overflow: "auto",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    padding: "12px 16px", textAlign: "left",
    color: "var(--text3)", fontWeight: 600, fontSize: 11,
    textTransform: "uppercase", letterSpacing: "0.08em",
    borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid var(--border)", transition: "background 0.1s" },
  td: { padding: "12px 16px", color: "var(--text)", verticalAlign: "middle" },
  mono: { fontFamily: "var(--font-mono)", fontSize: 12 },
  actionBadge: {
    display: "inline-flex", alignItems: "center", gap: 5,
    border: "1px solid", borderRadius: 5,
    padding: "2px 8px", fontSize: 11, fontWeight: 700,
    fontFamily: "var(--font-mono)",
  },
  statusBadge: { padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)" },
};
