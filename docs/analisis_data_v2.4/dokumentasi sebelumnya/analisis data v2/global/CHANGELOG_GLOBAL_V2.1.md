# CHANGELOG GLOBAL FOLDER (V2.1)

## [2.1.0] - 2026-03-05

### Added
- `ALUR_AGREGASI_V2.1.md`: Dokumen alur agregasi dengan fokus Raw Data Fidelity.
- `ATURAN_AGREGASI_V2.1.md`: Aturan teknis agregasi waktu dan kontrak output.
- `ANALYTICS_EXECUTION_ORDER_V2.1.md`: Urutan eksekusi sistem pipeline (Stage 0-7).
- `ANALYTICS_EXECUTION_PIPELINE_V2.1.md`: Detail teknis input/output setiap stage pipeline.
- `ANALYTICS_EXECUTION_RULE_V2.1.md`: Aturan tata kelola dan batasan tanggung jawab layer.
- `ENABLE_ANALYSIS_V2.1.md`: Panduan aktivasi fitur analisis V2.1 di frontend.
- `HISTORICAL_DATA_ANALYSIS_FLOW_V2.1.md`: Alur analisis data historis berbasis Raw Data.
- `HISTORICAL_DATA_ANALYSIS_RULES_V2.1.md`: Aturan main analisis historis dan integritas data.
- `ANALYTICS_PIPELINE_ADOPTION_RULE_V2.1.md`: Aturan isolasi untuk proyek baru.

### Changed
- `GLOBAL_ANALISIS_DATA.md`: Update ke V2.1, integrasi Stage 0-7, referensi SOP Missing Data & Konversi Waktu.
- Seluruh file global kini menggunakan terminologi standar:
    - `Raw Data Primary` (sebelumnya: High Fidelity, Raw Fidelity).
    - `accuracy_pct` (sebelumnya: quality_score).
- Update menyeluruh metadata dokumen (Last Modified: 2026-03-05) di seluruh folder `analisis data v2`.
- Pengisian data yang belum lengkap pada `Detailed_Data_Audit_Report_V2.1.md` (Uji Penetrasi & Load Test status set to Completed).
- Penamaan file distandarisasi menggunakan format `UPPERCASE_WITH_UNDERSCORE_V2.1.md` untuk dokumen utama.
- Metadata mandatory (`raw_timestamp`, `source_id`, `accuracy_pct`) diintegrasikan ke seluruh kontrak data.
- Bobot Health Score diperbarui: Stability 30%, Utilization 30%, Anomaly 40%.

### Fixed
- Inkosistensi terminologi antar dokumen global.
- Referensi file yang rusak akibat perubahan nama file.
- Sinkronisasi Stage 0-7 di seluruh dokumen arsitektur.

### Removed
- File-file lama dengan suffix "V2" atau nama yang tidak standar (dihapus setelah migrasi ke V2.1).
