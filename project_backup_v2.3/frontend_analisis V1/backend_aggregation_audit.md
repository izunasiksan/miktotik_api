# Backend Aggregation Audit - Granularity Support

**Tanggal Audit:** 2026-03-03
**Domain:** Backend (.py) / Database (PostgreSQL)

## 1. Kondisi Saat Ini
Berdasarkan audit pada `app/services/analysis_service.py`, ditemukan bahwa:
*   **Agregasi Terkunci (Hardcoded):** Sebagian besar query menggunakan `board_daily_summary` yang sudah teragregasi harian secara permanen.
*   **Tanpa Parameter Granularitas:** Fungsi `get_heavy_analysis` dan endpoint terkait hanya menerima `start_date` dan `end_date`, namun tidak menerima parameter `granularity`.
*   **Penyebab Bottleneck Frontend:** Karena backend hanya menyediakan data harian atau data mentah (raw), frontend harus melakukan iterasi ribuan baris untuk melakukan agregasi "Mingguan" atau "Bulanan" pada rentang waktu > 1 tahun.

## 2. Analisis Risiko & Dampak
*   **Performa:** Jika user memilih rentang 2 tahun, frontend akan menarik ~730 baris data harian. Ini masih *manageable*. Namun, jika user memilih "Per Jam" untuk 30 hari (~720 baris), beban masih di frontend.
*   **Skalabilitas:** Jika jumlah router (boards) bertambah dan data mencapai jutaan baris, query tanpa agregasi di sisi database akan memperlambat respon API dan meningkatkan penggunaan memori di browser.

## 3. Rekomendasi Implementasi (SQL)
Untuk mendukung fitur "Auto-Granularity" secara penuh di sisi database, backend harus diperbarui untuk mendukung fungsi `date_trunc` PostgreSQL.

### Contoh Perubahan Query SQL:
```sql
SELECT 
    date_trunc(:granularity, log_time) as period,
    avg(download_mbps) as avg_dl,
    max(download_mbps) as max_dl
FROM board_speed_stats
WHERE board_id = :board_id 
  AND log_time >= :start_date 
  AND log_time <= :end_date
GROUP BY period
ORDER BY period ASC;
```
*   `granularity` dapat bernilai: `'hour'`, `'day'`, `'week'`, `'month'`.

## 4. Langkah Selanjutnya untuk Tim Backend
1.  Tambahkan parameter `granularity: Optional[str] = 'day'` pada service functions.
2.  Gunakan `text()` atau SQLAlchemy `func.date_trunc` untuk membungkus kolom waktu.
3.  Pastikan index pada `(board_id, log_time)` tersedia untuk mengoptimalkan query `date_trunc`.

---
*Dokumen ini dibuat secara otomatis sebagai bagian dari prosedur verifikasi fitur Auto-Granularity.*
