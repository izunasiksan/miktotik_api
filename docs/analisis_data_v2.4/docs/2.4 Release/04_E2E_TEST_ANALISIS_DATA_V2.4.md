## E2E TESTING - LAYANAN ANALISIS DATA V2.4

**Tanggal:** 2026-03-08  
**Domain:** Backend · Database · Celery · Frontend  
**Status:** READY (Baseline E2E Terimplementasi)

---

## 1. Tujuan & Ruang Lingkup

- Memverifikasi bahwa seluruh alur analisis data **Stage 0–7** berjalan end-to-end:
  - Input data mentah di database.
  - Normalisasi, Context Lock, Trend, Analytics, Health Score, dan Insight.
  - Eksekusi via API (sync & async Celery).
  - Visualisasi hasil di UI (Analysis V2).
- Menguji **fungsionalitas utama**, **performa**, **keamanan akses dasar**, dan **integritas hasil analisis**.
- Memastikan integrasi antar komponen: **PostgreSQL/SQLite (dev)**, **FastAPI**, **Celery + Redis**, dan **React Frontend**.

---

## 2. Ringkasan Skenario Pengujian

| Kode | Kategori | Deskripsi Singkat | Implementasi |
| :--- | :--- | :--- | :--- |
| S1 | Fungsional (Positif) | Pipeline penuh Stage 0–7 dengan data beban normal | Script `e2e_pipeline_v24.py` |
| S2 | Fungsional (Negatif) | Pipeline dengan data rusak, missing, dan anomali ekstrem | Script `e2e_negative_v24.py` |
| S3 | API Sync | Panggilan langsung endpoint `/analysis/{boardId}/pipeline-v21/` | Manual / HTTP client |
| S4 | API Async | Trigger Celery pipeline-v21 async + polling `/analysis/tasks/{taskId}/status/` | Frontend + backend |
| S5 | Frontend Manual Run | Analisis manual tanpa queue (sync) dari UI Analysis V2 | React UI (ScopeFilterStage) |
| S6 | Frontend Async Run | Analisis via queue Celery dari UI Analysis V2 | React UI + polling hook |
| S7 | Beban Tinggi (Load) | Menjalankan beberapa pipeline async paralel untuk satu board | Celery workers |
| S8 | Edge Cases Dataset | Range kosong, data sangat jarang, traffic datar, dan anomali over-density | Kombinasi script + parameter |
| S9 | Keamanan Dasar | Akses tanpa token, role tidak berhak, dan input parameter ekstrem | Pytest / manual curl |

---

## 3. Implementasi Uji E2E Backend

### 3.1. Skenario S1 – Pipeline Utama (Positif)

- Script: [e2e_pipeline_v24.py](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/scripts/e2e_pipeline_v24.py)
- Alur yang diuji:
  1. **Seeding Data**: Mengisi tabel statistik (`BoardSpeedStat`, `BoardResourceStat`, `BoardClientStat`) untuk satu `board_id` selama rentang waktu tertentu (48 jam).
  2. **Stage 0 – Normalization**: Memanggil `normalization_v2.run_normalization_preview` dan memverifikasi `traffic`, `resource`, dan `accuracyPct` tersedia.
  3. **Stage 1 – Context Lock**: `analysis_service.create_scoped_dataset` membuat temp table `temp_scoped_*` dengan filter `board_id`, `start_time`, `end_time`, `granularity`.
  4. **Stage 2 – Trend**: `get_trend_analysis` menghasilkan `series` time-series beserta `summary` dan `metadata.accuracyPct`.
  5. **Stage 3–5 – Advanced Analytics**: `get_advanced_analytics` memberikan `correlation`, `habit`, dan `anomaly`.
  6. **Stage 6 – Health Score**: `calculate_health_score` menghitung `total_score` dan komponennya (30/30/40).
  7. **Stage 7 – Insights**: `generate_insights` menciptakan daftar insight berbasis hasil Stage 2–6.
  8. **Cleanup**: Temp table di-drop dan transaksi di-commit.
- Cara menjalankan (dev):
  - `cd e2e_best_practice/src`
  - `python app/scripts/e2e_pipeline_v24.py`
- Hasil aktual (berdasarkan `Hasil Pengujian Pipeline Utama.md` dan run terbaru):
  - Akurasi normalisasi > 90%.
  - Trend menghasilkan > 48 titik data dengan korelasi kuat RX vs CPU.
  - Health Score terhitung dengan `total_score` stabil.
  - Waktu eksekusi < 5 detik → kategori **EXCELLENT**.

### 3.2. Skenario S2 – Skenario Negatif & Edge Cases

- Script: [e2e_negative_v24.py](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/scripts/e2e_negative_v24.py)
- Fokus:
  - Data rusak (nilai ekstrem, out-of-range).
  - Missing data (gap besar dalam time-series).
  - Kombinasi traffic tidak realistis (burst berat, zero-traffic panjang).
- Tujuan:
  - Memastikan Stage 0 menandai akurasi dengan benar dan tidak crash.
  - Memastikan Stage 5 (Anomaly) mampu mendeteksi cluster anomali ekstrem.
  - Memastikan Stage 7 tidak memproduksi insight menyesatkan ketika `accuracyPct` sangat rendah.

### 3.3. Skenario S3 – API Sync (HTTP Level)

- Endpoint: `GET /api/v2/analysis/{boardId}/pipeline-v21/`
- Flow uji:
  1. Siapkan `boardId` yang sudah memiliki data di DB (hasil seeding dari S1/S2).
  2. Panggil endpoint dengan kombinasi query:
     - `startTime`, `endTime` (48 jam terakhir).
     - `granularity` = `hour` dan `day`.
     - `interfaceName` = `None` dan salah satu interface aktif.
  3. Verifikasi response:
     - HTTP 200.
     - Struktur `AnalysisResponse` lengkap (`status`, `metadata`, `stages`, `results`).
     - `results.trend.series` tidak kosong.
     - `results.healthScore.totalScore` berada di rentang 0–100.
  4. Observasi durasi respon (target < 5 detik di dev).

### 3.4. Skenario S4 & S7 – API Async + Beban Tinggi

- Endpoint:
  - `POST /api/v2/analysis/{boardId}/pipeline-v21/async/`
  - `GET /api/v2/analysis/tasks/{taskId}/status/`
- Alur:
  1. Jalankan Celery worker + Redis terlebih dahulu.
  2. Kirim beberapa request async dengan kombinasi:
     - 3–5 task untuk board yang sama dengan range beririsan.
     - Variasi `granularity` (`hour`, `day`).
  3. Pantau `taskId` masing-masing dan lakukan polling ke endpoint `task-status` sampai `state === SUCCESS` atau `FAILURE`.
  4. Catat:
     - Rata-rata waktu selesai per task.
     - Maksimum concurrency yang masih stabil (tidak overload DB/Redis).
     - Apakah terjadi error `Timeout`, `Broker` atau `Rate limit`.
- Ukuran keberhasilan:
  - Tidak ada error 5xx pada endpoint.
  - Task tidak stuck di `PENDING` > 5 menit.
  - Hasil `result` tiap task konsisten dengan struktur pipeline (trend, analytics, health_score, insights).

---

## 4. Implementasi Uji E2E Frontend

### 4.1. Skenario S5 – Manual Run (Sync) via UI

- Komponen utama: [ScopeFilterStage.jsx](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/ScopeFilterStage.jsx)
- Syarat awal:
  - Backend dan Celery berjalan (untuk preflight & normalisasi).
  - User sudah login di aplikasi frontend.
- Langkah uji:
  1. Buka halaman Analisis V2.
  2. Pilih **Router** (`board`) yang sudah punya data (hasil seeding S1/S2).
  3. Biarkan Quick Date Picker mengisi range default 1 hari terakhir, atau pilih range manual.
  4. Klik tombol **Run Manual**.
  5. Verifikasi:
     - Context Lock aktif (input board, interface, tanggal menjadi non-editable saat proses berjalan).
     - Muncul toast "Menjalankan pipeline secara manual tanpa queue…".
     - Setelah selesai, Stage 2 (Trend), Stage 6 (Health Score), dan Stage 7 (Insight) menampilkan data sesuai hasil backend.
     - Tidak ada error JS di console browser.
- Validasi integritas data:
  - Bandingkan nilai Health Score, akurasi, dan jumlah insight di UI dengan response mentah dari API sync (S3) untuk parameter yang sama.

### 4.2. Skenario S6 – Async Run (Queue) via UI

- Tetap di halaman Analisis V2, gunakan tombol **Run with Queue** (atau tombol utama untuk run async sesuai implementasi).
- Langkah uji:
  1. Pastikan tidak ada task yang sedang berjalan (taskStatus IDLE).
  2. Klik tombol untuk menjalankan pipeline async.
  3. Verifikasi:
     - Context Lock aktif selama task berlangsung.
     - Progress status bergerak (PENDING → STARTED → PROGRESS → SUCCESS).
     - Toast menampilkan status selesai atau error.
     - Setelah `SUCCESS`, komponen Stage 2–7 menerima `analysisData` yang telah dimapping oleh util `mapAnalysisResponseToStages`, sehingga struktur sama dengan jalur manual.
  4. Bandingkan hasil visual (Trend, Insight, Health Score) dengan jalur manual untuk range dan board yang sama.

### 4.3. Edge Cases UI (Bagian dari S8)

- Variasi dataset & kondisi:
  - Range waktu yang valid tapi sangat pendek (misal 1 jam).
  - Range waktu panjang (7–30 hari) dengan granularity `day`.
  - Board tanpa data pada range tersebut → UI harus menampilkan state "Tidak ada data" tanpa crash.
  - Akurasi rendah (`accuracyPct` < threshold) → UI menampilkan label "Low Confidence" serta warning visual.
  - Context Lock aktif lalu user mencoba mengganti board/interface → perubahan harus ditolak sampai pipeline selesai.

---

## 5. Validasi Performa, Keamanan, dan Integritas

### 5.1. Performa

- Dari S1 (pipeline positif):
  - Waktu eksekusi pipeline Stage 0–7 < 5 detik di environment dev → **EXCELLENT**.
- Dari S4/S7 (async + beban tinggi):
  - Task selesaikan eksekusi tanpa error 5xx selama concurrency moderat (disarankan uji awal dengan 3–5 task paralel).
- Rekomendasi tambahan:
  - Integrasikan metrik Prometheus untuk `pipeline_v21_duration_seconds` per stage untuk pemantauan jangka panjang.

### 5.2. Keamanan

- Pengujian spesifik keamanan telah dibahas di:  
  [Security_PenTest_Automation_20260301.md](file:///E:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/audit/Security_PenTest_Automation_20260301.md)
- Untuk layanan analisis data, minimal dilakukan:
  - Uji akses tanpa token → harus 401 Unauthorized.
  - Uji pengguna dengan role tidak berhak (bukan owner board) → harus 403 Forbidden untuk analisis board tersebut.
  - Uji parameter ekstrem (range sangat panjang atau kombinasi granularity tidak valid) → harus 4xx dengan pesan error jelas, bukan 500.

### 5.3. Integritas Hasil Analisis

- Integritas lintas layer dijaga dengan:
  - Skema Pydantic (`AnalysisResponse`, `TrendAnalysisResponse`, dll.) yang memaksa struktur konsisten.
  - Mapper frontend `mapAnalysisResponseToStages` yang memastikan output sync & async disajikan ke UI dalam format yang sama.
  - E2E pipeline script (S1/S2) yang memverifikasi hubungan raw data → trend → analytics → health → insight.

---

## 6. Hasil Uji, Bug & Bottleneck

### 6.1. Hasil Ringkas

- Backend E2E (S1 + S2):
  - **Status:** LULUS  
  - Pipeline Stage 0–7 berjalan sesuai desain, baik skenario normal maupun data rusak/anomali.
- API Sync & Async (S3 + S4):
  - **Status:** LULUS (fungsi dasar)  
  - Endpoint pipeline-v21 sync mengembalikan `AnalysisResponse` sesuai kontrak.  
  - Endpoint async menghasilkan `result` yang berisi struktur serupa namun masih sedikit berbeda (khususnya key `health_score`).
- Frontend (S5 + S6):
  - **Status:** LULUS (jalur utama)  
  - Jalur manual run dan async run sama-sama menampilkan Trend, Health Score, dan Insight dengan konteks yang terkunci dengan baik.

### 6.2. Bug / Gap yang Teridentifikasi

1. **Perbedaan Struktur Output Async vs Sync (Sudah Dinormalisasi)**  
   - **Deskripsi (Sebelum Perbaikan):**  
     - Sync: `results.healthScore`, `stages.*`, dan metadata lengkap.  
     - Async: `result.results.health_score` (snake_case) dan tidak memiliki `stages`.
   - **Perbaikan:**  
     - Endpoint `get_task_status` kini memvalidasi `res.result` ke `AnalysisResponse` dan mengembalikan payload yang sudah dinormalisasi (`model_validate` + `jsonable_encoder(..., by_alias=True)`).  
     - Frontend tetap menggunakan util `mapAnalysisResponseToStages`, tetapi sekarang menerima struktur yang sudah konsisten antara jalur sync & async.
   - **Status:**  
     - Gap kontrak data untuk klien sudah **DITANGANI**; baik sync maupun async kini mengekspos struktur `AnalysisResponse` yang seragam.  
   - **Dampak:**  
     - Tidak ada lagi risiko kebingungan untuk konsumen API resmi; Celery internal masih boleh menyimpan `health_score`, namun output eksternal selalu memakai `healthScore` dan field `stages` yang lengkap.

2. **Kurangnya Otomasi UI-Level (Playwright/Cypress Masih Dalam Rencana)**  
   - **Deskripsi:**  
     - E2E UI saat ini masih mengandalkan skenario manual terstruktur berdasarkan Testing Philosophy V2.1 dan skenario S5–S6.  
   - **Dampak:**  
     - Risiko regresi UI pada update kecil masih ada, namun sebagian ditekan dengan kombinasi test unit/integration dan checklist manual hingga otomasi penuh (Playwright/Cypress) diimplementasikan.

### 6.3. Bottleneck Potensial

1. **Beban Tinggi di Celery + DB**  
   - Jika concurrency Celery worker dinaikkan drastis tanpa tuning DB (connection pool, index, dsb.), pipeline berpotensi mengalami lonjakan latensi atau deadlock ringan.
   - Saat ini belum ada skenario load test terautomasi penuh; pengujian dilakukan dengan jumlah task paralel moderat.

2. **Akumulasi Temp Table di Kasus Error Tak Terduga**  
   - Implementasi normal sudah melakukan `DROP TABLE` di `finally`.  
   - Namun, jika terjadi error di level koneksi DB atau worker crash sebelum `finally`, temp table dapat tertinggal sementara hingga koneksi dibersihkan.

---

## 7. Rekomendasi Lanjutan

1. **Normalisasi Output Async ke `AnalysisResponse` (Telah Dilakukan)**  
   - Di endpoint `get_task_status`, `result` kini sudah divalidasi ke `AnalysisResponse` dan dikembalikan dalam bentuk camelCase (`model_validate` + `jsonable_encoder(..., by_alias=True)`).  
   - Aksi lanjut: tambahkan regression test backend untuk memastikan kontrak sync/async tetap konsisten pada setiap perubahan pipeline.

2. **Tambah Test Otomatis UI-Level (Integration/E2E)**  
   - Tambahkan test React Testing Library + MSW untuk:
     - Alur polling async (PENDING → SUCCESS).
     - Penanganan error (FAILURE) dan tampilan toast.
   - Prioritas awal: cover ScopeFilterStage + hook polling analysis task dengan skenario sukses dan gagal.  
   - Optional jangka panjang: Playwright/Cypress untuk smoke test UI end-to-end (run pada setiap release kandidat).

3. **Load Test Terstruktur**  
   - Susun script berbasis `httpx` atau `locust` (menggunakan environment terpisah) untuk menguji:
     - 10–50 request paralel ke pipeline-v21.
     - Monitoring time-to-first-insight dan error rate.
   - Gunakan dataset yang sama dengan E2E positif/negatif agar hasil load test bisa dibandingkan dengan baseline fungsional.

4. **Observability Per Stage**  
   - Tambahkan metrik Prometheus: durasi per stage, jumlah error per stage, dan jumlah insight yang dihasilkan per run.
   - Gunakan label `stage` (0–7) dan `status` (success/error) agar bottleneck spesifik stage mudah diidentifikasi saat terjadi degradasi performa.

---

## 8. Kesimpulan

- Suite E2E yang ada (script backend + skenario UI) sudah mencakup:
  - Alur positif dan negatif pipeline Stage 0–7.
  - Verifikasi performa dasar (< 5s di dev).
  - Sanity check integritas hasil analisis dan visualisasi utama.
- Gap utama yang tersisa bersifat **struktural dan non-kritikal** (normalisasi output async dan otomasi UI penuh).  
- Dengan menindaklanjuti rekomendasi di atas, layanan analisis data V2.4 dapat dinyatakan siap untuk penggunaan produktif dengan tingkat keyakinan yang tinggi terhadap akurasi, performa, dan integritas data.
