CORRELATION_FLOW_RULE V2.1
(VERSION V2.1 – DEEP TRACEABILITY & RAW ALIGNMENT)

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
A. STAGE 3 — CORRELATION (HEAVY ANALYSIS V2.1)
==============================================

1. Stage 3 menganalisis hubungan linear antar metrik dari ScopedDataset (Stage 1).
2. Bertujuan menghitung Pearson Correlation Coefficient (r) dan Sample Size (n).
3. Hasil Stage 3 disebut CorrelationMetrics.
4. Stage ini DILARANG melakukan filtering ulang (re-filter).

23→PRINSIP DEEP TRACEABILITY (STAGE 3):
24→- GRANULAR ALIGNMENT: Korelasi wajib menggunakan resolusi data tertinggi dari ScopedDataset (Raw Data Primary).
25→- MANDATORY METADATA: Output wajib menyertakan `raw_timestamp`, `source_id`, dan `accuracy_pct`.
- TRACEABLE PAIRS: Simpan referensi ke `source_id` dari kedua metrik yang dikorelasikan (Link to Raw Log ID).
- FIDELITY AUDIT: Pastikan Pearson r dihitung tanpa pembulatan prematur pada data input.

============================================================
B. PRINSIP UTAMA (STANDAR SISTEM V2.1)
=====================================

1. Korelasi WAJIB dihitung di Backend (Heavy Analysis Engine).
2. Frontend DILARANG menghitung Pearson secara manual.
3. Korelasi WAJIB menggunakan RAW DATA (Single Source of Truth) untuk akurasi maksimal, bukan data agregat.
4. Raw log adalah fondasi utama perhitungan ini untuk menangkap micro-correlation.
5. Heavy computation tidak boleh dilakukan di UI thread.

============================================================
C. STANDAR CORRELATIONMETRICS (OUTPUT)
======================================

Output dari Stage 3 harus mencakup:

1. **Pearson r**:
   * Nilai antara -1.0 s/d +1.0.
   * Null jika n < threshold minimum atau variansi = 0.
2. **Sample Size (n)**:
   * Jumlah pasangan data valid setelah simetris drop.
3. **Interpretasi**:
   * Deskripsi kualitatif (Kuat, Sedang, Lemah, Tidak Ada).
4. **Metrik Pair**:
   * Identitas dua metrik yang dikorelasikan (mis. Traffic vs CPU).

============================================================
D. PENYELARASAN WAKTU & DATA
============================

1. Kedua metrik wajib:
   * Granularity identik (dari ScopedDataset).
   * Rentang waktu identik.
   * Bucket timestamp identik.

2. Missing Data Handling:
   * Jika salah satu metrik null/isGap -> Drop titik tersebut dari kedua deret (Inner Join logic).
   * Sample size (n) dihitung setelah pembersihan data.

3. Validitas:
   * Korelasi dianggap tidak valid jika n < 5 (default threshold).
   * Korelasi tidak valid jika salah satu deret data bersifat statis (variansi = 0).

============================================================
E. LARANGAN KERAS
=================

1. **Re-filter**: Dilarang mengubah period, limit, atau entity filter yang sudah dikunci di Stage 1.
2. **Frontend Pearson**: Dilarang melakukan iterasi manual untuk Pearson di UI.
3. **Implicit Filling**: Dilarang mengisi gap data dengan 0 sebelum korelasi; biarkan drop simetris bekerja.
4. **Mixed Granularity**: Dilarang mengorelasikan data per-jam dengan data per-hari.

============================================================
F. ATURAN IMPLEMENTASI
======================

1. Lokasi:
   * useAnalysisV2Controller.js (Mapping response).
   * Backend API V2 (Heavy Analysis Engine).
2. Kecepatan:
   * UI hanya menampilkan hasil fetch (Read-only).
3. Memoization:
   * Hasil korelasi di-memoize berdasarkan ScopedDataset ID/hash di frontend.

============================================================
G. FINAL DECLARATION
====================

Correlation Rule adalah:
* Berbasis ScopedDataset.
* Backend-computed.
* Time-aligned.
* Deterministic.
* Frontend read-only.

END OF DOCUMENT
