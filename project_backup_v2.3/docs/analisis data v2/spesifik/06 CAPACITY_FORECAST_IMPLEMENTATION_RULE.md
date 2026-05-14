CAPACITY_FORECAST_IMPLEMENTATION_RULE V2.1
(VERSION V2.1 – UTILIZATION SCORING & GRANULAR PROJECTION)

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
A. CORE PRINCIPLE (STAGE 6 — CAPACITY FORECAST V2.1)
===================================================

1. Stage 6 memprediksi beban masa depan dan menghitung sisa kapasitas operasional.
2. Forecast utama dihitung di Backend (Heavy Analysis Engine) menggunakan model statistik/ML.
3. Frontend bertugas melakukan derivasi ringan: TTC (Time-To-Capacity) dan Headroom.
4. Analisis bersifat deterministik berdasarkan ScopedDataset (Stage 1).
5. Hasil Stage 6 disebut ForecastMetrics.
6. Harus patuh pada Context Lock (Stage 1); tidak ada filtering ulang di frontend.

PRINSIP UTILIZATION SCORING (STAGE 6):
- **Utilization Scoring**: Skor penggunaan kapasitas berkontribusi **30%** ke Health Score (Stage 7).
- MANDATORY METADATA: Setiap proyeksi wajib menyimpan `raw_timestamp`, `source_id`, dan `accuracy_pct`.

Single Source of Truth (SSOT):
* `board_speed_stats`
* `board_resource_stats`
* `board_client_stats`
* `board_usage_stats`
* `board_pppoe_usage`
* `hotspot_usage_raw`

============================================================
B. PIPELINE POSITION & INPUT/OUTPUT (V2.1)
==========================================
1. Input:
   * ScopedDataset (Stage 1)
   * TrendMetrics (Stage 2) - Untuk konteks pertumbuhan historis.
   * HeavyAnalysisResult (dari API /heavy-analysis/) - Berisi projected_values & confidence_bands.
2. Output: ForecastMetrics (Daftar proyeksi, TTC, dan rekomendasi).
3. Dependency: Stage 0 → Stage 1 → [Stage 2, 3, 4, 5] → Stage 6.

============================================================
C. CAPACITY & UNIT RULE
========================
1. Kapasitas acuan harus eksplisit (Link Speed atau Config Override).
2. Unit beban dan kapasitas wajib identik (contoh: Mbps vs Mbps).
3. Jika traffic dalam Mbps: wajib gunakan data hasil Normalisasi (Stage 0).
4. Dilarang menggunakan "Proxy Capacity" (puncak historis) tanpa label eksplisit di UI.

============================================================
D. DERIVATION LOGIC (FRONTEND)
==============================
Frontend melakukan derivasi dari output Backend:

1. Utilization:
   utilization = projected_value / capacity

2. Headroom (Konservatif):
   headroom = capacity − upper_bound
   *Wajib menggunakan upper bound, bukan median/mean.*

3. TTC (Time-To-Capacity):
   TTC terjadi saat: upper_bound ≥ capacity
   *Jika tidak tercapai dalam horizon proyeksi, TTC = "> Horizon".*

============================================================
E. FORECAST HORIZON & CONFIDENCE
================================
1. Horizon Standar: 7 hari (Short-term) dan 30 hari (Mid-term).
2. Confidence Interval: Wajib menyertakan Upper & Lower Band.
3. Frontend DILARANG:
   * Menghitung ulang slope/trend utama.
   * Mengubah lebar confidence band.
   * Mengganti model prediksi backend.

============================================================
F. RECOMMENDATION GOVERNANCE
============================
Rekomendasi tindakan berbasis TTC:
* CRITICAL (TTC < 7 hari): Upgrade kapasitas segera.
* WARNING (TTC < 30 hari): Evaluasi optimasi/QoS.
* STABLE (TTC > Horizon): Sistem dalam kondisi aman.

============================================================
G. PERFORMANCE & CACHING
========================
1. Derivasi TTC/Headroom dilakukan di Frontend via `useMemo`.
2. Trigger memoization: [heavyData, scopedDataset, capacityMetadata].
3. Backend caching wajib aktif berdasarkan horizon dan granularity.

============================================================
H. ARCHITECTURAL RESTRICTIONS
=============================
Frontend DILARANG:
* Menghitung ulang model forecast (Linear Regression/Prophet/dll).
* Mengakses raw log secara langsung.
* Mengabaikan upper bound dalam perhitungan risiko TTC.

Backend WAJIB:
* Menjamin bucket waktu proyeksi selaras dengan granularity input.
* Menghasilkan output deterministik.
* Menyertakan metadata model dan confidence interval.

============================================================
I. FINAL DECLARATION
====================
Capacity Forecast Stage 6 adalah:
* **Berbasis Raw Data (SSOT)**
* Backend-computed (Model)
* Frontend-derived (TTC/Headroom)
* Upper-bound driven
* Context-locked (Stage 1 compliant)
* **Penyumbang Skor Utilization (30% Health Score)**

END OF DOCUMENT
