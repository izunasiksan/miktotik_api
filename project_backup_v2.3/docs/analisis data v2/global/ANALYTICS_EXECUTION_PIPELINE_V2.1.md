ANALYTICS_EXECUTION_PIPELINE V2.1
(VERSION V2.1 – GLOBAL DATA INTEGRITY)

============================================================
PURPOSE
=======

Dokumen ini menetapkan urutan eksekusi analitik V2.1 yang tegas,
tanpa ambigu, tanpa circular dependency, dan tanpa overlap peran.
Mengintegrasikan Raw Data Primary, Time Conversion, dan Missing Data SOP.

Setiap tahap:

*   Memiliki input yang jelas.
*   Menghasilkan output yang jelas.
*   Tidak menghitung ulang tahap lain.
*   Tidak mengubah hasil tahap sebelumnya.
*   WAJIB mematuhi aturan integritas data V2.1.

Pipeline ini bersifat WAJIB dan FINAL.

============================================================
GLOBAL RULE
===========

1.  Data mengalir satu arah (forward-only).
2.  Tidak ada layer yang boleh:
    *   Mengakses raw data setelah normalisasi (Stage 0).
    *   Melakukan re-filter setelah Stage 1.
    *   Mengubah hasil layer sebelumnya.
3.  Semua layer bersifat read-only terhadap inputnya.
4.  Output tiap layer menjadi input layer berikutnya.
5.  **Traceability**: Metadata `raw_timestamp` dan `source_id` harus diteruskan hingga Stage 7.

============================================================
STAGE 0 — NORMALISASI (DATA INTEGRITY)
=====================================

INPUT:
*   Raw Data dari tabel SSOT (board_speed_stats, board_usage_stats, dst.)

PROSES:
*   Standarisasi field (rx, tx, total, dst.)
*   **Time Conversion**: Selaraskan unit menggunakan [aturan_konversi_waktu_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_konversi_waktu_V2.1.md).
*   Selaraskan timestamp (ISO-8601 UTC).
*   Parse numeric secara eksplisit.
*   **Missing Data Handling**: Deteksi & Imputasi sesuai [aturan_penanganan_missing_data_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_penanganan_missing_data_V2.1.md).
*   Tandai gap dengan isGap (jika time-lock aktif).

DILARANG:
*   Menghitung trend/korelasi/anomali.
*   Mengubah statistik backend.

OUTPUT:
NormalizedDataset (Clean & Imputed)

============================================================
STAGE 1 — SCOPE & FILTER (CONTEXT LOCK)
=======================================

INPUT:
NormalizedDataset

PROSES:
*   Terapkan period / start_date / end_date.
*   Terapkan granularity (Prioritaskan Raw Resolution).
*   Terapkan entity filter & bucketSource.
*   Terapkan time-lock.

ATURAN:
*   Filtering hanya boleh dilakukan di tahap ini.
*   Tidak ada re-filter di tahap berikutnya.

OUTPUT:
ScopedDataset (Dataset Final untuk Analisis)

============================================================
STAGE 2 — TREND (DIRECTIONAL ANALYSIS)
======================================

INPUT:
ScopedDataset

PROSES:
Slope, delta, growth %, peak & trough, rolling average, volatility.

OUTPUT:
TrendAnalysisData

============================================================
STAGE 3-6 — ADVANCED ANALYTICS
================================
*   **Stage 3 (Correlation)**: Hubungan antar variabel.
*   **Stage 4 (Habit)**: Pola perilaku harian/mingguan.
*   **Stage 5 (Anomaly)**: Deteksi penyimpangan statistik.
*   **Stage 6 (Health Score)**: Skor final (Stability 30%, Utilization 30%, Anomaly 40%).

============================================================
STAGE 7 — INSIGHT & VISUALISASI
================================

INPUT:
Summary & Analytics Data

OUTPUT:
Actionable Insight & Interactive Dashboard
