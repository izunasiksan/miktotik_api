# Docker Development Guide v2.4 (Redis-as-a-Service)

Dokumentasi ini menjelaskan strategi pengembangan aplikasi Mikrotik API v2.4 di mana Docker **hanya difungsikan** untuk menjalankan layanan pendukung seperti **Redis (Cache)** guna memudahkan proses investigasi dan debugging pada sisi aplikasi (Backend & Frontend).

## 1. Alasan Strategi Ini (V2.4)
Pengembangan aplikasi secara full-container (Backend & Frontend di dalam Docker) seringkali menyulitkan proses:
- **Investigasi Log**: Log aplikasi terkadang terpotong atau sulit difilter di dalam kontainer.
- **Hot-Reload**: Terkadang terjadi delay antara perubahan kode dan update di kontainer.
- **Debugging**: Sulit untuk melakukan breakpoint debugging secara langsung.

Oleh karena itu, pada v2.4, kita merekomendasikan menjalankan **Backend & Frontend secara Native** (di luar Docker) dan **Layanan Pendukung (Redis) via Docker**.

## 2. Cara Menjalankan Layanan Pendukung (Redis Saja)
Gunakan file `docker-compose.dev.yml` yang telah disediakan untuk menjalankan Redis secara cepat.

```bash
# Jalankan Redis di background
docker-compose -f docker-compose.dev.yml up -d
```

Layanan yang akan aktif:
- **Redis**: Port `6379` (Digunakan untuk Caching & Task Queuing).

## 3. Konfigurasi Aplikasi (Native Development)

### **A. Backend (Python/FastAPI)**
Pastikan file `.env` di folder `backend` diarahkan ke localhost:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
DB_HOST=localhost  # Jika Database juga dijalankan native/lokal
```
Jalankan backend:
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

### **B. Frontend (Vite/React)**
Frontend akan otomatis menggunakan proxy ke backend di localhost:8000.
```bash
cd frontend
npm run dev
```

## 4. Keuntungan Mode Ini
- **Real-time Logging**: Anda dapat melihat log langsung di terminal editor (Trae/VSCode).
- **Fast Investigation**: Mudah untuk melakukan restart backend/frontend secara instan jika ada error.
- **Resource Efficient**: Mengurangi beban CPU/RAM karena tidak perlu menjalankan seluruh container stack.

---
*Catatan: File `docker-compose.yml` utama tetap tersedia untuk pengujian integrasi akhir (Production-like environment).*
