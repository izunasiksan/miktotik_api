# ASSESSMENT FEATURE GAP ANALYSIS
**Project:** Mikrotik Management System
**Date:** 2026-03-01
**Ref:** `docs/db/schema.sql` vs Current Frontend Implementation

## 1. PENDAHULUAN
Dokumen ini mengidentifikasi kesenjangan (gap) antara kapabilitas database yang telah didefinisikan dalam `schema.sql` dengan implementasi antarmuka (Frontend) yang saat ini tersedia. Analisis ini bertujuan untuk memetakan 10 fitur krusial yang belum diimplementasikan namun didukung oleh struktur database.

## 2. STATUS SAAT INI (EXISTING)
Fitur yang telah tersedia (Fase 1-4):
*   ✅ **Authentication & RBAC**: Login, Logout, Protected Routes.
*   ✅ **Dashboard**: Ringkasan status online/offline, total resource.
*   ✅ **Router Management**: CRUD Router, List View, Detail View (Basic Stats).
*   ✅ **User Management**: CRUD User Aplikasi.
*   ✅ **Audit Logs**: Log aktivitas user aplikasi (via `Settings` / `AuditLogs`).
*   ✅ **Reporting**: Laporan harian/bulanan (Agregat).
*   ✅ **Telegram Settings**: Konfigurasi Bot dan Penerima Notifikasi.

## 3. IDENTIFIKASI 10 FITUR YANG BELUM ADA (GAP ANALYSIS)

Berikut adalah 10 fitur yang memiliki struktur tabel di database namun belum memiliki antarmuka (UI) atau logika bisnis di Frontend:

### 1. Interface Management & Monitoring
*   **Schema Terkait:** `board_interface_configs`, `board_interface_usage`.
*   **Kondisi Saat Ini:** Tidak ada UI untuk melihat daftar interface per router.
*   **Kebutuhan:**
    *   List semua interface (ether1, wlan1, pppoe-out).
    *   Toggle `is_active` (Monitor on/off).
    *   Set `is_primary_uplink` (untuk kalkulasi WAN).
    *   Grafik trafik spesifik per interface.

### 2. VPN Management (Tunneling)
*   **Schema Terkait:** `vpn_profiles`.
*   **Kondisi Saat Ini:** API tersedia (`getVPNProfiles`), UI nihil.
*   **Kebutuhan:**
    *   UI Tab khusus di `RouterDetail` untuk manajemen VPN.
    *   Form Tambah/Edit VPN (L2TP, SSTP, OVPN).
    *   Status indikator koneksi VPN (Connected/Disconnected).

### 3. Backup Management & Restore
*   **Schema Terkait:** `board_backups`.
*   **Kondisi Saat Ini:** API tersedia (`getBackups`), UI nihil.
*   **Kebutuhan:**
    *   List histori backup (.rsc/.backup) per router.
    *   Tombol "Backup Now" (Trigger manual).
    *   Tombol "Download" dan "Restore".

### 4. PPPoE Client Monitoring (Detailed)
*   **Schema Terkait:** `board_pppoe_usage`, `board_client_stats`.
*   **Kondisi Saat Ini:** Hanya menampilkan total jumlah user aktif.
*   **Kebutuhan:**
    *   Tabel daftar user PPPoE yang sedang online.
    *   Penggunaan data (Upload/Download) per user.
    *   Fitur "Kick User" (Disconnect paksa).

### 5. Hotspot Client Analytics
*   **Schema Terkait:** `hotspot_usage_raw`, `hotspot_usage_monthly`.
*   **Kondisi Saat Ini:** Belum ada modul Hotspot sama sekali.
*   **Kebutuhan:**
    *   Laporan penggunaan voucher/user hotspot.
    *   Top 10 User (Download terbanyak).
    *   Grafik tren login hotspot harian.

### 6. Automation & Mass Configuration
*   **Schema Terkait:** `automation_jobs`, `automation_logs`.
*   **Kondisi Saat Ini:** Fitur belum tersentuh.
*   **Kebutuhan:**
    *   Wizard untuk membuat job massal (misal: Ganti Password Wifi di 50 router sekaligus).
    *   Monitoring status job (Pending -> Running -> Success/Fail).
    *   Log detail eksekusi per router.

### 7. Zero Touch Provisioning (ZTP) Queue
*   **Schema Terkait:** `ztp_queue`.
*   **Kondisi Saat Ini:** Belum tersentuh.
*   **Kebutuhan:**
    *   Halaman antrian router baru yang minta di-adopt.
    *   Action: Approve (Assign ke Site) atau Reject.
    *   Otomatisasi config awal saat Approve.

### 8. Router Event Logs (Per Device)
*   **Schema Terkait:** `board_events`.
*   **Kondisi Saat Ini:** `AuditLogs` global ada, tapi Log spesifik router (interface down, reboot, ospf state change) belum tampil di `RouterDetail`.
*   **Kebutuhan:**
    *   Tab "System Logs" di halaman Detail Router.
    *   Filter berdasarkan severity (Info, Warning, Critical).

### 9. Board Credentials Vault
*   **Schema Terkait:** `board_credentials`.
*   **Kondisi Saat Ini:** Password diinput saat create/edit board, tapi tidak ada manajemen terpisah.
*   **Kebutuhan:**
    *   UI aman untuk melihat/mengupdate password router tanpa mengedit konfigurasi lain.
    *   Fitur "Test Credentials" untuk memvalidasi password tersimpan.

### 10. Advanced Diagnostic Tools
*   **Schema Terkait:** N/A (Direct API Action), namun didukung oleh infrastruktur `mikrotik_boards`.
*   **Kondisi Saat Ini:** Hanya ada tombol "Ping Check" sederhana.
*   **Kebutuhan:**
    *   UI untuk Ping ke IP tertentu dari router (Remote Ping).
    *   UI Traceroute.
    *   UI Bandwidth Test antar router.

## 4. REKOMENDASI ROADMAP PENGEMBANGAN (NEXT STEPS)

Berdasarkan urgensi dan dependensi, berikut urutan pengerjaan yang disarankan:

### Fase 5: Router Deep-Dive (High Priority)
Fokus melengkapi detail router agar operasional harian terbantu.
1.  Implementasi **Interface Management** (Monitor traffic WAN/LAN).
2.  Implementasi **Router Event Logs** (Troubleshooting).
3.  Implementasi **Backup Management** (Disaster Recovery).

### Fase 6: Client Monitoring (Medium Priority)
Fokus pada end-user monitoring.
1.  Implementasi **PPPoE Monitoring**.
2.  Implementasi **Hotspot Analytics**.

### Fase 7: Advanced Features (Low Priority / Power User)
1.  **VPN Management**.
2.  **Automation & Mass Config**.
3.  **ZTP**.

---
*Dokumen ini dibuat otomatis oleh AI Assistant berdasarkan analisis Schema SQL vs Source Code.*
