import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  upload: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  audit: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  menu: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  close: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

const navLinks = [
  { to: "/dashboard", label: "Dashboard", icon: icons.dashboard },
  { to: "/upload", label: "Upload File", icon: icons.upload },
  { to: "/audit", label: "Audit Logs", icon: icons.audit },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success("Logged out securely.");
    navigate("/login");
  };

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <aside style={{ ...styles.sidebar, ...(mobileOpen ? styles.sidebarOpen : {}) }}>
        {/* Logo */}
        <div style={styles.logo}>
          <span style={styles.logoIcon}>{icons.shield}</span>
          <div>
            <div style={styles.logoText}>VaultShare</div>
            <div style={styles.logoSub}>Zero Trust</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              <span style={styles.navIcon}>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div style={styles.sidebarBottom}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <div style={styles.userName}>{user?.name}</div>
              <div style={styles.userEmail}>{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            {icons.logout}
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div style={styles.main}>
        {/* Mobile topbar */}
        <div style={styles.topbar}>
          <button style={styles.menuBtn} onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? icons.close : icons.menu}
          </button>
          <span style={styles.topbarLogo}>VaultShare</span>
        </div>

        <main style={styles.content}>{children}</main>
      </div>
    </div>
  );
}

const styles = {
  root: { display: "flex", minHeight: "100vh", background: "var(--bg)" },
  sidebar: {
    width: 240,
    background: "var(--bg2)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    padding: "0",
    flexShrink: 0,
    position: "fixed",
    top: 0, left: 0, bottom: 0,
    zIndex: 100,
    transition: "transform 0.25s ease",
  },
  sidebarOpen: { transform: "translateX(0)" },
  logo: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "24px 20px 20px",
    borderBottom: "1px solid var(--border)",
  },
  logoIcon: { color: "var(--accent)", display: "flex" },
  logoText: { fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 15, color: "var(--text)" },
  logoSub: { fontSize: 10, color: "var(--accent)", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-mono)" },
  nav: { padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4, flex: 1 },
  navLink: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 12px", borderRadius: "var(--radius)",
    color: "var(--text2)", fontSize: 14, fontWeight: 500,
    transition: "all 0.15s", textDecoration: "none",
  },
  navLinkActive: {
    background: "var(--accent-glow)",
    color: "var(--accent)",
    borderLeft: "2px solid var(--accent)",
    paddingLeft: 10,
  },
  navIcon: { display: "flex", flexShrink: 0 },
  sidebarBottom: {
    padding: "16px 12px",
    borderTop: "1px solid var(--border)",
    display: "flex", flexDirection: "column", gap: 12,
  },
  userInfo: { display: "flex", alignItems: "center", gap: 10, padding: "4px 4px" },
  avatar: {
    width: 34, height: 34,
    background: "linear-gradient(135deg, var(--accent2), var(--accent))",
    borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 14, color: "white", flexShrink: 0,
  },
  userName: { fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.2 },
  userEmail: { fontSize: 11, color: "var(--text3)", marginTop: 2 },
  logoutBtn: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "9px 12px", borderRadius: "var(--radius)",
    background: "transparent", border: "1px solid var(--border)",
    color: "var(--text2)", fontSize: 13, fontWeight: 500,
    transition: "all 0.15s", cursor: "pointer",
    width: "100%",
  },
  main: { flex: 1, marginLeft: 240, display: "flex", flexDirection: "column", minWidth: 0 },
  topbar: {
    display: "none",
    alignItems: "center", gap: 12,
    padding: "14px 20px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg2)",
  },
  menuBtn: {
    background: "none", border: "none",
    color: "var(--text)", cursor: "pointer", display: "flex", padding: 4,
  },
  topbarLogo: { fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 15 },
  content: { padding: "32px", flex: 1, maxWidth: 1100, width: "100%" },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    zIndex: 99, display: "none",
  },
};
