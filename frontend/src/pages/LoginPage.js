import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error("All fields required.");
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card} className="fadeIn">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.shieldWrap}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 style={styles.title}>VaultShare</h1>
          <p style={styles.subtitle}>Sign in to your secure vault</p>
        </div>

        {/* Security badge */}
        <div style={styles.badge}>
          <span style={styles.badgeDot} />
          <span style={styles.badgeText}>End-to-end encrypted · Zero trust architecture</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="Your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? <span className="spinner" /> : "Sign In Securely"}
          </button>
        </form>

        <p style={styles.footer}>
          No account?{" "}
          <Link to="/register" style={{ color: "var(--accent)" }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20,
    backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(0,229,255,0.05) 0%, transparent 60%)",
  },
  card: {
    width: "100%", maxWidth: 420,
    background: "var(--bg2)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "40px 36px",
    boxShadow: "0 0 60px rgba(0,229,255,0.05)",
  },
  header: { textAlign: "center", marginBottom: 24 },
  shieldWrap: {
    width: 56, height: 56,
    background: "var(--accent-glow)",
    border: "1px solid rgba(0,229,255,0.3)",
    borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 16px",
  },
  title: {
    fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700,
    color: "var(--text)", marginBottom: 6,
  },
  subtitle: { fontSize: 14, color: "var(--text2)" },
  badge: {
    display: "flex", alignItems: "center", gap: 8,
    background: "rgba(0,200,150,0.08)",
    border: "1px solid rgba(0,200,150,0.2)",
    borderRadius: 6, padding: "8px 12px",
    marginBottom: 28,
  },
  badgeDot: {
    width: 7, height: 7, borderRadius: "50%",
    background: "var(--success)", flexShrink: 0,
    boxShadow: "0 0 6px var(--success)",
  },
  badgeText: { fontSize: 12, color: "var(--success)", fontFamily: "var(--font-mono)" },
  form: { display: "flex", flexDirection: "column", gap: 18 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, color: "var(--text2)", fontWeight: 500 },
  btn: {
    padding: "12px",
    background: "var(--accent)",
    color: "#0a0a0f",
    border: "none",
    borderRadius: "var(--radius)",
    fontWeight: 700, fontSize: 15,
    cursor: "pointer",
    marginTop: 4,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    transition: "opacity 0.2s",
    fontFamily: "var(--font-mono)",
  },
  footer: { textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--text2)" },
};
