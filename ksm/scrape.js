const sql = require('mssql');

const config = {
    user: 'readonly_view_user',
    password: 'viewUser123?', 
    server: '192.165.105.25', // 'localhost' yerine gerçek IP
    database: 'KSM',
    options: {
        encrypt: false, // Yerel ağ veya standart sunucular için false kalsın
        trustServerCertificate: true,
        instanceName: 'SQLEXPRESS' // String'deki o önemli ayrıntı
    }
};

async function veriyiGetir() {
    try {
        console.log("Bağlantı kuruluyor...");
        let pool = await sql.connect(config);
        
        // --- SENARYO 1: View adını bilmiyorsan önce listele ---
        const viewListesi = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS");
        console.log("Erişebileceğin View'ler:", viewListesi.recordset);

        if (viewListesi.recordset.length > 0) {
            // İlk bulunan view adını otomatik alalım (veya listeden gördüğünü yaz)
            const viewAdi = viewListesi.recordset[0].TABLE_NAME;
            
            // --- SENARYO 2: Veriyi Çek ---
            console.log(`${viewAdi} üzerinden veriler çekiliyor...`);
            const veriler = await pool.request().query(`SELECT TOP 100 * FROM ${viewAdi}`);
            
            console.log("Veri çekme başarılı! İlk 5 satır:");
            console.table(veriler.recordset.slice(0, 5));
        } else {
            console.log("Hata: Sana atanmış bir view bulunamadı!");
        }

    } catch (err) {
        console.error("Hata Detayı:", err.message);
    } finally {
        await sql.close();
    }
}

veriyiGetir();