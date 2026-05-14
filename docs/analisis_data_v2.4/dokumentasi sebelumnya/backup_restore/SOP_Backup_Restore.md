# STANDAR OPERASIONAL PROSEDUR (SOP): BACKUP & RESTORE DATA

| Versi | Tanggal | Deskripsi | Penulis | Approver | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1.0 | 2026-03-01 | Initial Release | AI Assistant | Security Officer | DRAFT |

---

## 1. TUJUAN
Dokumen ini menetapkan standar prosedur backup dan restore untuk memastikan integritas, keamanan, dan ketersediaan data pada sistem API Mikrotik, baik untuk operasional harian maupun pemulihan bencana.

## 2. KLASIFIKASI DATA & KEBIJAKAN RETENSI
| Klasifikasi | Contoh Data | Metode Backup | Retensi |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | DB Mikrotik, Credentials, JWT Keys | Full Daily, Incremental Hourly | 1 Tahun |
| **MEDIUM** | Board Logs, Event Logs | Full Weekly, Incremental Daily | 3 Bulan |
| **LOW** | Temporary Files, Cache | No Backup / Differential | 1 Minggu |

## 3. METODE & JADWAL BACKUP
### 3.1 Skenario 1: Backup Lokal (On-Premise)
*   **Fokus:** Keamanan data internal dan audit trail.
*   **Jadwal:**
    *   **Full Backup:** Setiap hari Minggu (01:00 AM).
    *   **Incremental Backup:** Setiap hari Senin-Sabtu (01:00 AM).
*   **Audit Trail:** Setiap aktivitas backup dicatat ke dalam `backup_audit_log` tabel.

### 3.2 Skenario 2: Backup Online (Cloud/Remote)
*   **Fokus:** Disaster Recovery dan Failover.
*   **Mekanisme:** Replikasi data asinkron ke server sekunder di lokasi geografis berbeda.
*   **Jadwal:** Real-time replication untuk data CRITICAL, daily sync untuk data lainnya.

## 4. PROSEDUR ENKRIPSI & KEAMANAN
*   **Encryption at Rest:** Semua file backup WAJIB dienkripsi menggunakan AES-256 sebelum disimpan ke storage.
*   **Encryption in Transit:** Pengiriman data backup ke lokasi sekunder WAJIB menggunakan protokol aman (SSL/TLS atau SSH/SCP).
*   **Kontrol Akses:** Hanya akun sistem terdedikasi (service account) dan Administrator Keamanan yang memiliki izin akses ke direktori backup.

## 5. VERIFIKASI INTEGRITAS
Setiap proses backup harus diikuti oleh:
1.  **Checksum Generation:** Membuat file `.sha256` untuk setiap paket backup.
2.  **Hash Validation:** Verifikasi hash secara otomatis setelah transfer selesai.
3.  **Restore Test:** Uji coba restore secara acak setiap bulan.

## 6. PROSEDUR PEMULIHAN (RESTORE)
### 6.1 Parameter RTO & RPO
*   **RTO (Recovery Time Objective):** Maksimal 4 jam untuk layanan kritis.
*   **RPO (Recovery Point Objective):** Maksimal 1 jam kehilangan data (berdasarkan jadwal incremental).

### 6.2 Langkah-langkah Pemulihan
1.  Identifikasi titik kegagalan dan pilih snapshot backup terakhir yang valid.
2.  Verifikasi integritas file backup menggunakan checksum.
3.  Lakukan dekripsi file backup menggunakan kunci privat yang tersimpan aman.
4.  Jalankan script restorasi ke environment staging sebelum produksi.
5.  Verifikasi fungsionalitas sistem setelah restorasi.

---
*Dokumen ini merupakan properti internal. Dilarang menyebarluaskan tanpa izin tertulis.*
