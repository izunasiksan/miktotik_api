INSIGHT_IMPLEMENTATION_RULE V2.1
(VERSION V2.1 – HEALTH SCORE SSOT & TRACEABILITY)

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
A. OBJECTIVE & GRANULARITY (V2.1)
=================================

Aturan ini menetapkan standar resmi implementasi halaman Insight dengan fokus pada High Fidelity, Traceability, dan Health Score yang akurat.

Insight harus:

* Summary-based
* Backend-aligned
* Deterministic
* Reproducible
* High-Granularity Traceable
* Audit-safe

PRINSIP GRANULAR EVIDENCE:
- DRILL-DOWN: Setiap metrik (Peak, Percentile, Anomaly) harus dapat ditelusuri kembali ke titik data granular aslinya.
- METADATA TRANSPARENCY: Tampilkan `source_granularity` dan `raw_timestamp` dalam visualisasi detail.

============================================================
B. ARCHITECTURE PRINCIPLE (STAGE 7)
===================================

1. Heavy analysis (Stage 2-6) dihitung di Backend:
   * Percentiles & Trend (Stage 2)
   * Correlation (Stage 3)
   * Habit Baseline candidates (Stage 4)
   * Anomaly Detection (Stage 5)
   * Capacity Forecast model (Stage 6)

2. Frontend bertugas (Stage 7):
   * Menggabungkan hasil (Merging)
   * Menghitung derivasi ringan (Delta, Scoring)
   * Validasi anomali berbasis ScopedDataset
   * Presentasi Insight Cards

3.50→3. **Raw Data Primary**: Stage 7 WAJIB memungkinkan drill-down hingga ke Raw Logs (Single Source of Truth).
51→4. **Health Score SSOT (V2.1)**: Skor kesehatan (0-100) dihitung dengan bobot:
52→   - **Stability Score (30%)**: Dari Stage 4 (Habit & Patterns).
53→   - **Utilization Score (30%)**: Dari Stage 6 (Capacity Forecast).
54→   - **Anomaly Penalty (40%)**: Dari Stage 5 (Anomaly Validation).
55→5. **Mandatory Metadata**: Semua insight wajib menyertakan `raw_timestamp`, `source_id`, dan `accuracy_pct`.

Single Source of Truth:
* board_speed_stats
* board_usage_stats
* board_resource_stats
* board_client_stats
* board_pppoe_usage
* board_hotspot_usage

============================================================
C. SCOPE
========

Kartu Insight meliputi:

1. Today vs Baseline
2. Percentiles & Peak
3. Health Score
4. Anomali Aktif
5. Korelasi Penting
6. Forecast Glimpse
7. Data Quality
8. Top Growth / Decline

Semua kartu wajib:

* Loading Overlay
* Toast error handling

============================================================
D. BUCKET & UNIT RULE
=====================

1. Jika unit = Mbps:
   bucketSource = server direkomendasikan
   untuk konsistensi lintas metrik.

2. Jika unit non-Mbps:

   * Gunakan jalur frontend
   * Konversi byte-unit eksplisit

3. Dilarang mencampur unit berbeda
   dalam satu perhitungan.

4. Sebelum menghitung:

   * Percentile
   * Peak
   * Delta

   Bucket wajib disinkronkan.
   Titik tidak berpasangan → drop.

============================================================
E. METRIC DEFINITIONS
=====================

1. Percentiles

   * p95
   * p99
     Dihitung pada deret terselaraskan.

2. Peak

   * Nilai maksimum
   * Sertakan timestamp puncak

3. Baseline

   * Rata-rata atau median
   * Window pembanding eksplisit
   * Jika noise tinggi → gunakan median/MAD

4. Delta

   DoD:
   (today - yesterday) / yesterday

   WoW:
   (now - last_week_same_bucket) / last_week

   Jika pembagi = 0:
   Label “undefined”

5. Trend Classification

   UP    → delta ≥ +threshold
   DOWN  → delta ≤ -threshold
   FLAT  → di antara ambang

   Threshold default:
   ±5–10% (disesuaikan per metrik)

6. Health Score (0–100) - **Single Source of Truth (SSOT)**

   Health Score adalah metrik agregat akhir yang mencerminkan kesehatan keseluruhan perangkat.
   
   Komponen Skor:
   - **Utilization (Stage 6)**: Semakin dekat kapasitas (bottleneck), skor turun. (Bobot: 30%)
   - **Stability (Stage 4)**: CV (Coefficient of Variation) tinggi atau fluktuasi ekstrem = skor turun. (Bobot: 30%)
   - **Active Anomaly (Stage 5)**: Penalti berat per anomali aktif (Critical/Warning). (Bobot: 40%)

   Aturan Scoring:
   - Proporsional, Transparan, dan Traceable ke Raw Data.
   - Penalti anomali bersifat akumulatif.
   - Jika data tidak mencukupi (Accuracy < 100% di Stage 2), tampilkan indikator "Low Confidence Score".

7. Top Growth / Decline

   Ranking berdasarkan:
   (now - prev) / prev

   Jika prev = 0:
   Terapkan safe rule:

   * Skip
   * atau tandai “new activity”

8. Data Quality

   Berdasarkan:

   * Kelengkapan bucket
   * Missing field
   * Invalid record

   Tampilkan:

   * Jumlah hilang
   * Skor kualitas

============================================================
F. CALCULATION RULE
===================

1. Minimum sample size:

   daily  ≥ 12
   hourly ≥ 24

   Jika n < threshold:
   Tampilkan peringatan stabilitas rendah.

2. Guard wajib:

   * Tidak boleh division by zero
   * Nilai ekstrem harus clamp
   * Undefined harus dilabeli jelas

3. Forecast Glimpse:

   * Gunakan hasil backend
   * Tidak boleh ekstrapolasi tambahan
   * Headroom singkat berbasis upper bound

============================================================
G. UX STANDARD
==============

1. Label unit wajib jelas.
2. Sumber bucket (Server/Frontend) tampil bila relevan.
3. Tooltip definisi metrik wajib ada.
4. Deep-link ke Trend/Audit tersedia.
5. Maksimal Top list:
   5–10 entitas.

Dilarang:

* Menyembunyikan definisi metrik
* Menampilkan angka tanpa konteks unit

============================================================
H. PERFORMANCE RULE
===================

1. Gunakan memoization seperlunya.
2. Jangan re-hitung derivasi berat tanpa perubahan dependensi.
3. Terapkan dynamicStaleTime.
4. Hindari re-render masif akibat state global tidak perlu.

============================================================
I. SECURITY & LOGGING
=====================

1. Validasi input filter:

   * tanggal
   * granularity
   * aggMethod

2. Backend memverifikasi ulang seluruh filter dan hak akses.

3. Log hanya berisi:
   - rentang waktu
   - granularity
   - jumlah kartu aktif
   - accuracy_info (Stage 2)

4. Dilarang log:

   * PII
   * Secret
   * Raw metric sensitif

============================================================
J. PRE-FLIGHT CHECK
===================

1. Identifikasi Domain

   * Frontend (Insight UI)
   * Backend (heavy analysis/summary)

2. Dampak & Risiko

   * Bucket mismatch
   * Unit mismatch
   * Baseline tidak stabil

3. Hasil Audit

   * Definisi metrik konsisten
   * Threshold tren terdokumentasi
   * Guard pembagian nol ada
   * Data quality tercermin
   * Forecast tidak diekstrapolasi

4. Rekomendasi Eksekusi

   * Uji beberapa periode
   * Uji beberapa granularity
   * Uji dengan missing data
   * Uji dengan anomaly aktif

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

Insight Implementation adalah:

* Summary-based
* Backend-aligned
* Cross-metric consistent
* Deterministic
* Guard-protected
* Cache-aware
* Audit-safe

Jika frontend menghitung ulang heavy analysis
atau mencampur unit tanpa konversi eksplisit,
maka sistem dianggap menyimpang
dari arsitektur resmi.

END OF DOCUMENT
