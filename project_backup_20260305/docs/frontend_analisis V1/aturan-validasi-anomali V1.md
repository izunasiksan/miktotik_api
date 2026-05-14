# Aturan Validasi Anomali

Dokumen ini menetapkan standar validasi anomali untuk menurunkan false positive dan meningkatkan relevansi operasional.

## Prinsip Inti
- Selaraskan bucket & unit antar metrik sebelum validasi.
- Terapkan ambang berbasis statistik yang robust (z-score/MAD/persentil).
- Validasi silang (cross-metric) dan konteks operasional (maintenance window).

## Data & Waktu
- Gunakan granularity konsisten dengan tujuan (hour untuk insiden cepat, day untuk tren lambat).
- Mode “Sumber: Server” direkomendasikan untuk korelasi lintas metrik (traffic=Mbps).
- Rentang tanggal harus valid (ISO-8601); `start ≤ end`.

## Metode & Ambang
- Z-Score: kandidat anomali jika |z| ≥ 3 (dapat disesuaikan per metrik).
- MAD (Median Absolute Deviation): kandidat jika deviasi ≥ 3× MAD.
- Persentil: kandidat jika nilai > p99 (spike) atau < p1 (drop ekstrem).
- Window durasi: event dianggap valid jika berlangsung ≥ 2–3 bucket berurutan.
- Sample size minimum: n ≥ 24 (hourly) atau n ≥ 12 (daily) untuk menghitung ambang stabil.

## Cross-Metric & Konteks
- Traffic spike harus dipertimbangkan kuat jika diiringi kenaikan CPU atau penurunan mem bebas.
- Mark sebagai lemah jika hanya satu metrik menyimpang tanpa dukungan lain.
- Abaikan event yang tumpang tindih dengan maintenance window (mute/scheduled).

## Severity
- Hitung severity berdasarkan kombinasi:
  - Magnitude (|z| atau jarak dari persentil),
  - Durasi (jumlah bucket),
  - Dukungan metrik (jumlah metrik yang menyimpang selaras).
- Pemetaan contoh: Low (ambang lemah), Medium (dua faktor kuat), High (tiga faktor kuat).

## Penggabungan Event
- Gabungkan kandidat berdekatan menjadi satu event jika jarak ≤ 1 bucket.
- Simpan `start_time`, `end_time`, `peak_value`, dan daftar metrik pendukung.

## Outlier vs Anomali
- Outlier tunggal tanpa durasi/dukungan metrik → treat sebagai outlier (bukan anomali).
- Anomali memiliki konteks, durasi, dan dampak yang terukur.

## UX & Pelaporan
- Tampilkan daftar event dengan severity, durasi, metrik pendukung, dan bukti numerik.
- Sediakan opsi filter: periode, granularity, jenis metrik, severity.
- Hindari menampilkan nilai mentah sensitif; gunakan agregat/indikator.

## Keamanan & Logging
- Validasi parameter filter; endpoint terotentikasi di backend.
- Log operasional berisi metainformasi saja (rentang waktu, jumlah event).

## Performa
- Perhitungan ambang & kandidat sebaiknya di backend (heavy analysis) dengan caching.
- TTL cache mengikuti granularity & rentang; hindari recalculation berulang.

## Pre-Flight Check (Perubahan Validasi Anomali)
1) Identifikasi Domain
- Backend (deteksi/validasi), Frontend (presentasi), Database (N/A).

2) Dampak & Risiko
- Performa komputasi, false positive/negative, konsistensi bucket.

3) Hasil Audit
- Validasi ambang & n minimum, keamanan endpoint, TTL caching, maintenance window.

4) Rekomendasi Eksekusi
- Uji di beberapa rentang & granularity; verifikasi severity dan penggabungan event.

## Rujukan
- Controller: `frontend/src/pages/analysis/hooks/useAnalysisController.js`
- UI Anomali: `frontend/src/pages/analysis/analysis_anomali.jsx`
- Hook derivasi: `frontend/src/pages/analysis/hooks/useAnalysisData.jsx`
- Layanan API: `frontend/src/services/api.js`
