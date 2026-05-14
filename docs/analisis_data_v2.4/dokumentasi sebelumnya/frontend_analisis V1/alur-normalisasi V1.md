# Alur Normalisasi

Dokumen ini menguraikan alur normalisasi data dari hasil fetch hingga siap dipakai untuk agregasi, derivasi, dan visualisasi. Fokus: konsistensi field, unit, dan waktu; idempotensi; serta penanganan gap.

## Tujuan
- Menstandarkan struktur dan unit data lintas sumber agar dapat dipakai seragam di Trend/Insight/Audit.
- Menjaga akurasi perhitungan (percentiles/peak/delta) melalui penyelarasan waktu & tipe data.
- Menandai dan mengisi gap waktu untuk menjaga integritas deret.

## Sumber & Jalur Data
- Controller: [useAnalysisController.js](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisController.js)
  - Mengelola filter global (periode, limit, tanggal, granularity, aggMethod, sumber bucket) dan memuat KPI/summary/heavy/entities.
- Normalisasi & Fill Gaps: [Analysis.jsx](file:///e:/mikrotik_api/frontend/src/pages/Analysis.jsx)
  - `normalizeRawData()`: standarisasi field & unit.
  - `fillGaps()`: isi bucket kosong saat penguncian waktu aktif.
- Derivasi Lanjutan: [useAnalysisData.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisData.jsx)
  - Mengonsumsi hasil normalisasi untuk agregasi harian, tren, percentiles, delta, dsb.

## Pipeline Ringkas
1) Pengambilan Data
   - Controller memuat KPI/summary/heavy/entities berdasarkan filter global dan sumber bucket.
2) Sanitasi & Cast
   - Pastikan tipe numerik (Number) untuk kolom metrik; drop/mark nilai NaN/undefined.
3) Normalisasi Field
   - Traffic: bentuk standar `{ rx, tx, total, unit }`.
   - Resource: bentuk standar `{ cpu_percent_standard, free_memory, mem_usage }`.
   - Waktu: gunakan ISO-8601 untuk pertukaran; `displayDate` untuk tampilan UI.
4) Penyelarasan Unit
   - Traffic: sesuaikan dengan `usageUnit` aktif (Mbps/byte-unit) agar konsisten lintas komponen.
5) Fill Gaps (opsional)
   - Jika waktu dikunci, isi bucket kosong dengan placeholder numerik (mis. 0) dan `isGap: true`.
   - Hindari memasukkan titik gap ke metrik sensitif (opsi exclude pada percentiles).
6) Output Terstandar
   - Kembalikan array baru (immutability) yang siap dikonsumsi hook derivasi dan UI.

## Field Standar
- Traffic
  - `rx`: nilai unduh standar (mengikuti unit aktif).
  - `tx`: nilai unggah standar.
  - `total`: `rx + tx` (gunakan guard untuk NaN/null).
  - `unit`: label unit saat ini (mis. Mbps, MiB).
  - `displayDate`: string tanggal ramah UI dari timestamp.
- Resource
  - `cpu_percent_standard`: angka 0–100 (konversi dari `cpu_load` atau `%` serupa).
  - `free_memory`: nilai mem bebas dari sumber server (tetap apa adanya).
  - `mem_usage`: opsional; dihitung jika kapasitas diketahui, jika tidak biarkan undefined.

## Waktu & Zona
- Pertukaran dengan backend memakai ISO-8601 (UTC).
- Penyajian UI memakai `toLocaleDateString()` untuk keterbacaan.
- Granularity (auto|year|month|day|hour) menentukan resolusi bucket.

## Kebijakan Unit
- Mode Server (Traffic=Mbps): konsumsi apa adanya dari server untuk konsistensi lintas tab.
- Mode Frontend (non‑Mbps): lakukan konversi byte-unit secara eksplisit sebelum derivasi.

## Fill Gaps
- Buat timeline berdasarkan rentang & granularity aktif.
- Untuk setiap bucket kosong: tambahkan record placeholder `{ rx:0, tx:0, total:0, isGap:true }` (field lain disesuaikan).
- Simpan metadata gap agar komponen/derivasi dapat memutuskan apakah titik gap dihitung.

## Error & Loading
- Tampilkan Loading Overlay saat normalisasi berjalan pada dataset besar.
- Laporkan jumlah record yang di-drop/invalid sebagai bagian data quality.

## Checklist Verifikasi
- [ ] Field & unit sesuai standar (traffic/resource) tanpa NaN.
- [ ] Waktu selaras dan ISO-8601 pada pertukaran, `displayDate` untuk UI.
- [ ] Gap terisi saat penguncian waktu aktif dan diberi penanda `isGap`.
- [ ] Immutability: fungsi normalisasi tidak memodifikasi input.
- [ ] Jalur Server/Frontend menghasilkan bentuk data identik dari sisi konsumen.

## Rujukan
- Controller: `frontend/src/pages/analysis/hooks/useAnalysisController.js`
- Normalisasi & gaps: `frontend/src/pages/Analysis.jsx`
- Hook derivasi: `frontend/src/pages/analysis/hooks/useAnalysisData.jsx`
- Util analisis: `frontend/src/pages/analysis/analysis_utils.jsx`
