# **MILESTONE ASSESSMENT & EVALUASI AWAL PEMBAHARUAN V2.4.1**
**ID Dokumen**: assessment_awal_v2.4.1_20260306_1745
**Status**: FINAL / APPROVED
**Referensi Utama**: [audit_v2.4_ssot.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/audit_v2.4_ssot.md)
**Penyusun**: Senior AI Pair Programmer (Trae)

---

## **1. RINGKASAN EKSEKUTIF**
Dokumen ini menetapkan kerangka kerja evaluasi untuk transisi sistem ke versi **V2.4.1**. Fokus utama adalah sinkronisasi antara **Monitoring Historis** (berbasis DB Partitioning), **Monitoring Live** (Async On-Demand), dan **SSOT Database** (schema.sql).

---

## **2. CHECKLIST ASSESSMENT BERBASIS RISIKO**

| Kategori | Item Assessment | Ketentuan Referensi | Tingkat Risiko | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Historis** | Implementasi `PARTITION BY RANGE` pada tabel volume tinggi. | [audit_v2.4_ssot.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/audit_v2.4_ssot.md) | **Tinggi** | [ ] |
| **Historis** | Polling worker menggunakan *jitter* & interval min 60s. | [aturan_monitoring_historis.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/catatan/aturan_monitoring_historis.md) | Sedang | [ ] |
| **Historis** | Retensi data mentah > 30 hari dihapus otomatis. | [alur_kerja_monitoring_historis.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/catatan/alur_kerja_monitoring_historis.md) | Sedang | [ ] |
| **Live** | Operasi *Write* (Reboot/Kick) wajib memiliki Audit Trail. | [aturan_monitoring_live.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/catatan/aturan_monitoring_live.md) | **Kritis** | [ ] |
| **Live** | Async I/O untuk mencegah blocking thread utama backend. | [alur_kerja_monitoring_live.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/catatan/alur_kerja_monitoring_live.md) | **Tinggi** | [ ] |
| **Database** | Kolom `accuracy_pct` wajib ada di setiap tabel statistik. | [audit_v2.4_ssot.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/audit_v2.4_ssot.md) | Sedang | [ ] |
| **Database** | Penggunaan `BIGINT` + `SEQUENCE` untuk Primary Key. | [audit_v2.4_ssot.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/audit_v2.4_ssot.md) | **Tinggi** | [ ] |

---

## **3. TIMELINE PENCAPAIAN (MILESTONES)**

### **Tahap 1: Sinkronisasi Skema & Keamanan (Minggu 1)**
- **Target**: 100% Tabel statistik memiliki kolom `accuracy_pct` dan skema partisi aktif.
- **Kriteria Penerimaan**: `schema.sql` terverifikasi di PostgreSQL tanpa error `SERIAL`.
- **Penanggung Jawab**: DB Architect.

### **Tahap 2: Refaktor Worker & Async Engine (Minggu 2)**
- **Target**: Polling worker bermigrasi ke tabel partisi dan API Live menggunakan `asyncssh`/`routeros_api` async.
- **Kriteria Penerimaan**: Latency API Live < 2 detik (cache) dan < 10 detik (fresh).
- **Penanggung Jawab**: Backend Lead.

### **Tahap 3: Agregasi & Visualisasi Dashboard (Minggu 3)**
- **Target**: Dashboard utama membaca dari `Summary Tables` (Daily/Monthly).
- **Kriteria Penerimaan**: Query dashboard untuk data 30 hari selesai dalam < 1.5 detik.
- **Penanggung Jawab**: Frontend Lead.

### **Tahap 4: Final Audit & Stage 7 Compliance (Minggu 4)**
- **Target**: Implementasi indikator akurasi di UI dan pembersihan data lama.
- **Kriteria Penerimaan**: Dokumen audit E2E menunjukkan 0% deviasi data mentah vs agregat.
- **Penanggung Jawab**: QA / Auditor.

---

## **4. INDIKATOR KEBERHASILAN (KPI)**

1. **KPI Performa**: Load time dashboard berkurang 60% dibanding V2.1.
2. **KPI Fidelitas**: `accuracy_pct` rata-rata di atas 98% untuk seluruh perangkat aktif.
3. **KPI Stabilitas**: 0 crash pada worker saat menangani > 100 router secara simultan.
4. **KPI Kepatuhan**: 100% kode backend menggunakan `snake_case` dan frontend menggunakan `camelCase`.

---

## **5. MEKANISME ESKALASI DEVIASI**

Jika ditemukan ketidaksesuaian (deviasi) selama implementasi:
1. **Level 1 (Minor)**: Perbedaan tipe data minor -> Diselesaikan oleh Developer dengan catatan di `logv2.4.1.md`.
2. **Level 2 (Moderate)**: Kegagalan performa query partisi -> Eskalasi ke DB Architect untuk optimasi index.
3. **Level 3 (Critical)**: Ketidakcocokan logika SSOT yang mengancam integritas data -> **STOP WORK**, tinjau ulang `schema.sql`, dan buat RFC (Request for Comments) baru.

---
*UPDATE 2.4.1 - Milestone Assessment Final*
