const express = require('express');
const { getDb } = require('../db/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// DELETE route must be defined BEFORE GET /:id to avoid route conflicts
// Delete file (admin only or file owner)
router.delete('/:id', authenticateToken, (req, res) => {
  console.log('DELETE /files/:id called with id:', req.params.id);
  console.log('User:', req.user);
  const db = getDb();
  const fileId = req.params.id;

  // Helper function to run queries as promises
  const runQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  };

  const getQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };

  // Disable foreign keys temporarily to avoid constraint issues
  runQuery('PRAGMA foreign_keys = OFF')
    .then(() => {
      console.log('Foreign keys disabled');
      return getQuery('SELECT * FROM files WHERE id = ?', [fileId]);
    })
    .then((file) => {
      console.log('File found:', file);
      if (!file) {
        return Promise.reject({ status: 404, message: 'Dosya bulunamadı' });
      }

      // Check permission: admin can delete any file, users can delete their own files
      const isOwner = file.current_owner_user_id && Number(file.current_owner_user_id) === Number(req.user.id);
      console.log('Permission check - isAdmin:', req.user.role === 'admin', 'isOwner:', isOwner);
      if (req.user.role !== 'admin' && !isOwner) {
        return Promise.reject({ status: 403, message: 'Bu dosyayı silme yetkiniz yok' });
      }

      // Delete related records first, then the file
      console.log('Starting deletion process...');
      return runQuery('DELETE FROM event_logs WHERE file_id = ?', [fileId])
        .then(() => {
          console.log('Event logs deleted');
          return runQuery('DELETE FROM work_sessions WHERE file_id = ?', [fileId]);
        })
        .catch((err) => {
          console.error('Error deleting event logs (continuing):', err);
          return runQuery('DELETE FROM work_sessions WHERE file_id = ?', [fileId]);
        })
        .then(() => {
          console.log('Work sessions deleted');
          return runQuery('DELETE FROM files WHERE id = ?', [fileId]);
        })
        .catch((err) => {
          console.error('Error deleting work sessions (continuing):', err);
          return runQuery('DELETE FROM files WHERE id = ?', [fileId]);
        })
        .then(() => {
          console.log('File deleted successfully');
        });
    })
    .then(() => runQuery('PRAGMA foreign_keys = ON')) // Re-enable foreign keys
    .then(() => {
      res.json({ message: 'Dosya başarıyla silindi' });
    })
    .catch((err) => {
      // Re-enable foreign keys even on error
      runQuery('PRAGMA foreign_keys = ON').catch(() => {});
      
      console.error('Error deleting file:', err);
      const status = err.status || 500;
      const message = err.message || 'Dosya silinirken hata oluştu';
      res.status(status).json({ error: message });
    });
});

// Get all files (with search)
router.get('/', authenticateToken, (req, res) => {
  const db = getDb();
  const { search, department } = req.query;

  let query = `
    SELECT f.*, 
           u.name as owner_name,
           (SELECT COUNT(*) FROM event_logs WHERE file_id = f.id) as event_count
    FROM files f
    LEFT JOIN users u ON f.current_owner_user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  // Filter by department if user is not admin
  if (req.user.role === 'user') {
    query += ` AND f.current_department = ?`;
    params.push(req.user.department);
  } else if (department) {
    query += ` AND f.current_department = ?`;
    params.push(department);
  }

  // Search by customer, siparis_no, sap_no, or file_id
  if (search) {
    query += ` AND (f.customer LIKE ? OR f.siparis_no LIKE ? OR f.sap_no LIKE ? OR f.file_id LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY f.created_at DESC`;

  db.all(query, params, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(files);
  });
});

// Get file by ID
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const fileId = req.params.id;

  db.get(
    `SELECT f.*, u.name as owner_name
     FROM files f
     LEFT JOIN users u ON f.current_owner_user_id = u.id
     WHERE f.id = ?`,
    [fileId],
    (err, file) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check access: user can only see files in their department
      if (req.user.role === 'user' && file.current_department !== req.user.department) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get event logs
      db.all(
        `SELECT el.*, u.name as user_name
         FROM event_logs el
         LEFT JOIN users u ON el.user_id = u.id
         WHERE el.file_id = ?
         ORDER BY el.timestamp ASC`,
        [fileId],
        (err, logs) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          // Get work sessions for time calculations
          db.all(
            `SELECT ws.*, u.name as user_name
             FROM work_sessions ws
             LEFT JOIN users u ON ws.user_id = u.id
             WHERE ws.file_id = ?
             ORDER BY ws.start_time ASC`,
            [fileId],
            (err, sessions) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }

              // Calculate department times
              const departmentTimes = calculateDepartmentTimes(logs, sessions, file);

              res.json({
                ...file,
                event_logs: logs,
                work_sessions: sessions,
                department_times: departmentTimes
              });
            }
          );
        }
      );
    }
  );
});

// Create new file (only Ön repro users or admin)
router.post('/', authenticateToken, (req, res) => {
  console.log('POST /files called');
  console.log('Request body:', req.body);
  console.log('User:', req.user);
  
  const db = getDb();
  const { customer, siparis_no, sap_no, baski_malz, department } = req.body;

  if (!customer || customer.trim() === '') {
    console.log('Validation failed: customer is missing or empty');
    return res.status(400).json({ error: 'Müşteri alanı zorunludur' });
  }

  // Check permission: admin can always create files
  // Users can create files if they have permission (this check can be removed if all users should create files)
  // For now, allow all authenticated users to create files

  // Generate file_id
  db.get('SELECT MAX(id) as max_id FROM files', [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const nextId = (row.max_id || 0) + 1;
    const fileId = `D-${1000 + nextId}`;

    db.run(
      `INSERT INTO files (file_id, customer, siparis_no, sap_no, baski_malz, department, current_department, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [fileId, customer, siparis_no || null, sap_no || null, baski_malz || null, department || 'Ön repro', 'Ön repro', 'Waiting'],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Create event log
        db.run(
          `INSERT INTO event_logs (file_id, type, user_id, note)
           VALUES (?, ?, ?, ?)`,
          [this.lastID, 'Created', req.user.id, 'Dosya oluşturuldu'],
          (err) => {
            if (err) {
              console.error('Error creating event log:', err);
            }
          }
        );

        res.status(201).json({ id: this.lastID, file_id: fileId });
      }
    );
  });
});

// Take file (assign to user)
router.post('/:id/take', authenticateToken, (req, res) => {
  const db = getDb();
  const fileId = req.params.id;

  db.get('SELECT * FROM files WHERE id = ?', [fileId], (err, file) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check permission: user can only take files from their department
    if (req.user.role === 'user' && file.current_department !== req.user.department) {
      return res.status(403).json({ error: 'You can only take files from your department' });
    }

    // Check if file is already in progress
    if (file.status === 'InProgress' && file.current_owner_user_id) {
      return res.status(400).json({ error: 'File is already assigned to another user' });
    }

    // Update file
    db.run(
      `UPDATE files 
       SET status = 'InProgress', 
           current_owner_user_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.user.id, fileId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Create work session
        db.run(
          `INSERT INTO work_sessions (file_id, department, user_id, start_time)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
          [fileId, file.current_department, req.user.id],
          (err) => {
            if (err) {
              console.error('Error creating work session:', err);
            }
          }
        );

        // Create event log
        db.run(
          `INSERT INTO event_logs (file_id, type, user_id, note)
           VALUES (?, ?, ?, ?)`,
          [fileId, 'Taken', req.user.id, `Dosya ${req.user.name} tarafından üzerine alındı`],
          (err) => {
            if (err) {
              console.error('Error creating event log:', err);
            }
          }
        );

        res.json({ success: true });
      }
    );
  });
});

// Transfer file to next department
router.post('/:id/transfer', authenticateToken, (req, res) => {
  const db = getDb();
  const fileId = req.params.id;

  db.get('SELECT * FROM files WHERE id = ?', [fileId], (err, file) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check permission: user must own the file
    if (file.current_owner_user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only transfer files you own' });
    }

    // Determine next department
    const departments = ['Ön repro', 'Repro', 'Kalite', 'Kolaj'];
    const currentIndex = departments.indexOf(file.current_department);
    if (currentIndex === -1 || currentIndex === departments.length - 1) {
      return res.status(400).json({ error: 'File is already in the last department' });
    }

    const nextDepartment = departments[currentIndex + 1];

    // End current work session
    db.run(
      `UPDATE work_sessions 
       SET end_time = CURRENT_TIMESTAMP
       WHERE file_id = ? AND user_id = ? AND end_time IS NULL`,
      [fileId, req.user.id],
      (err) => {
        if (err) {
          console.error('Error ending work session:', err);
        }
      }
    );

    // Update file
    db.run(
      `UPDATE files 
       SET current_department = ?,
           current_owner_user_id = NULL,
           status = 'Waiting',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nextDepartment, fileId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Create event log
        db.run(
          `INSERT INTO event_logs (file_id, type, from_department, to_department, user_id, note)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [fileId, 'Transferred', file.current_department, nextDepartment, req.user.id, 
           `Dosya ${file.current_department} → ${nextDepartment} transfer edildi`],
          (err) => {
            if (err) {
              console.error('Error creating event log:', err);
            }
          }
        );

        res.json({ success: true, next_department: nextDepartment });
      }
    );
  });
});

// Complete file (only from Kolaj department)
router.post('/:id/complete', authenticateToken, (req, res) => {
  const db = getDb();
  const fileId = req.params.id;

  db.get('SELECT * FROM files WHERE id = ?', [fileId], (err, file) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check permission: user must own the file and be in Kolaj department
    if (file.current_owner_user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only complete files you own' });
    }
    if (file.current_department !== 'Kolaj') {
      return res.status(400).json({ error: 'File can only be completed from Kolaj department' });
    }

    // End current work session
    db.run(
      `UPDATE work_sessions 
       SET end_time = CURRENT_TIMESTAMP
       WHERE file_id = ? AND user_id = ? AND end_time IS NULL`,
      [fileId, req.user.id],
      (err) => {
        if (err) {
          console.error('Error ending work session:', err);
        }
      }
    );

    // Update file
    db.run(
      `UPDATE files 
       SET status = 'Completed',
           current_owner_user_id = NULL,
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [fileId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Create event log
        db.run(
          `INSERT INTO event_logs (file_id, type, user_id, note)
           VALUES (?, ?, ?, ?)`,
          [fileId, 'Completed', req.user.id, 'Dosya tamamlandı'],
          (err) => {
            if (err) {
              console.error('Error creating event log:', err);
            }
          }
        );

        res.json({ success: true });
      }
    );
  });
});

// Admin: Reset file owner (correction)
router.post('/:id/reset', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const fileId = req.params.id;

  db.get('SELECT * FROM files WHERE id = ?', [fileId], (err, file) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // End any active work session
    db.run(
      `UPDATE work_sessions 
       SET end_time = CURRENT_TIMESTAMP
       WHERE file_id = ? AND end_time IS NULL`,
      [fileId],
      (err) => {
        if (err) {
          console.error('Error ending work session:', err);
        }
      }
    );

    // Reset file
    db.run(
      `UPDATE files 
       SET status = 'Waiting',
           current_owner_user_id = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [fileId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Create event log
        db.run(
          `INSERT INTO event_logs (file_id, type, user_id, note)
           VALUES (?, ?, ?, ?)`,
          [fileId, 'Corrected', req.user.id, 'Admin tarafından düzeltme yapıldı'],
          (err) => {
            if (err) {
              console.error('Error creating event log:', err);
            }
          }
        );

        res.json({ success: true });
      }
    );
  });
});

// Helper function to calculate department times
function calculateDepartmentTimes(logs, sessions, file) {
  const departments = ['Ön repro', 'Repro', 'Kalite', 'Kolaj'];
  const times = {};

  for (const dept of departments) {
    times[dept] = {
      waiting_time: 0,
      processing_time: 0
    };
  }

  // Find entry time for each department
  const entryTimes = {};
  entryTimes['Ön repro'] = new Date(file.created_at);

  // Process logs to find transfer times
  for (const log of logs) {
    if (log.type === 'Transferred' && log.to_department) {
      entryTimes[log.to_department] = new Date(log.timestamp);
    }
  }

  // Calculate waiting and processing times
  for (const session of sessions) {
    if (session.end_time) {
      const start = new Date(session.start_time);
      const end = new Date(session.end_time);
      const processingTime = (end - start) / 1000 / 60; // minutes
      times[session.department].processing_time += processingTime;
    }
  }

  // Calculate waiting times
  for (const dept of departments) {
    if (!entryTimes[dept]) continue;

    const entryTime = entryTimes[dept];
    let waitingEnd = null;

    // Find when someone took the file in this department
    for (const session of sessions) {
      if (session.department === dept && session.start_time) {
        const sessionStart = new Date(session.start_time);
        if (sessionStart >= entryTime) {
          waitingEnd = sessionStart;
          break;
        }
      }
    }

    if (waitingEnd) {
      const waitingTime = (waitingEnd - entryTime) / 1000 / 60; // minutes
      times[dept].waiting_time = waitingTime;
    } else if (file.current_department === dept && file.status === 'Waiting') {
      // Still waiting
      const waitingTime = (new Date() - entryTime) / 1000 / 60; // minutes
      times[dept].waiting_time = waitingTime;
    }
  }

  return times;
}

module.exports = router;


