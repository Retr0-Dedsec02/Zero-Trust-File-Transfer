import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { encryptFile, formatBytes } from "../utils/crypto";
import toast from "react-hot-toast";

const steps = ["Select File", "Set Password", "Encrypt & Upload", "Done"];

export default function UploadPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) {
      setFile(accepted[0]);
      setStep(1);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 50 * 1024 * 1024,
    multiple: false,
  });

  const handleEncryptAndUpload = async () => {
    if (!password) return toast.error("Password required.");
    if (password !== confirmPassword) return toast.error("Passwords do not match.");
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");

    setStep(2);
    try {
      setProgress(10);
      setProgressText("Reading file...");
      await new Promise((r) => setTimeout(r, 300));

      setProgress(30);
      setProgressText("Encrypting with AES-256-GCM...");
      const { encryptedBlob, iv, salt } = await encryptFile(file, password);

      setProgress(55);
      setProgressText("Uploading encrypted blob...");

      const formData = new FormData();
      formData.append("file", encryptedBlob, file.name + ".enc");
      formData.append("originalName", file.name);
      formData.append("mimeType", file.type);
      formData.append("iv", iv);
      formData.append("salt", salt);

      const res = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / e.total) * 35);
          setProgress(55 + pct);
          setProgressText(`Uploading... ${55 + pct}%`);
        },
      });

      setProgress(100);
      setProgressText("Upload complete!");
      setUploadedFile(res.data.file);
      setStep(3);
      toast.success("File encrypted and uploaded securely!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed.");
      setStep(1);
      setProgress(0);
    }
  };

  const reset = () => {
    setStep(0);
    setFile(null);
    setPassword("");
    setConfirmPassword("");
    setProgress(0);
    setProgressText("");
    setUploadedFile(null);
  };

  return (
    <div className="fadeIn" style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Upload Encrypted File</h1>
        <p style={s.sub}>Files are encrypted in your browser before upload. The server only stores encrypted data.</p>
      </div>

      {/* Step indicator */}
      <div style={s.stepRow}>
        {steps.map((label, i) => (
          <React.Fragment key={label}>
            <div style={s.stepItem}>
              <div style={{ ...s.stepDot, ...(i <= step ? s.stepDotActive : {}) }}>
                {i < step ? "✓" : i + 1}
              </div>
              <span style={{ ...s.stepLabel, ...(i === step ? s.stepLabelActive : {}) }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ ...s.stepLine, ...(i < step ? s.stepLineActive : {}) }} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div style={s.card}>
        {/* Step 0: Drop zone */}
        {step === 0 && (
          <div {...getRootProps()} style={{ ...s.dropzone, ...(isDragActive ? s.dropzoneActive : {}) }}>
            <input {...getInputProps()} />
            <div style={s.dropIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p style={s.dropTitle}>{isDragActive ? "Drop it here!" : "Drag & drop your file"}</p>
            <p style={s.dropSub}>or click to browse · Max 50MB</p>
          </div>
        )}

        {/* Step 1: Set password */}
        {step === 1 && file && (
          <div style={s.stepContent}>
            {/* File preview */}
            <div style={s.filePreview}>
              <div style={s.filePreviewIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div>
                <div style={s.filePreviewName}>{file.name}</div>
                <div style={s.filePreviewSize}>{formatBytes(file.size)}</div>
              </div>
              <button style={s.changeBtn} onClick={reset}>Change</button>
            </div>

            <div style={s.infoBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>This password encrypts your file with AES-256-GCM. <strong>You must remember it to decrypt</strong> — it is never sent to the server.</span>
            </div>

            <div style={s.fieldGroup}>
              <div style={s.field}>
                <label style={s.label}>Encryption Password</label>
                <input type="password" placeholder="Min. 6 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Confirm Password</label>
                <input type="password" placeholder="Repeat password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>

            <button style={s.btn} onClick={handleEncryptAndUpload}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              Encrypt & Upload
            </button>
          </div>
        )}

        {/* Step 2: Progress */}
        {step === 2 && (
          <div style={s.progressWrap}>
            <div style={s.progressIcon}>
              <div className="spinner" style={{ width: 48, height: 48, borderWidth: 3 }} />
            </div>
            <p style={s.progressTitle}>{progressText || "Processing..."}</p>
            <div style={s.progressBar}>
              <div style={{ ...s.progressFill, width: `${progress}%` }} />
            </div>
            <p style={s.progressPct} className="mono">{progress}%</p>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && uploadedFile && (
          <div style={s.successWrap}>
            <div style={s.successIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={s.successTitle}>File Uploaded!</h2>
            <p style={s.successSub}>Your file is encrypted and stored securely.</p>

            <div style={s.successMeta}>
              <div style={s.metaRow}><span style={s.metaKey}>File</span><span style={s.metaVal}>{uploadedFile.originalName}</span></div>
              <div style={s.metaRow}><span style={s.metaKey}>Size</span><span style={s.metaVal}>{formatBytes(uploadedFile.size)}</span></div>
              <div style={s.metaRow}><span style={s.metaKey}>Encryption</span><span style={{ ...s.metaVal, color: "var(--success)" }}>AES-256-GCM ✓</span></div>
            </div>

            <div style={s.successActions}>
              <button style={s.btn} onClick={() => navigate("/dashboard")}>Go to Dashboard</button>
              <button style={s.btnSecondary} onClick={reset}>Upload Another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { maxWidth: 620 },
  header: { marginBottom: 32 },
  title: { fontSize: 22, fontWeight: 600, color: "var(--text)", marginBottom: 6 },
  sub: { color: "var(--text2)", fontSize: 14, lineHeight: 1.6 },
  stepRow: { display: "flex", alignItems: "center", marginBottom: 32 },
  stepItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  stepDot: {
    width: 30, height: 30, borderRadius: "50%",
    background: "var(--bg3)", border: "2px solid var(--border)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, color: "var(--text3)",
    fontFamily: "var(--font-mono)", transition: "all 0.3s",
  },
  stepDotActive: { background: "var(--accent)", borderColor: "var(--accent)", color: "#0a0a0f" },
  stepLabel: { fontSize: 11, color: "var(--text3)", textAlign: "center", whiteSpace: "nowrap" },
  stepLabelActive: { color: "var(--accent)" },
  stepLine: { flex: 1, height: 2, background: "var(--border)", margin: "0 8px", marginBottom: 20, transition: "background 0.3s" },
  stepLineActive: { background: "var(--accent)" },
  card: {
    background: "var(--bg2)", border: "1px solid var(--border)",
    borderRadius: 12, overflow: "hidden",
  },
  dropzone: {
    padding: "60px 40px", textAlign: "center", cursor: "pointer",
    border: "2px dashed var(--border)", borderRadius: 10, margin: 12,
    transition: "all 0.2s",
  },
  dropzoneActive: { borderColor: "var(--accent)", background: "var(--accent-glow)" },
  dropIcon: { marginBottom: 16 },
  dropTitle: { fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 8 },
  dropSub: { color: "var(--text2)", fontSize: 14 },
  stepContent: { padding: 32, display: "flex", flexDirection: "column", gap: 20 },
  filePreview: {
    display: "flex", alignItems: "center", gap: 12,
    background: "var(--bg3)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "12px 16px",
  },
  filePreviewIcon: {
    width: 40, height: 40, background: "var(--accent-glow)",
    borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  filePreviewName: { fontSize: 14, fontWeight: 600, color: "var(--text)" },
  filePreviewSize: { fontSize: 12, color: "var(--text2)", marginTop: 2 },
  changeBtn: {
    marginLeft: "auto", background: "none", border: "1px solid var(--border)",
    borderRadius: 6, color: "var(--text2)", fontSize: 12, padding: "5px 10px", cursor: "pointer",
  },
  infoBox: {
    display: "flex", gap: 8, alignItems: "flex-start",
    background: "var(--accent-glow)", border: "1px solid rgba(0,229,255,0.2)",
    borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "var(--text2)", lineHeight: 1.5,
  },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, color: "var(--text2)", fontWeight: 500 },
  btn: {
    padding: "12px 20px", background: "var(--accent)", color: "#0a0a0f",
    border: "none", borderRadius: "var(--radius)", fontWeight: 700, fontSize: 15,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontFamily: "var(--font-mono)",
  },
  btnSecondary: {
    padding: "12px 20px", background: "var(--bg3)", color: "var(--text)",
    border: "1px solid var(--border)", borderRadius: "var(--radius)", fontWeight: 600, fontSize: 14,
    cursor: "pointer",
  },
  progressWrap: { padding: "60px 40px", textAlign: "center" },
  progressIcon: { marginBottom: 24, display: "flex", justifyContent: "center" },
  progressTitle: { fontSize: 16, color: "var(--text)", marginBottom: 20 },
  progressBar: { height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden", margin: "0 auto", maxWidth: 360 },
  progressFill: { height: "100%", background: "var(--accent)", borderRadius: 3, transition: "width 0.4s ease" },
  progressPct: { marginTop: 10, color: "var(--text2)", fontSize: 14 },
  successWrap: { padding: "48px 40px", textAlign: "center" },
  successIcon: {
    width: 72, height: 72, background: "rgba(0,200,150,0.1)",
    border: "2px solid rgba(0,200,150,0.3)", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 20px",
  },
  successTitle: { fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 8 },
  successSub: { color: "var(--text2)", fontSize: 14, marginBottom: 24 },
  successMeta: {
    background: "var(--bg3)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "16px 20px", marginBottom: 24, textAlign: "left",
    display: "flex", flexDirection: "column", gap: 10,
  },
  metaRow: { display: "flex", justifyContent: "space-between", fontSize: 13 },
  metaKey: { color: "var(--text2)" },
  metaVal: { color: "var(--text)", fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: 12 },
  successActions: { display: "flex", flexDirection: "column", gap: 10 },
};
