# Panduan Parsing Data (Benar)

Dokumen ini menjelaskan standar parsing data untuk fitur Reporting dan Dashboard, mencakup sumber data, satuan, rumus konversi, serta praktik agregasi yang konsisten di frontend.

## Sumber Data & Struktur

- Realtime (sampling):
  - Tabel: board_speed_stats
  - Field utama: download_mbps, upload_mbps (Mbps, presisi 2 desimal)
  - Referensi: [mikrotik.py](file:///e:/mikrotik_api/backend/app/models/mikrotik.py#L1)

- Harian (Daily Summary):
  - Tabel: board_daily_summary
  - Field traffic:
    - avg_download (NUMERIC(10,2), Mbps)
    - max_download (NUMERIC(10,2), Mbps)
    - avg_upload (NUMERIC(10,2), Mbps)
    - max_upload (NUMERIC(10,2), Mbps)
    - total_download_bytes (BIGINT, Byte per hari)
    - total_upload_bytes (BIGINT, Byte per hari)
  - Referensi:
    - Model: [mikrotik.py](file:///e:/mikrotik_api/backend/app/models/mikrotik.py#L145-L182)
    - Agregasi: [aggregation_service.py](file:///e:/mikrotik_api/backend/app/services/aggregation_service.py#L15-L123)
    - Endpoint: [reports.py:get_daily_reports](file:///e:/mikrotik_api/backend/app/api/endpoints/reports.py#L1-L68)

- Bulanan (Monthly Summary):
  - Tabel: board_monthly_summary
  - Field traffic:
    - avg_download (BIGINT, Mbps dibulatkan dari rata-rata harian)
    - max_download (BIGINT, Mbps dibulatkan dari maksimum harian)
    - total_download_bytes (BIGINT, Byte per bulan)
    - avg_upload (BIGINT, Mbps dibulatkan)
    - max_upload (BIGINT, Mbps dibulatkan)
    - total_upload_bytes (BIGINT, Byte per bulan)
  - Referensi:
    - Model: [mikrotik.py](file:///e:/mikrotik_api/backend/app/models/mikrotik.py#L184-L213)
    - Agregasi: [aggregation_service.py](file:///e:/mikrotik_api/backend/app/services/aggregation_service.py#L128-L205)
    - Endpoint: [reports.py:get_monthly_reports](file:///e:/mikrotik_api/backend/app/api/endpoints/reports.py#L69-L112)

Catatan: Endpoint mengembalikan JSON hasil `jsonable_encoder` dari ORM (bukan skema Pydantic), sehingga field mengikuti model database apa adanya.

## Konvensi Satuan

- Mbps vs Gbps
  - Daily.avg_* dan Monthly.avg_* menggunakan satuan Mbps.
  - Konversi ke Gbps: gbps = mbps / 1000 (SI).

- Byte
  - total_*_bytes menggunakan Byte akumulasi untuk periode terkait.
  - Konversi ke MB/GB saat diperlukan untuk tampilan tabel, bukan untuk grafik throughput rata-rata.

## Aturan Parsing Frontend

- Sortir kronologis
  - Data dari endpoint biasanya dikembalikan dalam urutan menurun (DESC) untuk keperluan limit. Selalu sortir kembali ASC sebelum diplot.
  - Implementasi: [Reports.jsx](file:///e:/mikrotik_api/frontend/src/pages/Reports.jsx#L78-L99), [Dashboard.jsx](file:///e:/mikrotik_api/frontend/src/pages/Dashboard.jsx)

- Daily Chart (Throughput)
  - Gunakan avg_download dan avg_upload (Mbps).
  - Tampilkan dalam mbps atau gbps:
    - mbps: nilai apa adanya
    - gbps: nilai / 1000

- Monthly Chart (Throughput)
  - Gunakan avg_download dan avg_upload dari Monthly (unit tetap Mbps).
  - Tampilkan dalam mbps atau gbps sesuai pilihan:
    - mbps: nilai apa adanya
    - gbps: nilai / 1000

- Total (Bytes)
  - Untuk ringkasan volume data, gunakan total_download_bytes dan total_upload_bytes.
  - Konversi tampilan (opsional): 
    - MB = Bytes / 1024^2
    - GB = Bytes / 1024^3
  - Jangan campur “total bytes” dengan “throughput rata-rata” di sumbu yang sama.

## Agregasi “All (Public)” di Dashboard

- Seleksi perangkat: hanya board dengan is_public_review !== false.
- Mode agregasi:
  - Average: rata-rata antar perangkat per tanggal/bulan.
  - Sum: penjumlahan antar perangkat per tanggal/bulan.
- Implementasi:
  - Query paralel per-board, kemudian agregasi di klien.
  - Daily: rata-rata/sum berdasarkan avg_download, avg_upload (Mbps).
  - Monthly: rata-rata/sum berdasarkan avg_download, avg_upload (Mbps).
  - Referensi: [Dashboard.jsx](file:///e:/mikrotik_api/frontend/src/pages/Dashboard.jsx#L33-L118)

## Rumus Konversi

- Throughput
  - gbps = mbps / 1000

- Volume
  - MB = bytes / (1024^2)
  - GB = bytes / (1024^3)

## Contoh Parsing

- Daily item:
  ```json
  {
    "log_date": "2026-03-01",
    "avg_download": 42.35,
    "avg_upload": 6.12,
    "total_download_bytes": 987654321,
    "total_upload_bytes": 123456789
  }
  ```
  - Tampilkan mbps: 42.35 / 6.12
  - Tampilkan gbps: 0.04235 / 0.00612

- Monthly item:
  ```json
  {
    "log_month": "2026-03-01",
    "avg_download": 25,
    "avg_upload": 4,
    "total_download_bytes": 1234567890123,
    "total_upload_bytes": 234567890123
  }
  ```
  - Tampilkan mbps: 25 / 4
  - Tampilkan gbps: 0.025 / 0.004

## Praktik Terbaik

- Konsisten unit (jangan campur bits/s dengan bytes/s pada grafik yang sama).
- Pisahkan throughput (rate) dan volume (bytes) ke visualisasi berbeda.
- Selalu tampilkan label satuan pada Legend/Axis.
- Tangani nilai null/undefined sebagai 0 saat agregasi.

## Rujukan Teknis

- Model & Agregasi:
  - [app/models/mikrotik.py](file:///e:/mikrotik_api/backend/app/models/mikrotik.py)
  - [app/services/aggregation_service.py](file:///e:/mikrotik_api/backend/app/services/aggregation_service.py)
- Endpoint:
  - [app/api/endpoints/reports.py](file:///e:/mikrotik_api/backend/app/api/endpoints/reports.py)
- Frontend:
  - [frontend/src/services/api.js](file:///e:/mikrotik_api/frontend/src/services/api.js)
  - [frontend/src/pages/Reports.jsx](file:///e:/mikrotik_api/frontend/src/pages/Reports.jsx)
  - [frontend/src/pages/Dashboard.jsx](file:///e:/mikrotik_api/frontend/src/pages/Dashboard.jsx)

