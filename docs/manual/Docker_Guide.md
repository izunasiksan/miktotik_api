# Panduan Manual Docker - Mikrotik API

**Terakhir Diperbarui:** 01 Maret 2026
**Lingkup:** Panduan Instalasi, Penggunaan, dan Troubleshooting Docker untuk Aplikasi Mikrotik API.

---

## 1. Pendahuluan

Aplikasi Mikrotik API telah dikontainerisasi sepenuhnya menggunakan Docker untuk memastikan konsistensi lingkungan antara pengembangan dan produksi. Arsitektur Docker terdiri dari 4 layanan utama yang saling terintegrasi:

1.  **Backend (`backend`)**: Aplikasi FastAPI (Python 3.11).
2.  **Frontend (`frontend`)**: Aplikasi React + Vite yang disajikan melalui Nginx.
3.  **Database (`db`)**: PostgreSQL 15 untuk penyimpanan data persisten.
4.  **Cache (`redis`)**: Redis 7 untuk caching data, antrean tugas, dan rate limiting.

---

## 2. Prasyarat Sistem

Sebelum menjalankan aplikasi, pastikan komputer Anda telah memenuhi persyaratan berikut:

1.  **Docker Desktop** (untuk Windows/Mac) atau **Docker Engine** (untuk Linux).
    *   *Windows*: Pastikan WSL 2 (Windows Subsystem for Linux) telah aktif.
2.  **Git** (opsional, untuk kloning repositori).
3.  **Koneksi Internet** (untuk mengunduh image Docker pertama kali).

---

## 3. Cara Menjalankan Aplikasi

Ikuti langkah-langkah berikut untuk menjalankan aplikasi dari nol:

### Langkah 1: Pastikan Docker Berjalan
Buka aplikasi **Docker Desktop** dan tunggu hingga statusnya berubah menjadi **"Running"** (biasanya ditandai dengan ikon hijau di pojok kiri bawah atau system tray).

### Langkah 2: Jalankan Docker Compose
Buka terminal (PowerShell, CMD, atau Terminal VS Code) di direktori *root* proyek (`e:\mikrotik_api`), lalu jalankan perintah:

```bash
docker-compose up --build
```

*   **`up`**: Membuat dan memulai container.
*   **`--build`**: Memaksa Docker untuk membangun ulang image (penting jika ada perubahan kode).

### Langkah 3: Tunggu Proses Booting
Anda akan melihat log dari keempat layanan. Tunggu hingga muncul pesan bahwa server backend dan frontend siap:
*   Backend: `Application startup complete.`
*   Frontend: `start worker processes` (Nginx).

---

## 4. Akses Aplikasi

Setelah semua container berjalan, Anda dapat mengakses layanan melalui browser:

| Layanan | URL | Keterangan |
| :--- | :--- | :--- |
| **Frontend Dashboard** | [http://localhost:3000](http://localhost:3000) | Antarmuka pengguna utama. |
| **Backend API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Dokumentasi Swagger UI interaktif. |
| **Backend ReDoc** | [http://localhost:8000/redoc](http://localhost:8000/redoc) | Dokumentasi API alternatif. |

---

## 5. Perintah Docker yang Sering Digunakan

Berikut adalah perintah-perintah penting untuk mengelola aplikasi:

### Menghentikan Aplikasi
Tekan `Ctrl+C` di terminal tempat Docker berjalan, atau jalankan perintah berikut di terminal baru:
```bash
docker-compose down
```
*Gunakan `docker-compose down -v` jika ingin menghapus volume database (DATA AKAN HILANG).*

### Melihat Status Container
```bash
docker-compose ps
```

### Melihat Log (Real-time)
```bash
docker-compose logs -f
```
*Untuk melihat log layanan tertentu (misal backend):* `docker-compose logs -f backend`

### Masuk ke Dalam Container (Shell)
Untuk debugging langsung di dalam container:
*   **Backend**: `docker-compose exec backend bash`
*   **Frontend**: `docker-compose exec frontend sh`
*   **Database**: `docker-compose exec db psql -U postgres -d db_master_mikrotik`
*   **Redis**: `docker-compose exec redis redis-cli`

---

## 6. Struktur Konfigurasi

*   **`docker-compose.yml`**: File orkestrasi utama. Mengatur jaringan, port, dan environment variables.
*   **`Dockerfile`**: Definisi image untuk Backend.
*   **`frontend/Dockerfile`**: Definisi image untuk Frontend (Multi-stage build: Node.js -> Nginx).
*   **`frontend/nginx.conf`**: Konfigurasi server Nginx untuk melayani React app dan meneruskan request API (`/api/v1`) ke backend.

---

## 7. Troubleshooting (Masalah Umum)

### Error: `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.`
*   **Penyebab**: Docker Desktop belum berjalan atau belum siap.
*   **Solusi**: Buka aplikasi Docker Desktop, tunggu hingga ikon paus berwarna hijau, lalu coba lagi.

### Error: `Port is already allocated`
*   **Penyebab**: Ada aplikasi lain yang menggunakan port 3000, 8000, 5432, atau 6379.
*   **Solusi**:
    1.  Matikan aplikasi yang menggunakan port tersebut (misalnya server lokal `npm run dev` atau PostgreSQL lokal).
    2.  Atau, ubah mapping port di `docker-compose.yml` (misal: `"3001:80"` untuk frontend).

### Backend Error: `Connection refused` to DB/Redis
*   **Penyebab**: Container backend berjalan sebelum DB/Redis siap.
*   **Solusi**: Sistem *Healthcheck* sudah diterapkan di `docker-compose.yml` untuk mencegah ini. Namun jika terjadi, coba restart container backend:
    ```bash
    docker-compose restart backend
    ```

### Perubahan Kode Frontend Tidak Muncul
*   **Penyebab**: Docker menggunakan versi build lama.
*   **Solusi**: Jalankan build ulang:
    ```bash
    docker-compose up --build frontend
    ```
