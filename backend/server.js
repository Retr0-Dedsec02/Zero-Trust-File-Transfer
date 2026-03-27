require("dotenv").config();

const REQUIRED_ENV = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_STORAGE_BUCKET',
];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error('\n❌ Missing required environment variables:');
  missingEnv.forEach((key) => console.error(`   - ${key}`));
  console.error('\n→ Copy backend/.env.example to backend/.env and fill in the values.\n');
  process.exit(1);
}

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");

const authRoutes = require("./routes/auth");
const fileRoutes = require("./routes/files");
const auditRoutes = require("./routes/audit");

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests. Please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth attempts. Please wait." },
});

app.use(globalLimiter);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy for accurate IP
app.set("trust proxy", 1);

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/audit", auditRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "ZeroTrust File Share API",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
});

async function checkDatabaseConnection() {
  try {
    const supabase = require('./config/supabase');

    // Check DB
    const { error: dbError } = await supabase.from('users').select('id').limit(1);
    if (dbError) {
      console.error('❌ Supabase DB connection failed:', dbError.message);
      console.error('→ Check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
      console.error('→ Make sure you ran the SQL schema in Supabase SQL Editor');
      process.exit(1);
    }
    console.log('✅ Supabase database connected successfully');

    // Check Storage bucket exists
    const bucket = process.env.SUPABASE_STORAGE_BUCKET;
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.error('❌ Supabase Storage check failed:', bucketError.message);
      process.exit(1);
    }
    const bucketExists = (buckets || []).some((b) => b.name === bucket);
    if (!bucketExists) {
      console.error(`❌ Storage bucket "${bucket}" not found!`);
      console.error('→ Go to Supabase Dashboard → Storage → New Bucket');
      console.error(`→ Create a private bucket named exactly: ${bucket}`);
      process.exit(1);
    }
    console.log(`✅ Supabase storage bucket "${bucket}" found`);

  } catch (err) {
    console.error('❌ Could not connect to Supabase:', err.message);
    process.exit(1);
  }
}

checkDatabaseConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════╗
  ║   VaultShare API — ONLINE            ║
  ║   http://localhost:${PORT}             ║
  ║   Database: Supabase ✅              ║
  ╚══════════════════════════════════════╝
    `);
  });
});

module.exports = app;
