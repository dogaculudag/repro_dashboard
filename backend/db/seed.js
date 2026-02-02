const bcrypt = require('bcryptjs');

const departments = ['Ön repro', 'Repro', 'Kalite', 'Kolaj'];

async function seedDatabase(db) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create admin user
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      await new Promise((res, rej) => {
        db.run(
          `INSERT INTO users (name, username, password_hash, role, department) VALUES (?, ?, ?, ?, ?)`,
          ['Admin User', 'admin', adminPasswordHash, 'admin', null],
          (err) => err ? rej(err) : res()
        );
      });

      // Create department users
      const userPasswordHash = await bcrypt.hash('user123', 10);
      const usernameMap = {
        'Ön repro': 'on_repro',
        'Repro': 'repro',
        'Kalite': 'kalite',
        'Kolaj': 'kolaj'
      };
      
      for (const dept of departments) {
        const username = usernameMap[dept];
        await new Promise((res, rej) => {
          db.run(
            `INSERT INTO users (name, username, password_hash, role, department) VALUES (?, ?, ?, ?, ?)`,
            [`${dept} Personeli`, username, userPasswordHash, 'user', dept],
            (err) => err ? rej(err) : res()
          );
        });
      }

      // Get Ön repro user ID
      const onReproUser = await new Promise((res, rej) => {
        db.get(`SELECT id FROM users WHERE role = 'user' AND department = 'Ön repro'`, [], (err, row) => {
          if (err) rej(err);
          else res(row);
        });
      });

      if (!onReproUser) {
        reject(new Error('Ön repro user not found'));
        return;
      }

      const onReproUserId = onReproUser.id;

      // Create sample files
      const sampleFiles = [
        { customer: 'Müşteri A', siparis_no: 'SIP-001', sap_no: 'SAP-001', baski_malz: 'Malzeme 1', department: 'Ön repro' },
        { customer: 'Müşteri B', siparis_no: 'SIP-002', sap_no: 'SAP-002', baski_malz: 'Malzeme 2', department: 'Ön repro' },
        { customer: 'Müşteri C', siparis_no: 'SIP-003', sap_no: 'SAP-003', baski_malz: 'Malzeme 3', department: 'Ön repro' },
      ];

      for (let i = 0; i < sampleFiles.length; i++) {
        const file = sampleFiles[i];
        const fileId = `D-${1001 + i}`;
        
        const fileResult = await new Promise((res, rej) => {
          db.run(
            `INSERT INTO files (file_id, customer, siparis_no, sap_no, baski_malz, department, current_department, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [fileId, file.customer, file.siparis_no, file.sap_no, file.baski_malz, file.department, 'Ön repro', 'Waiting'],
            function(err) {
              if (err) rej(err);
              else res(this.lastID);
            }
          );
        });

        // Create event log for file creation
        await new Promise((res, rej) => {
          db.run(
            `INSERT INTO event_logs (file_id, type, user_id, note) VALUES (?, ?, ?, ?)`,
            [fileResult, 'Created', onReproUserId, 'Dosya oluşturuldu'],
            (err) => err ? rej(err) : res()
          );
        });
      }

      console.log('Seed data created successfully');
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { seedDatabase };

