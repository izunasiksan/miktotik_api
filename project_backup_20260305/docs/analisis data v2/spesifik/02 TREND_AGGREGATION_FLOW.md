TREND_AGGREGATION_FLOW V2.1
(VERSION V2.1 – TIME CONVERSION ACCURACY & DEFERRED AGGREGATION)

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
A. CORE PRINCIPLE (STAGE 2 - V2.1)
==================================

1. Trend & Aggregation (Stage 2) memproses ScopedDataset dari Stage 1.
2. Bertujuan memberikan konteks arah pergerakan data dengan Deferred Aggregation.
3. **Automatic Time Conversion**: Jika skala waktu data asal (Raw) berbeda dengan yang diminta, lakukan konversi otomatis dengan rata-rata (AVG).
4. **Accuracy Tracking**: Wajib menyertakan label akurasi jika data di bawah ambang batas (Threshold).
5. Menghasilkan TrendMetrics sebagai input bagi Stage 3 s/d 7.
6. Bersifat Forward-only (tidak boleh mundur ke Stage 0/1).

PRINSIP AUTOMATIC TIME CONVERSION & ACCURACY (STAGE 2):
- **Automatic Conversion**: Implementasi SOP [aturan_konversi_waktu_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_konversi_waktu_V2.1.md).
- **Accuracy Labeling**: Jika count < Threshold (T), sertakan pesan akurasi otomatis.
- **Traceability**: Wajib menyertakan metadata `raw_timestamp`, `source_id`, dan `accuracy_pct`.
- DILARANG melakukan downsampling pada ScopedDataset utama tanpa alasan konversi waktu.
- WAJIB menyertakan `source_granularity` dan `conversion_accuracy` dalam output TrendMetrics.

============================================================
B. PIPELINE POSITION (V2.1)
===========================

... -> Scope & Filter (Stage 1) -> [ Trend & Aggregation (Stage 2) ] -> Korelasi (Stage 3) -> ...

Dilarang:
* Melakukan fetching data baru di tahap ini (Fetch harus di Stage 1).
* Melakukan filtering ulang di tahap ini.
* Mengabaikan label akurasi pada data hasil konversi.

============================================================
C. ALUR KERJA (STAGE 2 - V2.1)
==============================

## Langkah 2.1: Penerimaan ScopedDataset & Time Check
* Memastikan dataset dari Stage 1 sudah terkunci (Context Lock).
* Memeriksa kesesuaian unit waktu (Raw vs Requested).
* Menentukan apakah konversi otomatis diperlukan.

## Langkah 2.2: Konversi & Perhitungan Akurasi (Jika Perlu)
* Terapkan fungsi `convertTimeScale` / `convert_time_scale`.
* Hitung persentase akurasi berdasarkan (count / Threshold) * 100%.

## Langkah 2.3: Kalkulasi Slope & Delta
* Menghitung selisih nilai antara bucket awal dan akhir.
* Menghitung persentase pertumbuhan (Growth %).

## Langkah 2.4: Identifikasi Titik Ekstrim (Peak Fidelity)
* Mencari nilai tertinggi (Peak) dan terendah (Trough) dari data resolusi tertinggi (Raw).
* Mencatat timestamp kejadian ekstrim tersebut.

## Langkah 2.5: Kalkulasi Volatilitas (Stability Base)
* Menilai stabilitas data berdasarkan variansi antar bucket untuk Stage 4.

============================================================
D. OUTPUT (TRENDMETRICS - V2.1)
===============================

Hasil Stage 2 adalah objek TrendMetrics yang berisi:
* trend_direction: (up | down | stable)
* growth_percent: Number
* delta_value: Number
* peak_value: Number
* peak_time: Timestamp
* trough_value: Number
* trough_time: Timestamp
* volatility_score: (low | medium | high)
* **conversion_accuracy**: Number (0-100)
* **accuracy_label**: String (e.g., "100% accurate" or "23% accurate")

============================================================
E. TRANSISI KE STAGE 3 (PRE-CONDITION)
======================================

Analisis Trend (Stage 2) selesai jika:
1. Seluruh metrik dalam ScopedDataset telah dihitung trennya.
2. Hasil perhitungan bersifat immutable.
3. TrendMetrics siap digunakan oleh Stage 3 (Korelasi).

============================================================
F. FINAL DECLARATION
====================

Trend Aggregation Flow Stage 2 adalah:
* Deterministic
* Forward-only
* **Time-aware (Automatic Conversion)**
* **Accuracy-labeled**
* Read-only terhadap ScopedDataset
* Penanggung jawab tunggal untuk metrik arah (Directional Metrics)

END OF DOCUMENT
