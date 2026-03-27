// Client-side encryption using Web Crypto API (AES-256-GCM)
// Files are encrypted BEFORE upload — server never sees plaintext

const PBKDF2_ITERATIONS = 100000;

export const generateSalt = () => crypto.getRandomValues(new Uint8Array(16));
export const generateIV = () => crypto.getRandomValues(new Uint8Array(12));

export const toBase64 = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

export const fromBase64 = (b64) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function deriveKey(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptFile(file, password) {
  const salt = generateSalt();
  const iv = generateIV();
  const key = await deriveKey(password, salt);

  const fileBuffer = await file.arrayBuffer();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    fileBuffer
  );

  return {
    encryptedBlob: new Blob([encrypted], { type: "application/octet-stream" }),
    iv: toBase64(iv),
    salt: toBase64(salt),
  };
}

export async function decryptFile(encryptedBuffer, password, ivB64, saltB64) {
  const salt = fromBase64(saltB64);
  const iv = fromBase64(ivB64);
  const key = await deriveKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedBuffer
  );

  return decrypted;
}

export function downloadDecryptedFile(buffer, filename, mimeType = "application/octet-stream") {
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
