HABIT_PATTERN_FLOW V2.1
(VERSION FINAL – STAGE 4 RAW ALIGNED)

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
A. CORE PRINCIPLE (STAGE 4 — HABITS & PATTERNS)
===============================================

1. Stage 4 menganalisis pola berulang (HOD, DOW, Monthly) dari ScopedDataset (Stage 1).
2. Bertujuan membentuk "Baseline Profile" untuk pembandingan real-time.
3. WAJIB menggunakan data dengan resolusi tertinggi (Raw/Interpolated).
4. Analisis bersifat deterministik, read-only, dan reproducible.
5. Hasil Stage 4 disebut HabitMetrics, yang berkontribusi pada Stability Score (Health Score).
6. Stage ini DILARANG melakukan filtering ulang (re-filter); harus patuh pada Context Lock (Stage 1).

PRINSIP RAW ALIGNMENT:
26→- PIPELINE FIDELITY: Menggunakan data granularitas tertinggi dari ScopedDataset (Raw Data Primary).
27→- MANDATORY METADATA: Setiap titik baseline wajib menyimpan `raw_timestamp`, `source_id`, dan `accuracy_pct`.
28→- TIME CONVERSION: Wajib mematuhi SOP [aturan_konversi_waktu_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_konversi_waktu_V2.1.md).

Single Source of Truth (via ScopedDataset):
* board_speed_stats
* board_resource_stats
* board_client_stats
* board_usage_stats
* board_pppoe_usage
* hotspot_usage_raw

============================================================
B. PIPELINE FLOW (STAGE 4)
==========================

STEP 1: Trigger & Dependency Check
* Controller memverifikasi `scopedDataset` (Stage 1) sudah tersedia.
* Memastikan `granularity` sesuai (hour untuk HOD, day untuk DOW).

STEP 2: Data Preparation
* Mengambil array data dari `scopedDataset.data`.
* Melakukan validasi timestamp dan pengecekan isGap (Stage 0).

STEP 3: Aggregation (HOD/DOW Profile)
* Untuk HOD:
  - Kelompokkan data berdasarkan jam (00-23).
  - Hitung rata-rata (mean/median) tiap jam dari seluruh hari.
* Untuk DOW:
  - Kelompokkan data berdasarkan hari (Sen-Min).
  - Hitung rata-rata tiap hari dari seluruh minggu.

STEP 4: Metaparameter Calculation
* Hitung Coefficient of Variation (CV) untuk setiap bucket.
* Tentukan Peak Hour (jam puncak) dan Peak Value.
* Hitung Peak-to-Baseline ratio.

STEP 5: UI Mapping & Presentation
* Render grafik profil (Line/Area Chart).
* Tampilkan pita variasi (min/max atau deviasi standar).
* Tampilkan badge peringatan jika sampel < 7 hari (HOD) atau < 14 hari (DOW).

============================================================
C. BACKEND HEAVY ANALYSIS (OPTIONAL STAGE 4)
============================================

Jika pola melibatkan korelasi multi-metrik yang berat:
1. Frontend mengirim request ke endpoint `/heavy-analysis/` dengan type `habits`.
2. Backend menghitung pola menggunakan seluruh history summary table.
3. Backend mengembalikan `HabitMetrics` terkompresi.
4. Frontend melakukan mapping ke UI.

============================================================
D. PERFORMANCE & CACHING
========================

1. Hasil kalkulasi Stage 4 wajib di-memoize di Controller:
   ```javascript
   const habitMetrics = useMemo(() => {
     return calculateHabitsV2(scopedDataset);
   }, [scopedDataset]);
   ```
2. Dependency utama hanya `scopedDataset`. Jika filter (Stage 1) berubah, habit otomatis dihitung ulang.

============================================================
E. ARCHITECTURAL RESTRICTIONS
=============================

Frontend DILARANG:
* Menghitung profil dari raw log.
* Mencampur granularitas dalam satu kalkulasi.
* Melakukan re-filter (Context Lock Violation).

Backend WAJIB:
* Menggunakan summary table.
* Menjamin bucket waktu konsisten.

END OF DOCUMENT
