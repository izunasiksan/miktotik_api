# Laporan Tinjauan Ulang & Audit Keselarasan (Schema vs Code vs Docs)
**Tanggal:** 2026-02-28
**Basis Audit:** `e:\mikrotik_api\docs\db\schema.sql` (Pondasi Utama) & `/docs`

## 1. Status Penyelarasan Database (Schema vs Code)
Sesuai instruksi untuk menjadikan `schema.sql` sebagai pondasi utama, berikut adalah status implementasi saat ini:

| Tabel (Schema.sql) | Model (Python) | Status | Catatan |
| :--- | :--- | :--- | :--- |
| `master_users` | `MasterUser` | ✅ Selesai | - |
| `mikrotik_boards` | `MikrotikBoard` | ✅ Selesai | - |
| `board_credentials` | `BoardCredential` | ✅ Selesai | - |
| `user_board_access` | `UserBoardAccess` | ✅ **BARU DITAMBAHKAN** | Model & Relasi telah dibuat di `app/models/user.py`. |
| `vpn_profiles` | `VPNProfile` | ⚠️ Partial | Model ada, tapi **Endpoint CRUD belum ada**. |
| `board_client_stats` | `BoardClientStat` | ✅ Selesai | - |
| `board_resource_stats` | `BoardResourceStat` | ✅ Selesai | - |
| `board_speed_stats` | `BoardSpeedStat` | ✅ Selesai | - |
| `board_daily_summary` | `BoardDailySummary` | ✅ Selesai | - |
| `board_events` | `BoardEvent` | ⚠️ Partial | Model ada, Trigger DB ada, tapi **Endpoint Audit Log belum ada**. |

**Tindakan yang Telah Dilakukan:**
*   [x] Menambahkan model `UserBoardAccess` dan relasi ke `MasterUser` serta `MikrotikBoard` di kode backend.
*   [x] Membuat migrasi Alembic (`335b32d43d15_add_userboardaccess_and_relationships`) dan mengaplikasikannya ke database.

## 2. Analisis Kesenjangan Dokumentasi (`alur kerja full.txt` vs `schema.sql`)
Ditemukan perbedaan signifikan antara deskripsi alur kerja (Phase 4) dengan schema database yang dijadikan acuan utama:

*   **Fitur Backup:** `alur kerja full.txt` menyebutkan tabel `board_backups`, namun tabel ini **TIDAK ADA** di `schema.sql`.
*   **Usage Tracking:** `alur kerja full.txt` menyebutkan tabel `board_interface_usage`, `board_pppoe_usage`, `hotspot_usage_raw`, `hotspot_usage_monthly`. Tabel-tabel ini **TIDAK ADA** di `schema.sql`.

**Keputusan Implementasi:**
Mengikuti instruksi *"buat alur sesuai dengan database sebagai pondasi utama"*, maka fitur-fitur di atas (Backup & Detailed Usage Tracking) **TIDAK DIIMPLEMENTASIKAN** pada tahap ini karena tidak didukung oleh schema database yang valid. Fokus saat ini adalah memaksimalkan fitur yang didukung oleh `schema.sql`.

## 3. Fitur yang Tertunda / Tidak Direalisasikan
1.  **Forgot Password via Email:**
    *   **Status:** 🛑 DIBATALKAN (Sesuai Request).
    *   **Alasan:** Infrastruktur server email belum tersedia.
2.  **Backup Otomatis (.rsc):**
    *   **Status:** 🛑 DITUNDA.
    *   **Alasan:** Tidak ada tabel `board_backups` di `schema.sql`.

## 4. Rekomendasi Langkah Selanjutnya (Action Plan)
Untuk memenuhi cakupan `schema.sql` secara penuh, kita perlu melengkapi endpoint API yang masih kosong:

1.  **Implementasi RBAC Endpoint:**
    *   Membuat endpoint untuk memberikan/mencabut akses user ke board tertentu (mengisi tabel `user_board_access`).
2.  **Implementasi VPN Management:**
    *   Membuat CRUD untuk `vpn_profiles`.
3.  **Implementasi Audit Log Viewer:**
    *   Membuat endpoint untuk melihat data `board_events` (History mati/hidup router).

---
*Laporan ini disusun untuk memastikan pengembangan tetap pada jalur yang ditentukan oleh struktur database utama.*
