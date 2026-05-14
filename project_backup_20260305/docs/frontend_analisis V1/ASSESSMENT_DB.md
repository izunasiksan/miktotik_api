# ASSESSMENT PERUBAHAN STRUKTUR DATABASE

**ID Assessment**: DB-20260302-01
**Status**: COMPLETED (Telah Dimigrasi ke Production)
**Tujuan**: Optimasi struktur data agregat untuk mendukung analisis prediktif (forecasting) yang lebih akurat.

## 1. Identifikasi Masalah
Struktur `board_daily_summary` saat ini belum memisahkan data statistik berdasarkan interface secara mendalam, hanya menyediakan agregasi level board. Hal ini membatasi kemampuan untuk melakukan forecasting per-interface (misal: uplink vs lokal).

## 2. Rencana Perubahan (Schema SQL)
Diusulkan penambahan tabel baru atau modifikasi kolom:

```sql
-- 1. Penambahan tabel baru untuk agregasi harian per interface
CREATE TABLE board_interface_daily_summary (
    summary_id           SERIAL PRIMARY KEY,
    board_id             UUID REFERENCES mikrotik_boards(board_id) ON DELETE CASCADE,
    interface_name       VARCHAR(100) NOT NULL,
    
    avg_download_mbps    NUMERIC(10,2),
    max_download_mbps    NUMERIC(10,2),
    p95_download_mbps    NUMERIC(10,2), -- Tambahan untuk analisis kapasitas
    
    avg_upload_mbps      NUMERIC(10,2),
    max_upload_mbps      NUMERIC(10,2),
    
    log_date             DATE NOT NULL,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_interface_daily UNIQUE(board_id, interface_name, log_date)
);

-- 2. Optimasi Indeks untuk Query Berbasis Waktu (Dashboard Tren) 
CREATE INDEX idx_interface_summary_lookup 
ON board_interface_daily_summary (board_id, interface_name, log_date DESC);
```

## 3. Dampak & Risiko
- **Dampak**: Memerlukan penyesuaian pada `aggregation_service.py` untuk mengisi tabel baru ini.
- **Risiko**: Ukuran database akan bertambah seiring bertambahnya jumlah interface yang dimonitor.
- **Migrasi**: Wajib menggunakan `alembic revision --autogenerate`.

## 4. Rekomendasi Eksekusi
1. Jalankan migrasi di lingkungan staging.
2. Update logic `aggregation_service.py`.
3. Backfill data dari `board_speed_stats` jika diperlukan.

---
*Dokumen ini dibuat sesuai aturan workspace sebagai prasyarat perubahan database.*
