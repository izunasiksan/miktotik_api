ANALYTICS_EXECUTION_RULE V2.1
(VERSION V2.1 – STRICT GOVERNANCE & DATA INTEGRITY)

============================================================
1. TUJUAN
============================================================

Dokumen ini menetapkan aturan resmi dan wajib untuk urutan serta batas tanggung jawab setiap layer dalam sistem analitik V2.1.
Mengintegrasikan kepatuhan terhadap Raw Data Primary, Time Conversion, dan Missing Data SOP.

Aturan ini bersifat:
*   Final
*   Tidak ambigu
*   Tidak dapat dibalik
*   Tidak dapat ditafsir ulang

============================================================
2. PRINSIP GLOBAL
============================================================

1.  **Data Primary**: Raw data adalah sumber tunggal kebenaran (SSOT).
2.  **Data Flow**: Mengalir satu arah (forward-only).
3.  **Read-Only**: Setiap layer hanya boleh membaca input dari layer sebelumnya.
4.  **No Re-filter**: Dilarang melakukan filter ulang setelah Stage 1.
5.  **Data Integrity**: WAJIB memproses missing data dan unit conversion di Stage 0.
6.  **Traceability**: Metadata asal wajib dipertahankan hingga tahap akhir.

============================================================
3. URUTAN WAJIB (STAGE 0 - STAGE 7)
============================================================

0.  Normalisasi (Missing Data & Unit Alignment)
1.  Scope & Filter (Context Lock)
2.  Trend (Directional)
3.  Korelasi (Relationship)
4.  Kebiasaan (Pattern)
5.  Validasi Anomali (Detection)
6.  Health Score (Aggregation V2.1)
7.  Insight & Visualisasi (Presentation)

============================================================
4. ATURAN PER STAGE
============================================================

## STAGE 0 — NORMALISASI
Wajib:
*   Standarisasi field.
*   **Time Conversion**: Gunakan [aturan_konversi_waktu_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_konversi_waktu_V2.1.md).
*   **Missing Data Handling**: Gunakan [aturan_penanganan_missing_data_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_penanganan_missing_data_V2.1.md).
*   Selaraskan timestamp (ISO-8601 UTC).
*   Parse numerik eksplisit.
*   Drop/flag NaN & Infinity.

Dilarang:
*   Menghitung trend/korelasi/anomali/prediksi.
*   Melakukan downsampling prematur (Raw Fidelity).

---

## STAGE 1 — SCOPE & FILTER
Wajib:
*   Terapkan period / start_date / end_date.
*   Terapkan granularity (Prioritaskan resolusi mentah).
*   Terapkan entity filter & bucketSource.
*   Terapkan time-lock.

Dilarang:
*   Filtering ulang di stage berikutnya.
*   Mengubah hasil normalisasi.

---

## STAGE 6 — HEALTH SCORE (V2.1)
Wajib:
*   Gunakan bobot: Stability 30%, Utilization 30%, Anomaly 40%.
*   Referensi: [revisi_logika_raw_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/revisi_logika_raw_V2.1.md).

---

## STAGE 7 — INSIGHT & VISUALISASI
Wajib:
*   Tampilkan akurasi konversi waktu jika durasi data < threshold.

---
**END OF DOCUMENT**
