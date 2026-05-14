# Arsitektur Redis v2.4 (Redis-as-a-Service)

Dokumentasi ini menjelaskan integrasi Redis dalam ekosistem Mikrotik API v2.4 menggunakan Docker container sebagai service cache mandiri.

## 1. Arsitektur Sistem Redis
Sistem menggunakan pola **Sidecar Service** di mana Redis berjalan di dalam container Docker, sementara Backend (FastAPI) dan Frontend (Vite) berjalan secara native di host localhost.

### Alur Komunikasi:
1. **Docker Container**: Menjalankan Redis Server pada port internal 6379.
2. **Port Mapping**: Docker memetakan port internal 6379 ke port localhost:6379 pada host.
3. **Backend (Python)**: Terhubung langsung ke localhost:6379 menggunakan library `redis-py` (Async).
4. **Frontend (React)**: Terhubung ke Redis secara **tidak langsung** (Indirect) melalui API Backend Proxy untuk alasan keamanan (Best Practice).

---

## 2. Troubleshooting Koneksi Localhost

Jika koneksi ke Redis di localhost:6379 gagal, periksa langkah-langkah berikut:

### **A. Redis Connection Refused**
- **Penyebab**: Container Redis tidak berjalan atau port 6379 digunakan oleh proses lain.
- **Solusi**:
  1. Cek status container: `docker ps | grep redis`
  2. Cek port: `netstat -ano | findstr :6379` (Windows)
  3. Restart container: `docker-compose -f docker-compose.redis.yml restart`

### **B. Authentication Failed**
- **Penyebab**: Password Redis salah atau tidak dikirimkan oleh client.
- **Solusi**: Periksa variabel lingkungan `REDIS_PASSWORD` di `.env` backend dan pastikan sesuai dengan `docker-compose.redis.yml`.

### **C. Docker Desktop Issues (Windows)**
- **Penyebab**: Docker Desktop vEthernet adapter terkadang memblokir localhost.
- **Solusi**: Coba ganti `localhost` dengan `127.0.0.1` pada konfigurasi `.env`.

---

## 3. Best Practices (Security & Performance)

### **Security**
1. **Password Protection**: Selalu gunakan `REDIS_PASSWORD` (requirepass) meskipun di lingkungan development.
2. **Bind Address**: Jangan mengekspos port Redis ke internet publik tanpa firewall.
3. **No Root**: Jalankan container Redis dengan user non-root (Default di alpine image).

### **Performance**
1. **Connection Pooling**: Gunakan `ConnectionPool` di backend untuk menghindari overhead pembuatan koneksi berulang.
2. **Pipelining**: Gunakan Redis Pipelining untuk operasi batch (SET/GET massal).
3. **Memory Management**: Gunakan kebijakan pengosongan memori (eviction policy) `allkeys-lru` untuk mencegah Redis kehabisan RAM.
4. **Binary Data**: Simpan data kompleks (JSON) dengan serialisasi yang efisien.
