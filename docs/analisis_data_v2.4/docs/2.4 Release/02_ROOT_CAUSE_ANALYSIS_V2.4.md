# 02. ROOT CAUSE ANALYSIS: ANALISIS DATA V2.4

## 1. Ringkasan Temuan
Kegagalan layanan analisis data pada V2.3 bukan disebabkan oleh infrastruktur (Redis/Docker), melainkan oleh **cacat logika pada Pipeline Execution** dan **diskoneksi antara pengambilan data (Backend) dengan ekspektasi visualisasi (Frontend)**.

## 2. Akar Penyebab Teknis (Deep Dive)

### A. Pengabaian Stage 0 (Normalization) pada Pipeline
- **Masalah**: Meskipun `normalization_v2.run_normalization_preview` dipanggil di [analysis_v2.py](file:///e:/mikrotik_api/backend/app/api_v2/endpoints/analysis_v2.py#L75), hasilnya hanya digunakan untuk mengecek akurasi metadata, **bukan sebagai sumber data** untuk Stage 1.
- **Dampak**: Stage 1 (`create_scoped_dataset`) langsung mengambil data dari tabel mentah (`board_speed_stats`, dll) tanpa melewati proses pembersihan gap atau penyelarasan unit yang sudah dilakukan di Stage 0. Hal ini menyebabkan data "kotor" (NaN, gaps, spikes) masuk ke proses analisis.

### B. Inefisiensi & Ketidakakuratan Scoped Dataset (Stage 1)
- **Masalah**: Logika pada `create_scoped_dataset` di [analysis_service.py](file:///e:/mikrotik_api/backend/app/services/analysis_service.py#L218) menggunakan materialisasi tabel temporary yang kaku.
- **Kesalahan Logic**: Jika rentang waktu > 365 hari, sistem berpindah ke `BoardDailySummary`. Namun, untuk rentang waktu sub-day (misal: 6 jam), sistem tetap menggunakan raw data yang sangat besar tanpa optimasi index yang tepat pada level query temporary table.
- **Data Leakage**: Tidak adanya mekanisme *Context Lock* yang ketat menyebabkan filter waktu pada Stage 2 s/d Stage 7 terkadang meleset dari rentang yang dikunci di Stage 1.

### C. Mismatch Granularitas & Agregasi
- **Masalah**: Fungsi `time_aggregate` di [analysis_service.py](file:///e:/mikrotik_api/backend/app/services/analysis_service.py#L100) menentukan granularitas secara otomatis (`_determine_time_granularity`), namun seringkali tidak sesuai dengan kebutuhan grafik di UI.
- **Contoh**: Filter 24 jam menghasilkan granularitas `hour` (24 titik data), namun jika data mentah hanya tersedia di 2 jam terakhir, grafik akan terlihat kosong di awal tanpa penjelasan (gap detection gagal).
- **Accuracy Penalty**: Perhitungan `accuracy_pct` menggunakan `threshold_map` yang statis, yang tidak memperhitungkan variasi interval polling Mikrotik yang sebenarnya (tidak selalu 1 menit).

### D. Kelemahan Integrasi Frontend (Zustand & Hook)
- **Masalah**: Frontend mengasumsikan data selalu sukses jika status 200, padahal payload bisa berisi `results` yang kosong atau tidak lengkap.
- **Logic Error**: Hook `useAnalysisTaskPolling` tidak menangani state kegagalan parsial di dalam tahapan pipeline (misal: Stage 1 sukses, tapi Stage 2 gagal karena data tidak cukup).

## 3. Matriks Kesalahan (V2.3 vs SSOT)

| Fitur | Implementasi V2.3 | Standar SSOT (V2.1/V2.4) | Status |
| :--- | :--- | :--- | :--- |
| **Data Flow** | Raw -> Stage 1 (Direct) | Raw -> Stage 0 -> Stage 1 | **VIOLATION** |
| **Context Lock** | Longgar (Re-filter possible) | Ketat (Immutable ScopedDataset) | **WEAK** |
| **Gap Handling** | Diabaikan di Backend | Wajib ditandai (`isGap: true`) | **FAIL** |
| **Accuracy** | Statis (Threshold map) | Dinamis (Based on raw samples) | **INACCURATE** |

## 4. Kesimpulan Analisis
Isu utama adalah **"Skipping Stage 0"**. Dengan melompati tahap normalisasi, backend mengirimkan dataset yang tidak konsisten ke mesin agregasi, menghasilkan informasi yang menyesatkan bagi pengguna akhir.

---
*Dokumen ini menjadi dasar teknis untuk perbaikan mitigasi pada V2.4.*
