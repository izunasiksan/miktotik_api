# Aturan Kebiasaan/Pola

Dokumen ini menetapkan aturan implementasi untuk deteksi dan penyajian kebiasaan/pola pada data trafik dan resource.

## Ruang Lingkup
- Profil jam-ke-jam (HOD), hari-ke-hari (DOW), dan musiman bulanan (opsional).
- Konsumsi oleh halaman/panel Pola/Kebiasaan dan komponen pendukung.

## Aturan Umum
- Gunakan jalur data yang konsisten: API di `src/services/`, derivasi di hook.
- Functional components + Tailwind utility-first; Loading Overlay & Toast wajib.
- Hindari logging PII/secret; jaga read-only untuk semua operasi audit/analisis.

## Data & Granularity
- Pilih granularity yang sesuai: `hour` untuk HOD, `day` untuk DOW, `month` untuk musiman.
- Gunakan `bucketSource='server'` untuk konsistensi lintas metrik (unit traffic = Mbps).
- Untuk unit non-Mbps, jalur frontend lebih tepat agar konversi byte-unit akurat.

## Sampel & Validasi
- Minimal sampel disarankan:
  - DOW: ≥ 14 hari agar rata-rata per hari stabil.
  - HOD: ≥ 7 hari aktif untuk rata-rata per jam yang representatif.
- Validasi filter (periode/tanggal/granularity/aggMethod) sebelum proses.

## Metode & Metrik
- HOD: rata-rata per jam lintas hari dengan smoothing opsional (MA 3-jam).
- DOW: rata-rata per hari dalam minggu; pisahkan hari kerja vs akhir pekan.
- Indeks Pola:
  - Konsistensi (CV), Kekuatan (peak-to-baseline ratio), Stabilitas (pergeseran puncak).
- Tangani missing data secara eksplisit: drop titik yang tak berpasangan.

## Outlier & Deviasi
- Gunakan deteksi anomali (z-score) dari heavy analysis sebagai referensi.
- Sediakan indikator deviasi hari ini terhadap baseline (warna/label di UI).

## UX
- Tampilkan profil + pita variasi; jelaskan unit dan sumber bucket yang dipakai.
- Gunakan label hari (Sen–Min) dan jam (00–23) yang konsisten.

## Performa
- Memoization seperlunya; gunakan `dynamicStaleTime` untuk efisiensi fetch.
- Hindari komputasi berat di UI untuk dataset sangat besar; pertimbangkan backend.

## Keamanan
- Validasi input filter; autentikasi endpoint bila komputasi dipindah ke backend.
- Jangan simpan data mentah sensitif pada log/laporan.

## Pre-Flight Check (Perubahan Kebiasaan/Pola)
1) Identifikasi Domain
- Frontend (pola), Backend (opsional untuk komputasi), Database (N/A).

2) Dampak & Risiko
- Konsistensi bucket, kebutuhan sampel, performa komputasi.

3) Hasil Audit
- Validasi granularity, jumlah sampel, penanganan missing/outlier, keamanan input.

4) Rekomendasi Eksekusi
- Uji HOD & DOW pada berbagai rentang; verifikasi konsistensi dan visual.

## Rujukan
- Controller: `frontend/src/pages/analysis/hooks/useAnalysisController.js`
- Hook derivasi: `frontend/src/pages/analysis/hooks/useAnalysisData.jsx`
- Util analisis: `frontend/src/pages/analysis/analysis_utils.jsx`
- Layanan API: `frontend/src/services/api.js`
