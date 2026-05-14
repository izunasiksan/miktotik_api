# Panduan Manual SQL

Dokumen ini berisi panduan praktis menjalankan query SQL (read‑only) untuk kebutuhan analisis, troubleshooting, dan pembuatan laporan di sistem Mikrotik Manager.

## Prinsip Utama (WAJIB DIBACA)

- Dilarang mengeksekusi query destruktif (DROP/TRUNCATE/DELETE) pada database produksi.
- Perubahan skema harus melalui migrasi Alembic, bukan langsung ALTER di production.
- Selaraskan field dengan SQLAlchemy Models sebelum membuat query kompleks.
  - Referensi model: [mikrotik.py](file:///e:/mikrotik_api/backend/app/models/mikrotik.py)
- Gunakan transaksi read‑only atau user dengan hak baca untuk operasional harian.

## Skema Inti Terkait Laporan

- mikrotik_boards
  - Kunci: board_id (UUID)
  - Field penting: board_name, ip_address, site_group, is_online, is_public_review, is_maintenance, created_at

- board_daily_summary
  - Per hari per board.
  - Field penting: log_date (DATE), avg_download (NUMERIC, Mbps), avg_upload (NUMERIC, Mbps), total_download_bytes (BIGINT), total_upload_bytes (BIGINT)

- board_monthly_summary
  - Per bulan per board.
  - Field penting: log_month (DATE; tanggal 1), avg_download (BIGINT, Mbps), avg_upload (BIGINT, Mbps), total_download_bytes (BIGINT), total_upload_bytes (BIGINT)

Indeks berguna:
- idx_daily_summary_board_date(board_id, log_date)
- idx_monthly_summary_board_date(board_id, log_month)

## Konvensi Satuan

- Throughput: avg_download/avg_upload menggunakan satuan Mbps.
  - Konversi ke Gbps: gbps = mbps / 1000.
- Volume: total_*_bytes dalam Byte.
  - Konversi ke MB/GB untuk tampilan: MB = bytes / 1024^2, GB = bytes / 1024^3.

## Query Dasar

1) Daftar perangkat Public Review (untuk mode “All (Public)”)

```sql
SELECT 
  board_id, board_name, ip_address, site_group,
  is_online, is_public_review, is_maintenance, created_at
FROM mikrotik_boards
WHERE is_public_review IS DISTINCT FROM FALSE
ORDER BY created_at DESC;
```

2) Daily summary satu perangkat (30 hari terakhir)

```sql
SELECT 
  s.log_date,
  s.avg_download::numeric(10,2) AS avg_download_mbps,
  s.avg_upload::numeric(10,2)   AS avg_upload_mbps,
  s.total_download_bytes,
  s.total_upload_bytes
FROM board_daily_summary AS s
WHERE s.board_id = :board_id
  AND s.log_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY s.log_date ASC;
```

3) Monthly summary satu perangkat (12 bulan terakhir)

```sql
SELECT 
  s.log_month,
  s.avg_download AS avg_download_mbps,
  s.avg_upload   AS avg_upload_mbps,
  s.total_download_bytes,
  s.total_upload_bytes
FROM board_monthly_summary AS s
WHERE s.board_id = :board_id
  AND s.log_month >= date_trunc('month', CURRENT_DATE) - INTERVAL '12 months'
ORDER BY s.log_month ASC;
```

## Query Agregasi “All (Public)”

4) Daily – Average throughput antar perangkat public, plus total usage (sum)

```sql
WITH pub AS (
  SELECT board_id 
  FROM mikrotik_boards 
  WHERE is_public_review IS DISTINCT FROM FALSE
),
per_day AS (
  SELECT 
    d.log_date,
    AVG(d.avg_download) AS avg_download_mbps,
    AVG(d.avg_upload)   AS avg_upload_mbps,
    SUM(d.total_download_bytes) AS total_download_bytes,
    SUM(d.total_upload_bytes)   AS total_upload_bytes
  FROM board_daily_summary d
  JOIN pub p ON p.board_id = d.board_id
  WHERE d.log_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY d.log_date
)
SELECT * 
FROM per_day
ORDER BY log_date ASC;
```

5) Daily – Sum throughput antar perangkat public (opsi alternatif)

```sql
WITH pub AS (
  SELECT board_id 
  FROM mikrotik_boards 
  WHERE is_public_review IS DISTINCT FROM FALSE
),
per_day AS (
  SELECT 
    d.log_date,
    SUM(d.avg_download) AS sum_download_mbps,
    SUM(d.avg_upload)   AS sum_upload_mbps,
    SUM(d.total_download_bytes) AS total_download_bytes,
    SUM(d.total_upload_bytes)   AS total_upload_bytes
  FROM board_daily_summary d
  JOIN pub p ON p.board_id = d.board_id
  WHERE d.log_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY d.log_date
)
SELECT * 
FROM per_day
ORDER BY log_date ASC;
```

6) Monthly – Average throughput antar perangkat public, plus total usage (sum)

```sql
WITH pub AS (
  SELECT board_id 
  FROM mikrotik_boards 
  WHERE is_public_review IS DISTINCT FROM FALSE
),
per_month AS (
  SELECT 
    m.log_month,
    AVG(m.avg_download) AS avg_download_mbps,
    AVG(m.avg_upload)   AS avg_upload_mbps,
    SUM(m.total_download_bytes) AS total_download_bytes,
    SUM(m.total_upload_bytes)   AS total_upload_bytes
  FROM board_monthly_summary m
  JOIN pub p ON p.board_id = m.board_id
  WHERE m.log_month >= date_trunc('month', CURRENT_DATE) - INTERVAL '12 months'
  GROUP BY m.log_month
)
SELECT * 
FROM per_month
ORDER BY log_month ASC;
```

7) Monthly – Sum throughput antar perangkat public (opsi alternatif)

```sql
WITH pub AS (
  SELECT board_id 
  FROM mikrotik_boards 
  WHERE is_public_review IS DISTINCT FROM FALSE
),
per_month AS (
  SELECT 
    m.log_month,
    SUM(m.avg_download) AS sum_download_mbps,
    SUM(m.avg_upload)   AS sum_upload_mbps,
    SUM(m.total_download_bytes) AS total_download_bytes,
    SUM(m.total_upload_bytes)   AS total_upload_bytes
  FROM board_monthly_summary m
  JOIN pub p ON p.board_id = m.board_id
  WHERE m.log_month >= date_trunc('month', CURRENT_DATE) - INTERVAL '12 months'
  GROUP BY m.log_month
)
SELECT * 
FROM per_month
ORDER BY log_month ASC;
```

## Query Navigasi & Segmentasi

8) Ringkasan jumlah perangkat berdasarkan status

```sql
SELECT
  COUNT(*) FILTER (WHERE is_public_review IS DISTINCT FROM FALSE) AS public_count,
  COUNT(*) AS total_count,
  COUNT(*) FILTER (WHERE is_online = TRUE AND is_maintenance = FALSE) AS online_count,
  COUNT(*) FILTER (WHERE is_online = FALSE AND is_maintenance = FALSE) AS offline_count,
  COUNT(*) FILTER (WHERE is_maintenance = TRUE) AS maintenance_count
FROM mikrotik_boards;
```

9) Daftar Site Group aktif (maks 12) beserta jumlah perangkat

```sql
SELECT site_group, COUNT(*) AS total_devices
FROM mikrotik_boards
GROUP BY site_group
ORDER BY site_group ASC
LIMIT 12;
```

10) Filter perangkat berdasarkan Site Group (untuk deep‑link ke Devices)

```sql
SELECT board_id, board_name, ip_address, site_group
FROM mikrotik_boards
WHERE site_group ILIKE :q || '%'
ORDER BY board_name;
```

## Query Tambahan (Optional)

11) Top pengguna PPPoE (harian) per board berdasarkan download

```sql
SELECT
  p.pppoe_username,
  p.download_bytes,
  p.upload_bytes,
  p.log_date
FROM board_pppoe_usage p
WHERE p.board_id = :board_id
  AND p.log_date = CURRENT_DATE
ORDER BY p.download_bytes DESC
LIMIT 20;
```

12) Interface usage (harian) per board

```sql
SELECT
  u.interface_name,
  u.total_rx_bytes,
  u.total_tx_bytes,
  u.log_date
FROM board_interface_usage u
WHERE u.board_id = :board_id
  AND u.log_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY u.log_date ASC, u.interface_name ASC;
```

## Praktik Terbaik

- Selalu sertakan ORDER BY ASC saat menyiapkan data time‑series untuk chart.
- Gunakan WHERE yang sejalan dengan indeks (misal board_id, log_date/log_month).
- Hindari SELECT * pada query yang sering dipanggil; spesifikkan kolom yang diperlukan.
- Validasi hasil agregasi (AVERAGE vs SUM) sesuai kebutuhan analisis.
- Jangan ubah skema tanpa Alembic. Gunakan `alembic revision --autogenerate` lalu `alembic upgrade head` pada lingkungan yang tepat.

---

Referensi model SQLAlchemy:
- MikrotikBoard, Daily/Monthly Summary, dsb. [mikrotik.py](file:///e:/mikrotik_api/backend/app/models/mikrotik.py)

Contoh skema SQL (arsip):
- [docs/db/schema.sql](file:///e:/mikrotik_api/docs/db/schema.sql)
- [postgres_data/schema.sql](file:///e:/mikrotik_api/postgres_data/schema.sql)
