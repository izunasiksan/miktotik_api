# Alur Validasi Anomali

Dokumen ini menguraikan end-to-end flow validasi anomali dari data time-series (trafik & resource), mulai dari penetapan scope/filter, deteksi, validasi silang, hingga penyajian dan arsip.

## Tujuan
- Mengidentifikasi outlier/anomali yang relevan operasional dengan tingkat false positive rendah.
- Menyelaraskan bucket waktu dan unit antar metrik sebelum validasi.
- Menyediakan ringkasan yang dapat ditindaklanjuti (severity, konteks, bukti).

## Sumber & Jalur Data
- Controller: [useAnalysisController.js](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisController.js)
  - Memuat heavy analysis (termasuk anomali) beserta konteks filter global.
- UI Validasi Anomali: [analysis_anomali.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/analysis_anomali.jsx)
  - Menampilkan daftar/peta waktu anomali dengan severity dan rincian bukti.
- Hook Derivasi: [useAnalysisData.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisData.jsx)
  - Menyediakan deret siap pakai untuk visual pendukung.
- Layanan API: [api.js](file:///e:/mikrotik_api/frontend/src/services/api.js)
  - Endpoint heavy analysis/anomali & (opsional) agregasi waktu.

## Pipeline Ringkas
1) Tetapkan Scope & Filter
   - Domain/entitas: board, interface, PPPoE/hotspot, dsb.
   - Waktu: period/limit atau start–end (ISO-8601), granularity, sumber bucket, aggMethod.
2) Fetch & Sinkronisasi
   - Unduh heavy analysis-anomaly dari backend.
   - Jika `bucketSource='server'` dan unit=Mbps, gunakan bucket server untuk konsistensi lintas metrik.
   - Normalisasi & fill gaps jika perlu (untuk visual pembanding).
3) Deteksi Dasar (dari Backend)
   - Backend menghitung kandidat anomali (mis. z-score, p95/p99, MAD).
   - Sertakan metadata: metrik, timestamp, nilai, score (z), dan window.
4) Validasi Ulang di UI
   - Pastikan bucket selaras antar metrik (trafik vs CPU/memory).
   - Drop titik tanpa pasangan saat korelasi/konfirmasi.
   - Terapkan ambang minimal n dan window (mis. durasi ≥ 2–3 bucket).
5) Validasi Silang (Cross-Metric/Contextual)
   - Konfirmasi kandidat anomali trafik dengan kenaikan CPU atau penurunan mem bebas.
   - Bandingkan terhadap baseline pola kebiasaan (HOD/DOW) bila tersedia.
   - Abaikan titik di maintenance window (mute/scheduled).
6) Penilaian Severity & Agregasi Event
   - Hitung severity berdasar magnitude (z), durasi, dan jumlah metrik yang mendukung.
   - Gabungkan titik berdekatan menjadi 1 event kontinu (merge by gap threshold).
7) Presentasi & Arsip
   - Tampilkan daftar event: waktu mulai–akhir, metrik, severity, bukti, rekomendasi singkat.
   - Arsipkan ringkasan hasil (tanpa PII) bersama parameter filter/scope untuk reproduksibilitas.

## Interaksi Kontrol Global
- Period/Limit atau Start/End membatasi cakupan deteksi & validasi.
- Granularity menentukan ukuran bucket (hour/day) yang memengaruhi sensitivitas.
- Sumber: Server untuk konsistensi lintas metrik (Mbps), Frontend untuk non‑Mbps.
- AggMethod harian berpengaruh pada agregasi daily untuk visual pembanding.

## Error & Loading
- Overlay loading saat memuat heavy analysis.
- Jika data heavy kosong/gagal, tampilkan notifikasi dan panduan ulang (ubah rentang/granularity).

## Checklist Verifikasi
- [ ] Bucket selaras dan unit konsisten sebelum validasi.
- [ ] Ambang (z-score/MAD/persentil) diterapkan dengan n sampel memadai.
- [ ] Validasi silang antar metrik dilakukan (trafik↔CPU/memory).
- [ ] Event digabungkan dengan benar; severity masuk akal.
- [ ] Maintenance window tidak memicu false positive.

## Rujukan
- Controller: `frontend/src/pages/analysis/hooks/useAnalysisController.js`
- UI Anomali: `frontend/src/pages/analysis/analysis_anomali.jsx`
- Hook derivasi: `frontend/src/pages/analysis/hooks/useAnalysisData.jsx`
- Layanan API: `frontend/src/services/api.js`
