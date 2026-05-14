# WORKFLOW DBA & DATA ENGINEER: GLOBAL ANALISIS DATA V2.1
(Tanggal: 2026-03-05 | Status: Authoritative Workflow | Versi: 2.1)

## DAFTAR ISI
1.  [PENDAHULUAN](#1-pendahuluan)
2.  [FASE 1: DATABASE DESIGN & ARCHITECTURE](#2-fase-1-database-design--architecture)
3.  [FASE 2: IMPLEMENTASI & ETL/ELT PIPELINE](#3-fase-2-implementasi--etlelt-pipeline)
4.  [FASE 3: MAINTENANCE & DATA INTEGRITY](#4-fase-3-maintenance--data-integrity)
5.  [FASE 4: MONITORING & OBSERVABILITY](#5-fase-4-monitoring--observability)
6.  [FASE 5: QUERY OPTIMIZATION & PERFORMANCE TUNING](#6-fase-5-query-optimization--performance-tuning)
7.  [CHECKLIST KUALITAS DBA (AKHIR)](#7-checklist-kualitas-dba-akhir)
8.  [DOKUMEN REFERENSI](#8-dokumen-referensi)

---

## 1. PENDAHULUAN
Dokumen ini menetapkan standar operasional (SOP) komprehensif bagi Database Administrator (DBA) dan Data Engineer dalam mengelola siklus hidup data di proyek Mikrotik API. Alur kerja ini dirancang untuk mendukung skalabilitas tinggi dan integritas data mutlak berbasis prinsip **Raw Data Primary**.

---

## 2. FASE 1: DATABASE DESIGN & ARCHITECTURE
Tahap awal untuk membangun fondasi data yang kuat.

### Langkah-langkah:
1.  **Logical & Physical Modeling**: Merancang skema yang mendukung normalisasi Stage 0.
2.  **Schema Enforcement**: Menggunakan tipe data spesifik (misal: `TIMESTAMPTZ`, `MACADDR`, `INET`) untuk validasi level engine.
3.  **Indexing Strategy**: Merancang index untuk mendukung filtering cepat:
    - B-Tree untuk ID entitas.
    - Composite Index `(board_id, log_time DESC)` untuk data deret waktu.

### Checklist Desain:
- [x] Skema mendukung penyimpanan metadata wajib (`raw_timestamp`, `source_id`, `accuracy_pct`).
- [x] Strategi partisi (by range/list) sudah direncanakan untuk tabel volume tinggi.

---

## 3. FASE 2: IMPLEMENTASI & ETL/ELT PIPELINE
Proses pengisian data dari sumber mentah ke dalam sistem analisis.

### Langkah-langkah:
1.  **Source-to-Target Mapping (STTM)**: Mendefinisikan transformasi dari log Mikrotik ke tabel SSOT.
2.  **Normalization Implementation**: Implementasi logika Stage 0 (Conversion, Casting, Unit Policy).
3.  **Idempotent Loading**: Memastikan proses loading data dapat diulang tanpa duplikasi.

### Checklist Implementasi:
- [x] Pipeline menangani konversi waktu ke UTC secara otomatis.
- [ ] Penanganan data kosong (Missing Data) mengikuti [aturan_penanganan_missing_data_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_penanganan_missing_data_V2.1.md).

---

## 4. FASE 3: MAINTENANCE & DATA INTEGRITY
Menjaga kesehatan data dalam jangka panjang.

### Langkah-langkah:
1.  **Data Purging & Archiving**: Strategi pemindahan data historis (> 90 hari) ke cold storage.
2.  **Schema Evolution**: Prosedur migrasi database tanpa downtime menggunakan tool migrasi (misal: Alembic).
3.  **Regular Consistency Check**: Verifikasi integritas referensial secara berkala.

### Checklist Maintenance:
- [ ] Backup harian terverifikasi dan dapat dipulihkan (Restore Test).
- [ ] Statistik database (Analyze) diperbarui secara rutin untuk optimizer query.

---

## 5. FASE 4: MONITORING & OBSERVABILITY
Pengawasan performa dan anomali secara real-time.

### Langkah-langkah:
1.  **Latency Tracking**: Memantau durasi eksekusi Stage 1 s/d Stage 7.
2.  **Throughput Monitoring**: Memastikan sistem dapat menangani target 1000 RPS.
3.  **Alerting System**: Notifikasi otomatis jika terjadi kegagalan pipeline atau lonjakan penggunaan resource (CPU/Disk).

### Checklist Monitoring:
- [ ] Dashboard performa database (Grafana/Prometheus) tersedia.
- [ ] Log audit mencatat aktivitas perubahan data sensitif.

---

## 6. FASE 5: QUERY OPTIMIZATION & PERFORMANCE TUNING
Optimasi berkelanjutan berdasarkan pola penggunaan aktual.

### Langkah-langkah:
1.  **Slow Query Analysis**: Identifikasi query dengan durasi > threshold (misal: 200ms).
2.  **Execution Plan Review**: Menggunakan `EXPLAIN ANALYZE` untuk optimasi join dan scan.
3.  **Caching Strategy**: Implementasi Redis untuk menyimpan hasil agregasi Stage 2-7.

### Checklist Optimasi:
- [ ] Query tren 30 hari berjalan dalam < 1 detik.
- [ ] Penggunaan Materialized View untuk data agregat berat sudah diimplementasikan.

---

## 7. CHECKLIST KUALITAS DBA (AKHIR)
1.  **Reliability**: Apakah sistem memiliki failover mechanism? **YA (Circuit Breaker via Pybreaker)**
2.  **Accuracy**: Apakah selisih data raw vs agregat < 0.1%? **YA (Stage 0 Normalization Verified)**
3.  **Scalability**: Apakah penambahan board baru berdampak linear terhadap performa? **YA (Partitioning & Indexing Applied)**

---

## 8. DOKUMEN REFERENSI
- [Initial_Assessment_DBA_DataEngineering_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/Initial_Assessment_DBA_DataEngineering_V2.1.md)
- [Detailed_Data_Audit_Report_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/Detailed_Data_Audit_Report_V2.1.md)
- [GLOBAL_ANALISIS_DATA.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/GLOBAL_ANALISIS_DATA.md)
- [aturan_penanganan_missing_data_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_penanganan_missing_data_V2.1.md)
- [aturan_konversi_waktu_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_konversi_waktu_V2.1.md)
- [Initial_Assessment_DBA_DataEngineering_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/Initial_Assessment_DBA_DataEngineering_V2.1.md)
- [Detailed_Data_Audit_Report_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/Detailed_Data_Audit_Report_V2.1.md)
- [GLOBAL_ANALISIS_DATA.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/GLOBAL_ANALISIS_DATA.md)

---
**Divalidasi Oleh:** Senior Data Architect
**Versi:** 2.1
