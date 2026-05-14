# Logika Audit & Agregasi Frontend Analysis

Dokumen ini mencatat standarisasi logika yang diterapkan pada `analysis_audit.jsx` dan hook terkait untuk memastikan konsistensi data dan menghilangkan ambiguitas sesuai dengan `AMBIGUITAS_LOGIKA.md`.

## 1. Standarisasi CPU & Resource
- **Field Tunggal:** Menggunakan `cpu_percent_standard` sebagai satu-satunya referensi beban CPU di seluruh komponen audit.
- **Mapping:** Field ini dipetakan secara otomatis dari berbagai kandidat backend (`cpu_load`, `cpu`, `cpu_usage`, dll) melalui fungsi `standardizeTableData` di `analysis_utils.jsx`.
- **Audit Batas:** Validasi `outOfBounds` hanya dilakukan pada field standardized ini (0-100%).

## 2. Standarisasi SI (Network Standard)
- **Faktor Konversi:** Menggunakan faktor **1000** (bukan 1024) untuk semua konversi Bytes ke KB/MB/GB/TB.
- **Throughput (Mbps):** Menggunakan fungsi `toMbps` dengan rumus `(bytes * 8) / (1000 * 1000)` untuk memastikan konsistensi dengan standar perangkat jaringan.

## 3. Deteksi Gap Waktu (Timeline Integrity)
- **Dynamic Interval:** Tidak lagi menggunakan hardcoded interval (misal: 1 jam). 
- **Logika Median:** Menghitung median dari perbedaan waktu antar sampel untuk menentukan interval "normal".
- **Threshold Gap:** Sebuah gap dideteksi jika perbedaan waktu > **1.5x median interval**. Hal ini membuat deteksi gap adaptif terhadap berbagai periode data (menit/jam/hari).

## 4. Agregasi Data Harian
- **Otomatisasi:** Jika user memilih filter "Daily", data per jam/menit akan dikelompokkan berdasarkan tanggal (`YYYY-MM-DD`).
- **Metode User-Defined:** User dapat memilih metode agregasi melalui UI:
  - **AVG (Average):** Rata-rata nilai dalam satu hari.
  - **MAX (Maximum):** Nilai tertinggi (penting untuk deteksi peak load).
  - **SUM (Summary):** Total nilai (penting untuk akumulasi trafik bytes).
  - **MIN (Minimum):** Nilai terendah.
- **Implementasi:** Dilakukan di `analysis_audit.jsx` menggunakan fungsi `aggregateDailyData` sebelum data didistribusikan ke layer visualisasi.

## 5. Insight Engine & Decision Layer
- **Pembersihan Logika Berat:** Perhitungan statistik berat seperti Z-Score atau Linear Regression manual telah dihapus dari frontend.
- **Backend-Driven:** Frontend kini hanya memvalidasi kesiapan alur data (Readiness Score) dan menampilkan insight berdasarkan data yang sudah diproses oleh Backend Engine.
- **Kriteria Kesiapan:** Insight dianggap "Reliable" jika:
  - Sampel minimal harian >= 7 hari.
  - Tidak ada gap waktu signifikan.
  - Korelasi backend tersedia.

## 6. Standarisasi Komponen & UI
- **Modular Table:** Menggunakan komponen `AnalysisTable.jsx` secara langsung di seluruh sub-halaman analisis untuk konsistensi tampilan dan fitur (sorting, filtering).
- **Penghapusan Utility Deprecated:** 
  - `renderTable`: Digantikan oleh import langsung `AnalysisTable`.
  - `bytesToUnit`: Digantikan oleh logika konversi langsung atau `formatBytesAuto` (SI 1000) untuk menghilangkan dependensi pada utilitas lama yang ambigu.
- **Pemisahan Scope vs Granularitas:** 
  - Seluruh label time-series wajib mencantumkan **Scope** (Rentang Analisis, misal: 30 Hari) dan **Granularitas** (Level Agregasi, misal: Per Hari).
  - Contoh Label Standar: `Distribusi Harian (MB) - Scope: 30 Hari • Granularitas: Per Hari`.

---
*Terakhir diupdate: 2026-03-03*
