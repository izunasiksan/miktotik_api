# Codebase Analysis & Architecture Report (V2.4)

## Ringkasan
- Monorepo berisi backend (FastAPI + Celery + Redis + PostgreSQL via SQLAlchemy) dan frontend (React + Vite + Tailwind).
- Pipeline Analisis V2.1 terdiri dari Stage 0–7, dengan normalisasi data, tren, analitik, skor kesehatan, dan insight eksekutif.
- Konvensi penamaan V2.4.1: request dan response API menggunakan camelCase; backend internal snake_case; database snake_case. Pydantic menggunakan alias_generator=to_camel dan jsonable_encoder dengan by_alias=True.

## Bahasa, Framework, Library, Teknologi
- Bahasa:
  - Python (backend, worker)
  - JavaScript (ESM) + JSX (frontend)
  - CSS (Tailwind) dan HTML (Vite index)
  - YAML (docker-compose)
  - Markdown (dokumentasi)
- Backend:
  - FastAPI, Uvicorn
  - SQLAlchemy (async), asyncpg, Alembic
  - Celery (worker dan beat) dengan Redis broker
  - Pydantic v2, pydantic-settings
  - Redis (cache, blacklist)
  - pybreaker (Circuit Breaker DB)
  - slowapi (rate limit), prometheus-fastapi-instrumentator (metrics), pyinstrument (profiling)
  - Utilities: python-jose/PyJWT, passlib, email-validator, numpy, aiofiles, asyncssh, routeros-api
- Frontend:
  - React 19, React Router, Vite
  - Zustand (state management)
  - TanStack Query (data fetching)
  - Tailwind CSS 4, PostCSS
  - Axios + axios-retry (circuit breaker UI), react-hot-toast
  - Recharts, lucide-react
  - Vitest + Testing Library (unit tests)
- Container/Orkestrasi:
  - Dockerfile backend [Dockerfile](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/Dockerfile)
  - docker-compose (Redis, Celery worker/beat) [docker-compose.yml](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/docker-compose.yml)

## Struktur Direktori Utama
- Backend: [src/app](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app)
  - API V1/V2: [api](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/api), [api_v2](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/api_v2)
  - Core: konfigurasi, database, middleware, security, limiter, logger [core](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/core)
  - Services: business logic dan pipeline [services](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/services)
  - Models & Schemas: ORM dan Pydantic [models](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/models), [schemas](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/schemas)
  - Tasks: Celery tasks [tasks](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/tasks)
  - Scheduler: cron tasks [scheduler](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/scheduler)
  - Tests: pytest [tests](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/tests)
- Frontend: [src/frontend](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend)
  - Fitur analisis V2: [features/analysis_v2](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2)
  - Komponen global: [components](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/components)
  - Store: Zustand [store](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/store)
  - Services (API client): [services](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/services)
  - Konfigurasi build/styling di root frontend (Vite, Tailwind, ESLint)
- Dokumentasi: [e2e_best_practice/docs](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/docs)

## Backend: Arsitektur & Komponen Utama
- Konfigurasi Sistem:
  - Settings dan ENV: [config.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/core/config.py) menggunakan pydantic-settings, properti DATABASE_URL & FINAL_REDIS_URL.
  - Database & Circuit Breaker: [database.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/core/database.py) menginisiasi async engine + pybreaker untuk PostgreSQL.
  - Keamanan:
    - Blacklist, Whitelist, Security Headers: [middleware_security.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/core/middleware_security.py)
    - Rate limit (slowapi), JWT, AES encryption [security.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/core/security.py)
  - Redis Client: [db/redis.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/db/redis.py)
- Skema & Konvensi:
  - BaseSchema camelCase via alias_generator: [schemas/base.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/schemas/base.py)
- API V2 (Analisis):
  - Endpoint pipeline V2.1: [analysis_v2.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/api_v2/endpoints/analysis_v2.py)
    - Stage 0: Normalisasi via [services/normalization_v2.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/services/normalization_v2.py)
    - Stage 1: Context Lock dataset sementara
    - Stage 2: Tren & agregasi via [get_trend_analysis](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/services/analysis_service.py#L568-L776)
    - Stage 3–5: Korelasi, Habit, Anomali via [get_advanced_analytics](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/services/analysis_service.py#L778-L847)
    - Stage 6: Health Score via [calculate_health_score](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/services/analysis_service.py)
    - Stage 7: Insight via [generate_insights](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/services/analysis_service.py)
    - Caching hasil dengan Redis, validasi output Pydantic, dan jsonable_encoder with by_alias=True.
  - Async pipeline: Celery task [pipeline_tasks.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/tasks/pipeline_tasks.py) dan tracking status via endpoint status task.
- Desain Data & Query:
  - SQL berbasis `text()` untuk agregasi, korelasi, dan deteksi anomali (Z-score).
  - Akurasi/quality diperhitungkan dari Stage 0 dan dipropagasi ke Stage 2 metadata.
- Instrumentasi:
  - Prometheus counter/summary (mis. PIPELINE_EXECUTION_COUNT, PIPELINE_STAGE_LATENCY) didefinisikan di service.

## Frontend: Arsitektur & Komponen Utama
- Bootstrapping:
  - Vite + React: [vite.config.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/vite.config.js), [main.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/main.jsx), [App.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/App.jsx)
  - Tailwind: [tailwind.config.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/tailwind.config.js)
- State Management:
  - Zustand store: [analysisStore.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/store/analysisStore.js), [authStore.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/store/authStore.js)
  - TanStack Query digunakan untuk data fetching generik
- Fitur Analysis V2:
  - Orkestrasi stage UI: [AnalysisV2.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/AnalysisV2.jsx)
  - Komponen stage:
    - Stage 0: [NormalizationStage.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/NormalizationStage.jsx)
    - Stage 2: [TrendChart.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/TrendChart.jsx)
    - Stage 3: [CorrelationMatrix.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/CorrelationMatrix.jsx)
    - Stage 4: [HabitPatternAnalysis.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/HabitPatternAnalysis.jsx)
    - Stage 5: [AnomalyAnalysis.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/AnomalyAnalysis.jsx)
    - Stage 6: [CapacityForecast.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/CapacityForecast.jsx)
    - Stage 7: [InsightCard.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/InsightCard.jsx)
  - Scope/Filter UI: [ScopeFilterStage.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/ScopeFilterStage.jsx)
  - Polling async task: [useAnalysisTaskPolling.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/hooks/useAnalysisTaskPolling.js)
  - Normalisasi response → state stage: [mapAnalysisResponse.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/utils/mapAnalysisResponse.js)
  - API client (V1 & V2) dengan retry, refresh token, circuit breaker UI: [api.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/services/api.js)
- Styling:
  - Tailwind 4, konfigurasi warna & shadow khusus
- Testing:
  - Vitest + React Testing Library (mis. QuickDatePicker.test.jsx, analysisStore.test.js)

## Pola Desain & Arsitektur
- Layered architecture di backend: API → Services → Database/Cache.
- Dependency Injection via FastAPI Depends (mis. get_db).
- Data normalization & aliasing:
  - Pydantic BaseSchema dengan alias_generator=to_camel untuk konsistensi camelCase (request/response).
  - Endpoint menggunakan jsonable_encoder(..., by_alias=True) sesuai rule V2.4.1.
- Resilience:
  - Circuit Breaker DB (pybreaker) dan axios-retry di frontend.
  - Redis caching untuk payload pipeline.
- Asynchronous processing:
  - Async SQLAlchemy, Celery untuk eksekusi pipeline asynchronous, polling status task dari frontend.
- Security middleware:
  - Blacklist/whitelist IP, Security headers, rate limiting (slowapi).
- Observability:
  - Prometheus metrics, structured logging.

## File Konfigurasi Penting
- Backend:
  - Dockerfile backend: [src/Dockerfile](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/Dockerfile)
  - docker-compose: [docker-compose.yml](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/docker-compose.yml)
  - requirements: [requirements.txt](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/requirements.txt)
  - .env.example: [e2e_best_practice/.env.example](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/.env.example)
  - Trae rule: [.trae/rules/rulev24.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/.trae/rules/rulev24.md)
- Frontend:
  - Vite config: [vite.config.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/vite.config.js)
  - Tailwind: [tailwind.config.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/tailwind.config.js)
  - ESLint: [eslint.config.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/eslint.config.js)
  - Nginx (preview/prod container): [nginx.conf](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/nginx.conf)
  - Dockerfile frontend: [frontend/Dockerfile](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/Dockerfile)

## Analisis Ketergantungan Antar Modul
- Backend (jalur sinkron):
  - Endpoint [analysis_v2.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/api_v2/endpoints/analysis_v2.py)
    → Normalization [services/normalization_v2.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/services/normalization_v2.py)
    → Scoped Dataset [services/analysis_service.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/services/analysis_service.py)
    → Trend, Analytics, Health Score, Insights
    → Redis cache [db/redis.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/db/redis.py)
    → Pydantic Schema [schemas](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/schemas).
- Backend (jalur async):
  - Endpoint async men-*queue* Celery task [tasks/pipeline_tasks.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/tasks/pipeline_tasks.py)
  - Status task diambil via celery_app dan dikonversi menjadi response AnalysisResponse camelCase.
- Frontend:
  - Layanan API (V2) [api.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/services/api.js)
    → Hook polling [useAnalysisTaskPolling.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/hooks/useAnalysisTaskPolling.js)
    → Normalisasi response ke stage map [mapAnalysisResponse.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/utils/mapAnalysisResponse.js)
    → Store Zustand [analysisStore.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/store/analysisStore.js)
    → Komponen UI stage (Trend/Correlation/Habit/Anomaly/Forecast/Insight).

## Dependensi Utama
- Backend: [requirements.txt](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/requirements.txt)
  - fastapi, uvicorn, sqlalchemy, asyncpg, alembic
  - celery[redis], redis, apscheduler
  - pydantic, pydantic-settings
  - slowapi, prometheus-fastapi-instrumentator, pyinstrument
  - pybreaker, numpy, python-jose/PyJWT, passlib
- Frontend: [package.json](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/package.json)
  - react, react-router-dom, @tanstack/react-query
  - axios, axios-retry, react-hot-toast
  - zustand, recharts, lucide-react
  - tailwindcss, @tailwindcss/postcss, postcss
  - vitest, @testing-library/react, @testing-library/jest-dom

## Rekomendasi Optimasi & Best Practices
- Konsistensi skema Analytics:
  - Samakan penamaan `anomaly` vs `anomalies` dari backend agar tidak perlu fallback di frontend.
  - Tambahkan skema eksplisit Pydantic untuk analytics.correlation/habit/anomaly agar kontrak lebih stabil.
- Observabilitas & Keandalan:
  - Perluas metrik Prometheus untuk memetakan error per-stage dan latency per query penting.
  - Tambahkan retry yang terkontrol untuk operasi DB yang aman di sisi backend (misalnya hanya untuk read).
- Keamanan:
  - Pastikan kredensial (DB_PASS, AES_SECRET_KEY) dipasok via environment dan tidak menggunakan nilai default.
  - Sesuaikan CSP di production (kurangi `'unsafe-inline'/'unsafe-eval'` jika memungkinkan).
- Performa:
  - Offload logika forecast (Stage 6) ke backend untuk konsistensi dan mengurangi logika fallback di frontend.
  - Indeks database pada kolom yang sering dipakai (period, board_id, interface_name) untuk query agregasi.
- Kualitas Kode & Testing:
  - Tambahkan test untuk pemetaan [mapAnalysisResponse.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/utils/mapAnalysisResponse.js) terutama Stage 3–7.
  - Pertimbangkan migrasi frontend ke TypeScript untuk safety pada bentuk data stage.
  - Gunakan komponen presentational/container untuk memisah logic & UI bila kompleksitas bertambah.
- DevX:
  - Tambahkan skrip lint/typecheck terpadu di root serta dokumentasi perintah standar untuk dev & CI.
  - Pertimbangkan penguncian versi paket Python (constraints file) dan Node (pnpm lockfile optional) untuk reproduktibilitas build.

## Catatan Konvensi V2.4.1
- Frontend request: camelCase.
- API response: camelCase (via Pydantic alias + jsonable_encoder by_alias=True).
- Backend internal: snake_case.
- Database: snake_case.

## Sumber Rujukan Kode
- Endpoint Analisis V2: [analysis_v2.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/api_v2/endpoints/analysis_v2.py)
- Layanan Analisis: [analysis_service.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/services/analysis_service.py)
- Normalisasi Data: [normalization_v2.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/services/normalization_v2.py)
- Pemetaan Response Frontend: [mapAnalysisResponse.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/utils/mapAnalysisResponse.js)
- Kartu Insight (Stage 7): [InsightCard.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/InsightCard.jsx)

