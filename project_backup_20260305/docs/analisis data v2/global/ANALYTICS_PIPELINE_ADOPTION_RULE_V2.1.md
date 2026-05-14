ANALYTICS_PIPELINE_ADOPTION_RULE V2.1
(VERSION V2.1 – NEW PROJECT ONLY, LEGACY SAFE)

============================================================
1. TUJUAN
============================================================

Dokumen ini menetapkan aturan penerapan Analytics Execution Pipeline V2.1 pada proyek BARU tanpa mengubah atau merusak proyek lama.
Mengintegrasikan Raw Data Primary, Time Conversion, dan Missing Data SOP secara terisolasi.

Aturan ini menjamin:
* Zero modification terhadap legacy project.
* Zero shared side-effect.
* Isolasi penuh arsitektur baru.

============================================================
2. PRINSIP UTAMA
============================================================

1. **Isolation**: Proyek baru harus berdiri independen dari sistem lama.
2. **Backward-Safe**: Perubahan tidak boleh merusak fungsionalitas yang sudah stabil.
3. **Data Fidelity**: V2.1 WAJIB menggunakan raw data mentah tanpa diproses oleh sistem agregasi lama.
4. **Independent Interface**: Integrasi hanya melalui endpoint atau interface baru.

============================================================
3. STRATEGI IMPLEMENTASI V2.1
============================================================

## A. ISOLASI DIREKTORI
Pipeline baru WAJIB berada di direktori terpisah (misal: `/src/analytics_v2/`).

## B. ISOLASI NAMESPACE
Semua komponen V2.1 wajib menggunakan prefix khusus dan hook baru yang mematuhi standar integritas data:
* `useAnalysisV2Controller`
* `normalization_v2.js` (dengan integrasi missing data & unit conversion).

## C. DATA CONTRACT RULE
1. **Raw Source**: V2.1 mengambil data langsung dari tabel RAW, bukan dari tabel summary lama.
2. **New Metadata**: Wajib mendukung `raw_timestamp`, `source_id`, dan `accuracy_pct`.

============================================================
4. PIPELINE IMPLEMENTATION RULE
============================================================

1. Gunakan [ANALYTICS_EXECUTION_PIPELINE_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/ANALYTICS_EXECUTION_PIPELINE_V2.1.md) sebagai pedoman urutan eksekusi.
2. Terapkan [aturan_penanganan_missing_data_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_penanganan_missing_data_V2.1.md) pada tahap normalisasi.
3. Terapkan [aturan_konversi_waktu_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_konversi_waktu_V2.1.md) untuk penyelarasan unit waktu.

END OF DOCUMENT
