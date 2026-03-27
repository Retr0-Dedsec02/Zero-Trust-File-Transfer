# 🔒 VaultShare — Zero Trust File Sharing

A full-stack, end-to-end encrypted file sharing system built with React + Node.js.
Files are encrypted **in the browser** using AES-256-GCM before upload — the server never sees plaintext.

---

## 🚀 Quick Start (VSCode)

### Prerequisites
- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **npm** v9+

### 1. Clone / Extract the project

### 2. Setup Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
Backend runs at → `http://localhost:5000`

### 3. Setup Frontend (new terminal)

```bash
cd frontend
npm install
npm start
```
Frontend runs at → `http://localhost:3000`

Open `http://localhost:3000` in your browser. Register an account and start uploading!

---

## 🏗️ Project Structure

```
zerotrust-fileshare/
├── backend/
│   ├── config/
│   │   └── db.js              # In-memory store (swap for real DB)
│   ├── middleware/
│   │   ├── auth.js            # JWT verification + file access control
│   │   └── audit.js           # Automatic audit logging
│   ├── routes/
│   │   ├── auth.js            # Register, login, refresh, logout
│   │   ├── files.js           # Upload, download, share, delete
│   │   └── audit.js           # Audit log retrieval
│   ├── uploads/               # Encrypted blobs stored here (auto-created)
│   ├── .env.example
│   ├── package.json
│   └── server.js              # Express app entry point
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── components/
        │   ├── Layout.js       # Sidebar navigation
        │   └── ShareModal.js   # File sharing modal
        ├── context/
        │   └── AuthContext.js  # Auth state management
        ├── pages/
        │   ├── LoginPage.js
        │   ├── RegisterPage.js
        │   ├── DashboardPage.js
        │   ├── UploadPage.js
        │   └── AuditPage.js
        ├── utils/
        │   ├── api.js          # Axios + auto token refresh
        │   └── crypto.js       # Web Crypto API (AES-256-GCM)
        ├── App.js
        └── index.js
```

---

## 🔐 Zero Trust Security Features

| Feature | Implementation |
|---|---|
| **E2E Encryption** | AES-256-GCM via Web Crypto API (client-side) |
| **Key Derivation** | PBKDF2 with 100,000 iterations + random salt |
| **Authentication** | JWT access tokens (15min) + refresh tokens (7 days) |
| **Authorization** | Per-file RBAC: view / download / manage |
| **Signed URLs** | JWT-signed download links, expire in 15 minutes |
| **Rate Limiting** | 200 req/15min global, 20 req/15min on auth endpoints |
| **Security Headers** | Helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| **Audit Logging** | Every action logged with IP, timestamp, outcome |
| **Input Validation** | express-validator on all inputs |
| **Password Hashing** | bcrypt with cost factor 12 |

---

## 🗄️ Upgrading to a Real Database

The in-memory store in `backend/config/db.js` resets on restart.
To persist data, replace it with **Supabase** (free):

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL in `backend/config/schema.sql` (if provided)
3. Replace db calls in `config/db.js` with `@supabase/supabase-js`

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |

### Files
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/files/upload` | Upload encrypted file |
| GET | `/api/files/my-files` | List owned files |
| GET | `/api/files/shared-with-me` | List shared files |
| GET | `/api/files/:id/signed-url` | Get expiring download URL |
| GET | `/api/files/download/:id?token=...` | Download via signed URL |
| POST | `/api/files/:id/share` | Share with user |
| DELETE | `/api/files/:id/share/:userId` | Revoke access |
| DELETE | `/api/files/:id` | Delete file |

### Audit
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/audit/my-logs` | Get my activity logs |
| GET | `/api/audit/file/:id` | Get file activity logs |

---

## 🛠️ Environment Variables

### Backend `.env`
```env
PORT=5000
JWT_SECRET=change_this_to_a_long_random_string
JWT_REFRESH_SECRET=another_long_random_string
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
MAX_FILE_SIZE=52428800
```

---

## 📦 Tech Stack

**Frontend:** React 18, React Router 6, Axios, react-dropzone, react-hot-toast, date-fns
**Backend:** Node.js, Express 4, Helmet, CORS, JWT, bcrypt, multer, express-rate-limit
**Encryption:** Web Crypto API (browser-native, zero dependencies)
**Storage:** Local disk (upgrade to Cloudflare R2 or Supabase Storage for production)

---

## 🎯 For Production Deployment

- Replace in-memory DB with Supabase/PostgreSQL
- Replace local file storage with Cloudflare R2 or S3
- Set strong random values for JWT secrets
- Deploy backend to [Render](https://render.com) (free)
- Deploy frontend to [Vercel](https://vercel.com) (free)
- Enable HTTPS (automatic on both platforms)
