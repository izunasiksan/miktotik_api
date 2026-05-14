# Analisis Refactoring Frontend - Analysis Audit

**Tanggal:** 2026-03-03
**Domain:** Frontend (React)
**Status:** Completed (Refactoring Layered Hooks Selesai)

## 1. Latar Belakang
File `analysis_audit.jsx` sebelumnya menggunakan satu hook raksasa (`useAnalysisAuditLogic.js`) yang menangani terlalu banyak tanggung jawab (UI, Audit, Statistik, Insight). Hal ini membuat kode sulit dipelihara dan diuji.

## 2. Perubahan yang Dilakukan
Sesuai dengan prinsip **Separation of Concerns**, logika telah dipecah menjadi 3 layer utama yang diimplementasikan dalam 4 custom hooks:

### A. Layer UI (`useAnalysisUI.js`)
- **Tanggung Jawab**: Mengelola state UI seperti limit tabel, filter, dan state refreshing.
- **Handler**: `handleLimitChange`, `handleFilterChange`, `handleTriggerAggregation`.

### B. Layer Audit & Statistik Deskriptif
1. **`useDataAudit.js` (Validation Layer)**:
    - Melakukan audit kualitas data dan integritas timeline.
    - **Weighted Health Scoring**: Implementasi pembobotan nilai kesehatan data:
        - CPU > 100% atau Nilai Negatif: **Weight 3** (Kritis).
        - Field Kosong (Missing): **Weight 1** (Minor).
    - Menghasilkan `dataQuality` dan `integrityAudit`.
2. **`useDescriptiveStats.js` (Descriptive Layer)**:
    - Mengelola seluruh statistik deskriptif untuk resource, traffic, interface, dan client.
    - Menghasilkan data untuk 6 tabel pivot bantu.

### C. Layer Insight (`useInsightEngine.js`)
- **Tanggung Jawab (Decision Layer)**: Menentukan kesiapan insight (`methodologyAudit`) dan mengklasifikasikan risiko temuan (`filteredFindings`).
- **Input**: Bergantung pada hasil dari layer Audit untuk menentukan skor kesiapan (`readinessScore`).

## 3. Manfaat Struktur Baru
- **Single Responsibility**: Setiap hook hanya memiliki satu alasan untuk berubah.
- **Objektivitas Scoring**: Health score kini lebih akurat dengan sistem pembobotan (Weighted Scoring).
- **Testability**: Logika validasi data terpisah dari logika UI, memudahkan pengujian unit.
- **Scalability**: Penambahan fitur baru (misal: statistik inferensial) dapat dilakukan dengan membuat hook baru tanpa mengganggu logika yang sudah ada.

## 4. Langkah Selanjutnya
- Pastikan backend menyediakan statistik berat (Z-Score, Korelasi, Peramalan) agar frontend tetap ringan dan hanya fokus pada visualisasi hasil (Descriptive).
- Terapkan pola layered hooks ini pada modul analisis lainnya untuk konsistensi arsitektur.

## 5. Implementasi Backend Granularity (Update 2026-03-03)
**Status:** Completed
**Domain:** Backend & Frontend Integration

### Perubahan Utama:
- **Backend Service (`analysis_service.py`)**: Implementasi parameter `granularity` pada seluruh fungsi analisis (Heavy, Interface, PPPoE, Hotspot, Clients). Menggunakan PostgreSQL `date_trunc` untuk agregasi dinamis (minute, hour, day, week, month) langsung di database.
- **Backend API (`analysis.py` & `reports.py`)**: Menambahkan parameter query `granularity` dengan validasi regex pattern.
- **Frontend API (`api.js`)**: Sinkronisasi seluruh fungsi pemanggilan API analisis untuk mengirimkan parameter granularity.
- **Frontend Controller (`useAnalysisController.js`)**: Integrasi state `granularity` ke dalam React Query key dan query function untuk sinkronisasi otomatis antara UI (GlobalControls) dan Backend.
- **State Persistence**: Seluruh filter (Period, Limit, Start/End Date, Granularity, Unit) kini tersimpan di localStorage via `INSIGHT_PREFS`.

### Manfaat:
- **Scalability**: Mengurangi beban memori browser dengan memindahkan proses agregasi dataset besar (jutaan baris) ke database.
- **Dynamic Views**: Mendukung visualisasi data dengan tingkat detail yang fleksibel (Per Jam s/d Per Bulan) tanpa bottleneck di frontend.
- **Performance**: Query harian tetap menggunakan tabel summary (`board_daily_summary`) untuk kecepatan, sementara query granularity halus (hour/minute) menggunakan tabel raw (`board_speed_stats`).
- **Consistency**: Memastikan seluruh dashboard analisis menggunakan parameter filter yang sama saat berpindah antar tab.

### Verifikasi:
- Integrasi parameter query `granularity` telah diverifikasi pada endpoint:
  - `/api/v1/analysis/{id}/heavy/`
  - `/api/v1/analysis/{id}/interfaces/`
  - `/api/v1/analysis/{id}/pppoe/`
  - `/api/v1/analysis/{id}/hotspot/`
  - `/api/v1/analysis/{id}/clients/`
  - `/api/v1/reports/daily/{id}/`
  - `/api/v1/reports/monthly/{id}/`

### Perbaikan & Optimasi (Update 2026-03-03 - v2):
- **Linter Fix (`analysis_service.py`)**: Memperbaiki referensi atribut model yang salah pada fungsi `get_clients_analysis`.
- **SQL Optimization**: Memastikan penggunaan `date_trunc` pada level database untuk agregasi granularity halus (`hour`, `minute`) guna menangani dataset besar secara efisien.
- **Model Consistency**: Verifikasi atribut model dilakukan langsung ke `models/mikrotik.py` untuk memastikan keselarasan antara kode servis dan definisi database SQLAlchemy.
- **Index Optimization**: Menambahkan index komposit `(board_id, log_time)` pada tabel `board_client_stats`, `board_resource_stats`, dan `board_speed_stats` di `mikrotik.py` untuk mempercepat query agregasi dinamis.
- **Documentation**: Membuat [OPTIMASI_INDEX_DATABASE.md](file:///e:/mikrotik_api/docs/frontend_analisis/OPTIMASI_INDEX_DATABASE.md) untuk mendokumentasikan strategi index pada database PostgreSQL.
- **Auto-Granularity Extension**: Memperluas logika `_determine_granularity` ke seluruh pivot analisis (Interface, PPPoE, Hotspot, Client) untuk sinkronisasi level agregasi di seluruh dashboard.
- **Redis TTL Strategy**: Implementasi kebijakan TTL Redis berbasis granularity: 24 jam untuk data historis (Minggu/Bulan), 1 jam default, dan 5 menit untuk data halus (Menit).

## 6. Standarisasi Audit Frontend - 4 Tahap (Update 2026-03-03 - v3)
**Status:** Completed
**Domain:** Frontend (React)

### Implementasi Kerangka Kerja Audit:
Untuk memastikan akurasi data dan kepatuhan terhadap aturan workspace, seluruh sistem analisis frontend telah distandarisasi ke dalam 4 tahap:

1.  **Stage 1: Exposure (Data Fetching)**
    - Pengambilan data mentah melalui `useAnalysisController.js`.
    - Data tetap dalam bentuk aslinya (Raw) untuk audit integritas awal.
2.  **Stage 2: Normalization (Unit Conversion)**
    - Implementasi `normalizeRawData` di `Analysis.jsx`.
    - Konversi unit dinamis (B -> KB -> MB -> GB) berdasarkan konfigurasi `normalizationConfig`.
    - Mendukung pemetaan kustom (`customMappings`) dan inferensi otomatis.
3.  **Stage 3: Lock (Dimension Validation)**
    - Implementasi `isLocked` (Metric Lock) dan `isTimeLocked` (Time Lock).
    - Memastikan konfigurasi unit dan rentang waktu telah divalidasi sebelum analisis mendalam dimulai.
    - Sinkronisasi state global melalui `useAnalysisController.js` (dengan localStorage persistence).
4.  **Stage 4: Analysis (Gap Filling & Derived Metrics)**
    - Implementasi `finalAnalysisData` dengan `fillGaps` untuk memastikan timeline yang kontinu.
    - Seluruh tab analisis (`Trend`, `Anomali`, `Kapasitas`, `Korelasi`, `Kebiasaan`, `Audit`) kini menggunakan `finalAnalysisData` sebagai sumber tunggal.
    - Metrik turunan (`trafficSeries`, `capacityStats`, `anomaliesList`) dihitung ulang secara terpusat di `Analysis.jsx` untuk memastikan kepatuhan terhadap data yang sudah di-gap-fill.

### Perbaikan Kritis:
- **`analysis_audit.jsx`**: Memperbaiki pelanggaran Stage 4 dengan mengganti `processedData` (un-normalized) menjadi `finalAnalysisData` (normalized + gap-filled).
- **`analysis_korelasi.jsx` & `analysis_kebiasaan.jsx`**: Menghapus kalkulasi hardcoded (pembagi 1024) dan menggantinya dengan utilitas terpusat `bytesToUnit` (SI 1000) dan `toMbps`.
- **Global State Consistency**: Memindahkan state alur audit (`isTimeLocked`, `currentPhase`) dari hook UI lokal ke controller global untuk menjaga konsistensi antar tab.
- **Top Analysis Normalization**: Menambahkan normalisasi unit pada `interfaceAnalysis`, `pppoeAnalysis`, dan `hotspotAnalysis` sebelum divisualisasikan.

### Manfaat:
- **Data Integrity**: Menjamin tidak ada data yang "melompat" atau tidak konsisten antar grafik karena perbedaan metode konversi atau gap timeline.
- **Workspace Compliance**: Mematuhi aturan dilarang melakukan agregasi berat di frontend (semua agregasi tetap di backend, frontend hanya melakukan normalisasi tampilan dan gap-filling ringan).
- **User Experience**: State audit yang persisten memudahkan pengguna untuk berpindah tab tanpa kehilangan progres validasi data.

