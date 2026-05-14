# 📋 ASSESSMENT SCHEMA AUDIT & CONSISTENCY CHECK
**Bahasa Indonesia**
**Tanggal:** 2026-03-01
**Target Assessment:** Database Schema (SQL vs Code vs Docs)
**Domain:** Backend & Database
**Severity Level:** CRITICAL

---

## 1. RINGKASAN EKSEKUTIF
Audit menyeluruh telah dilakukan untuk membandingkan `docs/db/schema.sql`, kode model Python (`app/models/`), dan sejarah migrasi Alembic. Ditemukan **INKONSISTENSI KRITIKAL** di mana dokumen referensi utama (`schema.sql`) tidak lengkap (hanya mencakup Tabel 11-16) dan tertinggal jauh dari implementasi kode aktual. Selain itu, ditemukan model Python yang **CACAT** (`HotspotUsageMonthly`) yang kehilangan field vital untuk operasional.

## 2. TEMUAN ANOMALI (DETAIL)

### A. DOKUMENTASI (`docs/db/schema.sql`)
| Status | Deskripsi Anomali | Dampak |
| :--- | :--- | :--- |
| 🔴 **CRITICAL** | **Missing Tables 1-10**: File dimulai dari "NOMOR 11". Tabel fundamental seperti `master_users`, `mikrotik_boards`, `board_credentials` **TIDAK ADA**. | Referensi database utama tidak valid. Developer baru akan bingung melihat struktur DB. |
| 🔴 **CRITICAL** | **Missing Phase 8 & 14**: Tabel `automation_jobs`, `automation_logs`, `ztp_queue`, dan `audit_logs` **TIDAK ADA**. | Fitur Automation & Audit tidak terdokumentasi di SQL level. |
| 🟠 **HIGH** | `telegram_bots`: Kolom `bot_token` **MISSING**. | Bot tidak bisa login tanpa token. Dokumentasi menyesatkan. |
| 🟠 **HIGH** | `board_interface_configs`: Kolom `is_primary_uplink` **MISSING**. | Logika prioritas uplink tidak terlihat di schema. |

### B. KODE BACKEND (`app/models/*.py`)
| Status | Deskripsi Anomali | Dampak |
| :--- | :--- | :--- |
| 🔴 **CRITICAL** | `HotspotUsageMonthly` (mikrotik.py): **MISSING FIELDS** `month_period`, `is_frequent_user`, `last_updated`. | **DATA LOSS RISK**. Laporan bulanan tidak memiliki referensi waktu (bulan apa data ini?). |
| 🟡 **MEDIUM** | `BoardInterfaceConfig`: Missing `UniqueConstraint(board_id, interface_name)`. | Potensi duplikasi konfigurasi interface untuk board yang sama. |
| 🟡 **MEDIUM** | `BoardInterfaceUsage`: Missing `UniqueConstraint(board_id, interface_name, log_date)`. | Potensi duplikasi data usage harian (double counting). |
| 🟡 **MEDIUM** | `BoardPppoeUsage`: Missing `UniqueConstraint(board_id, pppoe_username, log_date)`. | Potensi duplikasi data usage PPPoE. |
| 🟡 **MEDIUM** | `HotspotUsageRaw`: Missing `UniqueConstraint(username, board_id, log_date)`. | Potensi duplikasi data hotspot harian. |
| 🟡 **MEDIUM** | `TelegramRecipient`: Missing `UniqueConstraint(bot_id, board_id, chat_id)`. | Potensi spam notifikasi ke user yang sama. |

## 3. ANALISIS RISIKO
*   **Integritas Data (High):** Absennya Unique Constraints di level aplikasi (Python) meningkatkan risiko "Dirty Data" jika validasi di database tidak ketat atau jika insert dilakukan via script luar.
*   **Operasional (Critical):** Model `HotspotUsageMonthly` yang cacat membuat fitur Laporan Bulanan Hotspot **TIDAK BERFUNGSI** secara logika (tidak ada penanda bulan).
*   **Maintenance (High):** `schema.sql` yang parsial membuat debugging database menjadi sulit karena tidak ada "Single Source of Truth" yang valid.

## 4. REKOMENDASI PERBAIKAN (ACTION PLAN)

### PRIORITAS 1: PERBAIKAN KODE (HOTFIX)
1.  **Update `HotspotUsageMonthly`**: Tambahkan kolom `month_period` (Date), `is_frequent_user` (Bool), `last_updated` (DateTime).
2.  **Inject Constraints**: Tambahkan `__table_args__` dengan `UniqueConstraint` ke semua model yang terdampak (`BoardInterfaceConfig`, `BoardInterfaceUsage`, `BoardPppoeUsage`, `HotspotUsageRaw`, `TelegramRecipient`).

### PRIORITAS 2: SINKRONISASI DOKUMENTASI
1.  **Regenerate `schema.sql`**: Buat ulang file `docs/db/schema.sql` yang LENGKAP mencakup semua tabel (1-16 + Automation + Audit) berdasarkan state Alembic terakhir.

## 5. STATUS SAAT INI
*   **Schema SQL:** 🔴 INVALID (Partial)
*   **Models:** 🟡 NEEDS FIX (Constraint Missing, Field Missing)
*   **Migrations:** 🟢 VALID (Alembic track record lengkap)

---
*Assessment oleh: AI Assistant (Trae)*
