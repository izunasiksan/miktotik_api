AUDIT_SCOPE_FILTER_RULE V2.1
(VERSION V2.1 – CONTEXT LOCK & RAW DATA PRIMARY)

Pipeline Stage Summary:
- Stage 0: Normalization (High Granularity Preservation & Raw Fidelity)
- Stage 1: Scope & Filter (Context Lock & Initial Indexing)
- Stage 2: Trend & Aggregation (Deferred Aggregation & Time Conversion Accuracy)
- Stage 3: Correlation (Deep Traceability & High-Res Alignment)
- Stage 4: Habits & Patterns (Granular Baseline & Stability Scoring)
- Stage 5: Anomaly Validation (Granular Validation & Penalty Scoring)
- Stage 6: Capacity Forecast (Granular Projection & Utilization Scoring)
- Stage 7: Insight (Traceable Insight & Health Score SSOT)

============================================================
A. STAGE 1 — SCOPE & FILTER (CONTEXT LOCK V2.1)
==============================================

1. Stage 1 adalah satu-satunya tahap untuk melakukan filtering.
2. Bertujuan mengunci (Context Lock) dataset yang telah dinormalisasi (Stage 0).
3. Hasil Stage 1 disebut ScopedDataset.
4. Stage berikutnya (Trend, Korelasi, dll) DILARANG melakukan filtering ulang.

PRINSIP RAW DATA PRIMARY (STAGE 1):
- **Source Priority**: Filtering WAJIB dilakukan pada Raw Data (Single Source of Truth) untuk memastikan akurasi maksimal sebelum agregasi di Stage 2.
- **Initial Indexing**: Gunakan index `(board_id, log_time DESC)` untuk kecepatan filter.
- **Metadata Mandatory**: Tambahkan `raw_timestamp`, `source_id`, dan `accuracy_pct` ke ScopedDataset.

============================================================
B. PRINSIP UTAMA (V2.1)
=======================

WAJIB:

* Pre-Flight sebelum eksekusi.
* Validasi seluruh parameter filter.
* Dokumentasi scope & filter.

DILARANG:

* Menjalankan query destruktif.
* Mengubah konfigurasi sistem.
* Logging data sensitif (PII, token, secret, credential).
* Query berat tanpa alasan teknis jelas.

============================================================
C. DEFINISI SCOPE
=================

Scope terdiri dari 3 elemen wajib:

1. Domain

   * Database
   * Backend
   * Frontend
   * Infrastruktur

2. Entitas

   * board
   * interface
   * pppoe
   * hotspot
   * clients
   * atau entitas lain yang relevan

   Tabel mentah resmi (Single Source of Truth - SSOT):
   * `board_speed_stats`
   * `board_resource_stats`
   * `board_client_stats`
   * `board_usage_stats`
   * `board_pppoe_usage`
   * `hotspot_usage_raw`

3. Waktu

   * period (daily | monthly | yearly)
   * limit
   * atau start_date & end_date (ISO-8601)

Scope harus eksplisit dan terdokumentasi.
Audit tanpa scope dianggap tidak valid.

============================================================
D. ATURAN FILTER
================

Filter yang sah:

* period
* limit
* start_date
* end_date
* granularity (auto|year|month|day|hour)
* aggMethod (AVG|MAX|SUM|MIN) → hanya untuk daily
* entity/name filter

ATURAN VALIDASI:

1. start_date ≤ end_date
2. Format tanggal ISO-8601 (yyyy-MM-dd)
3. Gunakan granularity = auto sebagai default
4. Gunakan aggMethod = AVG sebagai default
5. Context Lock: Data setelah difilter di Stage 1 menjadi sumber tunggal yang immutable bagi Stage 2 s/d Stage 7.

DILARANG:
1. Re-filter di tahap Trend (Stage 2).
2. Re-filter di tahap Korelasi (Stage 3).
3. Re-filter di tahap Insight (Stage 7).

Semua filter wajib lolos:

* validateFilterParams
* aturan granularitas konsisten dengan tabel summary

============================================================
E. SUMBER BUCKET (DATA SOURCE MODE)
===================================

## Mode 1: Server (Default & Direkomendasikan)

* Menggunakan bucket dari backend.
* Konsisten lintas tab.
* Cocok untuk unit Mbps.

## Mode 2: Frontend

* Hanya untuk fleksibilitas unit non-Mbps.
* Hanya untuk eksplorasi harian.
* Tidak boleh melakukan agregasi berat.

Frontend tidak boleh menjadi engine agregasi utama.

============================================================
F. VALIDASI & KEAMANAN
======================

1. Endpoint backend:

   * Wajib autentikasi.
   * Validasi parameter.
   * Gunakan index waktu & board_id.
   * Gunakan caching jika perlu.

2. Hindari:

   * Query N+1.
   * O(n²) loop.
   * Join lintas tabel tanpa kebutuhan jelas.

3. Logging:

   * Hanya metadata (timestamp, board_id, jumlah rows).
   * Tidak menyimpan nilai metrik mentah sensitif.

============================================================
G. PRE-FLIGHT CHECK (WAJIB)
===========================

Audit tidak boleh dieksekusi tanpa Pre-Flight.

Format wajib 4 bagian:

1. Identifikasi Domain

   * Lingkup audit
   * File / modul terkait
   * Entitas

2. Dampak & Risiko

   * Risiko performa
   * Risiko mismatch unit
   * Risiko inkonsistensi bucket

3. Hasil Audit Teknis Awal

   * Konsistensi parameter
   * Validasi struktur & tipe data
   * Compliance aturan proyek

4. Rekomendasi Eksekusi

   * Langkah audit
   * Metode verifikasi
   * Strategi rollback (jika relevan)

============================================================
H. CHECKLIST VALIDASI
=====================

[ ] Scope jelas (domain/entitas/waktu)
[ ] Filter tervalidasi
[ ] Mode bucket sesuai kebutuhan
[ ] Read-only terjamin
[ ] Tidak ada data sensitif di log/laporan
[ ] Parameter audit terdokumentasi
[ ] Konsisten dengan aturan agregasi & historical analysis

============================================================
I. FINAL DECLARATION
====================

Audit Scope & Filter Rule adalah:

* Read-only
* **Berbasis Raw Data (SSOT)**
* Konsisten terhadap waktu
* Tidak ambigu granularitas
* **Membaca Raw Log secara Efisien (Index-based)**
* Tidak melakukan re-aggregation berat di tahap filter
* Selaras dengan Single Source of Truth

Jika aturan ini dilanggar,
maka audit dianggap keluar dari arsitektur resmi sistem.

END OF DOCUMENT
