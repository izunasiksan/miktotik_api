# Dokumentasi Komponen ScopeFilterStage

## Deskripsi Umum
[ScopeFilterStage.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/ScopeFilterStage.jsx) adalah komponen tingkat **Molecule** dalam arsitektur Atomic Design yang menangani **Stage 1: Scope & Filter** pada pipeline analisis data. Komponen ini berfungsi sebagai pintu masuk utama (Entry Point) untuk menentukan parameter analisis sebelum pipeline dijalankan.

## Fitur Utama
1.  **Context Lock (P0)**: Mekanisme penguncian parameter (Router, Rentang Waktu, Granularitas) saat analisis sedang berjalan untuk menjaga integritas data antar stage.
2.  **Pemilihan Target Router**: Mengambil daftar router (boards) dari API dan memungkinkan pengguna memilih router spesifik yang akan diaudit.
3.  **Rentang Waktu Audit (Audit Range)**:
    -   Mendukung pemilihan waktu mulai dan selesai secara kustom menggunakan `QuickDatePicker`.
    -   Menyediakan *Presets* cepat: Last Day, Last 7 Days, Last Month, Last 60 Days, dan Last Year.
4.  **Granularitas Waktu**: Opsi untuk menentukan kepadatan data (Auto, Hourly, Daily, Monthly).
5.  **Pre-Flight Check**: Melakukan validasi awal terhadap kualitas data (normalisasi) sebelum pipeline dijalankan. Jika kualitas data di bawah 100%, sistem akan memberikan peringatan.
6.  **Pipeline Execution**: Menjalankan tugas analisis secara asinkron ke backend dan memantau statusnya.

## State Management
-   **Zustand (Global)**:
    -   `useContextLockStore`: Mengelola parameter filter (boardId, timeRange, granularity) dan status penguncian (`isLocked`).
    -   `useAnalysisStore`: Mengelola status tugas analisis, ID tugas saat ini, dan metadata hasil scan.
-   **React Query**: Digunakan untuk fetching data daftar router (`getBoards`) dengan caching otomatis.
-   **Local State**: Mengelola status pre-flight, kesalahan validasi, dan UI feedback.

## Integrasi API
-   `getBoards`: Mengambil daftar perangkat router.
-   `getNormalizationStatus`: Mengecek tingkat akurasi data pada rentang waktu terpilih.
-   `executeAnalysisAsync`: Memulai proses pipeline analisis di backend.

## Teknologi yang Digunakan
-   **Icons**: `lucide-react` (ShieldCheck, Lock, Play, dll).
-   **Styling**: Tailwind CSS untuk UI yang responsif dan modern.
-   **Notifications**: `react-hot-toast` untuk feedback pengguna (loading, success, error).
-   **Animations**: Tailwind `animate-in` untuk transisi UI yang halus.

---
*Catatan: Komponen ini telah diperbarui ke versi 2.4.1 untuk mendukung konvensi penamaan camelCase pada request/response API sesuai dengan aturan workspace. Untuk menghindari ambiguitas pada dokumentasi logic, istilah **`board_usage_stats`** merujuk pada tabel **`board_interface_usage`** di database PostgreSQL.*
