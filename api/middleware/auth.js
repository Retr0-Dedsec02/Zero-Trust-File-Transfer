const jwt = require('jsonwebtoken');
const db = require('../config/db');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.users.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found.' });

    req.user = { userId: decoded.userId, email: decoded.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired.' });
    console.error('verifyToken error:', err.message);
    return res.status(403).json({ error: 'Invalid token.' });
  }
};

const verifyFileAccess = (requiredPermission = 'view') => {
  return async (req, res, next) => {
    try {
      const fileId = req.params.fileId || req.params.id;
      const userId = req.user.userId;

      const file = await db.files.findById(fileId);
      if (!file) return res.status(404).json({ error: 'File not found.' });

      if (file.ownerId === userId) {
        req.file = file;
        return next();
      }

      const permission = await db.filePermissions.find(fileId, userId);
      if (!permission) return res.status(403).json({ error: 'Access denied.' });

      const permissionLevels = { view: 1, download: 2, manage: 3 };
      if (permissionLevels[permission.level] < permissionLevels[requiredPermission]) {
        return res.status(403).json({ error: 'Insufficient permissions.' });
      }

      req.file = file;
      next();
    } catch (err) {
      console.error('Auth middleware error:', err.message);
      return res.status(500).json({ error: 'Authorization check failed.' });
    }
  };
};

module.exports = { verifyToken, verifyFileAccess };
