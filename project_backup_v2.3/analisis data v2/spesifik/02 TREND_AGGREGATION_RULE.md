TREND_AGGREGATION_RULE V2.1
(VERSION V2.1 – AUTOMATIC TIME CONVERSION & ACCURACY)
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
A. STAGE 2 — TREND & AGGREGATION (DIRECTIONAL V2.1)
==================================================

1. Stage 2 menganalisis ScopedDataset (output Stage 1).
2. Bertujuan menentukan arah pergerakan data (Trend).
3. Hasil Stage 2 disebut TrendMetrics.
4. Stage ini DILARANG melakukan filtering ulang (re-filter).

PRINSIP AUTOMATIC TIME CONVERSION & ACCURACY (V2.1):
- **Automatic Conversion**: Gunakan SOP [aturan_konversi_waktu_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_konversi_waktu_V2.1.md) untuk menyelaraskan unit waktu.
- **Accuracy Tracking**: Wajib menyertakan metadata `accuracy_pct` pada hasil agregasi.
- **Thresholds (T)**:
    - Hari ke Bulan: T = 30 Hari.
    - Jam ke Hari: T = 24 Jam.
    - Menit ke Jam: T = 60 Menit.
    - Detik ke Menit: T = 60 Detik.
- **Accuracy Labeling**: Jika count < T, tampilkan pesan: *"Telah dikonversi, hanya [X]% akurat"*.

PRINSIP DEFERRED AGGREGATION:
- AGGREGATION ONLY FOR DISPLAY: Agregasi hanya dilakukan untuk presentasi (grafik/top list).
- KEEP RAW IN MEMORY: ScopedDataset yang granular wajib tetap tersimpan di memori untuk analisis Stage 3-7.
- PREVENT MICRO-AGGREGATION: Dilarang melakukan pembulatan nilai di tengah proses kalkulasi trend.
- METADATA PRESERVATION: TrendMetrics harus menyimpan referensi ke granularity asli data sumber.

============================================================
B. PRINSIP UTAMA
================

1. Agregasi waktu grafik Traffic & Resource.
2. Top Lists (Interfaces / PPPoE / Hotspot).
3. Clients Chart.
4. Interaksi Global Controls:

   * period
   * limit
   * start_date
   * end_date
   * granularity
   * aggMethod
   * bucketSource

| Konversi | Satuan Asal | Satuan Tujuan | Ambang Batas (T) | Rumus Agregasi | Perhitungan Akurasi |
|---|---|---|---|---|---|
| **Hari ke Bulan** | Hari | Bulan | 30 Hari | `AVG(data_hari)` | `(Jumlah Hari / 30) * 100%` |
| **Jam ke Hari** | Jam | Hari | 24 Jam | `AVG(data_jam)` | `(Jumlah Jam / 24) * 100%` |
| **Menit ke Jam** | Menit | Jam | 60 Menit | `AVG(data_menit)` | `(Jumlah Menit / 60) * 100%` |
| **Detik ke Menit** | Detik | Menit | 60 Detik | `AVG(data_detik)` | `(Jumlah Detik / 60) * 100%` |

============================================================
C. STANDAR TRENDMETRICS (OUTPUT)
================================

Output dari Stage 2 harus mencakup:

1. **Slope & Delta**:
   * Selisih nilai (akhir - awal).
   * Persentase perubahan (growth %).
2. **Extreme Points**:
   * Peak (Max value) & Trough (Min value) dalam scope.
   * Timestamp saat peak/trough terjadi.
3. **Volatility**:
   * Standar deviasi atau variance ringan.
   * Stabilitas data (Stable vs Volatile).
4. **Moving Average**:
   * Derivasi rolling average untuk visualisasi halus.

============================================================
D. LARANGAN KERAS
=================

1. **Re-filter**: Dilarang mengubah period, limit, atau entity filter yang sudah dikunci di Stage 1.
2. **Re-normalize**: Dilarang mengubah unit (Mbps -> Bytes) di tahap ini.
3. **Implicit Gap Filling**: Dilarang mengisi gap data secara sepihak; gunakan isGap dari Stage 0.

============================================================
E. ATURAN IMPLEMENTASI
======================

1. Lokasi:
   * useTrendAnalysis hook (atau sejenisnya).
   * Util trend.js V2.
2. Kecepatan:
   * Kalkulasi trend harus O(n) terhadap jumlah row ScopedDataset.
3. Memoization:
   * Hasil trend wajib di-memoize berdasarkan ScopedDataset ID/hash.

============================================================
F. FINAL DECLARATION
====================

Trend Aggregation Rule adalah:
* Berbasis ScopedDataset.
* Forward-only computation.
* Deterministic (input sama → trend sama).
* Read-only terhadap input.

END OF DOCUMENT
