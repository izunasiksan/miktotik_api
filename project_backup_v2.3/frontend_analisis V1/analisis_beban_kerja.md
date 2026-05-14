# Audit Beban Kerja Frontend Analysis

Dokumen ini menganalisis pembagian beban kerja antara Frontend dan Backend pada modul Analysis, dengan fokus pada kepatuhan terhadap aturan "No Heavy Aggregation in Frontend".

## 1. Identifikasi Logika Berat di Frontend
Berdasarkan audit pada `useAnalysisData.js`, ditemukan beberapa logika yang melakukan kalkulasi agregasi:

### A. Top Growth Users (Potensi Beban Tertinggi)
- **Deskripsi**: Menghitung persentase pertumbuhan penggunaan bandwidth per-user dari data log harian.
- **Proses**: Iterasi seluruh baris report, pengelompokan menggunakan `Map`, perhitungan rata-rata dua periode (split-half), dan pengurutan (sorting).
- **Risiko**: Jika data log mencakup ratusan user dalam periode 30-90 hari, proses ini dapat menghambat main thread.

### B. Health Score Calculation (Fallback)
- **Deskripsi**: Menghitung skor kesehatan perangkat berdasarkan CPU, Memory, Stabilitas (CV), dan Anomali.
- **Proses**: Menggunakan standar deviasi (`std`) dan Z-score jika data dari backend tidak lengkap.

### C. Percentile Fallback (P95/P99)
- **Deskripsi**: Menghitung percentile 95 dan 99 dari data traffic.
- **Proses**: Sorting array traffic dan interpolasi linear (quantile).
- **Catatan**: Saat ini sudah ada mekanisme prioritas menggunakan data dari `heavyAnalysis` (Backend), namun fallback masih ada di frontend.

## 2. Kepatuhan Terhadap Aturan (Workspace Rules)
Aturan `fullfrontend.md` menyatakan:
> "AGREGASI WAJIB DILAKUKAN MENGGUNAKAN QUERI SQL ATAU client–server orchestration di BACKEND."

### Evaluasi:
- **Pelanggaran Ringan**: Perhitungan `Top Growth Users` saat ini murni dilakukan di frontend. Ini seharusnya dipindahkan ke backend melalui endpoint agregasi.
- **Sudah Sesuai**: Fitur **Forecast**, **Anomali**, dan **RCA** sudah mengambil hasil perhitungan dari backend (`heavyAnalysis`). Frontend hanya bertugas memformat tampilan.

## 3. Rekomendasi Pemindahan ke Backend
Untuk menjaga performa, tugas-tugas berikut direkomendasikan untuk dipindahkan sepenuhnya ke backend:
1. **Agregasi Top Growth**: Backend mengirimkan daftar top 5 user dengan pertumbuhan tertinggi secara langsung.
2. **Health Score Pre-calculation**: Backend menghitung skor akhir sehingga frontend hanya menampilkan angka dan warna.
3. **P95/P99 Enforcement**: Memastikan API selalu mengirimkan nilai percentile sehingga tidak perlu ada fallback kalkulasi di frontend.

---
*Dokumen ini dibuat sebagai hasil audit beban kerja pada 2026-03-02.*
