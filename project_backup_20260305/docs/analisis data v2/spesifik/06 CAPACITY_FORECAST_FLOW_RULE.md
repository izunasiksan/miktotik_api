CAPACITY_FORECAST_FLOW_RULE V2.1
(VERSION FINAL – STAGE 6 RAW ALIGNED)

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
A. CORE PRINCIPLE (STAGE 6 — FLOW)
==================================
1. Stage 6 adalah tahap akhir proyeksi beban dan estimasi TTC dengan High Fidelity.
2. Menggabungkan tren historis berbasis Raw Data dengan proyeksi masa depan dari Backend pada level granular.
3. Menghitung risiko operasional berdasarkan sisa kapasitas (Headroom) menggunakan Upper Bound granular.
4. Hasil akhir berupa ForecastMetrics yang berkontribusi pada Utilization Score (Health Score).

PRINSIP RAW ALIGNMENT (V2.1):
- GRANULAR PROJECTION: Proyeksi wajib menggunakan data granular (Raw Data Primary).
- MANDATORY METADATA: Setiap titik proyeksi wajib menyimpan `raw_timestamp`, `source_id`, dan `accuracy_pct`.
- Integrasi SOP: Patuhi [aturan_konversi_waktu_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_konversi_waktu_V2.1.md) jika ada konversi skala waktu.

============================================================
B. PIPELINE EKSEKUSI STAGE 6
============================

STEP 1 — Fetch Heavy Forecast (Raw Fidelity)
-------------------------------------------
Frontend mengirim parameter (Stage 1) ke Backend via `getHeavyAnalysisV2`.
Backend melakukan peramalan (Linear/ML) menggunakan data **Raw (SSOT)** dan mengembalikan `heavyData.forecast`.
*Data harus menyertakan: projected_value, upper_bound, lower_bound.*

STEP 2 — Capacity Identification
--------------------------------
Frontend mengambil nilai kapasitas acuan dari:
* Metadata Board/Interface (Link Speed) dari tabel `board_speed_stats`.
* Config Override (jika ada input manual dari user).
* Default: Mbps (jika traffic), % (jika resource).

STEP 3 — Projection Synchronization
-----------------------------------
Frontend menyelaraskan stempel waktu (timestamp) proyeksi dengan:
* ScopedDataset (Stage 1) untuk visualisasi kontinyu.
* Memastikan unit proyeksi sama dengan unit historis.

STEP 4 — Headroom & Utilization Calculation
-------------------------------------------
Hitung metrik efisiensi per titik proyeksi:
* Utilization = projected_value / capacity
* Headroom (Conservative) = capacity − upper_bound
*Jika headroom < 0, artinya beban diprediksi melampaui kapasitas.*

STEP 5 — Time-To-Capacity (TTC) Derivation
------------------------------------------
Tentukan waktu kritis:
* Temukan timestamp pertama di mana `upper_bound ≥ capacity`.
* Jika ditemukan dalam horizon: TTC = (timestamp kritis - sekarang).
* Jika tidak ditemukan: TTC = "> Horizon" (Sistem Stabil).

STEP 6 — Recommendation Logic
-----------------------------
Tentukan status operasional:
* IF TTC < 7 hari → Action: Upgrade / QoS Kritis.
* IF TTC < 30 hari → Action: Evaluasi Ekspansi.
* ELSE → Action: Aman.

STEP 7 — Final Output Generation
--------------------------------
Keluarkan objek `forecastMetrics` untuk UI:
{
  projections: [ { timestamp, value, upper, lower, utilization, headroom } ],
  ttc: { value, label, severity },
  recommendation: { action, message }
}

============================================================
C. PERFORMANCE & CACHING RULE
=============================
1. Derivasi STEP 4–6 dilakukan via `useMemo`.
2. Trigger memoization: [scopedDataset, heavyData, capacityConfig].
3. Backend wajib mengaktifkan caching untuk model forecast yang berat.

============================================================
D. UX & PRESENTATION RULE
=========================
1. Grafik wajib menampilkan "Confidence Area" (area antara lower & upper bound).
2. Garis Kapasitas wajib ditampilkan sebagai garis horizontal pembanding.
3. Label "Conservative Mode" wajib ada jika perhitungan menggunakan Upper Bound.

============================================================
E. ARCHITECTURAL ENFORCEMENT
----------------------------
* Dilarang menghitung model statistik berat di Frontend.
* Dilarang mengabaikan confidence interval dari Backend.
* Dilarang menggunakan median untuk perhitungan TTC kritis.

END OF DOCUMENT
