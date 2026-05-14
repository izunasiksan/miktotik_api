# 📋 ASSESSMENT: SCHEMA GAP ANALYSIS
**Bahasa Indonesia**
**Tanggal:** 2026-02-28
**Target Assessment:** Sinkronisasi `schema.sql` vs `app/models/mikrotik.py`
**Domain:** Backend & Database
**Severity Level:** HIGH

---

## 1. DESKRIPSI & TUJUAN
* **Tujuan:** Mengidentifikasi celah (gap) antara desain database terbaru (`schema.sql`) dengan implementasi kode (`mikrotik.py`) untuk memastikan sistem dibangun di atas pondasi yang valid.
* **Target:** Keselarasan 100% antara ERD/Schema dengan SQLAlchemy Models.

## 2. TEMUAN KRITIS (MISSING & MISMATCH)

### A. Tabel yang Belum Ada di Kode (Missing Models)
Berdasarkan `schema.sql`, model-model berikut **Wajib** ditambahkan ke `app/models/mikrotik.py`:
1.  **BoardBackups** (Tabel 11) - Manajemen file `.rsc`.
2.  **TelegramBots** (Tabel 12a) - Konfigurasi Bot API.
3.  **TelegramRecipients** (Tabel 12b) - Mapping notifikasi.
4.  **BoardInterfaceConfigs** (Tabel 13) - Filter interface monitoring.
5.  **BoardInterfaceUsage** (Tabel 14) - Daily traffic usage (Bytes).
6.  **BoardPppoeUsage** (Tabel 15) - PPPoE usage tracking.
7.  **HotspotUsageRaw** (Tabel 16a) - Hotspot daily raw.
8.  **HotspotUsageMonthly** (Tabel 16b) - Loyalty user summary.

### B. Ketidaksesuaian Tipe Data (Type Mismatch)
| Model / Tabel | Kolom | Schema.sql | Code (SQLAlchemy) | Rekomendasi |
| :--- | :--- | :--- | :--- | :--- |
| **BoardSpeedStat** | `download_mbps` | `NUMERIC(10,2)` | `Integer` | Ubah ke `Numeric(10,2)` agar presisi desimal. |
| **BoardSpeedStat** | `upload_mbps` | `NUMERIC(10,2)` | `Integer` | Ubah ke `Numeric(10,2)`. |
| **BoardResourceStat** | `uptime` | `INTERVAL` | `String` | Ubah ke `Interval` (native PostgreSQL). |
| **BoardDailySummary** | *Structure* | Sederhana (4 kolom metrik) | Kompleks (13 kolom metrik) | **PERLU KEPUTUSAN**: Kode saat ini lebih lengkap daripada schema. Apakah schema perlu di-update mengikuti kode, atau kode di-downgrade mengikuti schema? (Asumsi: Ikuti Schema dulu). |

### C. Tabel Tidak Dikenal di Schema (Extra Models)
*   `BoardMonthlySummary` ada di kode tapi **TIDAK ADA** di `schema.sql`.
    *   *Analisis:* `schema.sql` menggunakan pendekatan `hotspot_usage_monthly` (fokus ke user), bukan summary router bulanan.
    *   *Rekomendasi:* Hapus `BoardMonthlySummary` dari kode untuk mematuhi schema.

## 3. ANALISIS RISIKO
*   **Data Integrity:** Penggunaan `Integer` untuk Mbps menghilangkan presisi (5.5 Mbps terbaca 5 Mbps).
*   **Fitur Hilang:** Tanpa tabel `board_interface_usage` dan `hotspot_usage_raw`, fitur "Delta Logic" dan "Loyalty Filter" yang dijelaskan di `alur kerja full.txt` **TIDAK BISA DIJALANKAN**.
*   **Compliance:** Kode saat ini melanggar aturan "Schema sebagai Pondasi Utama".

## 4. RENCANA TINDAK LANJUT (ACTION PLAN)

### Langkah 1: Refactor Model (`app/models/mikrotik.py`)
1.  Hapus class `BoardMonthlySummary`.
2.  Sesuaikan `BoardDailySummary` agar persis dengan `schema.sql`.
3.  Ubah tipe data `BoardSpeedStat` dan `BoardResourceStat`.
4.  Tambahkan 8 Class Model baru (Backup, Telegram, Usage, dll).

### Langkah 2: Refactor Schema Pydantic (`app/schemas/mikrotik.py`)
1.  Buat schema `Response` dan `Create` untuk 8 model baru.
2.  Update schema `Stat` untuk mendukung desimal.

### Langkah 3: Migrasi Database
1.  Generate revisi Alembic baru: `alembic revision --autogenerate -m "sync_schema_vs_code_v2"`.
2.  Apply migration.

---
*Assessment dilakukan oleh: AI Assistant (Trae)*
