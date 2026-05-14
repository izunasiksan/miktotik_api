# Optimasi Index Database untuk Analisis

Dokumen ini mencatat optimasi index yang dilakukan pada database PostgreSQL untuk mendukung performa query analisis data besar (jutaan baris), terutama saat menggunakan fungsi `date_trunc` dan agregasi dinamis.

## 1. Identifikasi Masalah
Pada dataset yang tumbuh sangat besar (monitoring log setiap menit), query untuk rentang waktu panjang (> 1 tahun) akan mengalami penurunan performa jika hanya menggunakan index tunggal pada `board_id` atau `log_time`. Penarikan data dengan granularitas dinamis (Per Jam, Per Hari, Per Minggu) membutuhkan index komposit agar database dapat melakukan filter dan sorting secara efisien.

## 2. Implementasi Index Komposit

Tiga tabel utama yang menampung data monitoring log mentah (raw data) telah dioptimasi dengan index komposit `(board_id, log_time)`:

### A. Tabel `board_client_stats` (Data Client)
- **Index Baru**: `idx_client_stats_brd_time`
- **Kolom**: `(board_id, log_time)`
- **Kegunaan**: Mempercepat filter data client per board dalam rentang waktu tertentu.

### B. Tabel `board_resource_stats` (CPU & Memory)
- **Index Baru**: `idx_resource_stats_brd_time`
- **Kolom**: `(board_id, log_time)`
- **Kegunaan**: Mempercepat analisis tren penggunaan resource sistem.

### C. Tabel `board_speed_stats` (Traffic / Bandwidth)
- **Index Baru**: `idx_speed_brd_time`
- **Kolom**: `(board_id, log_time)`
- **Kegunaan**: Mempercepat kalkulasi P95, P99, dan rata-rata traffic pada dataset besar.

## 3. Optimasi Tabel Summary (Agregasi)

Untuk query yang lebih luas (Per Minggu/Bulan), sistem menggunakan tabel summary untuk menghindari scanning jutaan baris data mentah.

### A. Tabel `board_daily_summary`
- **Index Eksis**: `idx_daily_summary_board_date`
- **Kolom**: `(board_id, log_date)` (Unique)
- **Kegunaan**: Mempercepat query trend harian dan forecasting jangka panjang.

### B. Tabel `board_interface_daily_summary`
- **Index Eksis**: `idx_interface_summary_lookup`
- **Kolom**: `(board_id, interface_name, log_date DESC)`
- **Kegunaan**: Mempercepat audit penggunaan per-port secara historis.

## 4. Manfaat Teknis
1. **Index Scan vs Sequential Scan**: Memastikan PostgreSQL menggunakan `Index Scan` bahkan saat filter menggunakan `board_id` dan `log_time` sekaligus.
2. **Performance date_trunc**: Mendukung fungsi `date_trunc` di backend SQL query agar eksekusi tetap di bawah 200ms untuk dataset jutaan baris.
3. **Efisiensi Caching**: Dengan query yang lebih cepat, Redis dapat mengisi cache lebih efisien tanpa membuat database overload saat cache miss.

## 5. Prosedur Maintenance
Index ini dikelola melalui SQLAlchemy models di `app/models/mikrotik.py` dan dideploy menggunakan migrasi Alembic.

```python
# Contoh implementasi di model
__table_args__ = (
    Index('idx_speed_brd_time', 'board_id', log_time),
)
```

---
*Dokumen ini dibuat secara otomatis sebagai bagian dari audit backend dan optimasi performa sistem.*