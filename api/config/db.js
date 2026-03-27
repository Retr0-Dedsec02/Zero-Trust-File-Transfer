require('dotenv').config();
const supabase = require('./supabase');

const db = {
  users: {
    findByEmail: async (email) => {
      const { data, error } = await supabase
        .from('users').select('*').eq('email', email).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data ? mapUser(data) : null;
    },
    findById: async (id) => {
      const { data, error } = await supabase
        .from('users').select('*').eq('id', id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data ? mapUser(data) : null;
    },
    create: async (user) => {
      const { data, error } = await supabase
        .from('users')
        .insert({ id: user.id, email: user.email, password: user.password, name: user.name })
        .select().single();
      if (error) throw error;
      return mapUser(data);
    },
  },

  files: {
    findById: async (id) => {
      const { data, error } = await supabase
        .from('files').select('*').eq('id', id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data ? mapFile(data) : null;
    },
    findByOwner: async (ownerId) => {
      const { data, error } = await supabase
        .from('files').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapFile);
    },
    getAll: async () => {
      const { data, error } = await supabase.from('files').select('*');
      if (error) throw error;
      return (data || []).map(mapFile);
    },
    create: async (file) => {
      const { data, error } = await supabase
        .from('files')
        .insert({
          id: file.id,
          owner_id: file.ownerId,
          original_name: file.originalName,
          mime_type: file.mimeType,
          stored_name: file.storedName,
          size: file.size,
          iv: file.iv,
          salt: file.salt,
        })
        .select().single();
      if (error) throw error;
      return mapFile(data);
    },
    update: async (id, updates) => {
      const dbUpdates = {};
      if (updates.downloadCount !== undefined) dbUpdates.download_count = updates.downloadCount;
      if (updates.originalName !== undefined) dbUpdates.original_name = updates.originalName;
      const { data, error } = await supabase
        .from('files').update(dbUpdates).eq('id', id).select().single();
      if (error) throw error;
      return mapFile(data);
    },
    delete: async (id) => {
      const { error } = await supabase.from('files').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
  },

  filePermissions: {
    find: async (fileId, userId) => {
      const { data, error } = await supabase
        .from('file_permissions').select('*')
        .eq('file_id', fileId).eq('user_id', userId).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data ? mapPermission(data) : null;
    },
    findByFile: async (fileId) => {
      const { data, error } = await supabase
        .from('file_permissions').select('*').eq('file_id', fileId);
      if (error) throw error;
      return (data || []).map(mapPermission);
    },
    findByUser: async (userId) => {
      const { data, error } = await supabase
        .from('file_permissions').select('*').eq('user_id', userId);
      if (error) throw error;
      return (data || []).map(mapPermission);
    },
    create: async (perm) => {
      const { data, error } = await supabase
        .from('file_permissions')
        .insert({
          id: perm.id,
          file_id: perm.fileId,
          user_id: perm.userId,
          user_email: perm.userEmail,
          level: perm.level,
          granted_by: perm.grantedBy,
        })
        .select().single();
      if (error) throw error;
      return mapPermission(data);
    },
    delete: async (fileId, userId) => {
      const { error } = await supabase
        .from('file_permissions').delete()
        .eq('file_id', fileId).eq('user_id', userId);
      if (error) throw error;
      return true;
    },
  },

  auditLogs: {
    create: async (log) => {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          id: log.id,
          action: log.action,
          user_id: log.userId || null,
          user_email: log.userEmail || null,
          file_id: log.fileId || null,
          ip_address: log.ipAddress || null,
          user_agent: log.userAgent || null,
          success: log.success,
          status_code: log.statusCode || null,
          timestamp: log.timestamp,
        })
        .select().single();
      if (error) throw error;
      return data;
    },
    findByUser: async (userId) => {
      const { data, error } = await supabase
        .from('audit_logs').select('*').eq('user_id', userId)
        .order('timestamp', { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    },
    findByFile: async (fileId) => {
      const { data, error } = await supabase
        .from('audit_logs').select('*').eq('file_id', fileId)
        .order('timestamp', { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
    getAll: async () => {
      const { data, error } = await supabase
        .from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(500);
      if (error) throw error;
      return data || [];
    },
  },

  refreshTokens: {
    save: async (token, userId) => {
      const { error } = await supabase
        .from('refresh_tokens').insert({ token, user_id: userId });
      if (error) throw error;
    },
    find: async (token) => {
      const { data, error } = await supabase
        .from('refresh_tokens').select('token').eq('token', token).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data ? data.token : null;
    },
    delete: async (token) => {
      const { error } = await supabase
        .from('refresh_tokens').delete().eq('token', token);
      if (error) throw error;
    },
  },
};

// Mappers: snake_case DB → camelCase JS
function mapUser(row) {
  return { id: row.id, email: row.email, password: row.password, name: row.name, createdAt: row.created_at };
}
function mapFile(row) {
  return {
    id: row.id, ownerId: row.owner_id, originalName: row.original_name,
    mimeType: row.mime_type, storedName: row.stored_name, size: row.size,
    iv: row.iv, salt: row.salt, downloadCount: row.download_count, createdAt: row.created_at,
  };
}
function mapPermission(row) {
  return {
    id: row.id, fileId: row.file_id, userId: row.user_id, userEmail: row.user_email,
    level: row.level, grantedBy: row.granted_by, grantedAt: row.granted_at,
  };
}

module.exports = db;
