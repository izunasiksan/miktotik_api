ANOMALY_VALIDATION_RULE V2.1
(VERSION V2.1 – PENALTY SCORING & GRANULAR VALIDATION)

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
A. CORE PRINCIPLE (STAGE 5 — ANOMALY VALIDATION V2.1)
====================================================

1. Stage 5 memvalidasi anomali yang dideteksi oleh Backend (Heavy Analysis Engine).
2. Menggunakan ScopedDataset (Stage 1) dan HabitMetrics (Stage 4) sebagai konteks pembanding.
3. Frontend DILARANG menghitung ulang nilai statistik berat (z-score, MAD, percentile).
4. Bertujuan mengubah "Kandidat Outlier" menjadi "Validated Anomaly Event".
5. Hasil Stage 5 disebut AnomalyMetrics (Event List).
6. Harus patuh pada Context Lock (Stage 1); tidak ada filtering ulang di frontend.

PRINSIP PENALTY SCORING (STAGE 5):
- **Penalty Weighting**: Anomali yang tervalidasi berkontribusi **40%** ke Health Score (Stage 7).
- MANDATORY METADATA: Setiap event anomali wajib menyimpan `raw_timestamp`, `source_id`, dan `accuracy_pct`.
- FIDELITY SCORING: Skor keparahan (severity) dihitung berdasarkan deviasi terhadap data granular, bukan data yang sudah diagregasi.

Single Source of Truth (SSOT):
* `board_speed_stats`
* `board_resource_stats`
* `board_client_stats`
* `board_usage_stats`
* `board_pppoe_usage`
* `hotspot_usage_raw`

============================================================
B. PIPELINE POSITION & INPUT/OUTPUT (V2.1)
===================================
1. Input: 
   * ScopedDataset (Stage 1)
   * HabitMetrics (Stage 4) - Untuk deteksi penyimpangan profil.
   * HeavyAnalysisResult (dari API /heavy-analysis/) - Berisi kandidat anomali.
2. Output: AnomalyMetrics (Daftar event yang sudah dikonfirmasi & digabung).
3. Dependency: Stage 0 → Stage 1 → [Stage 2, 3, 4] → Stage 5.

============================================================
C. DATA & TIME ALIGNMENT RULE
=============================
1. Granularity harus konsisten antara ScopedDataset dan hasil Backend.
2. Default: bucketSource = server.
3. Jika traffic dalam Mbps: wajib gunakan data hasil Normalisasi (Stage 0).
4. Missing Data (isGap=true dari Stage 0):
   * Drop dari validasi durasi.
   * Dilarang padding nol otomatis (bisa memicu false anomaly).

============================================================
D. VALIDATION & SEVERITY CRITERIA
=================================
1. Window Validation:
   * Event valid jika berlangsung ≥ 2–3 bucket berturut (tergantung granularity).
   * Outlier tunggal tanpa durasi diklasifikasikan sebagai "Noise/Spike", bukan "Anomaly".

2. Cross-Metric Confirmation:
   * Traffic Spike + CPU Spike = HIGH Severity.
   * Traffic Drop + Client Drop = HIGH Severity.
   * Hanya satu metrik menyimpang = LOW/MEDIUM Severity.

3. Severity Level:
   * LOW: Penyimpangan minor, durasi singkat, metrik tunggal.
   * MEDIUM: Penyimpangan moderat, durasi cukup, atau didukung metrik sekunder.
   * HIGH: Penyimpangan ekstrem, durasi lama, didukung multi-metrik.

============================================================
E. MAINTENANCE & MUTE POLICY
============================
1. Maintenance Window:
   * Harus dideklarasikan eksplisit di metadata/filter.
   * Anomali dalam window ditandai sebagai "MUTED".
   * Data tidak dihapus, hanya status notifikasi yang ditekan.

============================================================
F. EVENT MERGING & AGGREGATION
==============================
1. Kandidat anomali yang berdekatan (jarak ≤ 1 bucket) wajib digabung menjadi satu Event.
2. Atribut Event yang harus disimpan:
   * start_time & end_time.
   * peak_value & peak_score.
   * metric_list (metrik apa saja yang terlibat).
   * severity & status (active/muted).

============================================================
G. PERFORMANCE & CACHING
========================
1. Validasi dilakukan sekali per perubahan filter/dataset.
2. Gunakan Memoization berdasarkan `scopedDataset` dan `heavyData`.
3. Backend wajib mengembalikan output deterministik (input sama = kandidat sama).

============================================================
H. ARCHITECTURAL RESTRICTIONS
=============================
Frontend DILARANG:
* Menghitung ulang ambang statistik (z-score/MAD).
* Mengakses raw log secara langsung.
* Mengubah severity tanpa dasar cross-metric yang terdokumentasi.

Backend WAJIB:
* Menjamin bucket waktu konsisten dan berurutan.
* Menghasilkan kandidat anomali yang sudah terfilter secara temporal.
* Mengembalikan metadata statistik lengkap (mean, stddev, threshold).

============================================================
I. FINAL DECLARATION
====================
Anomaly Validation Stage 5 adalah:
* **Berbasis Raw Data (SSOT)**
* Backend-driven
* Context-locked (Stage 1 compliant)
* Cross-metric validated
* Deterministic & Reproducible
* **Penyumbang Skor Penalti (40% Health Score)**

END OF DOCUMENT
