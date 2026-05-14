# Alur Korelasi

Dokumen ini mengurai alur data dan eksekusi untuk fitur Korelasi, dari sumber data hingga penyajian nilai korelasi dan konteksnya di UI.

## Tujuan
- Menilai hubungan linear antar metrik (mis. traffic vs CPU load) pada periode tertentu.
- Menyediakan indikator cepat berupa Pearson r dan jumlah sampel (n).
- Menjaga akurasi dengan penyelarasan bucket waktu dan penanganan data hilang.

## Sumber & Jalur Data
- Controller: [useAnalysisController.js](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisController.js)
  - Memuat heavy analysis yang berisi `correlation` (Pearson r dan sample size).
  - Menyediakan `corrValue` untuk konsumsi UI (r, n) dari heavyAnalysis.
- Korelasi UI: [analysis_korelasi.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/analysis_korelasi.jsx)
  - Mengambil `corrValue` dan konteks waktu dari props (period/limit/start/end/granularity).
- Derivasi tambahan (opsional): [useAnalysisData.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisData.jsx)
  - Menangani normalisasi/aggregasi untuk grafik pendukung jika diperlukan.

## Pipeline Ringkas
1) Fetch heavy analysis
   - Controller mengunduh hasil korelasi dari backend (bagian dari heavy analysis).
2) Sinkron konteks waktu
   - Periode/limit atau rentang tanggal custom + granularity mempengaruhi cakupan data heavy analysis.
3) Ambil nilai korelasi
   - `corrValue = { r, n }` dipetakan dari heavyAnalysis.correlation di controller.
4) Sajikan di UI
   - Halaman Korelasi menampilkan nilai r, jumlah sampel, dan rekomendasi interpretasi.
5) Opsional visual
   - Jika diperlukan, tampilkan scatter/line overlay dari tren terkait (menggunakan data terstandardisasi).

## Penyelarasan Waktu & Missing Data
- Korelasi valid jika kedua deret data berada pada bucket waktu yang sama dan berisi nilai pada titik-titik yang identik.
- Mode Server (bucket konsisten lintas tab, unit traffic = Mbps) direkomendasikan untuk perbandingan lintas metrik.
- Titik dengan data hilang harus di-drop secara simetris dari kedua deret sebelum perhitungan.

## Interaksi Kontrol Global
- Period/Limit atau Start/End menentukan rentang data heavy analysis yang digunakan.
- Granularity mempengaruhi resolusi data yang dianalisis.
- Sumber bucket (Frontend/Server):
  - Server: pastikan korelasi menggunakan bucket yang selaras lintas metrik.
  - Frontend: gunakan saat unit non-Mbps atau untuk eksplorasi lokal.

## Error & Loading
- Tampilkan Loading Overlay saat memuat korelasi.
- Jika heavy analysis gagal atau kosong, tampilkan pesan informatif (mis. “Data korelasi tidak tersedia”).

## Checklist Verifikasi
- [ ] Periode/granularity sesuai dengan konteks analisis.
- [ ] Nilai r dan n terbaca dan sesuai rentang (r ∈ [-1, 1], n ≥ ambang).
- [ ] Data hilang tidak ikut dihitung (drop simetris).
- [ ] Konsistensi bucket lintas metrik terjaga.

## Rujukan
- Controller: `frontend/src/pages/analysis/hooks/useAnalysisController.js`
- Korelasi UI: `frontend/src/pages/analysis/analysis_korelasi.jsx`
- Hook derivasi: `frontend/src/pages/analysis/hooks/useAnalysisData.jsx`
