# DOKUMENTASI PERUBAHAN BACKEND (ANALYSIS SERVICE)

**ID Dokumen**: BE-20260302-01
**Status**: COMPLETED (Telah Diimplementasikan)
**Tujuan**: Menambahkan endpoint baru untuk mendukung analisis performa interface secara mendalam.

## 1. Perubahan Endpoint (`api/endpoints/analysis.py`)
Akan ditambahkan endpoint baru:
- `GET /api/v1/analysis/{board_id}/interfaces/`: Mengembalikan daftar interface yang dimonitor beserta statistik agregatnya.
- `GET /api/v1/analysis/{board_id}/forecast/interface/{interface_name}`: Memberikan data prediksi (forecasting) khusus untuk satu interface.

## 2. Logic Service (`services/analysis_service.py`)
Logic baru akan diimplementasikan untuk melakukan:
- **P95 Aggregation**: Menghitung persentil ke-95 dari traffic download/upload per interface.
- **Trend Detection**: Mendeteksi kenaikan traffic yang signifikan (>20% YoY atau MoM).
- **Interface Ranking**: Mengurutkan interface berdasarkan utilisasi bandwidth tertinggi.

## 3. Alur Data (Rule Compliant)
1. **Frontend**: Kirim intent melalui pemanggilan API di `api.js`.
2. **Backend (Router)**: Validasi UUID board dan hak akses user.
3. **Backend (Service)**: Eksekusi kueri SQL berat (agregasi/window function) di PostgreSQL.
4. **Backend (Response)**: Kirim JSON hasil akhir ke frontend (Tidak ada perhitungan berat di JS).

## 4. Keamanan & Performa
- **Caching**: Menggunakan Redis untuk menyimpan hasil agregasi selama 1 jam.
- **Limiting**: Membatasi query range maksimal 365 hari.

---
*Dokumen ini dibuat sesuai aturan workspace sebagai prasyarat perubahan backend.*
