# Alur Agregasi/Trend

Dokumen ini menguraikan alur data untuk halaman Trend, dengan fokus pada integrasi agregasi waktu (Frontend/Server), derivasi metrik, dan konsumsi data oleh komponen grafik/tabel.

## Tujuan
- Memastikan grafik Trend menggunakan bucket waktu yang konsisten lintas tab saat mode Server diaktifkan.
- Menjaga fleksibilitas agregasi harian di frontend (AVG/MAX/SUM/MIN) untuk kebutuhan eksplorasi.
- Menetapkan rujukan komponen dan struktur data yang dipakai Trend.

## Sumber & Jalur Data
- Controller: [useAnalysisController.js](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisController.js)
  - Memuat KPI/report, heavy analysis, summary, entitas (interfaces/PPPoE/hotspot/clients).
  - Opsional: memuat bucket server via `getTimeAggregate` (DL/UL/CPU/Memory), lalu merge per `period` menjadi `serverBuckets`.
- Hook Derivasi: [useAnalysisData.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisData.jsx)
  - Mengubah raw data menjadi struktur grafik (trafficTrendData/resourceTrendData), prioritas ke `serverBuckets` bila `bucketSource='server'` dan unit=Mbps.
  - Agregasi harian frontend (AVG/MAX/SUM/MIN) berlaku saat `period='daily'`.
- Komponen Trend: [analysis_trend.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/analysis_trend.jsx)
  - Meneruskan props kontrol global & data hasil derivasi ke komponen grafis dan tabel.

## Pipeline Ringkas
1) Fetch (controller)
   - KPI, entities, heavy analysis, summary.
   - Jika `bucketSource='server'`, controller menghitung rentang efektif dan memanggil `getTimeAggregate` untuk `download_mbps|upload_mbps|cpu_load|free_memory`, lalu merge berdasarkan `period` → `serverBuckets` (traffic/resource).
2) Derivasi (hook)
   - Jika `bucketSource='server'` dan `usageUnit='Mbps'`, gunakan `serverBuckets` untuk grafik;
   - Selain itu, gunakan agregasi frontend (harian: AVG/MAX/SUM/MIN) atau data standar (resource & non-daily).
3) Konsumsi UI (Trend)
   - TrafficOverviewCard: data berbentuk `{ date, dl, ul }`.
   - ResourceUsageCard: data `{ date, cpu, mem, cpu_usage, mem_usage }`.
   - Tabel Top (Interfaces, PPPoE, Hotspot): komputasi nilai, sorting, dan konversi unit di controller/utility, kemudian dirender oleh tabel/grafik bar.
   - Clients: `clientsChartData` berisi deret `{ date, total_pppoe, total_hotspot }`.

## Interaksi Kontrol Global
- Periode & Limit: mengatur rentang bucket default (daily/monthly).
- Rentang Tanggal: override limit; validasi wajib lulus sebelum apply.
- Granularity: `auto|year|month|day|hour` mempengaruhi pembentukan bucket.
- AggMethod Harian: `AVG|MAX|SUM|MIN` untuk period `daily`.
- Sumber: `Frontend|Server`—mengatur prioritas jalur data (lihat Unit).
- Semua kontrol berada di [GlobalControls.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/components/GlobalControls.jsx).

## Unit & Fallback
- Traffic dari server tersedia dalam Mbps:
  - Jika `Usage Unit === 'Mbps'` → gunakan data server langsung.
  - Jika `Usage Unit !== 'Mbps'` → fallback ke jalur agregasi frontend agar konversi byte-unit akurat.
- Resource Memory: saat ini memakai `free_memory` dari server; ditampilkan apa adanya.

## Error & Loading
- Loading overlay di setiap kartu grafik Trend.
- Toast untuk error query (boards/KPI/heavy/summary/interface).
- Fallback otomatis ke frontend jika bucket server gagal atau unit bukan Mbps.

## Rujukan Komponen
- Traffic Overview: `frontend/src/pages/analysis/components/TrafficOverviewCard.jsx`
- Resource Usage: `frontend/src/pages/analysis/components/ResourceUsageCard.jsx`
- Shared Widgets/Tables: `frontend/src/pages/analysis/components/SharedWidgets.jsx`, `AnalysisTable.jsx`

## Checklist Verifikasi
- [ ] Toggle Sumber Frontend ↔ Server memengaruhi dataset grafik tanpa error.
- [ ] AggMethod harian mengubah bentuk kurva harian sesuai AVG/MAX/SUM/MIN.
- [ ] Granularity & rentang tanggal menghasilkan bucket wajar.
- [ ] Top lists terurut benar dan konsisten unit.
- [ ] Loading & Toast berjalan baik pada kondisi sukses/gagal.
