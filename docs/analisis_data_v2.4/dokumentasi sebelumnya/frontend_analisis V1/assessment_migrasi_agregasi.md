# Assessment Migrasi Agregasi Backend Analysis

**ID Dokumen**: AS-20260302-01
**Tujuan**: Memenuhi aturan `filtering.md` dan `fullfrontend.md` dengan memindahkan perhitungan agregasi berat dari Frontend ke Backend.

## 1. Identifikasi Pelanggaran Arsitektur
Ditemukan beberapa fungsi pada `useAnalysisData.js` yang melakukan kalkulasi berat:
- **Top Growth Users**: Melakukan iterasi, grouping (Map), sorting, dan perhitungan rata-rata pada ribuan baris log di sisi client.
- **Health Score Calculation**: Menggunakan statistik (Standard Deviation, CV) pada dataset besar di sisi client.

## 2. Rencana Migrasi Agregasi
Akan dilakukan perubahan pada backend untuk mengambil alih tanggung jawab perhitungan tersebut.

### A. Perubahan pada `get_heavy_analysis` (Service)
Endpoint ini akan diperluas untuk mengembalikan:
1.  **`top_growth_users`**: Hasil kueri SQL menggunakan window functions untuk menghitung pertumbuhan penggunaan bandwidth antar periode.
2.  **`health_score`**: Skor akhir yang sudah dihitung di backend berdasarkan metrik resource dan anomali.

### B. Perubahan pada `get_interface_analysis`, `get_pppoe_analysis`, `get_hotspot_analysis`, dan `get_clients_analysis`
Fungsi-fungsi ini akan dimigrasi untuk melakukan agregasi pivot (Sum, Max, Avg) langsung di level database PostgreSQL menggunakan kueri SQL `GROUP BY` dan fungsi agregasi (`SUM`, `MAX`, `AVG`). Frontend hanya akan menerima hasil akhir yang sudah siap ditampilkan dalam tabel pivot dan chart trend.

### C. Struktur Kueri SQL (Backend)
```sql
-- Contoh kueri untuk Top Growth (PPPoE)
WITH daily_usage AS (
    SELECT 
        pppoe_username, 
        log_date, 
        sum(total_rx_bytes + total_tx_bytes) as total_bytes
    FROM board_pppoe_usage
    WHERE board_id = :board_id AND log_date >= :start_date
    GROUP BY pppoe_username, log_date
),
period_avg AS (
    SELECT 
        pppoe_username,
        avg(total_bytes) filter (where log_date < :mid_date) as prev_avg,
        avg(total_bytes) filter (where log_date >= :mid_date) as curr_avg
    FROM daily_usage
    GROUP BY pppoe_username
)
SELECT pppoe_username, prev_avg, curr_avg, 
       ((curr_avg - prev_avg) / NULLIF(prev_avg, 0)) * 100 as growth_pct
FROM period_avg
WHERE prev_avg > 0
ORDER BY growth_pct DESC
LIMIT 5;
```

## 3. Dampak & Risiko
- **Dampak**: Pengurangan beban CPU pada browser user, dashboard menjadi lebih responsif saat menangani data dalam jumlah besar (3-12 bulan).
- **Risiko**: Beban CPU backend sedikit meningkat, namun terkompensasi dengan efisiensi kueri SQL (dibandingkan pengolahan manual di JS).

## 4. Rekomendasi
Segera lakukan modifikasi pada `backend/app/services/analysis_service.py` untuk mengimplementasikan kueri di atas, kemudian hapus logika manual di `frontend/src/pages/analysis/hooks/useAnalysisData.js`.

---
*Dokumen ini dibuat sebagai prasyarat migrasi kode sesuai aturan workspace.*
