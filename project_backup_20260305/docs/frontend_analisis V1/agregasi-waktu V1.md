# Alur Agregasi Waktu Lintas Tab

Dokumen ini menjelaskan arsitektur dan alur data untuk fitur agregasi waktu pada halaman Analysis, mencakup dua mode sumber data: Frontend dan Server. Tujuan utama adalah memastikan bucket waktu konsisten lintas tab (Trend dan Insight) tanpa menghilangkan fleksibilitas agregasi harian di sisi frontend.

## Ringkasan

- Dua sumber bucket waktu:
  - Frontend: agregasi dan standardisasi waktu dilakukan di browser.
  - Server: bucket waktu diambil dari endpoint agregasi waktu backend untuk konsistensi lintas tab.
- Toggle “Sumber” di Global Controls: Frontend | Server.
- Unit:
  - Traffic dari server memakai metric Mbps. Untuk penggunaan selain Mbps, grafik kembali ke agregasi frontend agar satuan tetap benar.
  - Resource “mem” menggunakan metric `free_memory` dari server (lihat catatan).

## Komponen Kunci

- State & Query Global: [useAnalysisController.js](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisController.js)
- Hook derivasi: [useAnalysisData.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisData.jsx)
- Layanan API: [api.js](file:///e:/mikrotik_api/frontend/src/services/api.js#L233-L242)
- UI Kontrol: [GlobalControls.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/components/GlobalControls.jsx)
- Konsumen data:
  - Trend: [analysis_trend.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/analysis_trend.jsx)
  - Insight: [analysis_insight.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/analysis_insight.jsx)
  - Pengkabelan props: [Analysis.jsx](file:///e:/mikrotik_api/frontend/src/pages/Analysis.jsx)

## Parameter Waktu & Agregasi

- period: `daily` | `monthly`
- limit: jumlah bucket default ketika tidak memakai rentang tanggal khusus
- startDate, endDate: rentang tanggal kustom (ISO-8601 `yyyy-MM-dd`); mengabaikan `limit`
- granularity: `auto` | `year` | `month` | `day` | `hour`
- aggMethod (harian): `AVG` | `MAX` | `SUM` | `MIN`
- Pemetaan ke server:
  - `AVG → avg`, `MAX → max`, `SUM → sum`, `MIN → min`

## Endpoint Server-Side Time Aggregation

```
GET /analysis/{board_id}/aggregate/
  ?start_time=2025-01-01T00:00:00Z
  &end_time=2025-01-31T23:59:59Z
  &granularity=day
  &metric=download_mbps|upload_mbps|cpu_load|free_memory
  &agg=avg|sum|count|min|max
```

- Parameter wajib: `start_time`, `end_time`
- Granularity: `auto|year|month|day|hour`
- Metric:
  - Traffic: `download_mbps`, `upload_mbps`
  - Resource: `cpu_load`, `free_memory`
- Contoh konsumsi di frontend: [api.js:getTimeAggregate](file:///e:/mikrotik_api/frontend/src/services/api.js#L233-L242)

## Alur Data (Mode Server)

1. GlobalControls: user memilih “Sumber: Server”.
2. State Global: `bucketSource` disimpan ke localStorage dan URL (`src=server`). Lihat [useAnalysisController.js](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisController.js).
3. Query server buckets:
   - Kalkulasi rentang waktu efektif dari `period/limit` atau `startDate/endDate`.
   - Panggil endpoint empat kali paralel: `download_mbps`, `upload_mbps`, `cpu_load`, `free_memory`.
   - Gabungkan hasil berdasarkan field `period` menjadi dua kanal:
     - `traffic`: `{ date, dl, ul }`
     - `resource`: `{ date, cpu, mem }`
4. Konsumsi data:
   - Trend & Insight melewatkan `serverBuckets` ke [useAnalysisData.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisData.jsx).
   - Hook akan memprioritaskan `serverBuckets` untuk grafik jika `bucketSource==='server'` dan `usageUnit==='Mbps'` (traffic). Selain itu akan fallback ke agregasi frontend.

## Alur Data (Mode Frontend)

1. GlobalControls: “Sumber: Frontend” (default).
2. Data historis dimuat via query (KPI, summary, dsb.).
3. [useAnalysisData.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisData.jsx) melakukan:
   - Standardisasi record (traffic/resource).
   - Agregasi harian sesuai `aggMethod` (AVG/MAX/SUM/MIN) bila `period='daily'`.
   - Penyusunan data grafik trafik dan resource.

## Perilaku Unit

- Traffic dari server disediakan dalam Mbps:
  - Jika `usageUnit === 'Mbps'` → gunakan `serverBuckets.traffic` langsung.
  - Jika `usageUnit !== 'Mbps'` → fallback ke agregasi frontend untuk menjaga konversi satuan (Bytes/MB/GB).
- Resource “mem” di server menggunakan `free_memory`:
  - Saat ini ditampilkan “as-is” sebagai kanal `mem`.
  - Opsional ke depan: sediakan toggle “Memory Usage = 100 - Free” bila definisi diperlukan.

## Performa

- Stale time dinamis di query (React Query) berdasarkan rentang/granularity untuk mengurangi panggilan berulang. Lihat bagian `dynamicStaleTime` di [useAnalysisController.js](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisController.js).

## Interaksi UI

- Toggle Sumber Data:
  - Lokasi: Global Controls.
  - Opsi: `Frontend` | `Server`.
  - Persistensi: localStorage key `INSIGHT_PREFS` → `bucketSource`, serta URL param `src`.
- Agregasi Harian (only daily): `AVG`, `MAX`, `SUM`, `MIN`.
- Granularity: tetap terlihat di tab Trend & Insight untuk kontrol bucket.

## Batasan Dikenal

- Traffic server-only di Mbps. Konversi ke byte-unit di sisi backend belum tersedia; frontend melakukan fallback.
- Memory metric masih `free_memory` (bukan usage). Perlu kesepakatan definisi jika ingin menampilkan “usage”.

## Langkah Selanjutnya (Opsional)

- Tambah endpoint server untuk traffic dalam byte (rx/tx/total) agar dukungan unit non-Mbps bisa konsisten tanpa fallback.
- Sediakan opsi “Tampilkan Memory Usage” (100 - free) di Global Controls.

---

Relevan untuk pengembangan lebih lanjut:

- Controller (state, query server buckets): [useAnalysisController.js](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisController.js)
- Konsumsi & derivasi grafik: [useAnalysisData.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/hooks/useAnalysisData.jsx)
- Endpoint klien: [api.js](file:///e:/mikrotik_api/frontend/src/services/api.js#L233-L242)
