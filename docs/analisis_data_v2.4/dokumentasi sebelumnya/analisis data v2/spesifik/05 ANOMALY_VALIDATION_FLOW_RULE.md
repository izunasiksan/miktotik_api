ANOMALY_VALIDATION_FLOW_RULE V2.1
(VERSION FINAL – STAGE 5 RAW ALIGNED)
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
A. CORE PRINCIPLE (STAGE 5 — FLOW)
==================================
1. Stage 5 adalah tahap validasi akhir kandidat anomali dari Backend dengan High Fidelity.
2. Menggabungkan titik-titik anomali menjadi satu Event terpadu berbasis Raw Data.
3. Menghitung severity berdasarkan konteks lintas metrik (Cross-Metric) pada level granular.
4. Hasil akhir berupa AnomalyMetrics yang berkontribusi pada Penalty Score (Health Score).

22→PRINSIP RAW ALIGNMENT (V2.1):
23→- FIDELITY VALIDATION: Memeriksa setiap titik data granular (Raw Data Primary).
24→- MANDATORY METADATA: Setiap event wajib menyertakan `raw_timestamp`, `source_id`, dan `accuracy_pct`.
25→- Integrasi SOP: Patuhi [aturan_penanganan_missing_data_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_penanganan_missing_data_V2.1.md) di Step 2.

============================================================
B. PIPELINE EKSEKUSI STAGE 5
============================

STEP 1 – Fetch Heavy Analysis (Raw Fidelity)
-------------------------------------------
Frontend mengirim parameter (Stage 1) ke Backend via `getHeavyAnalysisV2`.
Backend melakukan deteksi (Z-Score/MAD/Percentile) pada data **Raw (SSOT)** dan mengembalikan `heavyData.anomalies`.

STEP 2 – Candidate Validation
-----------------------------
Frontend memvalidasi kandidat terhadap:
* ScopedDataset (Stage 1): Memastikan timestamp selaras dengan Raw Data.
* HabitMetrics (Stage 4): Membandingkan terhadap baseline profil resolusi tinggi.
* isGap Check (Stage 0): Memastikan anomali bukan hasil dari data kosong.

STEP 3 – Window & Duration Check
--------------------------------
* Verifikasi apakah kandidat berlangsung berturut-turut.
* Terapkan ambang durasi (misal: ≥ 2 bucket untuk 1h granularity).
* Jika durasi < ambang, klasifikasikan sebagai "Noise/Outlier".

STEP 4 – Event Merging (Aggregation)
------------------------------------
* Gabungkan kandidat yang berdekatan (jarak ≤ 1 bucket).
* Tentukan `start_time`, `end_time`, dan `peak_value`.
* Kumpulkan daftar metrik yang terlibat dalam satu event.

STEP 5 – Severity Scoring
-------------------------
Hitung skor akhir berdasarkan:
* Magnitude: Seberapa jauh dari mean (score dari backend).
* Durasi: Jumlah bucket yang terlibat.
* Cross-Metric: Apakah metrik lain (CPU/Mem/Client) juga menyimpang di waktu yang sama.

STEP 6 – Maintenance Check (Muting)
-----------------------------------
* Periksa apakah event berada dalam Maintenance Window.
* Jika ya, set `status = "muted"`.

STEP 7 – Final Output Generation
--------------------------------
Keluarkan objek `anomalyMetrics` yang siap dikonsumsi UI:
{
  events: [ { id, start, end, severity, metrics, status, evidence } ],
  summary: { total, high, medium, low }
}

============================================================
C. PERFORMANCE & CACHING RULE
=============================
1. Gunakan `useMemo` untuk menjalankan STEP 2–7 di Frontend.
2. Trigger memoization: [scopedDataset, heavyData, habitMetrics].
3. Backend caching wajib aktif untuk endpoint heavy analysis.

============================================================
D. UX & PRESENTATION RULE
=========================
1. UI wajib menampilkan badge "Muted" jika anomali dalam maintenance window.
2. Severity harus divisualisasikan dengan warna standar (Red/Orange/Yellow).
3. Detail event harus menyertakan bukti statistik dasar (misal: "Traffic +40% vs Baseline").

============================================================
E. ARCHITECTURAL ENFORCEMENT
----------------------------
* Dilarang melakukan deteksi statistik berat di Frontend.
* Dilarang mengubah stempel waktu (timestamp) dari Backend.
* Dilarang mengabaikan isGap dari Stage 0.

END OF DOCUMENT
