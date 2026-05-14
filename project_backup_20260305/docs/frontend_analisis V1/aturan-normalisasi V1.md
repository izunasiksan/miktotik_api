# Aturan Normalisasi

Dokumen ini menetapkan standar normalisasi data lintas sumber (KPI/summary/heavy/entities) agar konsisten, akurat, dan aman digunakan di seluruh tab analisis.

## Prinsip Umum
- Normalisasi bersifat pure & idempotent: tidak memodifikasi input; selalu mengembalikan struktur baru.
- API hanya di `src/services/`; normalisasi dilakukan di lapisan presentasi (Analysis.jsx) atau util terkait.
- Jangan log PII/secret; kesalahan ditangani tanpa memaparkan data sensitif.

## Standar Field
- Traffic
  - `rx`, `tx`, `total`, `unit`, `displayDate`.
  - Hindari null propagasi: gunakan guard saat `total = rx + tx`.
- Resource
  - `cpu_percent_standard` (0–100), `free_memory`, `mem_usage` (opsional, jika kapasitas diketahui).

## Waktu
- Pertukaran dengan backend: ISO-8601 (UTC).
- Tampilan UI: `toLocaleDateString()` untuk user-friendly date.
- Penamaan timestamp konsisten (mis. `timestamp`/`date`); konversi eksplisit bila tidak selaras.

## Unit
- Traffic server diasumsikan Mbps pada mode Server; konsumsi apa adanya.
- Non‑Mbps (byte-unit) dikelola di frontend: konversi dilakukan sebelum derivasi.
- Jangan campur unit berbeda dalam satu perhitungan; konversi dulu.

## Casting & Validasi
- Parse numerik dengan aman; drop/flag nilai non-angka (NaN, Infinity).
- Terapkan normalisasi tipe (Number, String) sesuai kebutuhan derivasi.
- Catat jumlah record yang di-drop untuk data quality (tanpa detail sensitif).

## Fill Gaps
- Terapkan hanya saat penguncian waktu aktif.
- Placeholder berisi nilai 0 untuk metrik kumulatif dan `isGap: true`.
- Sediakan opsi untuk mengecualikan titik gap dari perhitungan percentiles/kor.

## Performa
- Gunakan operasi berbasis array-mapping; hindari loop bertingkat yang tidak perlu.
- Memoization di tingkat derivasi (hook) untuk mencegah re-normalisasi berulang.

## Keamanan & Logging
- Jangan menyertakan payload mentah pada error log; log hanya metainformasi.
- Validasi filter (periode/tanggal/granularity) sebelum memicu normalisasi berat.

## Pre-Flight Check (Perubahan Normalisasi)
1) Identifikasi Domain
- Frontend (normalisasi), Backend (N/A), Database (N/A).

2) Dampak & Risiko
- Konsistensi derivasi lintas tab, efek pada percentiles/peak/delta.

3) Hasil Audit
- Verifikasi standar field, unit, penanganan NaN, dan fill gaps.

4) Rekomendasi Eksekusi
- Uji normalisasi pada data campuran (Mbps & byte-unit) dan berbagai granularity.

## Rujukan
- Normalisasi & gaps: `frontend/src/pages/Analysis.jsx`
- Controller: `frontend/src/pages/analysis/hooks/useAnalysisController.js`
- Hook derivasi: `frontend/src/pages/analysis/hooks/useAnalysisData.jsx`
- Util: `frontend/src/pages/analysis/analysis_utils.jsx`
