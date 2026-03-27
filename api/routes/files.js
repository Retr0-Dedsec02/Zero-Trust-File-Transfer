require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const supabase = require('../config/supabase');
const { verifyToken, verifyFileAccess } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

// Multer — write to temp disk first, then upload to Supabase Storage
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}.enc`),
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 },
});

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

// Helper — upload buffer to Supabase Storage
async function uploadToStorage(storedName, filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storedName, fileBuffer, {
      contentType: 'application/octet-stream',
      upsert: false,
    });
  // Always delete the temp local file
  try { fs.unlinkSync(filePath); } catch (_) {}
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

// Helper — download buffer from Supabase Storage
async function downloadFromStorage(storedName) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storedName);
  if (error) throw new Error(`Storage download failed: ${error.message}`);
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Helper — delete from Supabase Storage
async function deleteFromStorage(storedName) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([storedName]);
  if (error) console.error('Storage delete warning:', error.message);
}

// ─── UPLOAD ───────────────────────────────────────────────
router.post(
  '/upload',
  verifyToken,
  upload.single('file'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const { originalName, mimeType, iv, salt } = req.body;

    if (!iv || !salt) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      return res.status(400).json({ error: 'Missing encryption metadata (iv, salt).' });
    }

    try {
      // Upload encrypted blob to Supabase Storage
      await uploadToStorage(req.file.filename, req.file.path);

      // Save metadata to DB
      const file = await db.files.create({
        id: uuidv4(),
        ownerId: req.user.userId,
        originalName: originalName || req.file.originalname,
        mimeType: mimeType || 'application/octet-stream',
        storedName: req.file.filename,
        size: req.file.size,
        iv,
        salt,
      });

      // Audit log
      await db.auditLogs.create({
        id: uuidv4(),
        action: 'UPLOAD',
        userId: req.user.userId,
        userEmail: req.user.email,
        fileId: file.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        success: true,
        statusCode: 201,
      }).catch((e) => console.error('Audit log error:', e.message));

      return res.status(201).json({
        message: 'File uploaded successfully.',
        file: {
          id: file.id,
          originalName: file.originalName,
          size: file.size,
          createdAt: file.createdAt,
        },
      });
    } catch (err) {
      console.error('Upload error:', err.message);
      return res.status(500).json({ error: 'Failed to store file. ' + err.message });
    }
  }
);

// ─── LIST MY FILES ────────────────────────────────────────
router.get('/my-files', verifyToken, async (req, res) => {
  try {
    const files = await db.files.findByOwner(req.user.userId);
    return res.json({
      files: files.map((f) => ({
        id: f.id,
        originalName: f.originalName,
        size: f.size,
        createdAt: f.createdAt,
        downloadCount: f.downloadCount,
      })),
    });
  } catch (err) {
    console.error('List files error:', err.message);
    return res.status(500).json({ error: 'Failed to list files.' });
  }
});

// ─── SHARED WITH ME ───────────────────────────────────────
router.get('/shared-with-me', verifyToken, async (req, res) => {
  try {
    const allFiles = await db.files.getAll();
    const sharedFiles = [];
    for (const f of allFiles) {
      if (f.ownerId === req.user.userId) continue;
      const perm = await db.filePermissions.find(f.id, req.user.userId);
      if (perm) {
        sharedFiles.push({
          id: f.id,
          originalName: f.originalName,
          size: f.size,
          createdAt: f.createdAt,
          permission: perm.level,
        });
      }
    }
    return res.json({ files: sharedFiles });
  } catch (err) {
    console.error('Shared files error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch shared files.' });
  }
});

// ─── GENERATE SIGNED DOWNLOAD URL ─────────────────────────
router.get(
  '/:fileId/signed-url',
  verifyToken,
  verifyFileAccess('download'),
  async (req, res) => {
    try {
      const file = req.file;
      const token = jwt.sign(
        { fileId: file.id, userId: req.user.userId, purpose: 'download' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      await db.auditLogs.create({
        id: uuidv4(),
        action: 'GENERATE_LINK',
        userId: req.user.userId,
        fileId: file.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        success: true,
        statusCode: 200,
      }).catch((e) => console.error('Audit log error:', e.message));

      return res.json({
        signedUrl: `/api/files/download/${file.id}?token=${token}`,
        expiresIn: 900,
        iv: file.iv,
        salt: file.salt,
      });
    } catch (err) {
      console.error('Signed URL error:', err.message);
      return res.status(500).json({ error: 'Failed to generate download link.' });
    }
  }
);

// ─── DOWNLOAD VIA SIGNED URL ──────────────────────────────
router.get('/download/:fileId', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(401).json({ error: 'No token provided.' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }

    if (decoded.purpose !== 'download' || decoded.fileId !== req.params.fileId) {
      return res.status(403).json({ error: 'Invalid token purpose.' });
    }

    const file = await db.files.findById(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found.' });

    const buffer = await downloadFromStorage(file.storedName);
    await db.files.update(file.id, { downloadCount: (file.downloadCount || 0) + 1 });

    await db.auditLogs.create({
      id: uuidv4(),
      action: 'DOWNLOAD',
      userId: decoded.userId,
      fileId: file.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      success: true,
      statusCode: 200,
    }).catch((e) => console.error('Audit log error:', e.message));

    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}.enc"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    return res.send(buffer);
  } catch (err) {
    console.error('Download error:', err.message);
    return res.status(500).json({ error: 'Download failed: ' + err.message });
  }
});

// ─── SHARE FILE ───────────────────────────────────────────
router.post(
  '/:fileId/share',
  verifyToken,
  verifyFileAccess('manage'),
  async (req, res) => {
    try {
      const { email, permission = 'view' } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required.' });

      const targetUser = await db.users.findByEmail(email);
      if (!targetUser) return res.status(404).json({ error: 'User not found.' });
      if (targetUser.id === req.user.userId) {
        return res.status(400).json({ error: 'Cannot share with yourself.' });
      }

      const existing = await db.filePermissions.find(req.params.fileId, targetUser.id);
      if (existing) return res.status(409).json({ error: 'Already shared with this user.' });

      const validPermissions = ['view', 'download', 'manage'];
      if (!validPermissions.includes(permission)) {
        return res.status(400).json({ error: 'Invalid permission level.' });
      }

      await db.filePermissions.create({
        id: uuidv4(),
        fileId: req.params.fileId,
        userId: targetUser.id,
        userEmail: targetUser.email,
        level: permission,
        grantedBy: req.user.userId,
      });

      await db.auditLogs.create({
        id: uuidv4(),
        action: 'SHARE',
        userId: req.user.userId,
        fileId: req.params.fileId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        success: true,
        statusCode: 200,
      }).catch((e) => console.error('Audit log error:', e.message));

      return res.json({ message: `File shared with ${email} (${permission}).` });
    } catch (err) {
      console.error('Share error:', err.message);
      return res.status(500).json({ error: 'Share failed.' });
    }
  }
);

// ─── GET FILE PERMISSIONS ─────────────────────────────────
router.get(
  '/:fileId/permissions',
  verifyToken,
  verifyFileAccess('manage'),
  async (req, res) => {
    try {
      const permissions = await db.filePermissions.findByFile(req.params.fileId);
      return res.json({ permissions });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch permissions.' });
    }
  }
);

// ─── REVOKE ACCESS ────────────────────────────────────────
router.delete(
  '/:fileId/share/:userId',
  verifyToken,
  verifyFileAccess('manage'),
  async (req, res) => {
    try {
      await db.filePermissions.delete(req.params.fileId, req.params.userId);
      await db.auditLogs.create({
        id: uuidv4(),
        action: 'REVOKE_ACCESS',
        userId: req.user.userId,
        fileId: req.params.fileId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        success: true,
        statusCode: 200,
      }).catch((e) => console.error('Audit log error:', e.message));
      return res.json({ message: 'Access revoked.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to revoke access.' });
    }
  }
);

// ─── DELETE FILE ──────────────────────────────────────────
router.delete(
  '/:id',
  verifyToken,
  verifyFileAccess('manage'),
  async (req, res) => {
    try {
      const file = req.file;
      await deleteFromStorage(file.storedName);
      await db.files.delete(file.id);
      await db.auditLogs.create({
        id: uuidv4(),
        action: 'DELETE',
        userId: req.user.userId,
        fileId: file.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        success: true,
        statusCode: 200,
      }).catch((e) => console.error('Audit log error:', e.message));
      return res.json({ message: 'File deleted successfully.' });
    } catch (err) {
      console.error('Delete error:', err.message);
      return res.status(500).json({ error: 'Delete failed.' });
    }
  }
);

module.exports = router;
