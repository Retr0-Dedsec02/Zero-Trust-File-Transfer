const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Get current user's audit logs
router.get('/my-logs', verifyToken, async (req, res) => {
  try {
    const logs = await db.auditLogs.findByUser(req.user.userId);
    return res.json({ logs });
  } catch (err) {
    console.error('My logs error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Get audit logs for a specific file (owner only)
router.get('/file/:fileId', verifyToken, async (req, res) => {
  try {
    const file = await db.files.findById(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found.' });
    if (file.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const logs = await db.auditLogs.findByFile(req.params.fileId);
    return res.json({ logs });
  } catch (err) {
    console.error('File logs error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
