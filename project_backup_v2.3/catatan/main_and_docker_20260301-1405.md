Judul: Perbaikan handler SlowAPI dan Dockerization
Tanggal: 2026-03-01 14:05

Bagian A: Perbaikan main.py
- Masalah: add_exception_handler menolak handler bertipe (Request, RateLimitExceeded) karena tipe handler FastAPI mengharuskan parameter kedua bertipe Exception.
- Solusi: Ubah signature menjadi (Request, Exception) dan cast ke RateLimitExceeded saat memanggil handler bawaan.
- Perubahan:
  - Import: from typing import cast
  - Handler: async def custom_rate_limit_exceeded_handler(request, exc: Exception) -> Response
  - Return: return _rate_limit_exceeded_handler(request, cast(RateLimitExceeded, exc))
- Status: Diagnostics bersih untuk file main.py.

Bagian B: Dockerization
- Dockerfile:
  - Base image: python:3.11-slim
  - Install dependencies via requirements.txt
  - Entrypoint: uvicorn app.main:app --host 0.0.0.0 --port 8000
- docker-compose.yml:
  - Layanan: db (postgres:15), redis:7, api (build .)
  - Environment app: DB_HOST=db, DB_PORT=5432, DB_NAME=db_master_mikrotik, DB_USER=postgres, DB_PASS=example, REDIS_HOST=redis, REDIS_PORT=6379, ENABLE_SCHEDULER=true
  - Port mapping: API 8000:8000, Postgres 5432:5432, Redis 6379:6379

Cara Menjalankan:
- docker compose up --build

Catatan:
- Gunakan .env untuk override credential di produksi. Nilai default pada compose hanya untuk pengembangan.

