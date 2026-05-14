# BACKEND ARCHITECTURE DESIGN: GLOBAL ANALISIS DATA V2.1
(Tanggal: 2026-03-05 | Status: Authoritative Architecture)

## 1. PENDAHULUAN
Dokumen ini merancang arsitektur backend yang dioptimalkan untuk mendukung pipeline Analisis Data V2.1 (Stage 0-7) sesuai dengan [GLOBAL_ANALISIS_DATA.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/GLOBAL_ANALISIS_DATA.md). Arsitektur ini dirancang untuk skalabilitas tinggi, keandalan data, dan performa query yang responsif.

---

## 2. KOMPONEN UTAMA ARSITEKTUR

### 2.1 API Layer (FastAPI)
Menggunakan FastAPI untuk high-performance asynchronous API.
- **Validation**: Pydantic v2 untuk skema input/output.
- **Versioning**: `/api/v2/` untuk mendukung kompatibilitas.
- **Endpoints**:
    - `POST /analysis/v2/normalization`: Memicu Stage 0 (Manual Trigger).
    - `GET /analysis/v2/trend`: Query Stage 2 (Trend Aggregation).
    - `GET /analysis/v2/health`: Query Stage 6 (Health Score).
    - `GET /analysis/v2/insight`: Query Stage 7 (Final Interpretation).

### 2.2 Service Layer (Business Logic)
Menerapkan Design Pattern **Service Object** dan **Strategy Pattern** untuk pipeline Stage 0-7.
- **NormalizationService**: Implementasi [aturan_penanganan_missing_data_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_penanganan_missing_data_V2.1.md).
- **AggregationService**: Melakukan on-the-fly aggregation dengan dukungan *Auto-Granularity*.
- **AnalysisService**: Menangani komputasi statistik (Slope, Delta, Correlation).
- **HealthScoreService**: Menghitung bobot Stability (30%), Utilization (30%), dan Anomaly (40%).

### 2.3 Database Layer (PostgreSQL)
Optimasi untuk beban kerja Timeseries dan Analytical.
- **Raw Storage**: Tabel partisi bulanan untuk `board_speed_stats` dan `board_resource_stats`.
- **Indexing**: Composite Index `(board_id, log_time DESC)` pada seluruh tabel RAW.
- **Interim Results**: Tabel temporary atau materialized views untuk menyimpan hasil Stage 1 (Scoped Dataset) guna mempercepat proses Stage 2-6.

### 2.4 Background Job System (Celery + Redis)
Menangani tugas-tugas berat di luar request-response cycle.
- **Stage 0 Pre-processing**: Normalisasi otomatis setiap 5 menit untuk data yang baru masuk.
- **Daily Aggregation**: Batch processing untuk mengisi tabel summary harian.
- **Data Retention**: Pembersihan log lama secara berkala sesuai kebijakan retensi.

### 2.5 Caching Mechanism (Redis)
Strategi caching untuk mencapai target response time < 200ms.
- **Query Cache**: Menyimpan hasil agregasi Stage 2-7 berdasarkan kunci `(board_id, range, granularity)`. TTL: 5 menit.
- **Metadata Cache**: Menyimpan konfigurasi board dan threshold alert untuk akses cepat.

---

## 3. RELIABILITY & OBSERVABILITY

### 3.1 Error Handling & Retry Logic
- **Global Exception Handler**: Menangkap error database dan koneksi API Mikrotik.
- **Retry Decorator**: Implementasi exponential backoff untuk koneksi ke database dan Redis.
- **Circuit Breaker**: Melindungi backend dari kegagalan berantai jika database mengalami overload.

### 3.2 Logging & Monitoring
- **Structured Logging**: JSON format untuk integrasi dengan ELK Stack/Loki.
- **Metrics (Prometheus)**: Tracking RPS, latency, dan error rate per endpoint.
- **Tracing (Jaeger)**: Observabilitas end-to-end untuk melacak waktu proses dari Stage 0 hingga Stage 7.

---

## 4. TESTING STRATEGY (MIN 80% COVERAGE)

- **Unit Tests**: Fokus pada `NormalizationService` dan `AnalysisService` menggunakan Pytest.
- **Integration Tests**: Validasi alur data dari database hingga API output.
- **Performance Tests**: Menggunakan Locust untuk mensimulasikan 1000 RPS dan memverifikasi response time.

---

## 5. API DOCUMENTATION (OPENAPI)
- Auto-generated Swagger UI di `/docs`.
- Skema OpenAPI 3.1 lengkap dengan contoh request/response untuk setiap Stage pipeline.

---

## 6. DEPLOYMENT & CI/CD PIPELINE

- **CI**: GitHub Actions untuk linting, security scanning (Bandit), dan unit testing.
- **CD**: Deployment otomatis ke Docker Swarm/Kubernetes.
- **Rollback**: Otomatis melakukan revert jika health check gagal setelah deployment (Blue-Green Deployment).

---

## 7. TARGET PERFORMA & KRITERIA KEBERHASILAN

| Metrik | Target | Metode Verifikasi |
| :--- | :--- | :--- |
| **Throughput** | 1000 Requests Per Second (RPS) | Load Test (Locust) |
| **Latency** | < 200ms (95th Percentile) | APM Monitoring |
| **Data Integrity** | 100% Traceable to Raw Data | Audit Log Check |
| **Reliability** | 99.9% Uptime | SRE Dashboard |

---
**Dirancang Oleh:** Senior Backend Architect
**Versi:** 2.1
**Referensi Utama:** [GLOBAL_ANALISIS_DATA.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/GLOBAL_ANALISIS_DATA.md)
