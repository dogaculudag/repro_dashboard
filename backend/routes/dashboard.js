const express = require('express');
const { getDb } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get dashboard stats
router.get('/stats', authenticateToken, (req, res) => {
  const db = getDb();

  // Active files count
  db.get(
    `SELECT COUNT(*) as count FROM files WHERE status != 'Completed'`,
    [],
    (err, activeFiles) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Files by department
      db.all(
        `SELECT current_department, COUNT(*) as count
         FROM files
         WHERE status != 'Completed'
         GROUP BY current_department`,
        [],
        (err, byDepartment) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          // Today's completed files
          db.get(
            `SELECT COUNT(*) as count 
             FROM files 
             WHERE status = 'Completed' 
             AND DATE(completed_at) = DATE('now')`,
            [],
            (err, todayCompleted) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }

              // Longest waiting files (top 10)
              db.all(
                `SELECT f.id, f.sap_no, f.customer, f.current_department,
                        f.status, f.created_at,
                        CASE 
                          WHEN f.status = 'Waiting' THEN
                            (julianday('now') - julianday(
                              COALESCE(
                                (SELECT MAX(timestamp) FROM event_logs 
                                 WHERE file_id = f.id AND type = 'Transferred'),
                                f.created_at
                              )
                            )) * 24 * 60
                          ELSE 0
                        END as waiting_minutes
                 FROM files f
                 WHERE f.status != 'Completed'
                 ORDER BY waiting_minutes DESC
                 LIMIT 10`,
                [],
                (err, longestWaiting) => {
                  if (err) {
                    return res.status(500).json({ error: 'Database error' });
                  }

                  // Last 7 days completed files (for chart)
                  db.all(
                    `SELECT DATE(completed_at) as date, COUNT(*) as count
                     FROM files
                     WHERE status = 'Completed'
                     AND completed_at >= datetime('now', '-7 days')
                     GROUP BY DATE(completed_at)
                     ORDER BY date ASC`,
                    [],
                    (err, last7Days) => {
                      if (err) {
                        return res.status(500).json({ error: 'Database error' });
                      }

                      res.json({
                        active_files: activeFiles.count,
                        by_department: byDepartment.reduce((acc, row) => {
                          acc[row.current_department] = row.count;
                          return acc;
                        }, {}),
                        today_completed: todayCompleted.count,
                        longest_waiting: longestWaiting,
                        last_7_days: last7Days
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

module.exports = router;


