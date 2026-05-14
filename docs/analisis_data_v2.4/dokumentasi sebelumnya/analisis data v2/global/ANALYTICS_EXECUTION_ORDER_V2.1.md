ANALYTICS_EXECUTION_ORDER V2.1
(VERSION V2.1 – SYSTEM PIPELINE CONSTITUTION)
Last Modified: 2026-03-05
Status: Finalized & Implemented

============================================================
OVERVIEW
========

Dokumen ini menetapkan urutan resmi eksekusi analitik V2.1.
Urutan ini bersifat wajib, deterministik, dan tidak boleh dibalik.
Mengintegrasikan prinsip Raw Data Primary dan SOP Data Integrity terbaru.

Setiap layer:

*   Tidak boleh mengubah hasil layer sebelumnya.
*   Tidak boleh melewati dependency.
*   Tidak boleh menghitung ulang metrik milik layer lain.
*   WAJIB mematuhi aturan penanganan missing data dan konversi waktu.

============================================================
0. NORMALISASI (FOUNDATION LAYER - STAGE 0)
===========================================

Tujuan:
Menstandarkan seluruh data mentah (Raw Data) sebelum analisis.

Wajib:

*   Field konsisten (rx, tx, total, dst.)
*   Unit selaras menggunakan [aturan_konversi_waktu_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_konversi_waktu_V2.1.md).
*   Timestamp ISO-8601 aligned.
*   **Missing Data Handling**: Deteksi & Imputasi sesuai [aturan_penanganan_missing_data_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_penanganan_missing_data_V2.1.md).
*   isGap ditandai jika ada bucket kosong.
*   Tanpa NaN / Infinity.
*   Immutable (tidak memodifikasi input).

Dilarang:

*   Menghitung trend/korelasi/anomali.
*   Melakukan downsampling prematur.

Output:
NormalizedDataset (Clean, Unit-Aligned, Imputed).

============================================================
1. SCOPE & FILTER (CONTEXT LOCK LAYER - STAGE 1)
================================================

Tujuan:
Mengunci ruang lingkup analisis dan parameter waktu.

Meliputi:

*   period / start_date / end_date.
*   granularity (Raw Data Primary Focus).
*   entity filter & bucketSource.
*   time-lock.

Aturan:

*   Dataset setelah filter menjadi sumber tunggal.
*   Layer berikutnya tidak boleh melakukan re-filter.

Output:
ScopedDataset (Dataset Final untuk Analisis).

============================================================
2. TREND (DIRECTIONAL LAYER - STAGE 2)
======================================

Tujuan:
Menentukan arah pergerakan data dari ScopedDataset.

Metrik:
Slope, delta, growth %, peak/trough, volatility, rolling average.

Output:
Arah dan dinamika perubahan.

============================================================
3. KORELASI (RELATIONSHIP LAYER - STAGE 3)
=========================================

Tujuan:
Menentukan hubungan antar variabel (misal: Traffic vs Resource).

============================================================
4. HABIT (PATTERN LAYER - STAGE 4)
==================================

Tujuan:
Identifikasi pola perilaku berulang (Daily/Weekly Pattern).

============================================================
5. VALIDASI ANOMALI (DETECTION LAYER - STAGE 5)
===============================================

Tujuan:
Deteksi penyimpangan data dari pola normal.

============================================================
6. SUMMARY (CONSOLIDATION LAYER - STAGE 6)
==========================================

Tujuan:
Ringkasan akhir seluruh temuan analisis.

============================================================
7. INSIGHT (IMPLEMENTATION LAYER - STAGE 7)
===========================================

Tujuan:
Saran atau tindakan yang harus dilakukan berdasarkan summary.
