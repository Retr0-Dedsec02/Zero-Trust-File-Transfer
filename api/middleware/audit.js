const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const auditLog = (action, getFileId = null) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      const success = res.statusCode < 400;
      const fileId = getFileId
        ? getFileId(req, data)
        : req.params.fileId || req.params.id || null;

      if (req.user) {
        db.auditLogs.create({
          id: uuidv4(),
          action,
          userId: req.user.userId,
          userEmail: req.user.email,
          fileId,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString(),
          success,
          statusCode: res.statusCode,
        }).catch((err) => console.error('Audit log error:', err.message));
      }

      return originalJson(data);
    };
    next();
  };
};

module.exports = { auditLog };
