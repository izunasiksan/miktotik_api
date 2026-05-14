# Dokumentasi Perbaikan Docker Backend V2.3

Dokumen ini mencatat langkah-langkah perbaikan untuk kontainer Docker Backend dan sinkronisasi database Alembic pada proyek **mikrotik_api**.

## 1. Identifikasi Masalah

### Gejala
- Kontainer `backend` dan `celery_worker` terus-menerus restart (CrashLoopBackOff).
- Log kontainer menunjukkan error: `sqlalchemy.exc.ProgrammingError: <class 'asyncpg.exceptions.DuplicateTableError'>: relation "telegram_bots" already exists`.
- `alembic upgrade head` mencoba menjalankan migrasi awal padahal tabel sudah ada di database.

### Akar Penyebab
Tabel `alembic_version` tidak ditemukan di database Docker (`mikrotik_api-db-1`), meskipun tabel-tabel aplikasi sudah ada. Hal ini menyebabkan Alembic menganggap database masih kosong dan mencoba membuat ulang tabel dari migrasi pertama, yang berujung pada konflik nama tabel.

---

## 2. Tindakan Perbaikan

### Langkah 1: Sinkronisasi Manual Alembic Version
Saya melakukan sinkronisasi manual pada database di dalam kontainer Docker untuk memberitahu Alembic bahwa skema saat ini sudah berada di versi terbaru (`b6b1f9745450`).

Perintah yang dijalankan:
```bash
docker exec mikrotik_api-db-1 psql -U postgres -d db_master_mikrotik -c \
"CREATE TABLE alembic_version (version_num varchar(32) NOT NULL, CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)); \
INSERT INTO alembic_version (version_num) VALUES ('b6b1f9745450');"
```

### Langkah 2: Rebuild Kontainer Backend
Untuk memastikan perubahan kode terbaru (termasuk standarisasi penamaan V2.3 dan perbaikan parameter API) masuk ke dalam image Docker, dilakukan proses rebuild.

Perintah:
```bash
docker-compose up --build -d backend celery_worker
```

### Langkah 3: Aktivasi Layanan Terkait
Memastikan seluruh stack (Redis, DB, Frontend) berjalan normal.

---

## 3. Hasil Akhir

| Kontainer | Status | Fungsi |
| :--- | :--- | :--- |
| **mikrotik_api-db-1** | Healthy | Database PostgreSQL 15 |
| **mikrotik_api-redis-1** | Healthy | Redis Cache & Rate Limiter |
| **mikrotik_api-backend-1** | **Running** | FastAPI Server (Port 8000) |
| **mikrotik_api-celery_worker-1** | **Running** | Background Task Processor |
| **mikrotik_api-frontend-1** | **Running** | React Frontend (Port 3000) |

### Verifikasi Log Backend
Log menunjukkan aplikasi berhasil startup:
- `INFO:apscheduler.scheduler:Scheduler started`
- `INFO: Application startup complete.`
- `INFO: Uvicorn running on http://0.0.0.0:8000`

---

## 4. Rekomendasi Maintenance
- Selalu gunakan `docker-compose down -v` jika ingin membersihkan volume database secara total.
- Jika terjadi ketidaksinkronan lagi, gunakan script `backend/check_db_state.py` (pada host) atau perintah `psql` di dalam kontainer untuk memverifikasi tabel `alembic_version`.

---
*Dokumen ini dibuat secara otomatis sebagai bagian dari standarisasi V2.3.*
