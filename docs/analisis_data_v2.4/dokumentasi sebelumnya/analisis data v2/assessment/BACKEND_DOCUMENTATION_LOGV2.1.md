# BACKEND DEVELOPMENT DOCUMENTATION LOG V2.1
**Tanggal Rilis:** 2026-03-05  
**Versi:** 2.1 (Pipeline Analisis Data)

## 1. Ringkasan Modul & Service
Pengembangan fase ini berfokus pada implementasi **Pipeline Analisis Data V2.1** yang mencakup pemrosesan data dari tahap mentah hingga menghasilkan wawasan kualitatif dan skor kesehatan sistem.

- **Normalization Engine (Stage 0):** Menangani pembersihan data, pengisian celah (gap filling), dan imputasi data hilang menggunakan algoritma cerdas (MissingDataHandler).
- **Context Lock Engine (Stage 1):** Mengunci dataset ke dalam tabel temporary PostgreSQL untuk memastikan konsistensi analisis di seluruh tahapan berikutnya.
- **Trend & Aggregation (Stage 2):** Menghitung rata-rata bergerak (Moving Average) dan ringkasan statistik menggunakan fungsi jendela (Window Functions) SQL.
- **Analytics Engine (Stage 3-5):** Melakukan analisis korelasi Pearson, deteksi pola penggunaan puncak (Habit), dan deteksi anomali berbasis Z-Score.
- **Health Score Engine (Stage 6):** Menghitung skor kesehatan sistem (0-100) berdasarkan stabilitas, utilisasi, dan penalti anomali.
- **Insights Engine (Stage 7):** Menghasilkan narasi kualitatif dan rekomendasi teknis berdasarkan hasil analisis kuantitatif.
- **Async Processing:** Integrasi Celery dan Redis untuk menjalankan tugas berat di background.

## 2. Daftar File Baru
| Path | Deskripsi |
| :--- | :--- |
| `backend/app/core/celery_app.py` | Konfigurasi utama Celery worker dan Redis broker. |
| `backend/app/core/missing_data_handler.py` | Logika deteksi dan imputasi missing data (MCAR/MAR/MNAR). |
| `backend/app/tasks/pipeline_tasks.py` | Task Celery untuk menjalankan full pipeline (Stage 1-7). |
| `backend/app/tasks/normalization_tasks.py` | Task Celery untuk normalisasi data (Stage 0). |
| `backend/verify_pipeline_v21.py` | Script verifikasi end-to-end untuk Pipeline V2.1. |
| `docs/analisis data v2/assessment/2026-03-05_assessment_backend-pipeline-v2.1.md` | Dokumen assessment teknis awal. |
| `docs/analisis data v2/assessment/2026-03-05_audit_pipeline_v2.1.md` | Hasil audit keselarasan arsitektur. |
| `docs/analisis data v2/assessment/2026-03-05_backend_implementation_workflow_v2.1.md` | Workflow detail implementasi backend. |

## 3. Modifikasi File Existing
| File | Perubahan Utama |
| :--- | :--- |
| `backend/app/api_v2/endpoints/analysis_v2.py` | Penambahan endpoint `pipeline-v21`, `scoped-analysis`, dan `task-status`. Refaktor fungsi parsing tanggal. |
| `backend/app/services/analysis_service.py` | Implementasi fungsi inti Stage 1-7 (Scoped Dataset, Trend, Analytics, Health Score, Insights). |
| `backend/app/services/normalization_v2.py` | Integrasi `MissingDataHandler` untuk penanganan gap filling yang lebih akurat. |
| `backend/requirements.txt` | Penambahan dependensi `celery[redis]`, `redis`, dan `numpy`. |
| `backend/app/core/config.py` | Penambahan konfigurasi `REDIS_HOST`, `REDIS_PORT`, dan konstruksi `REDIS_URL`. |
| `docs/db/schema.sql` | Update v2.2: BIGSERIAL -> BIGINT, standarisasi NUMERIC(15,2), penambahan kolom `accuracy_pct`, dan optimasi index. |
| `docker-compose.yml` | Penambahan service `celery_worker` untuk pemrosesan asinkron. |

## 4. Spesifikasi API Endpoint (V2.1)
### **Full Pipeline (Sync)**
- **Endpoint:** `GET /api/v2/analysis/{board_id}/pipeline-v21/`
- **Method:** `GET`
- **Query Params:** `start_time` (ISO), `end_time` (ISO), `granularity` (hour/day/month/year)
- **Response:** JSON berisi hasil lengkap Stage 1 hingga Stage 7.

### **Full Pipeline (Async)**
- **Endpoint:** `POST /api/v2/analysis/{board_id}/pipeline-v21/async/`
- **Method:** `POST`
- **Response:** `{"task_id": "...", "status": "queued"}`

### **Task Status**
- **Endpoint:** `GET /api/v2/analysis/tasks/{task_id}/status/`
- **Method:** `GET`
- **Response:** Status pengerjaan Celery (PENDING, PROGRESS, SUCCESS, FAILURE).

## 5. Konfigurasi Environment & Database
### **Environment Variables (.env)**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```
### **Database Changes (v2.2)**
- Perubahan tipe data `download_mbps`, `upload_mbps`, `cpu_load` menjadi `NUMERIC(15,2)`.
- Penambahan kolom `accuracy_pct` (DEFAULT 100.0) di semua tabel statistik.
- Pembersihan database (Reset) dilakukan untuk sinkronisasi dengan `schema.sql` terbaru.

## 6. Dependensi Baru
| Package | Versi | Kegunaan |
| :--- | :--- | :--- |
| `celery` | `[redis]` | Background task processing. |
| `redis` | *(latest)* | Broker dan Result Backend untuk Celery. |
| `numpy` | *(latest)* | Komputasi numerik untuk deteksi missing data. |

## 7. Instruksi Setup & Deployment
1. **Update Dependensi:**
   ```bash
   pip install -r backend/requirements.txt
   ```
2. **Jalankan Redis Server:**
   Pastikan Redis berjalan di port 6379.
3. **Jalankan Celery Worker:**
   ```bash
   cd backend
   celery -A app.core.celery_app worker --loglevel=info -P solo
   ```
4. **Reset Database (Jika diperlukan):**
   Ikuti prosedur di `DATABASE RESET & STRUCTURE RULE`.
5. **Verifikasi:**
   Jalankan `python backend/verify_pipeline_v21.py`.

## 8. Catatan Penting & Breaking Changes
- **Database Reset:** Update skema ke v2.2 mengharuskan reset database jika terdapat ketidaksesuaian struktur.
- **Temporary Tables:** Stage 1 menggunakan tabel temporary PostgreSQL yang bersifat session-bound. Pastikan koneksi database tetap aktif selama proses pipeline sinkron.
- **Date Parsing:** Fungsi `_parse_iso_dt` kini lebih ketat terhadap format ISO 8601. Pastikan input dari frontend menyertakan offset UTC atau akhiran 'Z'.
- **Resource Usage:** Perhitungan `accuracy_pct` kini menjadi faktor penentu kualitas data di Stage 0.
