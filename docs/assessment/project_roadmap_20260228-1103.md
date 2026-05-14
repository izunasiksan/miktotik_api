# Ringkasan Peta Jalan Proyek (Project Roadmap)

Dokumen ini adalah ringkasan dari `PROJECT_PHASES.md` yang mendefinisikan alur kerja pengembangan.

-   **Fase 1: Core Backend & Database (Selesai)**
    -   Membangun model SQLAlchemy, migrasi Alembic, dan modul keamanan (JWT & Argon2).

-   **Fase 2: Data Polling & Worker (Selesai)**
    -   Implementasi worker `asyncio` dengan `APScheduler` untuk pengumpulan data periodik dari perangkat Mikrotik.

-   **Fase 3: Event-Driven Alerting (Pending)**
    -   Membangun sistem notifikasi via Telegram berdasarkan anomali data, lengkap dengan antrean pesan.

-   **Fase 4: API & Frontend Integration (Pending)**
    -   Menyediakan endpoint FastAPI untuk dikonsumsi oleh dashboard React, dengan mematuhi standar HCI.

-   **Fase 5: Data Aggregation & Reporting (Pending)**
    -   Membuat tugas terjadwal untuk agregasi data harian/bulanan dan pembersihan data lama.

-   **Fase 6: Containerization & Deployment (Pending)**
    -   Membungkus aplikasi menggunakan Docker dan Docker Compose untuk deployment yang konsisten.
