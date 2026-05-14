# Aturan Analisis Data

Dokumen ini menetapkan aturan dan standar untuk seluruh proses analisis data (end-to-end) agar hasil yang ditampilkan konsisten, aman, dan efisien. Aturan ini melengkapi: [aturan-proyek](file:///e:/mikrotik_api/docs/aturan-proyek.md), [aturan-agregasi](file:///e:/mikrotik_api/docs/aturan-agregasi.md), dan [alur-analisis-data](file:///e:/mikrotik_api/docs/alur-analisis-data.md).

## Tujuan
- Menjaga konsistensi dan akurasi hasil analisis lintas tab/halaman.
- Menjamin kualitas data (kelengkapan, validasi, outlier-aware).
- Menetapkan praktik performa dan keamanan pada pipeline analisis.

## Prinsip Umum
- Satu sumber kebenaran untuk bucket waktu: gunakan mode Server bila ingin konsistensi lintas tab; gunakan Frontend untuk fleksibilitas unit non-Mbps.
- Semua pemanggilan API di `src/services/`; semua derivasi di hook khusus.
- Selalu sediakan Loading dan Toast feedback untuk setiap aksi pengguna.
- Hindari logging informasi sensitif (PII). Jangan commit secret.

## Kontrak Data & Waktu
- Tanggal/waktu: gunakan ISO-8601 untuk pertukaran dengan backend.
- Timezone: gunakan representasi UTC pada API; representasi di UI menggunakan `toLocaleDateString()` untuk kebutuhan tampilan.
- Field standar (hasil standardisasi):
  - Traffic: `rx`, `tx`, `total`, `displayDate`.
  - Resource: `cpu_percent_standard`, `mem_usage`, `cpu_p`.

## Pipeline Frontend (Standar)
- Pengambilan data dilakukan via React Query di controller: [useAnalysisController.js](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisController.js)
  - KPI harian/bulanan, heavy analysis, summary, entitas (interfaces/PPPoE/hotspot/clients), dan server time buckets (opsional).
- Normalisasi & Pengisian Gap:
  - Dilakukan di [Analysis.jsx](file:///e:/mikrotik_api/frontend/src/pages/Analysis.jsx) menggunakan `normalizeRawData` dan `fillGaps`. Aktifkan gap fill saat waktu dikunci.
- Derivasi & Agregasi:
  - Dilakukan di [useAnalysisData.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisData.jsx).
  - Agregasi harian (AVG/MAX/SUM/MIN) berlaku untuk period `daily`.
  - Saat `bucketSource='server'` dan `usageUnit='Mbps'`, prioritaskan `serverBuckets` untuk grafik tren; selain itu fallback ke agregasi frontend.
- Kinerja:
  - Gunakan `useMemo/useCallback` seperlunya; hindari dependensi berlebihan.
  - Stale time query mengikuti `dynamicStaleTime` di controller (berbasis granularity/rentang).

## Pipeline Backend (Standar)
- Endpoint agregasi waktu:
  - Path: `/analysis/{board_id}/aggregate/`
  - Params: `start_time`, `end_time` (ISO-8601), `granularity`, `metric`, `agg`.
  - Metric yang didukung minimal: `download_mbps`, `upload_mbps`, `cpu_load`, `free_memory`.
  - Agg: `sum|avg|count|min|max` (pemetaan dari frontend).
- Validasi:
  - Tolak rentang waktu tidak valid (`end_time ≤ start_time`).
  - Validasi nilai granularity/metric/agg terhadap whitelist.
- Performa:
  - Caching hasil agregasi dengan TTL dinamis (tergantung granularity/rentang).
  - Hindari query N+1; optimasi indeks pada kolom waktu/board/metric.

## Data Quality & Validasi
- Kelengkapan: hitung jumlah record tanpa kolom utama (mis. cpu/memory) dan turunkan skor kualitas.
- Outlier: deteksi berbasis z-score (dari heavy analysis) dan tampilkan di RCA/anomali.
- Konsistensi unit: pastikan konversi Mbps ↔ byte-unit hanya dilakukan di jalur yang valid (frontend).

## Aturan UI/UX
- Kontrol global (periode, limit, tanggal, granularity, aggMethod, sumber bucket) disatukan di [GlobalControls.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/components/GlobalControls.jsx).
- Wajib Loading Overlay pada grafik dan daftar; tampilkan pesan progres yang jelas.
- Toast untuk error pemuatan (boards/KPI/heavy/summary/interface).

## Logging & Keamanan
- Jangan log kredensial, token, atau data sensitif.
- Validasi semua input user-side sebelum dikirim ke backend (format tanggal, limit, dsb.).
- Backend wajib mengautentikasi akses endpoint analitik.

## Testing & Verifikasi
- Frontend:
  - `npm run lint` harus bebas error.
  - Verifikasi dev preview untuk kontrol filter dan visual (Trend & Insight).
- Backend:
  - Uji manual/otomatis endpoint agregasi waktu, pastikan hasil deterministik.
  - Verifikasi TTL cache dan jalur error.

## Checklist Ringkas
- [ ] Period `daily`/`monthly` dan granularity `auto/day/month` menghasilkan bucket wajar.
- [ ] AggMethod `AVG|MAX|SUM|MIN` mengubah grafik harian sesuai ekspektasi.
- [ ] Toggle Sumber Frontend ↔ Server bekerja, bucket lintas tab konsisten.
- [ ] Unit non-Mbps untuk traffic fallback ke frontend.
- [ ] Loading Overlay & Toast berjalan pada kondisi sukses/gagal.
- [ ] Lint tanpa error; tidak ada kebocoran secret/log PII.
