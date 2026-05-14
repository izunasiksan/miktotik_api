# Aturan Prediksi Kapasitas

Dokumen ini menetapkan standar implementasi untuk fitur prediksi kapasitas, mencakup sumber kapasitas, metode proyeksi, perhitungan TTC/headroom, serta praktik UX/keamanan/performa.

## Ruang Lingkup
- Proyeksi trafik & resource jangka pendek/menengah, kartu TTC/headroom, dan rekomendasi.
- Interaksi kontrol global (periode, tanggal, granularity, aggMethod, sumber).

## Sumber Kapasitas
- Gunakan metadata board/interface (mis. link speed) sebagai kapasitas acuan.
- Jika tidak tersedia, izinkan konfigurasi kapasitas manual (opsional).
- Hindari menurunkan kapasitas dari puncak historis kecuali diberi label “proxy”. 

## Aturan Unit & Bucket
- Seleraskan unit beban dan kapasitas (mis. keduanya dalam Mbps).
- Gunakan `bucketSource='server'` untuk lintas metrik (Mbps) agar konsisten.
- Untuk non‑Mbps, jalur frontend digunakan agar konversi byte-unit akurat.

## Metode & Horizon
- Forecast dihitung di backend (heavy analysis) dan dikembalikan dengan interval kepercayaan (lower/upper) bila memungkinkan.
- Horizon disesuaikan dengan periode & granularity (mis. 7–30 hari).
- Hindari proyeksi terlalu panjang tanpa pembaruan data (perbesar TTL/horizon bertahap).

## TTC & Headroom
- Utilisasi = beban / kapasitas; Headroom = kapasitas − beban.
- TTC (konservatif) ditentukan saat proyeksi upper bound menembus kapasitas.
- Jika tren tidak meningkat (slope ≤ 0), TTC dianggap aman/tidak terdefinisi.
- Terapkan batasan numerik untuk mencegah pembagian nol dan hasil tak masuk akal.

## UX
- Tampilkan grafik historis + proyeksi dengan band kepercayaan.
- Kartu ringkas: TTC, peak yang diproyeksikan, headroom minimal pada horizon.
- Beri label unit yang jelas; tampilkan sumber kapasitas (metadata/manual).
- Cantumkan catatan bila memakai “proxy kapasitas” (puncak historis + margin).

## Keamanan & Logging
- Validasi input kapasitas manual dan parameter filter (tanggal/granularity).
- Endpoints heavy analysis & agregasi wajib berotentikasi.
- Log hanya metainformasi (rentang, horizon, jumlah titik); hindari PII/secret.

## Performa
- Terapkan caching pada hasil forecast (TTL mengikuti granularity & horizon).
- Gunakan memoization pada UI; hindari komputasi forecast berat di frontend.

## Pre-Flight Check (Perubahan Prediksi Kapasitas)
1) Identifikasi Domain
- Backend (forecast), Frontend (presentasi/derivasi TTC/headroom), Database (N/A).

2) Dampak & Risiko
- Ketepatan TTC, konsistensi unit/bucket, horizon yang terlalu panjang.

3) Hasil Audit
- Validasi sumber kapasitas, keamanan endpoint, TTL caching, penanganan edge-case TTC.

4) Rekomendasi Eksekusi
- Uji berbagai rentang & granularity; verifikasi TTC terhadap skenario sintetis.

## Rujukan
- Controller: `frontend/src/pages/analysis/hooks/useAnalysisController.js`
- Hook derivasi: `frontend/src/pages/analysis/hooks/useAnalysisData.jsx`
- UI prediksi: `frontend/src/pages/analysis/analysis_prediksi_kapasitas.jsx`
- Layanan API: `frontend/src/services/api.js`
