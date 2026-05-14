# FRAMEWORK ASSESSMENT: DATA ENGINEER & DBA V2.1
(Tanggal: 2026-03-05 | Status: Evaluation Standard | Versi: 2.1)

## DAFTAR ISI
1.  [TUJUAN ASSESSMENT](#1-tujuan-assessment)
2.  [DIMENSI PENILAIAN TEKNIS](#2-dimensi-penilaian-teknis)
3.  [DIMENSI PENILAIAN NON-TEKNIS](#3-dimensi-penilaian-non-teknis)
4.  [SISTEM SKORING (RUBRIC)](#4-sistem-skoring-rubric)
5.  [INSTRUMEN EVALUASI](#5-instrumen-evaluasi)
6.  [REKOMENDASI & TINDAK LANJUT](#6-rekomendasi--tindak-lanjut)
7.  [DOKUMEN REFERENSI](#7-dokumen-referensi)

---

## 1. TUJUAN ASSESSMENT
Framework ini dirancang untuk mengevaluasi kesiapan teknis dan profesional personil Data Engineer/DBA dalam menangani ekosistem data Mikrotik API V2.1. Fokus utama adalah pada kemampuan menjaga integritas data (Raw Data Primary) dan optimasi performa skala besar.

---

## 2. DIMENSI PENILAIAN TEKNIS
Penilaian berbasis pada penguasaan stack teknologi dan metodologi data engineering.

| Kategori | Kriteria Kompetensi | Bobot |
| :--- | :--- | :--- |
| **Database Mastery** | Pemahaman indexing (B-Tree, GIN, Composite), Partisi, dan Query Optimization (Explain Analyze). | 30% |
| **Pipeline Engineering** | Kemampuan membangun ETL/ELT yang idempotent dan menangani Stage 0 Normalization. | 25% |
| **Data Integrity** | Implementasi SOP penanganan data kosong (Missing Data) dan sinkronisasi waktu (UTC). | 20% |
| **Infrastructure Knowledge** | Penguasaan caching (Redis), background jobs (Celery), dan monitoring. | 15% |
| **Security & Compliance** | Pemahaman akses kontrol (RBAC), enkripsi data, dan audit logging. | 10% |

---

## 3. DIMENSI PENILAIAN NON-TEKNIS
Mengevaluasi kemampuan problem-solving dan kolaborasi dalam tim.

| Skill | Deskripsi Perilaku |
| :--- | :--- |
| **Analytical Skills** | Mampu membedah masalah performa query yang kompleks menjadi langkah-langkah optimasi yang sistematis. |
| **Problem Solving** | Kreativitas dalam menangani anomali data (Data Drift) tanpa merusak integritas historis. |
| **Communication** | Kemampuan menjelaskan arsitektur data teknis kepada stakeholder non-teknis dengan bahasa yang sederhana. |
| **Adaptability** | Kecepatan dalam mengadopsi perubahan standar V2.1 dan teknologi baru. |

---

## 4. SISTEM SKORING (RUBRIC)
Skor akhir dihitung berdasarkan rata-rata tertimbang dari seluruh dimensi.

| Skor | Level | Deskripsi |
| :--- | :--- | :--- |
| **1.0 - 1.9** | **Novice** | Membutuhkan supervisi ketat; pemahaman dasar masih kurang. |
| **2.0 - 2.9** | **Junior** | Mampu mengerjakan tugas rutin; kesulitan pada optimasi kompleks. |
| **3.0 - 3.9** | **Intermediate** | Mandiri; memahami best practices; mampu melakukan troubleshooting menengah. |
| **4.0 - 5.0** | **Expert** | Mampu merancang arsitektur; menjadi mentor; pakar dalam optimasi performa. |

---

## 5. INSTRUMEN EVALUASI
Metode yang digunakan untuk mengumpulkan data penilaian:
1.  **Technical Challenge**: Hands-on optimasi query pada dataset > 1 juta baris.
2.  **Architecture Review**: Presentasi desain pipeline ETL untuk Stage 0-2.
3.  **Case Study**: Simulasi penanganan insiden data corruption atau latensi tinggi.
4.  **Peer Review**: Evaluasi kolaborasi berdasarkan proyek sebelumnya.

---

## 6. REKOMENDASI & TINDAK LANJUT
- **Skor < 3.0**: Wajib mengikuti bootcamp internal mengenai Standard V2.1.
- **Skor 3.0 - 3.9**: Diberikan tanggung jawab sebagai pelaksana utama fitur baru.
- **Skor > 4.0**: Dipertimbangkan sebagai Lead Data Architect atau Reviewer Standard.

---

## 7. DOKUMEN REFERENSI
- [Workflow_DBA_DataEngineer_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/Workflow_DBA_DataEngineer_V2.1.md)
- [Detailed_Data_Audit_Report_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/Detailed_Data_Audit_Report_V2.1.md)
- [GLOBAL_ANALISIS_DATA.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/GLOBAL_ANALISIS_DATA.md)

---

## 8. IMPLEMENTATION EVIDENCE (AUTO-GENERATED)
Status implementasi berdasarkan standar V2.1 pada sistem saat ini.

| Kriteria | Bukti Implementasi | Status |
| :--- | :--- | :--- |
| **Indexing Strategy** | Composite Index `(board_id, log_time DESC)` diimplementasikan pada seluruh tabel stats. | **Verified** |
| **Table Partitioning** | Range Partitioning by `log_time`/`log_date` aktif pada 7 tabel volume tinggi. | **Verified** |
| **Stage 0 Normalization** | Logika metadata (`accuracy_pct`, `source_id`) aktif di `normalization_v2.py`. | **Verified** |
| **Data Integrity** | Penanganan missing data (Gap Filling) & UTC sync melalui `TIMESTAMPTZ`. | **Verified** |
| **Audit & Security** | Tabel `audit_logs` dan `board_credentials` (encrypted) tersedia di skema SSOT. | **Verified** |

---
**Divalidasi Oleh:** Head of Engineering
**Versi:** 2.1
