# Aturan Agregasi Waktu

Dokumen ini menetapkan aturan, standar, dan best practice untuk implementasi agregasi waktu pada aplikasi. Aturan berlaku untuk frontend dan backend, memastikan konsistensi bucket lintas tab (Trend, Insight) serta menjaga performa dan keamanan.

## Tujuan & Lingkup
- Menjamin bucket waktu konsisten lintas tab saat analisis.
- Menyediakan dua mode sumber bucket: Frontend dan Server.
- Menentukan pemetaan fungsi agregasi dan granularity.
- Mengatur tata cara pemilihan unit dan fallback.

## Definisi
- Bucket: satuan waktu hasil pengelompokan data (year|month|day|hour).
- Granularity: tingkat ketelitian bucket, default `auto` (disarankan).
- Period: `daily` atau `monthly` (mempengaruhi default limit dan rentang).
- AggMethod (harian): `AVG`, `MAX`, `SUM`, `MIN`.
- Mapping Agg ke backend: `AVG→avg`, `MAX→max`, `SUM→sum`, `MIN→min`.

## Sumber Bucket & Prioritas
1) Server (disarankan untuk konsistensi lintas tab)
- Bucket dihasilkan endpoint agregasi waktu backend.
- Dipakai langsung untuk grafik ketika Usage Unit = Mbps.
- Unit non-Mbps untuk traffic fallback ke Frontend (lihat bagian Unit).

2) Frontend
- Agregasi & standardisasi data dilakukan di browser.
- Dipakai ketika:
  - Mode “Sumber: Frontend” dipilih pengguna, atau
  - Unit traffic bukan Mbps, atau
  - Endpoint server tidak tersedia/bermasalah.

## Aturan Frontend
- Pemanggilan API wajib di `src/services/`.
- Derivasi dan agregasi berada di hook khusus (mis. `useAnalysisData`).
- Gunakan functional components dan Tailwind utility-first.
- Sediakan Loading state dan Toast untuk feedback pengguna.
- Granularity dan AggMethod harian harus memengaruhi grafik.
- Fallback otomatis ke agregasi frontend bila unit bukan Mbps (traffic).
- Jangan mengubah “free_memory” menjadi usage tanpa opsi eksplisit.

## Aturan Backend
- Endpoint agregasi waktu:
  - Path: `/analysis/{board_id}/aggregate/`
  - Params wajib: `start_time`, `end_time` (ISO-8601).
  - Granularity: `auto|year|month|day|hour`.
  - Metric: `download_mbps|upload_mbps|cpu_load|free_memory`.
  - Agg: `sum|avg|count|min|max`.
- Validasi input (rentang waktu, format ISO, nilai granularity/metric/agg).
- Keamanan: endpoint harus berotentikasi dan menghindari kebocoran data.
- Performa: gunakan caching (TTL dinamis mengikuti granularity/rentang).

## Konsistensi Lintas Tab
- Ketika “Sumber: Server” aktif, semua tab yang menampilkan grafik tren harus:
  - Menggunakan bucket yang sama dari server untuk traffic & resource.
  - Menggabungkan hasil per-metric secara deterministik berdasarkan `period`.

## Unit & Konversi
- Traffic (server):
  - Data dari server dalam Mbps.
  - Jika `Usage Unit === 'Mbps'` → gunakan nilai dari server apa adanya.
  - Jika `Usage Unit !== 'Mbps'` → fallback ke frontend agar konversi byte-unit akurat.
- Resource:
  - `cpu_load` dalam persen (0–100).
  - `free_memory` sesuai satuan yang disediakan backend (lihat service/backend); saat ini ditampilkan apa adanya. Opsional ke depan: sediakan toggle “usage = 100 - free”.

## Error Handling & Fallback
- Jika call agregasi server gagal atau hasil tidak sesuai:
  - Tampilkan Loading/Toast yang sesuai.
  - Fallback ke agregasi frontend (berdasarkan data historis yang tersedia).
- Saat menggunakan rentang custom, pastikan validasi `start_date ≤ end_date` dilakukan di UI sebelum apply.

## Pre-Flight Check untuk Perubahan Agregasi
1) Identifikasi Domain
- Frontend / Backend / Database

2) Dampak & Risiko
- Dampak ke performa dan konsistensi bucket lintas tab.
- Risiko fallback tak terduga, mismatch unit, atau query berat di backend.

3) Hasil Audit
- Konsistensi parameter (ISO-8601, granularity, agg, metric).
- Keamanan endpoint (auth) dan sanitasi input.
- Kesesuaian layanan API di `src/services/` dan hook derivasi.

4) Rekomendasi Eksekusi
- Rencana perubahan, strategi rollback, dan verifikasi.
- Lint (frontend), preview dev server, serta uji manual.

## Checklist Uji
- Periode `daily` & `monthly` dengan limit default.
- Rentang custom (tanggal awal/akhir) dan granularity `auto|day|month`.
- AggMethod harian: AVG/MAX/SUM/MIN (grafik berubah sesuai).
- Toggle Sumber: Frontend ↔ Server; bucket tetap konsisten lintas tab.
- Unit: Mbps vs non-Mbps (fallback ke frontend untuk unit non-Mbps).
- Error case: endpoint gagal → UI menampilkan feedback dan fallback.

## Rujukan Implementasi
- Controller: `frontend/src/pages/analysis/hooks/useAnalysisController.js`
- Hook derivasi: `frontend/src/pages/analysis/hooks/useAnalysisData.jsx`
- API client: `frontend/src/services/api.js`
- Kontrol global: `frontend/src/pages/analysis/components/GlobalControls.jsx`
- Konsumen grafik:
  - `frontend/src/pages/analysis/analysis_trend.jsx`
  - `frontend/src/pages/analysis/analysis_insight.jsx`
