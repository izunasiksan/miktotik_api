# Alur Insight

Dokumen ini menguraikan end-to-end flow halaman Insight: dari pengambilan data, normalisasi, agregasi (Frontend/Server), hingga derivasi metrik insight dan penyajiannya dalam kartu/grafik/tabel.

## Tujuan
- Menyajikan ringkasan “apa yang penting hari ini” berbasis data terkini.
- Menggabungkan sinyal: percentiles, peak, delta DoD/ WoW, health score, anomali, korelasi, forecast, dan kualitas data.
- Menjaga konsistensi bucket lintas metrik saat diperlukan (mode Server).

## Sumber & Jalur Data
- Controller: [useAnalysisController.js](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisController.js)
  - Memuat KPI harian/bulanan, heavy analysis (percentiles/forecast/anomali/korelasi), summary (mis. today_traffic), dan entitas (interfaces/PPPoE/hotspot/clients).
  - Opsional: memuat bucket server via `getTimeAggregate` lalu merge per `period` → `serverBuckets`.
- Hook Derivasi: [useAnalysisData.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisData.jsx)
  - Menghitung: p95/p99/peak, rolling baseline, delta DoD/WoW, health score, daftar anomali aktif, data quality score, top growth/decline, dan ringkasan tren (traffic/resource).
- UI Insight: [analysis_insight.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/analysis_insight.jsx)
  - Menampilkan kartu insight: Today vs Baseline, Peak & Percentiles, Health Score, Anomali Aktif, Korelasi Penting, Forecast Glimpse, Data Quality, Top Growth.

## Pipeline Ringkas
1) Fetch & Normalisasi
   - Muat KPI/heavy/summary/entities sesuai filter global; normalisasi kolom/units; `fillGaps` jika penguncian waktu aktif.
2) Agregasi & Sinkronisasi
   - Jika `bucketSource='server'` dan unit=Mbps → gunakan `serverBuckets` untuk konsistensi lintas metrik.
   - Jika unit non‑Mbps → jalur frontend untuk agregasi harian (AVG/MAX/SUM/MIN) dan konversi byte-unit.
3) Derivasi Insight
   - Percentiles (p95/p99) & peak pada rentang aktif.
   - Baseline (mis. rata-rata periode sebelumnya) → delta DoD/WoW dan klasifikasi tren (up/down/flat).
   - Health score dari kombinasi utilisasi, stabilitas, dan anomali.
   - Anomali aktif dan korelasi pendukung (mis. trafik ↔ CPU).
   - Forecast glimpse (short-horizon) dan estimasi headroom singkat.
   - Data quality score (kelengkapan/validasi).
4) Penyajian & Aksi
   - Kartu ringkas dengan indikator warna, tooltip, dan link ke tab Trend/Audit untuk eksplorasi lanjutan.
5) Arsip
   - Simpan ringkasan insight (tanpa PII) beserta parameter filter untuk reproduksi.

## Interaksi Kontrol Global
- Periode/Limit atau Start/End menentukan cakupan insight.
- Granularity memengaruhi resolusi bucket dan sensitivitas percentiles/peak.
- AggMethod (daily) mengubah agregasi harian pada jalur frontend.
- Sumber bucket: Server (konsistensi lintas metrik, unit=Mbps) vs Frontend (non‑Mbps/eksplorasi).

## Error & Loading
- Overlay loading untuk setiap kartu insight.
- Toast saat terjadi error pemuatan (boards/KPI/heavy/summary/entities).
- Fallback logis (mis. tampilkan subset insight jika heavy analysis tidak tersedia).

## Checklist Verifikasi
- [ ] Bucket & unit konsisten sebelum menghitung p95/p99/peak/delta.
- [ ] Health score menghukum anomali dan utilisasi ekstrem dengan proporsional.
- [ ] Delta DoD/WoW memakai baseline yang jelas dan window yang cukup.
- [ ] Forecast glimpse tidak mengekstrapolasi melampaui horizon yang disediakan backend.
- [ ] Data quality score tercermin saat kolom/record hilang.
- [ ] Loading & Toast berjalan baik untuk semua kartu.

## Rujukan
- Controller: `frontend/src/pages/analysis/hooks/useAnalysisController.js`
- Hook derivasi: `frontend/src/pages/analysis/hooks/useAnalysisData.jsx`
- UI Insight: `frontend/src/pages/analysis/analysis_insight.jsx`
- Layanan API: `frontend/src/services/api.js`
