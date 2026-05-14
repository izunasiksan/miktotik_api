# Alur Kebiasaan/Pola

Dokumen ini menguraikan alur identifikasi kebiasaan atau pola penggunaan (habit/pattern) dari data trafik dan resource, mulai dari pengambilan data hingga penyajian profil kebiasaan di UI.

## Tujuan
- Mengungkap pola berulang seperti jam sibuk harian atau pola hari kerja vs akhir pekan.
- Memberikan “profil kebiasaan” yang bisa dipakai sebagai baseline operasi.
- Menemukan deviasi dari kebiasaan yang dapat memicu insight atau peringatan.

## Sumber & Jalur Data
- Controller: [useAnalysisController.js](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisController.js)
  - Memuat KPI/report, entities, heavy analysis, summary; mengelola filter global (periode, tanggal, granularity, aggMethod, sumber bucket).
  - Opsional: memuat bucket server via `getTimeAggregate` untuk konsistensi lintas metrik (Mbps).
- Hook Derivasi: [useAnalysisData.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisData.jsx)
  - Normalisasi, fill gaps, agregasi harian (AVG/MAX/SUM/MIN), serta pembentukan deret siap dianalisis.
- UI Pola/Kebiasaan: [analysis_pola.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/analysis_pola.jsx)
  - Mengambil profil kebiasaan dan metrik pendukung untuk ditampilkan (grafik/tabel ringkas).

## Pipeline Ringkas
1) Tetapkan Scope & Filter
   - Pilih domain entitas (mis. keseluruhan board atau interface tertentu), periode/rentang tanggal, granularity, aggMethod harian.
2) Fetch & Penyelarasan
   - Muat data sesuai filter; jika `bucketSource='server'` dan unit=Mbps, gunakan bucket server agar konsisten lintas metrik.
   - Lakukan normalisasi dan `fillGaps` bila penguncian waktu aktif.
3) Pembentukan Profil
   - Profil Jam-ke-Jam (Hour-of-Day/HOD): rata-rata nilai untuk setiap jam melintasi banyak hari.
   - Profil Hari-ke-Hari (Day-of-Week/DOW): rata-rata nilai harian per hari dalam minggu.
   - Profil Musiman Bulanan (opsional): rata-rata nilai per bulan untuk rentang panjang.
4) Metaparameter Pola
   - Konsistensi: koefisien variasi (CV) atau deviasi relatif terhadap profil.
   - Kekuatan Pola: perbandingan puncak-profil vs baseline (peak-to-baseline ratio) atau R² terhadap profil.
   - Stabilitas Waktu: pergeseran puncak (peak shift) antar minggu.
5) Presentasi & Insight
   - Visual HOD/DOW dengan pita variasi; tabel ringkasan puncak/profil.
   - Sorot deviasi hari ini terhadap baseline kebiasaan.

## Profil & Metode
- HOD (Jam-ke-Jam):
  - Kumpulan bucket hourly; hitung rata-rata setiap jam (00–23) di seluruh hari yang tersedia.
  - Smoothing opsional (moving average 3-jam) untuk meredam noise.
- DOW (Hari-ke-Hari):
  - Kumpulan bucket daily; hitung rata-rata untuk Senin–Minggu.
  - Pisahkan hari kerja vs akhir pekan untuk interpretasi lebih praktis.
- Musiman Bulanan (opsional):
  - Kumpulan bucket monthly; sorot pola musiman jangka panjang.

## Interaksi Kontrol Global
- Period/Limit atau Start/End menentukan cakupan data sumber profil.
- Granularity menentukan resolusi (hour/day/month) profil yang dihitung.
- AggMethod harian memengaruhi agregasi saat period `daily`.
- Sumber bucket:
  - Server (direkomendasikan untuk konsistensi lintas metrik di unit Mbps).
  - Frontend (fleksibel untuk unit non-Mbps dan eksplorasi).

## Error & Loading
- Tampilkan Loading Overlay saat perhitungan profil.
- Jika data tidak cukup (n kecil) untuk membentuk profil, tampilkan notifikasi ramah.

## Checklist Verifikasi
- [ ] Granularity sesuai dengan tipe profil (HOD=hour, DOW=daily).
- [ ] n sampel memadai (mis. ≥ 14 hari untuk DOW; ≥ 7 hari aktif untuk HOD).
- [ ] Profil selaras dengan unit dan sumber bucket yang dipilih.
- [ ] Visual menampilkan profil, variasi, dan puncak secara jelas.

## Rujukan
- Controller: `frontend/src/pages/analysis/hooks/useAnalysisController.js`
- Hook derivasi: `frontend/src/pages/analysis/hooks/useAnalysisData.jsx`
- Util analisis: `frontend/src/pages/analysis/analysis_utils.jsx`
- Layanan API: `frontend/src/services/api.js`
