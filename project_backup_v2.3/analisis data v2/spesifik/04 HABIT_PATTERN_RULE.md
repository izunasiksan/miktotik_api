HABIT_PATTERN_RULE V2.1
(VERSION V2.1 – STABILITY SCORING & GRANULAR BASELINE)
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
A. CORE PRINCIPLE (STAGE 4 — HABITS & PATTERNS V2.1)
===================================================

1. Stage 4 menganalisis pola berulang (HOD, DOW, Monthly) dari ScopedDataset (Stage 1).
2. Bertujuan membentuk "Baseline Profile" untuk pembandingan real-time.
3. Menggunakan RAW DATA (SSOT) via ScopedDataset; Agregasi prematur dilarang keras.
4. Analisis bersifat deterministik, read-only, dan reproducible.
5. Hasil Stage 4 disebut HabitMetrics.
6. Stage ini DILARANG melakukan filtering ulang (re-filter); harus patuh pada Context Lock (Stage 1).

PRINSIP GRANULAR BASELINE (STAGE 4):
- MAX RESOLUTION: Baseline wajib dihitung menggunakan granularitas tertinggi dari ScopedDataset untuk menangkap mikro-pola.
- **Stability Scoring**: Hitung CV (Coefficient of Variation) sebagai indikator stabilitas. Skor ini berkontribusi **30%** ke Health Score (Stage 7).
- MANDATORY METADATA: Setiap bucket wajib menyimpan `raw_timestamp`, `source_id`, dan `accuracy_pct`.

Single Source of Truth (SSOT) via ScopedDataset:
* `board_speed_stats`
* `board_resource_stats`
* `board_client_stats`
* `board_usage_stats`
* `board_pppoe_usage`
* `hotspot_usage_raw`

============================================================
B. PIPELINE POSITION & INPUT/OUTPUT (V2.1)
==========================================

1. Input: ScopedDataset (dari Stage 1).
2. Input Tambahan: TrendMetrics (Stage 2) untuk konteks pertumbuhan.
3. Output: HabitMetrics (Objek JSON berisi profil baseline & metaparameter).
4. Dependency:
   Stage 0 → Stage 1 → [Stage 2 & Stage 4 secara paralel atau sekuensial]

============================================================
C. RUANG LINGKUP ANALISIS
========================

1. Profil Baseline:
   * HOD (Hour-of-Day): Rata-rata 24 jam.
   * DOW (Day-of-Week): Rata-rata 7 hari (Senin–Minggu).
   * Monthly: Tren musiman bulanan.

2. Metaparameter (Indeks Pola):
   * Konsistensi (Coefficient of Variation - CV).
   * Kekuatan Pola (Peak-to-Baseline Ratio).
   * Stabilitas (Peak Shift Analysis).

============================================================
D. DATA & GRANULARITY RULE
==========================

1. Granularity wajib sesuai tipe profil:
   HOD     → hour
   DOW     → day
   Monthly → month

2. Tidak boleh mencampur granularitas dalam satu profil.
3. Jika traffic unit = Mbps, wajib gunakan data hasil Normalisasi (Stage 0).

============================================================
E. SAMPLE & VALIDATION POLICY
=============================

Minimum sampel untuk profil stabil:
* HOD: ≥ 7 hari data aktif.
* DOW: ≥ 14 hari (2 siklus mingguan).
* Monthly: ≥ 6 bulan.

Jika sampel < threshold:
* Profil tetap dihitung.
* UI WAJIB menampilkan badge/peringatan: "Data belum cukup stabil (Low Sample)".

============================================================
F. MISSING DATA & OUTLIER RULE (V2.1)
=====================================

1. Missing Data (isGap=true dari Stage 0):
   - Drop titik tersebut dari perhitungan rata-rata.
   - **Accuracy Check**: Jika jumlah data valid < Ambang Batas (Stage 2), gunakan pesan akurasi otomatis.

2. Outlier:
   * Gunakan hasil deteksi anomali (Stage 5) jika sudah tersedia.
   * Baseline murni dihitung dari rata-rata (mean) atau median (lebih tahan outlier).

============================================================
G. PERFORMANCE & HEAVY ANALYSIS
===============================

1. Perhitungan HOD/DOW sederhana dilakukan di Frontend (Controller).
2. Perhitungan kompleks (Multi-metric Correlation Habit) WAJIB di Backend via `heavy-analysis`.
3. Gunakan Memoization berdasarkan `scopedDataset` (Stage 1) untuk mencegah re-komputasi saat UI berinteraksi.

============================================================
H. ARCHITECTURAL RESTRICTIONS
=============================

Frontend DILARANG:
* Menggunakan raw log secara langsung.
* Melakukan re-filter data (melanggar Context Lock Stage 1).
* Mengubah unit secara diam-diam tanpa deklarasi eksplisit.

Backend WAJIB:
* Menjamin bucket waktu konsisten dan berurutan.
* Menghasilkan output deterministik (input yang sama = baseline yang sama).

============================================================
I. FINAL DECLARATION

Habit / Pattern Stage 4 adalah:
* **Berbasis Raw Data (SSOT)**
* Deterministic
* Time-aligned
* Baseline-oriented
* Context-locked (Stage 1 compliant)
* **Penyumbang Skor Stabilitas (30% Health Score)**

END OF DOCUMENT
