const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();

  db.all(
    `SELECT id, name, username, role, department, created_at
     FROM users
     ORDER BY created_at DESC`,
    [],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(users);
    }
  );
});

// Create new user
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const db = getDb();
  const { name, username, password, role, department } = req.body;

  if (!name || !username || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (role === 'user' && !department) {
    return res.status(400).json({ error: 'Department required for user role' });
  }

  if (role === 'admin' && department) {
    return res.status(400).json({ error: 'Admin cannot have department' });
  }

  // Check if username exists
  db.get('SELECT id FROM users WHERE username = ?', [username], async (err, existing) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);

      db.run(
        `INSERT INTO users (name, username, password_hash, role, department)
         VALUES (?, ?, ?, ?, ?)`,
        [name, username, passwordHash, role, department || null],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          res.status(201).json({
            id: this.lastID,
            name,
            username,
            role,
            department
          });
        }
      );
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// Delete user
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  console.log('DELETE /users/:id called with id:', req.params.id);
  console.log('User:', req.user);
  const db = getDb();
  const userId = parseInt(req.params.id);

  // Prevent self-deletion
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz' });
  }

  // Check if user exists
  db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has active files assigned
    db.get(
      `SELECT COUNT(*) as count FROM files WHERE current_owner_user_id = ? AND status != 'Completed'`,
      [userId],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        if (result.count > 0) {
          return res.status(400).json({ 
            error: 'Bu kullanıcının aktif dosyaları var. Önce dosyaları devretmesi gerekiyor.' 
          });
        }

        // Delete user
        db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          res.json({ success: true, message: 'User deleted successfully' });
        });
      }
    );
  });
});

module.exports = router;


