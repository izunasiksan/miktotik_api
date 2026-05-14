# 03. MITIGATION STRATEGY: ANALISIS DATA V2.4

## 1. Strategi Perbaikan Logic Filtering & Akurasi Data
Strategi mitigasi difokuskan pada penguatan alur data (Pipeline Flow) dan memastikan kepatuhan terhadap prinsip **Raw Fidelity** dan **Context Lock**.

### A. Penguatan Alur Pipeline (Stage 0 -> Stage 1)
- **Wajib Stage 0**: Backend **WAJIB** menjalankan normalisasi (Stage 0) sebagai prasyarat utama sebelum data masuk ke Stage 1 (Scope & Filter).
- **Gap Detection & Handling**: Seluruh data hasil normalisasi harus ditandai dengan `isGap: true` jika terdapat kekosongan data dalam rentang waktu yang dipilih, sehingga UI dapat menampilkan status "Data Terbatas" atau "Data Hilang" secara akurat.
- **Pembersihan Data (Sanitization)**: Menghapus nilai `NaN`, `Infinity`, atau outlier ekstrem yang tidak masuk akal (misal: CPU Load > 100%) pada tahap normalisasi.

### B. Implementasi Context Lock yang Ketat (Stage 1)
- **Immutable ScopedDataset**: Sekali data dikunci ke dalam tabel temporary di Stage 1, Stage berikutnya (Trend, Korelasi, Insight) **DILARANG** melakukan query ulang ke tabel sumber mentah (`raw_stats`). Mereka hanya diperbolehkan melakukan agregasi dari tabel temporary yang sudah difilter.
- **Optimasi Index Temporary Table**: Menambahkan index pada kolom `period` dan `board_id` di tabel temporary untuk mempercepat proses agregasi di tahap-tahap berikutnya.

### C. Dinamisasi Granularitas & Akurasi (Accuracy v2.4)
- **Dynamic Accuracy Scoring**: Mengganti `threshold_map` statis dengan perhitungan akurasi dinamis berdasarkan interval polling aktual dari Mikrotik.
- **Auto-Granularity UI Alignment**: Menyesuaikan logika `_determine_time_granularity` agar selalu menghasilkan jumlah titik data yang optimal untuk visualisasi grafik (misal: minimal 12 titik, maksimal 100 titik).

## 2. Peningkatan Integrasi UI & Resilience
- **Smart Error Handling (Frontend)**: Mengimplementasikan pengecekan mendalam pada payload response. Jika `results` kosong namun `metadata` menunjukkan `validCount > 0`, UI harus menampilkan pesan "Data Tersedia namun Gagal Dianalisis" (bukan sekadar "Error").
- **Optimasi Payload (Lean Response)**: Backend hanya mengirimkan data metrik yang diperlukan oleh UI, mengurangi ukuran JSON payload untuk meningkatkan kecepatan rendering grafik di perangkat mobile/low-end.
- **Progress Tracking**: Menampilkan persentase progres pipeline (Stage 1/7, 2/7, dst.) di UI untuk mengurangi persepsi "UI Hang" saat proses analisis berat sedang berlangsung.

## 3. Roadmap Implementasi V2.4

| Tahap | Deskripsi | Target File |
| :--- | :--- | :--- |
| **P1: Logic Fix** | Refaktorisasi `execute_pipeline_v21` untuk mewajibkan data dari Stage 0 masuk ke Stage 1. | [analysis_v2.py](file:///e:/mikrotik_api/backend/app/api_v2/endpoints/analysis_v2.py) |
| **P2: Scoped Fix** | Memperbarui `create_scoped_dataset` untuk mendukung *Context Lock* murni. | [analysis_service.py](file:///e:/mikrotik_api/backend/app/services/analysis_service.py) |
| **P3: UI Resilience** | Update Zustand store dan hook `useAnalysisTaskPolling` untuk menangani status parsial. | [Reports.jsx](file:///e:/mikrotik_api/frontend/src/pages/Reports.jsx) |
| **P4: Accuracy v2.4** | Implementasi perhitungan akurasi dinamis berdasarkan interval log real-time. | [analysis_service.py](file:///e:/mikrotik_api/backend/app/services/analysis_service.py) |

## 4. Rencana Rollback
Jika terjadi degradasi performa yang signifikan pada V2.4, sistem akan:
1. Kembali ke mode caching agresif (Redis) untuk hasil analisis sebelumnya.
2. Menyederhanakan proses normalisasi dengan mematikan fitur `fill_gaps` sementara.

---
*Strategi ini dirancang untuk menyelesaikan isu relevansi data secara permanen.*
