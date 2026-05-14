INSIGHT_FLOW_RULE V2.1
(VERSION V2.1 – HEALTH SCORE SSOT & TRACEABLE INSIGHT)

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
A. OBJECTIVE & TRACEABILITY (V2.1)
==================================

Halaman Insight bertujuan menyajikan ringkasan kondisi terkini dengan kemampuan Deep Traceability ke data granular (Raw Data).

Insight harus:
* **Berbasis Raw Data (SSOT)**
* Executive View (Summary-based)
* Backend-aligned
* Deterministic
* Reproducible
* High-Fidelity Traceable (Link to Raw ID)
* Audit-safe

PRINSIP HEALTH SCORE & TRACEABILITY (V2.1):
- **Health Score SSOT**: 0.3 * Stability + 0.3 * Utilization - (0.4 * AnomalyPenalty).
- **Mandatory Metadata**: Insight wajib menyertakan `raw_timestamp`, `source_id`, dan `accuracy_pct`.
- **Raw Drill-down**: Visualisasi wajib memungkinkan user melihat data mentah (Raw Data Primary).

============================================================
B. ARCHITECTURE PRINCIPLE (V2.1)
================================

1. Heavy analysis dihitung di Backend (Heavy Analysis Engine):
   * percentiles
   * anomaly & penalty
   * correlation
   * forecast & utilization
   * stability scoring

2. Frontend hanya:
   * Menggabungkan (Signal Merging)
   * Menghitung derivasi ringan
   * Menyajikan (Visualization)
   * Menampilkan Accuracy Labeling (Stage 2)

3. **Raw Data (SSOT)** adalah sumber utama; Agregasi prematur dilarang.

Single Source of Truth (SSOT):
* `board_speed_stats`
* `board_resource_stats`
* `board_client_stats`
* `board_usage_stats`
* `board_pppoe_usage`
* `hotspot_usage_raw`

============================================================
C. END-TO-END PIPELINE (STAGE 7 - V2.1)
=======================================

STEP 1 — Context & Heavy Data Fetching
-------------------------------------
1. Frontend memicu Stage 0-1 (Normalization & Scope) via `getAggregateAll`.
2. Frontend mengambil hasil Stage 2-6 (Trend, Correlation, Habits, Anomaly, Forecast) via `getHeavyAnalysisV2`.
3. Seluruh input insight HARUS terkunci pada Context Lock Stage 1.

STEP 2 — Metric Normalization & Synchronization
-----------------------------------------------
1. Pastikan unit lintas metrik (Mbps vs %, dll) identik atau memiliki konversi eksplisit.
2. Sinkronisasi bucket waktu: Titik tidak berpasangan dalam perbandingan WoW/DoD wajib di-drop.
3. Gunakan `serverBuckets` (Stage 0) sebagai jangkar utama.

STEP 3 — Percentile & Peak Derivation
-------------------------------------
1. P95 dan P99 diambil dari hasil Backend (Stage 2/3).
2. Frontend hanya menyajikan label dan visualisasi pendukung.

STEP 4 — Baseline & Delta Calculation
-------------------------------------
1. Hitung Delta DoD: (today - yesterday) / yesterday.
2. Hitung Delta WoW: (now - last_week) / last_week.
3. Klasifikasi Tren (UP/DOWN/FLAT) berbasis ambang batas (default ±5%).

STEP 5 — Health Score Scoring (SSOT)
------------------------------------
1. Health Score dihitung secara agregat:
   - **Utilization (Stage 6)**: Semakin dekat kapasitas, skor turun. (Bobot: 30%)
   - **Stability (Stage 4)**: CV tinggi/fluktuasi ekstrem = skor turun. (Bobot: 30%)
   - **Active Anomaly (Stage 5)**: Penalti berat per anomali aktif. (Bobot: 40%)
2. Aturan Scoring:
   - Proporsional, Transparan, dan Traceable ke Raw Data.
   - Jika data tidak mencukupi (Accuracy < 100% di Stage 2), tampilkan indikator "Low Confidence Score".

STEP 6 — Signal Merging (Active Signals)
----------------------------------------
1. Gabungkan anomali aktif, korelasi signifikan, dan TTC kritis ke dalam kartu "Top Signals".
2. Gunakan `severity` dari Stage 5 & 6 untuk pengurutan prioritas.

STEP 7 — Insight Object Generation
----------------------------------
Keluarkan objek `insightMetrics` untuk UI:
{
  summary: { healthScore, deltaDoD, deltaWoW },
  signals: [ { id, type, severity, message } ],
  quality: { completeness, score }
}

============================================================
D. GLOBAL CONTROL INTERACTION
=============================

1. Period / Start-End:
   Menentukan cakupan insight.

2. Granularity:
   Mempengaruhi sensitivitas:

   * Percentile
   * Peak
   * Delta

3. AggMethod:
   Hanya berlaku untuk jalur frontend.

4. bucketSource:
   server → konsistensi lintas metrik
   frontend → eksplorasi non-Mbps

============================================================
E. PRESENTATION & ACTION
========================

UI wajib menampilkan:

1. Today vs Baseline
2. Peak & Percentile
3. Health Score
4. Active Anomaly
5. Correlation Highlight
6. Forecast Glimpse
7. Data Quality
8. Top Growth / Decline

Setiap kartu wajib:

* Label unit jelas
* Tooltip penjelasan
* Link eksplorasi lanjutan (Trend/Audit)

============================================================
F. ERROR & FALLBACK POLICY
==========================

1. Loading overlay per kartu.

2. Toast untuk:

   * KPI gagal
   * Heavy analysis gagal
   * Summary gagal

3. Jika heavy analysis unavailable:

   * Tampilkan subset insight
   * Beri label "Partial Insight"

Dilarang:

* Menghasilkan insight palsu
* Mengisi nilai kosong dengan asumsi

============================================================
G. PERFORMANCE RULE
===================

1. Insight berbasis caching backend.

2. TTL mengikuti:

   * granularity
   * period

3. Frontend hanya lakukan:

   * merge ringan
   * delta ringan
   * scoring ringan

4. Hindari recomputation tanpa perubahan filter.

============================================================
H. SECURITY & LOGGING
=====================

1. Endpoint heavy analysis wajib:

   * Authentication
   * Authorization

2. Parameter filter wajib divalidasi.

3. Log hanya memuat:

   * rentang waktu
   * granularity
   * jumlah insight aktif

4. Tidak boleh log:

   * Raw metric sensitif
   * Token
   * Secret

============================================================
I. AUDIT & REPRODUCIBILITY (V2.1)

Insight harus dapat direproduksi with:
* entity
* start_date
* end_date
* granularity
* aggMethod
* bucketSource
* **Time Conversion Accuracy Label**

Tanpa parameter ini, insight dianggap tidak audit-safe.

============================================================
J. PRE-FLIGHT CHECK
===================

1. Identifikasi Domain

   * Backend (heavy analysis)
   * Frontend (derivasi ringan & presentasi)

2. Dampak & Risiko

   * Unit mismatch
   * Bucket misalignment
   * Over-interpretation forecast

3. Hasil Audit

   * Bucket konsisten
   * Baseline jelas
   * Health score proporsional
   * Forecast tidak diekstrapolasi
   * Data quality tercermin

4. Rekomendasi Eksekusi

   * Uji berbagai granularity
   * Uji dengan missing data
   * Uji dengan anomaly aktif
   * Uji dengan slope negatif forecast

============================================================
K. ARCHITECTURAL ENFORCEMENT
============================

Frontend DILARANG:

* Menghitung ulang percentiles berat
* Menghitung ulang korelasi
* Menghitung ulang anomaly
* Mengubah severity backend
* Mengekstrapolasi forecast

Backend WAJIB:

* Menggunakan summary table
* Menghasilkan heavy analysis deterministik
* Menyediakan metadata lengkap

============================================================
L. FINAL DECLARATION
====================

Insight Flow adalah:

* Summary-based
* Backend-aligned
* Cross-metric consistent
* Deterministic
* Cache-aware
* Audit-safe

Jika frontend menghitung ulang heavy analysis
atau mengekstrapolasi forecast,
maka sistem dianggap menyimpang
dari arsitektur resmi.

END OF DOCUMENT
