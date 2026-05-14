# INITIAL ASSESSMENT: BACKEND PIPELINE ANALISIS DATA V2.1
**Tanggal**: 2026-03-05
**Status**: Draft Initial Assessment
**Versi**: 1.0
**Fitur**: Backend Pipeline Stage 0-7 (Normalization to Insight)
**Referensi Arsitektur**: [Backend_Architecture_Design_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/Backend_Architecture_Design_V2.1.md)

---

## 1. IDENTIFIKASI KEBUTUHAN TEKNIS
Berdasarkan evaluasi terhadap [Backend_Architecture_Design_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/Backend_Architecture_Design_V2.1.md) dan [GLOBAL_ANALISIS_DATA.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/GLOBAL_ANALISIS_DATA.md), berikut adalah kebutuhan teknis utama:

### **A. Core Services (FastAPI)**
- **Normalization Engine (Stage 0)**: Implementasi logika klasifikasi missing data (MCAR, MAR, MNAR) dan strategi imputasi (FFill, Regression, Interpolation).
- **Analytics Engine (Stage 1-6)**: 
  - Komputasi statistik (Slope, Delta, Correlation).
  - Algoritma deteksi anomali.
  - Scoring engine untuk Health Score (Stability 30%, Utilization 30%, Anomaly 40%).
- **Presentation Engine (Stage 7)**: Transformasi data untuk visualisasi dengan metadata akurasi.

### **B. Infrastructure & Data**
- **PostgreSQL**: Pemanfaatan tabel partitioned dan materialized views untuk Stage 1 (Scoped Dataset).
- **Redis**: Caching hasil agregasi dengan TTL 5 menit untuk mencapai latency < 200ms.
- **Celery/Redis**: Background processing untuk Stage 0 (Normalization) dan Daily Batch Aggregation.

---

## 2. ANALISIS RISIKO
| Risiko | Dampak | Mitigasi |
|:---|:---|:---|
| **Overload Database** | High (Sistem lambat/crash) | Implementasi *Circuit Breaker* dan penggunaan *Materialized Views* untuk data scoped. |
| **Inkonsistensi Data** | Medium (Hasil analisis salah) | Validasi ketat pada Stage 0 dan penggunaan *Context Lock* pada Stage 1. |
| **Latency Tinggi** | High (UX buruk) | Strategi caching agresif di Redis dan optimasi query PostgreSQL. |
| **Complexity Sinkronisasi** | Medium (Race condition) | Penggunaan Celery untuk tugas berat dan locking mechanism pada resource kritis. |

---

## 3. ESTIMASI EFFORT (STORY POINTS / DAYS)
Estimasi total pengerjaan untuk pipeline V2.1: **14-18 Hari Kerja**.

- **Stage 0 (Normalization)**: 4 Hari (Logika imputasi cukup kompleks).
- **Stage 1-2 (Scope & Trend)**: 3 Hari (Fokus pada optimasi query).
- **Stage 3-5 (Correlation, Habit, Anomaly)**: 5 Hari (Implementasi algoritma statistik).
- **Stage 6-7 (Health Score & Insight)**: 3 Hari (Finalisasi scoring dan API output).
- **Testing & QA**: 3 Hari (Unit, Integration, dan Performance Test).

---

## 4. DAFTAR DEPENDENSI
### **A. Internal Dependencies**
- **Database Schema v2.2**: (Selesai) Skema sudah mendukung partitioning dan indexing GIN/Composite.
- **Mikrotik API Connection**: (Existing) Dibutuhkan untuk pengambilan data RAW terbaru.

### **B. External Libraries**
- **Pandas/NumPy**: Untuk pemrosesan data statistik di Python layer.
- **Scipy/Scikit-learn**: (Opsional) Untuk regresi/interpolasi tingkat lanjut pada Stage 0.
- **Redis**: Sebagai message broker Celery dan cache provider.

---

## 5. RENCANA PENGUJIAN (TESTING PLAN)
### **A. Unit Testing (Pytest)**
- Validasi fungsi imputasi data pada `NormalizationService`.
- Verifikasi perhitungan slope dan delta pada `AnalysisService`.
- Pengujian bobot pada `HealthScoreService`.

### **B. Integration Testing**
- End-to-end flow: Raw Data -> Normalization -> Aggregation -> API Output.
- Verifikasi akurasi data setelah konversi waktu (Jam -> Hari).

### **C. Performance Testing (Locust)**
- Target: **1000 RPS** dengan latency **< 200ms** (p95).
- Pengujian beban pada endpoint `/analysis/v2/trend` dengan dataset besar.

---

## 6. EVALUASI ARSITEKTUR & RESOURCE
- **Arsitektur**: Desain V2.1 sudah sangat robust dengan pemisahan *Service Layer* dan *Background Jobs*. Penggunaan SSOT (schema.sql) menjamin konsistensi.
- **Skalabilitas**: Partitioning di DB layer dan caching di API layer memberikan ruang tumbuh yang baik.
- **Resource Tim**: Dibutuhkan setidaknya 1 Senior Backend Developer dan 1 Data Engineer/DBA untuk memastikan performa query optimal.

---
**Disusun Oleh**: AI Pair Programmer
**Disetujui Oleh**: [Menunggu Persetujuan]
