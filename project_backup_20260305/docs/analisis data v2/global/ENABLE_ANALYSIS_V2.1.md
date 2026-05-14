============================================================
ENABLE ANALYSIS V2.1 - FRONTEND FEATURE FLAG
Deterministic • Isolated • Backward-Safe
============================================================

Tujuan
------
- Mengaktifkan tampilan Analisis V2.1 yang mendukung Raw Data Primary.
- Menjaga isolasi arsitektur: route/feature-flag terpisah.
- Mendukung sistem konversi waktu otomatis dan deteksi missing data di UI.

Cara Aktivasi (Pilihan)
-----------------------
1) Local Storage (Browser)
- Buka DevTools Console, jalankan:
  
  localStorage.setItem('enableAnalysisV2', 'true')
  
- Refresh halaman. Sidebar akan menampilkan menu "Analisis V2.1".

2) Variabel Lingkungan (Frontend)
- Tambahkan pada .env lokal:
  
  VITE_ENABLE_ANALYSIS_V2=true
  
- Jalankan ulang dev server: npm run dev

Perilaku Navigasi
-----------------
- Sidebar menampilkan item "Analisis V2.1" saat feature flag aktif.
- Route: /analysis-v2
- V1 tetap berjalan seperti semula; tidak ada perubahan pada /analysis.

Kepatuhan Rule
--------------
- Sesuai ANALYTICS_EXECUTION_RULE_V2.1.md: V2.1 terisolasi, non-breaking, backward-safe.
- Integrasi otomatis dengan:
  - [aturan_konversi_waktu_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_konversi_waktu_V2.1.md)
  - [aturan_penanganan_missing_data_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_penanganan_missing_data_V2.1.md)

Rollback
--------
- Nonaktifkan dengan:
  
  localStorage.removeItem('enableAnalysisV2')
  
  atau set VITE_ENABLE_ANALYSIS_V2=false dan restart dev server.

END OF DOCUMENT
