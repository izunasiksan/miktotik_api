# 📋 ASSESSMENT: PHASE 16 (HOTSPOT LOYALTY) GAP ANALYSIS
**Bahasa Indonesia**
**Tanggal:** 2026-03-01
**Target Assessment:** Phase 16 (Hotspot Loyalty) vs Schema SQL & Codebase
**Domain:** Backend Service & Scheduler
**Severity Level:** MEDIUM (Feature Missing)

---

## 1. DESKRIPSI & TUJUAN
*   **Tujuan Fitur:** Menghitung loyalitas pengguna Hotspot berdasarkan frekuensi login bulanan (`frequency_days`) dan menandai pengguna setia (`is_frequent_user`).
*   **Target Pengguna/Sistem:** Manajemen Marketing & Retensi Pelanggan.

## 2. AUDIT STATUS SAAT INI (GAP ANALYSIS)

### A. SCHEMA & DATABASE (✅ READY)
*   [x] **Tabel 16a (`hotspot_usage_raw`):** Sudah ada di `schema.sql` dan database.
*   [x] **Tabel 16b (`hotspot_usage_monthly`):** Sudah ada di `schema.sql` dan database dengan kolom `frequency_days`, `month_period`, `is_frequent_user`.
*   [x] **Models (`app/models/mikrotik.py`):** Class `HotspotUsageRaw` dan `HotspotUsageMonthly` sudah didefinisikan dengan benar.

### B. BACKEND LOGIC (❌ MISSING)
*   [ ] **Aggregation Service:** File `app/services/aggregation_service.py` saat ini **HANYA** menangani `BoardDailySummary` dan `BoardMonthlySummary` (Traffic & Resource).
*   [ ] **Loyalty Calculation:** **BELUM ADA** logika untuk:
    1.  Mengambil data unik `username` + `log_date` dari `hotspot_usage_raw`.
    2.  Menghitung `frequency_days` (jumlah hari aktif dalam satu bulan).
    3.  Menentukan flag `is_frequent_user` (misal: jika aktif > 15 hari).
    4.  Menyimpan hasil ke `hotspot_usage_monthly`.

### C. SCHEDULER (⚠️ PARTIAL)
*   [x] **Cron Job:** `app/main.py` sudah memiliki job `run_monthly_aggregation_job` yang berjalan setiap tanggal 1 jam 01:00.
*   [ ] **Integration:** Job tersebut belum memanggil fungsi kalkulasi loyalty (karena fungsinya belum dibuat).

## 3. ANALISIS RISIKO
*   **Dampak Sistem:** Data `hotspot_usage_monthly` akan kosong atau tidak akurat. Fitur loyalitas tidak berjalan.
*   **Risiko Downtime:** RENDAH (Hanya logic background job).

## 4. REKOMENDASI & ACTION PLAN
1.  **Implementasi Logic:** Buat fungsi `aggregate_hotspot_loyalty(db, year, month)` di `app/services/aggregation_service.py`.
2.  **Integrasi Scheduler:** Panggil fungsi tersebut di dalam `run_monthly_aggregation_job` pada file yang sama.
3.  **Verifikasi:** Jalankan unit test atau manual trigger untuk memastikan data terisi.

---
*Assessment dilakukan oleh: AI Assistant (Trae)*
