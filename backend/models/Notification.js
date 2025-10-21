const db = require('../database');

class Notification {
  static create(notificationData) {
    return new Promise((resolve, reject) => {
      const { user_id, type, message, data, is_read = false } = notificationData;
      
      db.run(
        `INSERT INTO notifications (user_id, type, message, data, is_read, created_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [user_id, type, message, JSON.stringify(data || {}), is_read],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, ...notificationData });
          }
        }
      );
    });
  }

  static getByUserId(userId, limit = 50, offset = 0) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM notifications 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [userId, limit, offset],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const notifications = rows.map(row => ({
              ...row,
              data: JSON.parse(row.data || '{}')
            }));
            resolve(notifications);
          }
        }
      );
    });
  }

  static markAsRead(notificationId, userId) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE notifications 
         SET is_read = 1 
         WHERE id = ? AND user_id = ?`,
        [notificationId, userId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ success: true, changes: this.changes });
          }
        }
      );
    });
  }

  static markAllAsRead(userId) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE notifications 
         SET is_read = 1 
         WHERE user_id = ? AND is_read = 0`,
        [userId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ success: true, changes: this.changes });
          }
        }
      );
    });
  }

  static getUnreadCount(userId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count 
         FROM notifications 
         WHERE user_id = ? AND is_read = 0`,
        [userId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row.count);
          }
        }
      );
    });
  }
}

module.exports = Notification;


