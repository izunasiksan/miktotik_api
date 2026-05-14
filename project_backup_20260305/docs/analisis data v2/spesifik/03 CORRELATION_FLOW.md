CORRELATION_FLOW V2.1
(VERSION V2.1 – HIGH-RES ALIGNMENT & DEEP TRACEABILITY)

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
A. PIPELINE EKSEKUSI STAGE 3 (V2.1)
==================================

Korelasi mengikuti alur forward-only dari ScopedDataset (Stage 1) dengan High Fidelity (Raw Data Alignment).

## Langkah 3.1: Trigger & Parameter Lock
* User melakukan perubahan filter atau memilih board di UI.
* Stage 1 menghasilkan ScopedDataset dan mengunci parameter (Context Lock).
* Parameter yang dikunci: `board_id`, `start_date`, `end_date`, `granularity`.
* **PRINSIP RAW ALIGNMENT**: Wajib menyelaraskan titik data (Time Sync) menggunakan resolusi tertinggi (Raw Data) sebelum korelasi dihitung.

## Langkah 3.2: API Fetch (Heavy Analysis Engine)
* `useAnalysisV2Controller.js` memanggil endpoint `/api/v2/analytics/heavy-analysis`.
* Parameter dikirimkan sesuai dengan Scope yang sudah dikunci.
* Sertakan metadata `conversion_accuracy` dari Stage 2 jika ada.

## Langkah 3.3: Backend Processing (Pearson r - Raw Fidelity)
* Backend mengambil data **Raw (SSOT)** sesuai scope.
* Backend menyelaraskan bucket waktu antar metrik (Inner Join) pada resolusi tertinggi.
* Backend melakukan drop missing data secara simetris.
* Backend menghitung Pearson r dan jumlah sampel n.
* Hasil dikembalikan dalam struktur `CorrelationMetrics`.

##39→## Langkah 3.4: Mapping & Deep Traceability
40→* Frontend menerima response.
41→* Controller melakukan mapping dan menyimpan metadata korelasi.
42→* **Mandatory Metadata**: Simpan `raw_timestamp`, `source_id`, dan `accuracy_pct` untuk setiap pasangan data.

## Langkah 3.5: UI Presentation & Accuracy Labeling
* Tampilkan nilai **r** (Pearson Coefficient) dan **n** (Sample Size).
* Tampilkan interpretasi kualitatif (Kuat/Sedang/Lemah).
* **Accuracy Indicator**: Jika korelasi menggunakan data hasil konversi (Stage 2), tampilkan label akurasi waktu.

============================================================
B. DIAGRAM ALUR (LOGIC - V2.1)
==============================

[Raw ScopedDataset (Stage 1)]
          |
          v
[API Call /heavy-analysis (V2.1)]
          |
          v
[Backend: Raw Time Sync & Pearson]
          |
          v
[CorrelationMetrics + Traceability Metadata]
          |
          v
[UI Render + Accuracy Labeling]

============================================================
C. PENANGANAN ERROR & EDGE CASES (V2.1)
================================

1. **n < 5**:
   * UI menampilkan: "Data tidak mencukupi untuk korelasi (n < 5)".
   * Pearson r dianggap null.

2. **Variansi Nol**:
   * Jika salah satu deret data flat (statis), Pearson r = null.
   * UI menampilkan: "Korelasi tidak valid (Data statis)".

3. **Timeout**:
   * Karena heavy analysis bisa memakan waktu, gunakan retry logic terbatas di `tanstack-query`.

============================================================
D. FINAL DECLARATION
====================

Correlation Flow Stage 3 adalah:
* Forward-only.
* **Backend-driven (Raw Data SSOT)**.
* **Deep Traceability Enabled**.
* Immutable context.
* Deterministic result.

END OF DOCUMENT
