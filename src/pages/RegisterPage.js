import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      return toast.error("All fields required.");
    }
    if (form.password.length < 8) {
      return toast.error("Password must be at least 8 characters.");
    }
    if (form.password !== form.confirm) {
      return toast.error("Passwords do not match.");
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success("Account created! Welcome to VaultShare.");
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 100);
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthColor = ["#ff4757", "#ffa94d", "#ffd43b", "#00c896"][strength - 1] || "var(--border)";
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength] || "";

  return (
    <div style={styles.page}>
      <div style={styles.card} className="fadeIn">
        <div style={styles.header}>
          <div style={styles.shieldWrap}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Join VaultShare — your files, encrypted.</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Full Name</label>
            <input type="text" placeholder="Jane Smith" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <input type="email" placeholder="you@example.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input type="password" placeholder="Min. 8 characters" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            {form.password && (
              <div style={{ marginTop: 6 }}>
                <div style={styles.strengthBar}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ ...styles.strengthSegment, background: i <= strength ? strengthColor : "var(--border)" }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: strengthColor, fontFamily: "var(--font-mono)" }}>{strengthLabel}</span>
              </div>
            )}
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Confirm Password</label>
            <input type="password" placeholder="Repeat password" value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
          </div>

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? <span className="spinner" /> : "Create Secure Account"}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--accent)" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh", background: "var(--bg)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.06) 0%, transparent 60%)",
  },
  card: {
    width: "100%", maxWidth: 420,
    background: "var(--bg2)", border: "1px solid var(--border)",
    borderRadius: 12, padding: "36px 36px",
    boxShadow: "0 0 60px rgba(124,58,237,0.05)",
  },
  header: { textAlign: "center", marginBottom: 24 },
  shieldWrap: {
    width: 56, height: 56, background: "rgba(124,58,237,0.12)",
    border: "1px solid rgba(124,58,237,0.3)", borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
  },
  title: { fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "var(--text2)" },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, color: "var(--text2)", fontWeight: 500 },
  strengthBar: { display: "flex", gap: 4, marginBottom: 4 },
  strengthSegment: { height: 3, flex: 1, borderRadius: 2, transition: "background 0.3s" },
  btn: {
    padding: "12px", background: "var(--accent2)", color: "white",
    border: "none", borderRadius: "var(--radius)", fontWeight: 700, fontSize: 15,
    cursor: "pointer", marginTop: 4,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontFamily: "var(--font-mono)",
  },
  footer: { textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--text2)" },
};
