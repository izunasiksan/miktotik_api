AUDIT_SCOPE_FILTER_FLOW V2.1
(VERSION V2.1 – RAW DATA PRIMARY & INITIAL INDEXING)
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
A. CORE PRINCIPLE (STAGE 1 - V2.1)
==================================

1. Scope & Filter (Stage 1) memproses NormalizedDataset dari Stage 0.
2. Bertugas mengunci konteks analisis (Context Lock) dengan High Fidelity.
3. **PRINSIP RAW DATA PRIMARY**: Filtering WAJIB dilakukan pada **Raw Data (SSOT)** untuk memastikan akurasi maksimal sebelum agregasi.
4. **Initial Indexing**: Gunakan index `(board_id, log_time DESC)` untuk kecepatan filter pada data mentah.
5. Hasilnya adalah ScopedDataset yang siap dianalisis di Stage 2 s/d Stage 7.
6. Filtering hanya boleh terjadi di tahap ini.

25→PRINSIP GRANULARITAS & TRACEABILITY:
26→- DILARANG mereduksi detail data saat filtering.
27→- WAJIB mempertahankan metadata `raw_timestamp`, `source_id`, dan `accuracy_pct`.
28→- WAJIB mencatat `scope_metadata` yang berisi parameter filter (Time Range, Board ID, dll).

============================================================
B. PIPELINE POSITION (V2.1)
===========================

Normalisasi (Stage 0) -> [ Scope & Filter (Stage 1) ] -> Trend (Stage 2) -> ... -> Insight (Stage 7)

Dilarang:
* Re-filtering di tahap setelah Stage 1.
* Mengubah Normalisasi (Stage 0) di tahap ini.
* Melewatkan indexing pada query data mentah.

============================================================
C. SUMBER DATA RESMI (SSOT - V2.1)
==================================

Audit WAJIB menggunakan tabel mentah resmi:
* `board_speed_stats`
* `board_resource_stats`
* `board_client_stats`
* `board_usage_stats`
* `board_pppoe_usage`
* `hotspot_usage_raw`

DILARANG:
* Menggunakan summary tables sebagai sumber utama filtering (Summary hanya untuk cache/display).
* Join berat lintas tabel tanpa optimasi index.
* Agregasi prematur sebelum filtering selesai.

============================================================
D. ALUR RESMI AUDIT (V2.1)
==========================

1. DEFINE SCOPE

---

* Domain:
  Database | Backend | Frontend | Infrastruktur
* Entitas:
  board | interface | pppoe | hotspot | client | dll
* Waktu:
  period (daily/monthly/yearly)
  limit
  atau start_date & end_date

Scope harus eksplisit dan terdokumentasi.

2. DEFINE FILTER (V2.1)

---

Filter yang sah:

* period
* limit
* start_date (ISO-8601)
* end_date (ISO-8601)
* granularity (auto|year|month|day|hour)
* aggMethod (AVG|MAX|SUM|MIN)
* entity/name filter
* **source_table** selection

Semua filter wajib:

* tervalidasi
* tercatat dalam `scope_metadata`
* digunakan konsisten di seluruh pipeline.

3. PRE-FLIGHT VALIDATION

---

Wajib menggunakan format 4 bagian:

A. Identifikasi Domain

* File / modul terkait
* Dependency

B. Dampak & Risiko

* What-if scenario
* Risiko performa
* Risiko inkonsistensi

C. Hasil Audit Teknis Awal

* Validasi tipe data
* Validasi index
* Validasi struktur schema

D. Rekomendasi Eksekusi

* Langkah eksekusi
* Metode verifikasi
* Opsi rollback (jika relevan)

Parameter filter wajib lolos:

* validateFilterParams
* aturan granularitas konsisten
* aturan period sesuai tabel summary

============================================================
E. EKSEKUSI PENGAMBILAN DATA
============================

## MODE 1: Stage 1 Pipeline Execution

* Menerima NormalizedDataset (Stage 0).
* Menerapkan period, date range, entity filter.
* Mengunci dataset (Context Lock).
* Mengeluarkan ScopedDataset.

DILARANG:
* Melakukan filtering ulang di Stage 2 s/d 7.
* Mengubah struktur NormalizedDataset di tahap ini.

## MODE 2: Backend Retrieval Filter

* Mengirim parameter filter ke API V2.
* Menerima response terfilter sesuai scope.
* Backend menjamin data berasal dari Summary Table.

============================================================
F. GAP MANAGEMENT (STAGE 1)
===========================

1. Gap Recognition:
   * Mengidentifikasi gap yang ditandai di Stage 0.
2. Gap Handling:
   * Menentukan perlakuan gap untuk analisis berikutnya (skip/zero/flag).

============================================================
G. OUTPUT (SCOPED DATASET)
==========================

ScopedDataset adalah satu-satunya sumber data bagi:
* Stage 2 (Trend)
* Stage 3 (Korelasi)
* Stage 4 (Kebiasaan)
* Stage 5 (Anomali)
* Stage 6 (Prediksi)
* Stage 7 (Insight)

============================================================
H. PELAPORAN
============

Laporan audit harus berisi:

1. Scope lengkap
2. Filter lengkap
3. Ringkasan temuan
4. Rekomendasi tindakan
5. Catatan risiko

DILARANG menyertakan:

* Data sensitif
* Token
* Credential
* Raw log detail

============================================================
I. PENUTUPAN & ARSIP
====================

Yang wajib diarsipkan:

* Checklist Pre-Flight
* Parameter Filter
* Ringkasan Temuan
* Tanggal eksekusi audit

Audit harus bisa direplikasi dengan parameter yang sama.

============================================================
J. FINAL DECLARATION (V2.1)

Audit Scope & Filter System Stage 1 adalah:
* **Berbasis Raw Data (SSOT)**
* Read-only
* Deterministic
* Traceable (Metadata focus)
* Repeatable
* **Optimized via Initial Indexing**
* Selaras dengan Raw Data Logic V2.1

END OF DOCUMENT
