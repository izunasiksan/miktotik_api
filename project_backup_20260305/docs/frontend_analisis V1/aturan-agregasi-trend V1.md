# Aturan Agregasi/Trend

Dokumen ini menetapkan aturan implementasi untuk halaman Trend terkait agregasi waktu, unit, performa, dan UX.

## Ruang Lingkup
- Agregasi waktu pada grafik trafík & resource.
- Top lists (Interfaces/PPPoE/Hotspot) dan Clients chart.
- Interaksi kontrol global (periode, tanggal, granularity, aggMethod, sumber).

## Aturan Umum
- API hanya dipanggil dari `src/services/`; logika derivasi di hook khusus.
- Gunakan functional components dan Tailwind utility-first.
- Wajib Loading Overlay pada kartu grafik dan Toast untuk error.

## Aturan Agregasi Waktu
- Gunakan `bucketSource='server'` untuk konsistensi lintas tab (Traffic/Resource) saat unit=Mbps.
- Mapping fungsi agregasi: `AVG→avg`, `MAX→max`, `SUM→sum`, `MIN→min`.
- Granularity: `auto|year|month|day|hour`; gunakan `auto` sebagai default.
- Periode:
  - `daily`: aktifkan AggMethod harian (AVG/MAX/SUM/MIN).
  - `monthly`: gunakan agregasi sesuai data sumber; AggMethod harian tidak relevan.
- Rentang Tanggal vs Limit:
  - Jika `startDate & endDate` tersedia → abaikan `limit`.
  - Validasi: `start ≤ end` (ISO-8601 `yyyy-MM-dd`). 

## Aturan Unit & Fallback
- Traffic server dalam Mbps:
  - Jika `Usage Unit === 'Mbps'` → konsumsi data server apa adanya.
  - Jika `Usage Unit !== 'Mbps'` → fallback ke agregasi frontend untuk konversi byte-unit.
- Resource Memory: gunakan `free_memory` dari server “as-is”; jangan ubah ke usage tanpa opsi eksplisit.

## Aturan Top Lists & Clients
- Top Interfaces/PPPoE/Hotspot:
  - Hitung nilai total yang konsisten (dl+ul atau unit konversi yang sama).
  - Sorting menurun berdasarkan total, ambil N teratas (mis. Top 5).
  - Label harus menyertakan unit yang dipilih (Mbps atau byte-unit).
- Clients Chart:
  - Series `{ total_pppoe, total_hotspot }` terstandardisasi dari report/clientsAnalysis.
  - Tanggal tampil sebagai `toLocaleDateString()`.

## Performa
- Gunakan memoization seperlunya; hindari dependensi useMemo yang tidak perlu.
- Terapkan `dynamicStaleTime` berbasis granularity/rentang untuk efisiensi fetch.
- Hindari data array besar tanpa pagination/limit yang jelas untuk tabel.

## UX & Aksesibilitas
- Pastikan sumbu, tooltip, dan legend terbaca pada mode compact maupun normal.
- Berikan pesan loading yang spesifik (“Memuat tren trafik…”, “Menganalisis top interfaces…”).
- Tampilkan informasi scope/granularity di kartu untuk konteks pengguna.

## Keamanan & Logging
- Jangan log PII/secret; gunakan log operasional minimal.
- Validasi input filter di sisi UI sebelum apply; backend memverifikasi ulang.

## Pre-Flight Check (Perubahan Trend)
1) Identifikasi Domain
- Frontend (Trend), Backend (agregasi waktu/summary), Database (N/A).

2) Dampak & Risiko
- Performa grafik, konsistensi bucket, fallback unit.

3) Hasil Audit
- Konsistensi pemetaan agg, validasi parameter, keamanan endpoint.

4) Rekomendasi Eksekusi
- Uji lint, preview dev, dan verifikasi visual (daily/monthly, berbagai granularity).

## Rujukan
- Controller: `frontend/src/pages/analysis/hooks/useAnalysisController.js`
- Hook derivasi: `frontend/src/pages/analysis/hooks/useAnalysisData.jsx`
- Layanan API: `frontend/src/services/api.js`
- Komponen Trend: `frontend/src/pages/analysis/analysis_trend.jsx`
