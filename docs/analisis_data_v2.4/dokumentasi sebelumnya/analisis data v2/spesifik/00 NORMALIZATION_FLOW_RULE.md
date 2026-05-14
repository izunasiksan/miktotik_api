NORMALIZATION_FLOW_RULE V2.1
(VERSION V2.1 – RAW FIDELITY & TRACEABILITY)
Last Modified: 2026-03-05
Status: Finalized & Implemented

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
A. OBJECTIVE & GRANULARITY (V2.1)
================================

Normalisasi bertujuan untuk:
* Menstandarkan struktur data lintas sumber (Raw Data SSOT)
* Menyelaraskan unit & waktu (**Preserve Raw Precision**)
* Menjamin idempotensi transformasi
* Menjaga integritas deret waktu (High Fidelity)
* Menyediakan data siap agregasi & derivasi (Deferred Aggregation)
* Menjamin Deep Traceability melalui Metadata

PRINSIP RAW DATA PRIMARY (STAGE 0):
1. **Raw Fidelity**: Stage 0 DILARANG mereduksi detail data. Data mentah harus tetap mentah (Raw).
2. **Granularitas Maksimal**: Gunakan resolusi data tertinggi dari backend (Single Source of Truth).
3. **Traceability**: Setiap record wajib menyimpan referensi `raw_timestamp`, `source_id`, and `accuracy_pct`.
4. **Integrasi SOP**: Wajib mematuhi [aturan_penanganan_missing_data_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_penanganan_missing_data_V2.1.md) di Step 0.3.

Single Source of Truth (SSOT):
* `board_speed_stats`
* `board_resource_stats`
* `board_client_stats`
* `board_usage_stats`
* `board_pppoe_usage`
* `hotspot_usage_raw`

============================================================
B. ARCHITECTURE PRINCIPLE (V2.1)
================================

1. Data yang dinormalisasi berasal dari **Raw Tables (SSOT)**.
2. **Raw Data (SSOT)** adalah sumber utama; summary tables hanya digunakan sebagai fallback atau cache.
3. Normalisasi tidak boleh:
   * Mengubah makna data
   * Menghitung ulang heavy analysis
   * Mengganti nilai statistik backend
4. Transformasi harus idempotent: Input yang sama → Output identik.

============================================================
C. STAGE 0 — NORMALIZATION PIPELINE (V2.1)
==========================================

Fase ini memproses respon mentah dari backend menjadi NormalizedDataset.

STEP 0.1 — Data Acquisition (Raw Response Capture)
Controller memuat data melalui API V2.
* Sumber: GET /api/v2/analytics/raw-data/{board_id}
* Sifat: Read-only raw response.

STEP 0.2 — Sanitization & Standard Casting
1. Pastikan seluruh kolom metrik (rx, tx, cpu, mem) bertipe Number atau null.
2. Casting eksplisit: String "12.3" -> Number 12.3.
3. Penanganan NaN/Infinity: Ubah menjadi null (jangan biarkan di dataset).

STEP 0.3 — Gap Identification
1. Evaluasi setiap bucket: Jika seluruh metrik utama null -> Tandai isGap: true.
2. Jangan hapus bucket kosong (jaga integritas timeline).

STEP 0.4 — Structure Normalization (To NormalizedDataset)
Transformasi setiap item menjadi struktur standar dengan High Traceability:
Traffic: { 
  rx, tx, total, unit, timestamp, displayDate, isGap,
  metadata: { raw_timestamp, source_granularity, source_id, **source_table** }
}
Resource: { 
  cpu_percent_standard, free_memory, total_memory, mem_usage, timestamp, displayDate, isGap,
  metadata: { raw_timestamp, source_granularity, source_id, **source_table** }
}

STEP 0.5 — Output Readiness
* Hasilkan NormalizedDataset yang immutable.
* Kirim ke Stage 1 (Scope & Filter).

============================================================
D. TIME & GRANULARITY RULE
==========================

1. Backend exchange:
   ISO-8601 (UTC)

2. UI display:
   toLocaleDateString()

3. Granularity:
   auto | year | month | day | hour
   (Sesuai dengan resolusi data yang diterima dari backend).

4. Alignment:
   Timestamp harus konsisten di seluruh entitas dalam satu dataset.

============================================================
E. STAGE 1 PRE-CONDITION (TRANSITION)
=====================================

Normalisasi (Stage 0) selesai saat data memiliki struktur standar.
Filtering (period, entity filter, dll) WAJIB dilakukan setelah tahap ini di Stage 1.

Dilarang:
* Melakukan filtering di tengah proses normalisasi.
* Mengubah granularity di Stage 0.
* Melakukan agregasi ulang di Stage 0.

============================================================
F. FILL GAPS (RECONCILIATION)
=============================

Hanya dilakukan jika terdapat perbedaan antara timeline yang diharapkan (berdasarkan start/end) dengan bucket yang diterima.

Prosedur:
1. Bangun timeline teoritis (start -> end -> granularity).
2. Lakukan rekonsiliasi dengan NormalizedDataset.
3. Sisipkan bucket placeholder dengan isGap: true jika data hilang.

Dilarang:
* Menghapus gap tanpa penanda.
* Menganggap gap sebagai data valid (0).

============================================================
G. OUTPUT STANDARD
==================

1. Fungsi normalisasi harus:
   * Mengembalikan array baru.
   * Tidak memodifikasi input (immutability).

2. Bentuk output harus identik:
   Mendukung integrasi lintas tab (Trend / Insight / Audit).

3. Struktur final siap dikonsumsi oleh:
   * Stage 1 (Scope & Filter)
   * useAnalysisV2Controller (Shared State)

============================================================
H. DATA QUALITY SIGNAL
======================

Normalisasi harus menghasilkan metadata:

* jumlah record valid
* jumlah record drop
* jumlah gap
* invalid field count

Metadata ini dipakai untuk:

* Data Quality Score
* Insight transparency
* Audit trail

============================================================
I. ERROR & LOADING POLICY
=========================

1. Jika dataset besar:
   tampilkan Loading Overlay.

2. Jika banyak record invalid:
   tampilkan peringatan ringan.

3. Tidak boleh silent failure.

============================================================
J. PERFORMANCE RULE
===================

1. Hindari deep cloning berlebihan.
2. Gunakan memoization jika perlu.
3. Jangan re-normalisasi tanpa perubahan dependensi.
4. Hindari transformasi O(n²).

============================================================
K. PRE-FLIGHT CHECK
===================

1. Identifikasi Domain

   * Controller (fetch)
   * Normalizer
   * Derivation hook

2. Dampak & Risiko

   * Unit mismatch
   * Timestamp misalignment
   * Gap tidak ditandai

3. Hasil Audit

   * Field standar terpenuhi
   * Tidak ada NaN
   * isGap berfungsi
   * Output immutable

4. Rekomendasi Eksekusi

   * Uji berbagai granularity
   * Uji dataset dengan gap
   * Uji unit server & frontend
   * Uji idempotensi (run dua kali hasil sama)

============================================================
L. ARCHITECTURAL ENFORCEMENT (V2.1)

Normalizer DILARANG:
* Menghitung ulang percentiles
* Menghitung ulang korelasi
* Menghitung ulang anomaly
* Mengubah severity
* Mengubah confidence band
* **Mereduksi granularitas data mentah**

Normalizer WAJIB:
* Menjaga struktur standar
* Menyelaraskan unit
* Menandai gap
* Menjaga immutability
* Menghasilkan output deterministik
* **Menyertakan metadata traceability lengkap**

============================================================
M. FINAL DECLARATION (V2.1)

Normalization Flow Stage 0 adalah:
* **Berbasis Raw Data (SSOT)**
* High Fidelity (No Downsampling)
* Traceable (Link to Source ID)
* Deterministic & Idempotent
* Immutable
* Unit-consistent
* Time-aligned
* Gap-aware
* Backend-aligned

Jika normalisasi:

* Mengubah makna data,
* Mencampur unit tanpa konversi,
* Menghapus gap tanpa penanda,

maka sistem dianggap menyimpang
dari arsitektur resmi.

============================================================
N. INTEGRASI ASSESSMENT FRONTEND_V2.1
====================================

1. Stage 0 Pre-Check (01_INTEGRATION_MAP.md)
- Panggil `/analysis/normalization/status` sebelum eksekusi pipeline.
- Jika `accuracy_pct < 100`, tampilkan DataQualityAlert dan lanjutkan pipeline dengan transparansi akurasi.
- Jika status normalisasi `PENDING`, tampilkan overlay loading dan jalankan normalisasi async sesuai kebijakan backend.

2. Context Lock & Task Async (01_INTEGRATION_MAP.md, 03_API_COMMUNICATION.md)
- Kunci filter (board, time_range, granularity) saat task status `PENDING/STARTED`.
- Polling `/analysis/tasks/{task_id}/status` tiap 1–3 detik hingga `SUCCESS/FAILURE`.
- Pada `SUCCESS`: ambil hasil final dan buka lock; pada `FAILURE`: tampilkan error & buka lock.

3. Komunikasi API & Error Handling (03_API_COMMUNICATION.md)
- Gunakan instance Axios dengan:
  - baseURL VITE_API_URL, timeout 10–15s.
  - Interceptor Authorization Bearer.
  - Retry 3x dengan exponential backoff (axios-retry).
- Tindakan UI spesifik:
  - 401: hapus token & redirect /login
  - 429: toast “Terlalu banyak permintaan”
  - 503: “Circuit Breaker” / “Maintenance”

4. UI/UX Guidelines (04_UI_UX_GUIDELINES.md)
- Progress/Status untuk Stage 0.
- Label akurasi di komponen ringkasan (emerald/amber/rose).
- Konsistensi warna & aksesibilitas (focus ring, kontras).

5. Traceability & Metadata (Sinkron dengan Stage 0)
- Sertakan `raw_timestamp`, `source_granularity`, `source_id`, `source_table`, `accuracy_pct` pada NormalizedDataset.
- Pastikan *alignment* timestamp antar entitas sebelum Stage 1.

6. Kepatuhan Flow
- Dilarang melakukan filtering, agregasi, atau downsampling pada Stage 0.
- Stage 1 hanya untuk scope/filter; Stage 2+ untuk derivasi/analitik.
- Output Stage 0 immutable & idempotent.

END OF DOCUMENT
