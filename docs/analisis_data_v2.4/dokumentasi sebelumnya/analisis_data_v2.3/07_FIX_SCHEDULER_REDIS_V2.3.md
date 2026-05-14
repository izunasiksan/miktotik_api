# Dokumentasi Perbaikan Scheduler dan Redis V2.3

Dokumen ini mencatat langkah-langkah perbaikan untuk masalah Scheduler yang dinonaktifkan dan Redis yang tidak terjangkau pada proyek **mikrotik_api**.

## 1. Perbaikan Scheduler

### Masalah
Muncul peringatan: `⚠️ Scheduler disabled via configuration (running in API mode only)`.
Scheduler (APScheduler) tidak berjalan, sehingga tugas latar belakang seperti polling data Mikrotik dan agregasi harian tidak dieksekusi.

### Tindakan Perbaikan
- Mengubah konfigurasi pada file `backend/app/core/config.py`.
- Menyetel parameter `ENABLE_SCHEDULER` dari `False` menjadi `True`.

### Lokasi Perubahan
File: `backend/app/core/config.py`
```python
# SYSTEM
ENABLE_SCHEDULER: bool = True  # Enable for background tasks
```

### Verifikasi
- Saat aplikasi backend dijalankan, fungsi `lifespan` di `backend/app/main.py` akan mendeteksi `settings.ENABLE_SCHEDULER` sebagai `True`.
- Scheduler akan mendaftarkan tugas-tugas berikut:
    - `polling_job` (setiap 5 menit)
    - `daily_aggregation` (00:30 AM)
    - `daily_backup` (02:00 AM)
    - `monthly_aggregation` (Tanggal 1, 01:00 AM)
    - `weekly_maintenance` (Minggu, 03:00 AM)

---

## 2. Perbaikan Koneksi Redis

### Masalah
Muncul peringatan:
- `⚠️ Redis not reachable at localhost:6379. Falling back to memory storage for Limiter.`
- `⚠️ Redis not reachable at localhost:6379. Disabling cache layer (SafeRedisClient).`

Redis tidak berjalan di lingkungan lokal (Windows), sehingga sistem beralih ke penyimpanan memori (volatile) yang tidak persisten antar restart.

### Tindakan Perbaikan
- Menjalankan layanan Redis menggunakan Docker Desktop.
- Perintah yang dijalankan: `docker-compose up -d redis`.
- Memastikan port `6379` terpetakan dengan benar dari container ke host (`0.0.0.0:6379->6379/tcp`).

### Verifikasi Koneksi
- Pengujian koneksi dari host menggunakan script Python:
  ```python
  import redis
  r = redis.Redis(host='127.0.0.1', port=6379)
  print(r.ping()) # Output: True
  ```
- Koneksi berhasil diverifikasi pada `127.0.0.1:6379`.

### Manfaat Perbaikan
- **Limiter**: Sekarang menggunakan Redis untuk melacak rate limit, sehingga data tidak hilang saat server restart.
- **Caching**: `SafeRedisClient` sekarang aktif, memungkinkan caching hasil analisis data untuk meningkatkan performa API.
- **Blacklist/Jail2Ban**: Mekanisme pemblokiran IP otomatis sekarang berfungsi secara persisten.

---

## 3. Status Akhir

| Komponen | Status Sebelumnya | Status Sekarang | Keterangan |
| :--- | :--- | :--- | :--- |
| **Scheduler** | Disabled | **Enabled** | Berjalan di background (Lifespan API) |
| **Redis** | Unreachable | **Connected** | Berjalan via Docker (Port 6379) |
| **Limiter** | Memory Storage | **Redis Storage** | Persisten & Konsisten |
| **Caching** | Disabled | **Enabled** | Optimalisasi performa aktif |

---
*Dokumen ini dibuat secara otomatis sebagai bagian dari standarisasi V2.3.*
