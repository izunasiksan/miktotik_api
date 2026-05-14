# Alur Analisis Data

Dokumen ini menjelaskan alur end-to-end pengolahan dan penyajian data analisis di aplikasi, mulai dari pengambilan data, normalisasi, pengisian gap waktu, agregasi (frontend/server), hingga derivasi metrik dan konsumen UI.

## Tujuan
- Menstandarkan cara data dianalisis dan disajikan lintas tab.
- Memastikan komponen memakai sumber dan format data yang konsisten.
- Mempermudah debugging dan pengembangan fitur analitik baru.

## Gambaran Umum Alur
1) Pengambilan data (React Query):
   - Ringkasan, laporan harian/bulanan, analisis berat (percentiles/forecast/anomali), serta analisis per entitas (interfaces, PPPoE, hotspot, clients).
2) Normalisasi & Pengisian Gap:
   - Normalisasi unit/kolom; pengisian gap waktu jika penguncian waktu aktif.
3) Agregasi Waktu:
   - Mode Frontend: agregasi harian di browser (AVG/MAX/SUM/MIN).
   - Mode Server: bucket waktu dari endpoint backend (konsisten lintas tab). Lihat dokumen [aturan-agregasi](file:///e:/mikrotik_api/docs/aturan-agregasi.md) dan [agregasi-waktu](file:///e:/mikrotik_api/docs/agregasi-waktu.md).
4) Derivasi Metrik:
   - Totals, p95/p99/peak, health score, RCA, forecast, data quality, top growth, data tren trafik & resource.
5) Penyajian UI:
   - Komponen Trend & Insight mengonsumsi data hasil derivasi; kontrol global mempengaruhi seluruh alur.

## Pengambilan Data (Controller)
- Implementasi: [useAnalysisController.js](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisController.js)
- Query utama (menggunakan React Query):
  - Boards: daftar perangkat.
  - Report rows (KPI): harian/bulanan via `getDailyReports`/`getMonthlyReports`.
  - Heavy analysis: percentiles, forecast, anomali, korelasi, resource anomalies.
  - Ringkasan: `getAnalysisSummary` (mis. today_traffic).
  - Analisis entitas: interfaces, PPPoE, hotspot, clients.
  - Time buckets server (opsional): `getTimeAggregate` (download_mbps, upload_mbps, cpu_load, free_memory) lalu merge per period.
- Stale time dinamis berdasarkan granularity/rentang, untuk efisiensi fetch.
- State global mempengaruhi queryKey dan enabled (board, period/limit, start/end, granularity, aggMethod, bucketSource).

## Sinkronisasi Preferensi & URL
- Preferensi disimpan ke localStorage (`INSIGHT_PREFS`) dan disinkronkan ke URL (query string: board, period, limit, start, end, granularity, agg, src).
- Hal ini memastikan reload/tautan tetap membawa konteks filter yang sama.

## Normalisasi & Pengisian Gap
- Lokasi: [Analysis.jsx](file:///e:/mikrotik_api/frontend/src/pages/Analysis.jsx)
- Fungsi:
  - `normalizeRawData`: menyesuaikan format/kolom/units agar seragam.
  - `fillGaps`: mengisi bucket waktu yang hilang saat penguncian waktu aktif.
- Hasilnya dipakai sebagai `finalAnalysisData` dan diteruskan ke komponen/halaman.

## Agregasi Waktu
- Mode Frontend (default):
  - Dilakukan di hook derivasi (lihat bawah). Berlaku khususnya untuk period `daily` dengan AggMethod: AVG/MAX/SUM/MIN.
  - Menjaga fleksibilitas, terutama saat unit tampilan bukan Mbps.
- Mode Server (opsional via toggle Sumber):
  - Controller memanggil `getTimeAggregate` untuk empat metric, lalu menggabungkan sesuai period.
  - Hasil (`serverBuckets`) diteruskan ke hook derivasi agar grafik tren memakai bucket konsisten lintas tab.
  - Traffic server dalam Mbps; unit non-Mbps fallback ke frontend.

## Derivasi Metrik (Hook)
- Implementasi: [useAnalysisData.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisData.jsx)
- Input:
  - reportRows (hasil normalisasi & gap fill), heavyAnalysis, analysisSummary, flags (isKpiLoading/isHeavyLoading), comparePrev, usageUnit, period, aggMethod, serverBuckets (opsional).
- Derivasi yang dihasilkan:
  - totals (traffic total), cpuArr, memArr.
  - p95Bytes, p99Bytes, peakBytes, totalBytes.
  - totalDelta (perbandingan paruh awal vs akhir dataset jika compare aktif).
  - healthScore: komposit resource usage, stabilitas (std), jumlah anomali.
  - rcaData: ringkas tipe anomali (traffic/cpu/mem) dari heavyAnalysis.
  - forecast: proyeksi CPU/Mem/Traffic dari backend.
  - dataQuality: skor kelengkapan kolom.
  - topGrowthUsers: dari heavyAnalysis (jika tersedia).
  - trafficTrendData & resourceTrendData: prioritas serverBuckets saat mode Server & unit=Mbps; fallback ke frontend untuk lain-lain.
  - todayTraffic: dari analysisSummary.

## Konsumen UI
- Trend: [analysis_trend.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/analysis_trend.jsx)
  - Menampilkan grafik Traffic Overview & Resource Usage (menggunakan data dari hook derivasi).
  - Menyediakan tabel Top Interfaces/PPPoE/Hotspot, dan chart Client Counts.
- Insight: [analysis_insight.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/analysis_insight.jsx)
  - Menyajikan KPI, Today Traffic, Health Score, RCA, Forecast, Data Quality, dsb.
- Halaman lain (Kapasitas, Korelasi, Anomali, Kebiasaan) menggunakan data terproses dari controller/hook yang sama.

## Kontrol Global (GlobalControls)
- Lokasi: [GlobalControls.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/components/GlobalControls.jsx)
- Fitur:
  - Period, Limit, rentang tanggal (preset/tanggal spesifik).
  - Granularity & AggMethod harian.
  - Toggle Sumber: Frontend | Server.
  - Auto-apply & Reset, dengan Toast feedback.

## Error Handling & Loading
- Loading state komprehensif untuk tiap query serta overlay pada komponen grafik.
- Toast untuk error pemuatan boards/KPI/heavy/summary/interface.
- Fallback ke frontend untuk unit non-Mbps atau kegagalan bucket server.

## Rujukan API
- Layanan API: [api.js](file:///e:/mikrotik_api/frontend/src/services/api.js)
- Endpoints yang dipakai controller:
  - Boards: `/boards/`
  - Reports: `/analysis/{board}/daily|monthly/`
  - Heavy analysis: `/analysis/{board}/heavy/`
  - Summary: `/analysis/{board}/summary/`
  - Entities: `/analysis/{board}/interfaces|pppoe|hotspot|clients/`
  - Time aggregate: `/analysis/{board}/aggregate/`

## Pre-Flight Check (Ringkas)
1) Identifikasi Domain
- Frontend (docs/flow), Backend (endpoint agregasi), Database (N/A).

2) Dampak & Risiko
- Dampak ke konsistensi bucket dan beban backend (mode server).
- Risiko mismatch unit atau fallback yang tak diinginkan.

3) Hasil Audit
- Validasi parameter waktu & granularity; konsistensi pemetaan agg.
- Keamanan endpoint & sanitasi input.

4) Rekomendasi Eksekusi
- Gunakan mode Server untuk lintas tab bila unit=Mbps.
- Jalankan lint & verifikasi dev preview untuk UI.

## Tautan Terkait
- Aturan agregasi: [aturan-agregasi.md](file:///e:/mikrotik_api/docs/aturan-agregasi.md)
- Alur agregasi waktu: [agregasi-waktu.md](file:///e:/mikrotik_api/docs/agregasi-waktu.md)
