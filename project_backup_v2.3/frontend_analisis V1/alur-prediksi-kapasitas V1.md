# Alur Prediksi Kapasitas

Dokumen ini menguraikan end-to-end flow prediksi kapasitas jaringan (trafik & resource), termasuk pengambilan data, sinkronisasi bucket, perhitungan proyeksi, dan penyajian insight seperti Time-To-Capacity (TTC) dan headroom.

## Tujuan
- Memprediksi pertumbuhan beban dan waktu tersisa hingga menyentuh kapasitas.
- Memberikan headroom dan rekomendasi aksi berdasarkan proyeksi konservatif.
- Menjaga konsistensi unit & bucket lintas metrik untuk akurasi.

## Sumber & Jalur Data
- Controller: [useAnalysisController.js](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisController.js)
  - Memuat heavy analysis (forecast), KPI, summary, dan entitas; mengelola filter global.
  - (Opsional) Memuat bucket server via `getTimeAggregate` untuk konsistensi lintas metrik (DL/UL/CPU/Memory).
- Hook Derivasi: [useAnalysisData.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisData.jsx)
  - Normalisasi, pengisian gap, agregasi harian (AVG/MAX/SUM/MIN), dan derivasi metrik utilitas/headroom/TTC.
- UI Prediksi Kapasitas: [analysis_prediksi_kapasitas.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/analysis_prediksi_kapasitas.jsx)
  - Menampilkan grafik proyeksi, kartu TTC/headroom, dan rekomendasi.
- Layanan API: [api.js](file:///e:/mikrotik_api/frontend/src/services/api.js)
  - Endpoint heavy analysis (forecast) & (opsional) agregasi waktu.

## Pipeline Ringkas
1) Tetapkan Scope & Filter
   - Domain/entitas: board atau interface; periode/limit atau start–end; granularity; aggMethod; sumber bucket.
2) Fetch & Sinkronisasi
   - Unduh heavy analysis (forecast) dan sumber data pendukung (KPI, summary).
   - Jika `bucketSource='server'` dan unit=Mbps, gunakan bucket server agar lintas metrik selaras.
   - Normalisasi & `fillGaps` bila penguncian waktu aktif.
3) Forecast
   - Gunakan hasil forecast dari backend (mis. nilai proyeksi & interval kepercayaan).
   - Proyeksi jangka pendek menengah (mis. 7–30 hari) dengan sampling yang konsisten dengan granularity.
4) Derivasi Kapasitas
   - Kapasitas acuan: metadata board/interface (link speed) atau konfigurasi opsional.
   - Utilisasi = beban / kapasitas (unit harus selaras).
   - Headroom = kapasitas − beban (gunakan proyeksi upper bound untuk konservatif).
   - Time-To-Capacity (TTC) ≈ waktu saat proyeksi (upper) menembus kapasitas.
5) Presentasi & Insight
   - Grafik tren historis + proyeksi (dengan band kepercayaan).
   - Kartu ringkas: TTC, peak yang diproyeksikan, headroom minimal pada horizon.
   - Rekomendasi: tingkatkan kapasitas/optimasi QoS jika TTC < ambang organisasi.
6) Arsip & Reproduksibilitas
   - Simpan ringkasan insight dan parameter filter untuk audit (tanpa PII).

## Interaksi Kontrol Global
- Period/Limit atau Start/End menentukan cakupan historis dan horizon proyeksi.
- Granularity memengaruhi resolusi proyeksi dan sensitifitas TTC.
- AggMethod harian memengaruhi agregasi daily untuk basis perhitungan.
- Sumber: Server (disarankan untuk Mbps lintas metrik) vs Frontend (non‑Mbps/eksplorasi).

## Unit & Fallback
- Traffic server dalam Mbps; kapasitas harus pada unit yang sama untuk perhitungan rasio.
- Jika unit non‑Mbps dipilih, jalur frontend menjaga konversi byte-unit akurat.

## Error & Loading
- Tampilkan Loading Overlay saat memuat forecast.
- Jika forecast tidak tersedia, tampilkan fallback ringkas (tren linear sederhana) dengan label peringatan.

## Checklist Verifikasi
- [ ] Bucket & unit konsisten antara beban dan kapasitas acuan.
+- [ ] Forecast tersedia dan horizon sesuai kebutuhan (mis. 7/30 hari).
 - [ ] TTC dihitung berdasarkan proyeksi upper bound (konservatif).
 - [ ] Headroom minimal pada horizon tercantum jelas.
 - [ ] Visual dilengkapi band kepercayaan dan label unit.

## Rujukan
- Controller: `frontend/src/pages/analysis/hooks/useAnalysisController.js`
- Hook derivasi: `frontend/src/pages/analysis/hooks/useAnalysisData.jsx`
- UI prediksi: `frontend/src/pages/analysis/analysis_prediksi_kapasitas.jsx`
- Layanan API: `frontend/src/services/api.js`
