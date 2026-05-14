# Alur Audit (Scope & Filter)

Dokumen ini menjelaskan langkah-langkah audit yang berfokus pada penetapan scope dan filter, dari persiapan hingga pelaporan temuan. Fokus: aman, dapat dilacak, dan konsisten dengan aturan proyek.

## Tujuan
- Menentukan ruang lingkup (scope) audit yang jelas dan dapat dipertanggungjawabkan.
- Menggunakan filter yang tervalidasi agar hasil audit fokus dan repeatable.
- Memastikan seluruh proses bersifat read-only dan aman.

## Definisi
- Scope: batas ruang audit (domain, entitas, waktu).
- Filter: parameter penyaring data (periode, limit, rentang tanggal, granularity, aggMethod, nama/entitas).

## Alur Langkah
1) Tetapkan Scope
- Domain: Database / Backend / Frontend / Infrastruktur.
- Entitas: board, interface, PPPoE, hotspot, client, dsb.
- Waktu: period (daily/monthly), limit, atau rentang tanggal (start/end).

2) Tentukan Filter
- Periode & limit default sesuai kebutuhan.
- Rentang tanggal khusus (ISO-8601, yyyy-MM-dd) bila perlu.
- Granularity (auto|year|month|day|hour) dan aggMethod (AVG|MAX|SUM|MIN) untuk analisis harian.
- Filter nama/entitas untuk fokus (mis. interface tertentu).

3) Validasi Pre-Flight
- Gunakan format 4 bagian:
  - Identifikasi Domain (scope, file/komponen terkait).
  - Dampak & Risiko (what-if & mitigasi).
  - Hasil Audit (cek dependency, skema/tipe data, keamanan).
  - Rekomendasi Eksekusi (langkah, verifikasi, rollback).
- Jalankan validasi parameter: `validateFilterParams` pada UI.
- Terapkan aturan domain (Database/Backend/Frontend) dari dokumen aturan.

4) Eksekusi Pengumpulan Data (Read-Only)
- Jalur Frontend:
  - Gunakan controller untuk memuat KPI, summary, heavy analysis, entitas.
  - Jika perlu konsistensi bucket lintas tab, aktifkan sumber bucket “Server” (Mbps) atau gunakan Frontend untuk unit non-Mbps.
- Jalur Backend (jika dibutuhkan via endpoint agregasi waktu):
  - Pastikan param waktu valid, metric/agg legal, dan endpoint berotentikasi.

5) Analisis & Normalisasi
- Normalisasi data (penamaan kolom/units).
- Fill gaps (jika penguncian waktu aktif) agar bucket lengkap.
- Sesuaikan agregasi sesuai aggMethod harian atau gunakan bucket server.

6) Pelaporan & Temuan
- Rekomendasikan tindakan berbasis:
  - Health score, percentiles, anomali/z-score, korelasi.
- Sertakan bukti (timestamp, entitas, metrik).
- Simpan ringkasan hasil audit dan parameter scope/filter yang dipakai.

7) Penutupan & Arsip
- Pastikan tidak ada data sensitif dalam laporan.
- Arsipkan checklist Pre-Flight, parameter filter, dan ringkasan temuan.

## Diagram Sederhana

  Scope → Filter → Pre-Flight → Fetch (RO) → Normalisasi/Gap Fill → Agregasi → Temuan → Arsip

## Rujukan Kode
- Controller (state/filter/query): [useAnalysisController.js](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisController.js)
- Utils & Validasi filter: [analysis_utils.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/analysis_utils.jsx)
- Halaman Audit: [analysis_audit.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/analysis_audit.jsx)
- Hook derivasi: [useAnalysisData.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisData.jsx)
- Endpoint agregasi waktu: [api.js](file:///e:/mikrotik_api/frontend/src/services/api.js)
