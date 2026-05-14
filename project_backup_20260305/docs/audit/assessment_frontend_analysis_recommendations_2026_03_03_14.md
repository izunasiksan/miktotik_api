# ASSESSMENT AWAL & REKOMENDASI PERBAIKAN: MODUL ANALISIS FRONTEND
**Topik:** Frontend Analysis & Data Flow
**Tanggal:** 2026-03-03
**Auditor:** AI Auditor & Assessor
**Prioritas:** MEDIUM

## 1. TEMUAN ASSESSMENT
Setelah melakukan audit mendalam pada folder `frontend/src/pages/analysis/`, berikut adalah penilaian awal:

### A. Alur UI (Flow UI)
*   **Status:** SEHAT (90/100)
*   **Assessment:** Implementasi `NormalizationStage.jsx` sangat baik dalam memandu user melalui fase-fase kritis. Transisi antar fase (exposure → normalization → lock) sangat jelas.
*   **Risiko:** Tidak ada risiko signifikan, namun user mungkin memerlukan petunjuk visual tambahan pada tahap "exposure" tentang kegunaan masing-masing atribut.

### B. Arsitektur Data (Data Flow)
*   **Status:** SEHAT (82/100)
*   **Assessment:** Meskipun `normalizeRawData` sudah ada, distribusinya ke sub-komponen (insight, trend, dll) belum merata. Beberapa sub-komponen masih melakukan konversi manual (seperti `TrafficKpiCard` dan `InterfacePerformanceCard`).
*   **Risiko:** Ketidakkonsistenan tampilan angka jika rumus konversi manual di card berbeda dengan `normalizeRawData` di utilitas pusat.

### C. Konsistensi Unit (Standardization)
*   **Status:** SEHAT (88/100)
*   **Assessment:** Standar SI 1000 diterapkan secara konsisten pada fungsi `toMbps` dan `bytesToUnit`.

## 2. REKOMENDASI PERBAIKAN

### A. Arsitektur Data (Refactoring)
*   **Rekomendasi 1:** Ubah `Analysis.jsx` agar menormalisasi SELURUH data (termasuk `reportRows`, `heavyAnalysis`, dan `interfaceAnalysis`) sebelum diteruskan ke sub-komponen.
*   **Rekomendasi 2:** Hapus logika konversi manual (seperti `toMbps(value)` atau `bytesToUnit(value, usageUnit)`) di dalam komponen card (contoh: `TrafficKpiCard.jsx`). Gunakan nilai yang sudah ternormalisasi dari props.

### B. UI/UX (Enhancement)
*   **Rekomendasi 1:** Tambahkan tooltip atau deskripsi singkat pada masing-masing atribut di tahap "Exposure" untuk mengedukasi user tentang data mentah yang tersedia.
*   **Rekomendasi 2:** Tambahkan indikator status "TERNORMALISASI" pada card insight saat konfigurasi unit dikunci, agar user yakin data yang dilihat adalah hasil normalisasi.

### C. Pengujian (Testing)
*   **Rekomendasi 1:** Tambahkan unit test untuk `normalizeRawData` guna memastikan konversi unit yang kompleks (misal: Bytes ke Gbps) tetap akurat di berbagai skenario input.

## 3. RENCANA TINDAK LANJUT
*   **Minggu 1:** Sinkronisasi normalisasi data di level `Analysis.jsx` untuk semua tab (Insight, Trend, Kapasitas).
*   **Minggu 2:** Pembersihan logika konversi manual di tingkat card.
*   **Minggu 3:** Implementasi tooltip edukasi di tahap Exposure.
