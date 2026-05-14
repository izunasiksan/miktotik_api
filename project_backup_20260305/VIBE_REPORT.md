# VIBE REPORT — IKSAN ZANUSI - MIKROTIK MANAGER VIA API
**Tanggal:** 2026-03-02  
**Lokasi Proyek:** `E:\mikrotik_api`  
**Ringkas:** FastAPI async + PostgreSQL (asyncpg/SQLAlchemy) + Redis + Scheduler (APScheduler) + React (Vite) untuk manajemen & monitoring MikroTik (historis + live/on-demand).

---

## 1) Tech Stack

### Frontend (React)
- React + Vite: [package.json](file:///e:/mikrotik_api/frontend/package.json)
- Routing: `react-router-dom` (Routes + ProtectedRoute): [App.jsx](file:///e:/mikrotik_api/frontend/src/App.jsx)
- Data fetching/cache: `@tanstack/react-query`: [App.jsx](file:///e:/mikrotik_api/frontend/src/App.jsx)
- HTTP client: `axios` dengan interceptor Bearer token: [api.js](file:///e:/mikrotik_api/frontend/src/services/api.js)
- UI: Tailwind CSS: [index.css](file:///e:/mikrotik_api/frontend/src/index.css)
- Toast: `react-hot-toast`: [App.jsx](file:///e:/mikrotik_api/frontend/src/App.jsx)
- Icon: `lucide-react`: [Sidebar.jsx](file:///e:/mikrotik_api/frontend/src/components/layout/Sidebar.jsx)

### Backend (FastAPI Async)
- FastAPI (async), Uvicorn: [main.py](file:///e:/mikrotik_api/backend/app/main.py)
- DB ORM: SQLAlchemy 2.x Async + `asyncpg`: [config.py](file:///e:/mikrotik_api/backend/app/core/config.py)
- Scheduler: APScheduler (AsyncIOScheduler): [main.py](file:///e:/mikrotik_api/backend/app/main.py)
- Rate limit + blacklist: `slowapi` + Redis: [limiter.py](file:///e:/mikrotik_api/backend/app/core/limiter.py)
- Mikrotik integration:
  - RouterOS API: `routeros_api` (dipanggil via thread executor untuk call sync): [boards.py](file:///e:/mikrotik_api/backend/app/api/endpoints/boards.py)
- Security:
  - JWT (HS256): [config.py](file:///e:/mikrotik_api/backend/app/core/config.py)
  - Password hashing: dipakai via `get_password_hash/verify_password`: [auth.py](file:///e:/mikrotik_api/backend/app/api/endpoints/auth.py)
  - AES encryption untuk kredensial MikroTik: [boards.py](file:///e:/mikrotik_api/backend/app/api/endpoints/boards.py)
- Reporting export: CSV/PDF via `reportlab`: [reports.py](file:///e:/mikrotik_api/backend/app/api/endpoints/reports.py)

### Database & Infra
- PostgreSQL: tabel & relasi utama ada di: [schema.sql](file:///e:/mikrotik_api/docs/db/schema.sql)
- Redis: caching list/summary + limiter storage + blacklist: [limiter.py](file:///e:/mikrotik_api/backend/app/core/limiter.py)
- Docker Compose (service PostgreSQL/Redis): [docker-compose.yml](file:///e:/mikrotik_api/docker-compose.yml)

---

## 2) Struktur Modul (High-Level)

### Backend
- Entry & middleware, router, scheduler: [main.py](file:///e:/mikrotik_api/backend/app/main.py)
- Router API (v1): [api.py](file:///e:/mikrotik_api/backend/app/api/api.py)
- Endpoints utama:
  - Auth: [auth.py](file:///e:/mikrotik_api/backend/app/api/endpoints/auth.py)
  - Dashboard: [dashboard.py](file:///e:/mikrotik_api/backend/app/api/endpoints/dashboard.py)
  - Boards (devices + live ops): [boards.py](file:///e:/mikrotik_api/backend/app/api/endpoints/boards.py)
  - Reports (historis + export): [reports.py](file:///e:/mikrotik_api/backend/app/api/endpoints/reports.py)
  - Users + board access: [users.py](file:///e:/mikrotik_api/backend/app/api/endpoints/users.py)
  - Backups: [backups.py](file:///e:/mikrotik_api/backend/app/api/endpoints/backups.py)
  - Developer tools: [developer.py](file:///e:/mikrotik_api/backend/app/api/endpoints/developer.py)
- Services (job & domain):
  - Polling cycle: [polling_worker.py](file:///e:/mikrotik_api/backend/app/services/polling_worker.py)
  - Aggregation (daily/monthly): [aggregation_service.py](file:///e:/mikrotik_api/backend/app/services/aggregation_service.py)
  - Backup orchestration: [backup_service.py](file:///e:/mikrotik_api/backend/app/services/backup_service.py)
  - Cron wrappers: [cron_tasks.py](file:///e:/mikrotik_api/backend/app/scheduler/cron_tasks.py)

### Frontend
- Router + AuthProvider + QueryClient + Toaster: [App.jsx](file:///e:/mikrotik_api/frontend/src/App.jsx)
- API wrapper (axios): [api.js](file:///e:/mikrotik_api/frontend/src/services/api.js)
- Halaman utama:
  - Login: [Login.jsx](file:///e:/mikrotik_api/frontend/src/pages/Login.jsx)
  - Dashboard: [Dashboard.jsx](file:///e:/mikrotik_api/frontend/src/pages/Dashboard.jsx)
  - Devices (Boards): [Boards.jsx](file:///e:/mikrotik_api/frontend/src/pages/Boards.jsx)
  - Router detail (tabs): [RouterDetail.jsx](file:///e:/mikrotik_api/frontend/src/pages/RouterDetail.jsx)
  - Reports: [Reports.jsx](file:///e:/mikrotik_api/frontend/src/pages/Reports.jsx)
  - Users: [Users.jsx](file:///e:/mikrotik_api/frontend/src/pages/Users.jsx)
  - Audit logs: [AuditLogs.jsx](file:///e:/mikrotik_api/frontend/src/pages/AuditLogs.jsx)
  - Settings: [Settings.jsx](file:///e:/mikrotik_api/frontend/src/pages/Settings.jsx)
  - Automation: [Automation.jsx](file:///e:/mikrotik_api/frontend/src/pages/Automation.jsx)
  - ZTP Queue: [ZTPQueue.jsx](file:///e:/mikrotik_api/frontend/src/pages/ZTPQueue.jsx)
  - Developer console: [DeveloperConsole.jsx](file:///e:/mikrotik_api/frontend/src/pages/DeveloperConsole.jsx)

---

## 3) Alur Utama (User Flow)

### Flow A — Login → Operasional Monitoring
1. User buka `/login` dan submit kredensial.
2. Frontend memanggil `POST /api/v1/auth/login/` (form-urlencoded) dan simpan token di `localStorage`.
3. Akses halaman protected (`/`, `/boards`, `/reports`, dll) via `ProtectedRoute`.
4. Layout melakukan health-check backend setiap 30 detik dengan query `GET /api/v1/dashboard/summary/` untuk indikator status: [Layout.jsx](file:///e:/mikrotik_api/frontend/src/components/layout/Layout.jsx)

### Flow B — Manajemen Device (Boards) → Router Detail
1. User buka `Devices` (`/boards`) untuk melihat daftar router dari `GET /api/v1/boards/`.
2. Admin bisa create/update/delete board (CRUD) + simpan kredensial MikroTik terenkripsi (AES) di tabel credential.
3. User masuk ke detail device (`/boards/:id`) untuk melihat:
   - Overview (historis): stats dari DB via `GET /api/v1/boards/{id}/stats/` (auto-refresh 10s).
   - Live management (on-demand):
     - Interfaces list: `GET /api/v1/boards/{id}/interfaces/`
     - Monitor traffic interface: `GET /api/v1/boards/{id}/interfaces/{name}/monitor`
     - Enable/disable interface: `POST /api/v1/boards/{id}/interfaces/{name}/toggle`
     - PPPoE active: `GET /api/v1/boards/{id}/pppoe/` + disconnect user: `DELETE /api/v1/boards/{id}/pppoe/{username}/`
     - Hotspot active: `GET /api/v1/boards/{id}/hotspot/` + disconnect user: `DELETE /api/v1/boards/{id}/hotspot/{username}/`
     - VPN profiles CRUD: `GET/POST/PUT/DELETE /api/v1/boards/{id}/vpn/...`

### Flow C — Backup & Restore Router
1. Dari `Router Detail` tab `Backups`, frontend load list `GET /api/v1/backups/{board_id}/`.
2. Admin bisa create backup `POST /api/v1/backups/`.
3. Admin bisa restore `POST /api/v1/backups/{backup_id}/restore/`: [backups.py](file:///e:/mikrotik_api/backend/app/api/endpoints/backups.py)

### Flow D — Reports (Historis) + Export
1. User buka `/reports` untuk report daily/monthly/interface/pppoe/hotspot dari DB.
2. Export CSV/PDF via `GET /api/v1/reports/export/{board_id}/?type=daily|monthly&format=csv|pdf...`: [reports.py](file:///e:/mikrotik_api/backend/app/api/endpoints/reports.py)
3. Admin bisa trigger agregasi manual `POST /api/v1/reports/trigger-aggregation/`.

### Flow E — Admin (RBAC) + Audit
1. Public registration `POST /api/v1/auth/register/` membuat user `is_active=false` (butuh approval).
2. Admin mengelola user `GET/POST/PUT/DELETE /api/v1/users/` + grant/revoke akses board: [users.py](file:///e:/mikrotik_api/backend/app/api/endpoints/users.py)
3. Aktivitas dicatat lewat AuditService (async task) dan bisa dilihat via halaman `Audit Logs`.

---

## 4) Working Features (Yang Sudah Terlihat Berfungsi di Kode)
- Autentikasi JWT: login, me, test-token + rate-limit login/register: [auth.py](file:///e:/mikrotik_api/backend/app/api/endpoints/auth.py)
- RBAC basic: menu admin hanya muncul untuk `role=admin` (frontend) + dependency `get_current_active_superuser` (backend): [Sidebar.jsx](file:///e:/mikrotik_api/frontend/src/components/layout/Sidebar.jsx), [users.py](file:///e:/mikrotik_api/backend/app/api/endpoints/users.py)
- CRUD Boards + enkripsi kredensial MikroTik + caching Redis untuk list/stats: [boards.py](file:///e:/mikrotik_api/backend/app/api/endpoints/boards.py)
- Monitoring historis (DB) + ringkasan dashboard: [dashboard.py](file:///e:/mikrotik_api/backend/app/api/endpoints/dashboard.py)
- Live ops via RouterOS API (interfaces, monitor-traffic, PPPoE/Hotspot live, toggle interface): [boards.py](file:///e:/mikrotik_api/backend/app/api/endpoints/boards.py)
- Backup & restore router (endpoint + UI tab): [backups.py](file:///e:/mikrotik_api/backend/app/api/endpoints/backups.py), [BackupManager.jsx](file:///e:/mikrotik_api/frontend/src/components/router/BackupManager.jsx)
- Reports historis + export CSV/PDF + caching Redis: [reports.py](file:///e:/mikrotik_api/backend/app/api/endpoints/reports.py)
- Scheduler jobs (opsional via env): polling, daily backup, daily/monthly aggregation, maintenance: [main.py](file:///e:/mikrotik_api/backend/app/main.py)
- Rate limiting + blacklist automation berbasis Redis: [limiter.py](file:///e:/mikrotik_api/backend/app/core/limiter.py)

---

## 5) Catatan Risiko / Gap yang Perlu Dipantau
- Developer raw SQL endpoint (superuser) memakai `sqlalchemy.text(...)` sehingga melanggar constraint “no raw SQL untuk CRUD standar” dan berpotensi destruktif jika dipakai sembarang: [developer.py](file:///e:/mikrotik_api/backend/app/api/endpoints/developer.py)
- UI konfirmasi aksi destruktif masih `window.confirm()` (bukan modal UI terstruktur): [BackupManager.jsx](file:///e:/mikrotik_api/frontend/src/components/router/BackupManager.jsx)
- Ping board memakai `subprocess.run(ping ...)` (blocking) sehingga perlu perhatian jika traffic tinggi: [boards.py](file:///e:/mikrotik_api/backend/app/api/endpoints/boards.py)
- Scheduler default `ENABLE_SCHEDULER` saat ini `False` di settings, jadi polling/backup otomatis tidak aktif jika env tidak mengaktifkan: [config.py](file:///e:/mikrotik_api/backend/app/core/config.py)

---

## 6) Referensi Dokumen Alur
- Delta usage & alur monitoring: [alur_kerja_full.txt](file:///e:/mikrotik_api/docs/alur_kerja_full.txt)
- Rencana pengembangan harian: [FULLDAY.txt](file:///e:/mikrotik_api/docs/FULLDAY.txt)

---

## 7) Logika Delta & Polling
- Rumus Delta:
  - Delta = (Byte Saat Ini) - (Byte Sebelumnya). Jika counter reset (nilai saat ini < sebelumnya), gunakan Delta = Byte Saat Ini.
- Implementasi di worker:
  - Helper delta dan deteksi reset: [polling_worker.py:L270-L283](file:///e:/mikrotik_api/backend/app/services/polling_worker.py#L270-L283)
  - Kalkulasi speed Mbps berbasis delta/time diff: [polling_worker.py:L292-L300](file:///e:/mikrotik_api/backend/app/services/polling_worker.py#L292-L300)
  - Upsert harian Interface Usage (akumulasi delta): [polling_worker.py:L312-L324](file:///e:/mikrotik_api/backend/app/services/polling_worker.py#L312-L324)
  - Hotspot delta per-sesi → agregasi per-username + uptime delta: [polling_worker.py:L330-L367](file:///e:/mikrotik_api/backend/app/services/polling_worker.py#L330-L367), batch upsert: [polling_worker.py:L369-L382](file:///e:/mikrotik_api/backend/app/services/polling_worker.py#L369-L382)
  - PPPoE delta per-sesi → agregasi per-username + upsert: [polling_worker.py:L388-L418](file:///e:/mikrotik_api/backend/app/services/polling_worker.py#L388-L418)

---

## 8) Compliance Check (Stack Lock)
- Backend async: Endpoint memakai `async def` dan SQLAlchemy AsyncSession: contoh [auth.py](file:///e:/mikrotik_api/backend/app/api/endpoints/auth.py), [boards.py](file:///e:/mikrotik_api/backend/app/api/endpoints/boards.py)
- Database ORM: CRUD standar via SQLAlchemy; raw SQL hanya pada Developer Console (superuser): [developer.py](file:///e:/mikrotik_api/backend/app/api/endpoints/developer.py)
- Keamanan:
  - Hashing: Argon2 (`argon2-cffi`) melalui [security.py](file:///e:/mikrotik_api/backend/app/core/security.py)
  - JWT: PyJWT HS256 melalui [security.py](file:///e:/mikrotik_api/backend/app/core/security.py)
  - Kredensial MikroTik terenkripsi AES saat simpan: [boards.py](file:///e:/mikrotik_api/backend/app/api/endpoints/boards.py)
- Rate limiting: `slowapi` + Redis; ada mekanisme blacklist otomatis: [limiter.py](file:///e:/mikrotik_api/backend/app/core/limiter.py)
- Frontend: Functional Components, Tailwind, API dipusatkan di `src/services/api.js`: [api.js](file:///e:/mikrotik_api/frontend/src/services/api.js)
