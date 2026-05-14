# Aturan Korelasi

Dokumen ini menetapkan aturan dan standar implementasi fitur Korelasi, mencakup penyelarasan data, pemilihan sampel, metode, serta praktik keamanan/performa.

## Prinsip Inti
- Korelasi harus dihitung pada deret waktu yang selaras (bucket identik).
- Tangani missing data dengan drop simetris (pasangan titik waktu wajib ada untuk kedua metrik).
- Hindari interpretasi berlebihan: korelasi ≠ kausalitas.

## Data & Waktu
- Gunakan granularity yang konsisten untuk kedua metrik (auto|year|month|day|hour).
- Periode/rentang yang dipilih di UI wajib tercermin pada data heavy analysis.
- Disarankan mode “Sumber: Server” untuk konsistensi bucket lintas metrik (traffic/cpu/memory).

## Metode & Ambang
- Pearson correlation (r) sebagai standar: r ∈ [-1, 1].
- Ukur sample size (n) dan tampilkan bersama r untuk konteks signifikansi.
- Rekomendasi ambang minimum n (dapat disesuaikan): n ≥ 12 untuk daily bucket, n ≥ 24 untuk hourly.

## Penanganan Outlier
- Gunakan hasil deteksi anomali dari heavy analysis (z-score) sebagai referensi.
- Opsi: sediakan tampilan korelasi “dengan” dan “tanpa” outlier jika dibutuhkan analisis mendalam.

## Unit & Normalisasi
- Standarkan unit sebelum korelasi (traffic dalam Mbps ketika memakai bucket server).
- Jangan mencampur unit berbeda tanpa konversi eksplisit.

## Performa & Keamanan
- Hitung korelasi di backend (heavy analysis) untuk efisiensi.
- Terapkan caching pada hasil korelasi bersama bucket yang sama (TTL mengikuti granularity).
- Endpoint heavy analysis wajib berotentikasi; sanitasi parameter waktu/granularity.

## UX
- Tampilkan nilai r dan n secara jelas, serta interpretasi ringkas (mis. lemah/sedang/kuat).
- Sediakan konteks waktu (periode, granularity) agar pembaca tidak salah tafsir.

## Pre-Flight Check (Perubahan Korelasi)
1) Identifikasi Domain
- Backend (perhitungan), Frontend (presentasi), Database (N/A).

2) Dampak & Risiko
- Ketepatan hitung r, performa perhitungan, konsistensi bucket.

3) Hasil Audit
- Validasi parameter, keselarasan bucket, keamanan endpoint, TTL caching.

4) Rekomendasi Eksekusi
- Uji beberapa rentang waktu & granularity; verifikasi r dan n stabil.

## Rujukan
- Controller: `frontend/src/pages/analysis/hooks/useAnalysisController.js`
- Korelasi UI: `frontend/src/pages/analysis/analysis_korelasi.jsx`
- Hook derivasi: `frontend/src/pages/analysis/hooks/useAnalysisData.jsx`
