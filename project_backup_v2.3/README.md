# Mikrotik Management API

Sistem manajemen router Mikrotik terpusat berbasis Python (FastAPI) dengan arsitektur asinkron, monitoring real-time, dan manajemen konfigurasi otomatis.

## 🚀 Fitur Utama

*   **Monitoring Real-time:** CPU, Memory, Traffic, Uptime.
*   **Manajemen Terpusat:** Dashboard tunggal untuk ratusan router.
*   **Keamanan Tinggi:** Enkripsi AES-256 untuk kredensial, JWT Auth.
*   **Otomatisasi:** Backup harian, Notifikasi Telegram.
*   **Observability:** Integrasi Prometheus & Grafana.
*   **Scalable:** Arsitektur Microservices (API & Worker terpisah) dengan Docker.

## 🛠️ Tech Stack

*   **Backend:** Python 3.11+, FastAPI, SQLAlchemy (Async).
*   **Database:** PostgreSQL 15 (TimescaleDB Ready).
*   **Caching & Queue:** Redis 7.
*   **Infrastructure:** Docker Compose.
*   **Monitoring:** Prometheus, Grafana.

## 📦 Instalasi & Deployment

### Prasyarat
*   Docker Desktop / Docker Engine
*   Git

### Langkah Deployment (Docker)

1.  **Clone Repository**
    ```bash
    git clone https://github.com/your-repo/mikrotik-api.git
    cd mikrotik-api
    ```

2.  **Konfigurasi Environment**
    Salin file `.env.example` ke `.env` dan sesuaikan variabelnya.
    ```bash
    cp .env.example .env
    ```
    *Pastikan `AES_SECRET_KEY` dan `SECRET_KEY` diisi dengan string acak yang panjang.*

3.  **Jalankan Container**
    ```bash
    docker compose up -d --build
    ```

4.  **Verifikasi Layanan**
    *   **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
    *   **Grafana:** [http://localhost:3000](http://localhost:3000) (Login: admin/admin)
    *   **Prometheus:** [http://localhost:9090](http://localhost:9090)

## 📚 Dokumentasi Lengkap

Dokumentasi teknis tersimpan di folder `docs/`:
*   [Roadmap Q2 2026](docs/Implementation_Roadmap_Q2_2026.md)
*   [Project Phases](docs/assessment/PROJECT_PHASES.md)
*   [API Documentation](http://localhost:8000/docs)

## 🛡️ Keamanan

*   Jangan pernah commit file `.env` ke repository publik.
*   Gunakan `HTTPS` (SSL) di production.
*   Batasi akses port 8000, 3000, 9090 hanya untuk IP terpercaya (Firewall).

## 📄 Lisensi

Private Proprietary.
