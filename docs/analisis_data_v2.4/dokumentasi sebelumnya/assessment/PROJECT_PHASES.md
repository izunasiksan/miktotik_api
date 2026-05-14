# Dokumentasi Perencanaan Proyek Mikrotik Management

AI TIDAK DIPERBOLEHKAN MENGHAPUS CATATAN YANG STATUSNYA SUDAH SELESAI

Dokumen ini menguraikan seluruh fase pengembangan proyek, dari fondasi hingga deployment, sesuai dengan Standar Operasional Prosedur (SOP) yang telah ditetapkan.

---

## Fase 1: Core Backend & Database Foundation (Selesai)

*   **Tujuan:** Membangun fondasi aplikasi yang kuat, aman, dan terstruktur.
*   **Komponen:**
    *   **Database Schema:** Desain dan implementasi model menggunakan SQLAlchemy 2.0 (Async) untuk tabel-tabel inti: `master_users`, `mikrotik_boards`, `board_credentials`, `board_stats_realtime`, dan `telegram_recipients`.
    *   **Migrasi Database:** Konfigurasi Alembic untuk menangani migrasi skema database secara `async` dan pembuatan revisi awal.
    *   **Core Security:** Implementasi modul keamanan untuk hashing password (`argon2-cffi`) dan otentikasi berbasis token (`pyjwt`).
    *   **Konfigurasi Awal:** Pengaturan file `.env` untuk menyimpan semua variabel lingkungan sensitif seperti kredensial database dan secret key JWT.
*   **Status:** **COMPLETED**

---

## Fase 2: Data Polling & Worker Logic (Selesai)

*   **Tujuan:** Mengimplementasikan mekanisme untuk mengumpulkan data telemetri secara periodik dan efisien dari semua perangkat Mikrotik yang terdaftar.
*   **Komponen:**
    *   **Polling Worker:** Membuat service `polling_worker.py` yang mengambil daftar board yang aktif untuk dimonitor dari database.
    *   **Concurrency & Batching:** Menggunakan `asyncio.Semaphore` untuk memproses beberapa perangkat secara bersamaan dalam satu batch, mencegah lonjakan beban pada server dan perangkat.
    *   **Timeout Handling:** Menggunakan `asyncio.wait_for` untuk memastikan setiap koneksi atau proses polling yang lambat tidak memblokir keseluruhan worker.
    *   **Scheduler Integration:** Mengintegrasikan `APScheduler` untuk menjalankan siklus polling (`run_polling_cycle`) secara berkala sesuai dengan interval yang didefinisikan di `.env` (`POLLING_INTERVAL_MINUTES`).
    *   **Data Storage:** Menyimpan data hasil polling (seperti `cpu_load`, `uptime`, `active_hotspot_users`, `is_online`) ke dalam tabel `board_stats_realtime`.
*   **Status:** **COMPLETED**

---

## Fase 3: Event-Driven Alerting & Notification (Selesai)

*   **Tujuan:** Membangun sistem notifikasi real-time yang andal untuk memberi tahu teknisi tentang anomali atau insiden pada perangkat yang dimonitor.
*   **Komponen:**
    *   **Event Detection:** Menganalisis data yang masuk ke `board_stats_realtime` untuk mendeteksi kondisi anomali (contoh: `is_online` berubah menjadi `False`, `cpu_load` melebihi 90%, `ping_loss` tinggi).
    *   **Telegram Integration:** Membuat service khusus untuk berinteraksi dengan API Telegram Bot.
    *   **Recipient Logic:** Mengimplementasikan logika untuk menentukan `chat_id` tujuan notifikasi berdasarkan `board_id` yang bermasalah, dengan merujuk pada tabel `telegram_recipients`.
    *   **Message Queuing:** Menggunakan antrean (seperti `asyncio.Queue` atau integrasi dengan Redis) untuk menangani pengiriman notifikasi dalam jumlah besar (burst handling) dan mematuhi rate limit API Telegram (maks. 30 pesan/detik).
    *   **Formatted Messages:** Membuat format pesan standar menggunakan Markdown untuk keterbacaan maksimal, mencakup informasi penting seperti nama router, waktu kejadian, dan status.
    *   **Notification Logging:** Mencatat setiap notifikasi yang berhasil dikirim ke file log terpisah (`notification.log`) untuk kebutuhan audit dan troubleshooting.
*   **Status:** **COMPLETED**

---

## Fase 4: API Endpoint & Frontend Integration (Selesai)

*   **Tujuan:** Menyediakan data yang telah diolah ke antarmuka pengguna (dashboard) dan memungkinkan interaksi manajemen melalui API.
*   **Komponen:**
    *   **FastAPI Endpoints:** Membuat endpoint `async def` untuk:
        *   CRUD (Create, Read, Update, Delete) untuk data master (Users, Boards, Credentials, Recipients).
        *   Menyajikan data statistik historis dan real-time untuk dashboard.
        *   Menampilkan status online/offline perangkat dan metrik penting lainnya.
        *   **User Management:** Implementasi CRUD user, role-based access control (admin/teknisi), dan integrasi dengan frontend.
    *   **Frontend Services:** Menggunakan `axios` di sisi frontend (React) untuk mengonsumsi API dari backend secara aman dan efisien.
    *   **HCI Compliance:** Memastikan setiap fitur interaktif di frontend memenuhi standar HCI:
        *   **Loading Indicator:** Spinner atau skeleton screen saat data sedang diambil.
        *   **Confirmation Modal:** Muncul sebelum melakukan aksi destruktif (misalnya, menghapus board).
        *   **Toast Notification:** Memberikan feedback instan untuk setiap aksi (berhasil, gagal, atau peringatan).
    *   **CORS Configuration:** Mengonfigurasi `CORSMiddleware` di FastAPI untuk mengizinkan permintaan dari domain frontend.
*   **Status:** **COMPLETED**

---

## Fase 5: Data Aggregation & Reporting (Selesai)

*   **Tujuan:** Mengolah data telemetri mentah menjadi laporan ringkasan yang informatif untuk analisis tren dan performa jangka panjang.
*   **Komponen:**
    *   **Scheduled Aggregation:** Membuat tugas terjadwal (menggunakan `APScheduler`) untuk mengagregasi data dari `board_stats_realtime` ke tabel ringkasan (misalnya, `board_stats_daily`, `board_stats_monthly`).
    *   **Data Pruning/Cleanup:** Mengimplementasikan logika untuk membersihkan (prune) data lama dari tabel `board_stats_realtime` secara berkala untuk menjaga performa database dan efisiensi storage.
    *   **Reporting Endpoints:** Membuat API endpoint khusus untuk menyajikan data agregat yang dapat digunakan untuk membuat laporan atau grafik di frontend.
    *   **Export & Visualization:** Implementasi fitur export laporan ke format PDF dan CSV, serta visualisasi data dengan grafik interaktif dan filter rentang tanggal.
*   **Status:** **COMPLETED**

---

## Fase 6: Containerization & Deployment (Selesai)

*   **Tujuan:** Membungkus seluruh komponen aplikasi ke dalam kontainer Docker untuk memastikan proses deployment yang konsisten, terisolasi, dan dapat diskalakan.
*   **Komponen:**
    *   **Dockerfile:** Membuat `Dockerfile` yang mendefinisikan cara membangun image aplikasi Python, termasuk instalasi dependensi dari `requirements.txt`.
*   **Docker Compose:** Membuat file `docker-compose.yml` untuk menjalankan `api` (FastAPI/Uvicorn), `worker` (APScheduler), `db` (PostgreSQL), serta integrasi `redis`, `prometheus`, dan `grafana` (provisioning datasource otomatis).
    *   **Network & Volumes:** Mengonfigurasi jaringan internal Docker agar service dapat berkomunikasi, dan menggunakan `volumes` untuk memastikan data PostgreSQL tetap persisten.
    *   **Environment Configuration:** Menggunakan `env_file` dalam `docker-compose.yml` untuk memuat semua konfigurasi dari file `.env` ke dalam setiap kontainer secara aman.
*   **Status:** **COMPLETED**




## Fase 7: Security Hardening & Documentation Finalization (Completed)

*   **Tujuan:** Menyempurnakan sistem untuk siap produksi (Production-Ready), meningkatkan keamanan, performa, dan melengkapi dokumentasi pengguna.
*   **Komponen:**
    *   **Security Audit:** Memastikan konfigurasi aman (Environment Variables, CORS, Rate Limiting).
    *   **Performance Tuning:** Optimasi query database (Indexing) dan caching (Redis).
    *   **Documentation:** Membuat panduan instalasi (`README.md`) dan penggunaan sistem.
    *   **Handover:** Membersihkan file sementara dan menyiapkan prosedur backup/restore.
*   **Status:** **COMPLETED**


---

## Fase 8: Advanced Network Automation (Completed)

*   **Tujuan:** Mengotomatiskan tindakan perbaikan dan manajemen konfigurasi router untuk efisiensi operasional.
*   **Komponen:**
    *   **Self-Healing:** Implementasi Watchdog dan script reboot otomatis.
    *   **Dynamic QoS:** Manajemen bandwidth otomatis berdasarkan utilisasi real-time.
    *   **Mass Config:** Push command massal ke banyak router sekaligus.
    *   **Zero Touch Provisioning:** Script inisialisasi otomatis untuk router baru.
*   **Status:** **COMPLETED**

---

## Fase 9: High Availability & Scalability (Artifacts Ready)

*   **Tujuan:** Migrasi ke arsitektur cloud-native yang dapat diskalakan secara horizontal untuk menangani ribuan router.
*   **Komponen:**
    *   **Kubernetes (K8s):** Migrasi dari Docker Compose ke orkestrasi kontainer tingkat lanjut.
    *   **Database Clustering:** Implementasi HA PostgreSQL (Patroni) dan Redis Sentinel.
    *   **Distributed Queue:** Peningkatan sistem worker menggunakan RabbitMQ/Celery Cluster.
    *   **Geo-Redundancy:** Distribusi worker node di berbagai lokasi geografis.
*   **Status:** **COMPLETED**
