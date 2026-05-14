## AUDIT END-TO-END ANALISIS DATA V2.4

**Tanggal:** 2026-03-08  
**Versi:** 2.4  
**Domain:** Backend · Frontend · Database  
**Severity Audit:** MEDIUM (Perubahan mayor sudah dilakukan, audit ini bersifat verifikasi & sinkronisasi)

---

## 1. Ringkasan Eksekutif

- Pipeline Analisis Data V2.4 mengikuti arsitektur Stage 0–7 (Normalization → Insight) sesuai dokumen global V2.1, dengan adaptasi khusus V2.4 (interface filter, akurasi dinamis, cache, dan context lock yang lebih ketat).
- Backend FastAPI menyediakan dua jalur eksekusi utama:
  - **Sync (tanpa queue):** `GET /api/v2/analysis/{boardId}/pipeline-v21/`  
    Layanan penuh Stage 0–7 dalam satu request, dengan output `AnalysisResponse` terstruktur.
  - **Async (via Celery):** `POST /api/v2/analysis/{boardId}/pipeline-v21/async/` → `GET /api/v2/analysis/tasks/{taskId}/status/`  
    Eksekusi berat di background, frontend melakukan polling.
- Frontend React (Analysis V2) telah menggunakan **Context Lock** (board, waktu, interface, granularity) dan state global (`analysisStore`) untuk menyimpan hasil Stage 2–7.
- **Perbaikan penting V2.4:** integrasi Stage 0 ke pipeline, pembersihan temp table, serta pemetaan hasil `AnalysisResponse` ke struktur `analysisData.stage2–stage7` untuk jalur **manual run (sync)**.
- **Temuan utama audit:**  
  - Jalur **manual (sync)** kini selaras dengan kontrak UI (Trend, Insight, Health Score bekerja).  
  - Jalur **async (Celery)** masih mengembalikan struktur `results.{trend, analytics, health_score, insights}` yang belum dipetakan eksplisit ke `analysisData.stage2–stage7` di frontend.

---

## 2. Arsitektur Global & Kontrak Data

- **Dokumen referensi utama:**
  - Backend arsitektur: [Backend_Architecture_Design_V2.1.md](file:///E:/mikrotik_api/docs/analisis_data_v2.4/docs/docs%20Internasional%20standar%20(relevan)/Arsitektur_Global/Backend_Architecture_Design_V2.1.md)
  - Global pipeline: [GLOBAL_ANALISIS_DATA.md](file:///E:/mikrotik_api/docs/analisis_data_v2.4/docs/docs%20Internasional%20standar%20(relevan)/Arsitektur_Global/GLOBAL_ANALISIS_DATA.md)
  - Backend pipeline v2.1 (assessment & audit lama):  
    - [2026-03-05_assessment_backend-pipeline-v2.1.md](file:///E:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/analisis%20data%20v2/assessment/2026-03-05_assessment_backend-pipeline-v2.1.md)  
    - [2026-03-05_audit_pipeline_v2.1.md](file:///E:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/analisis%20data%20v2/assessment/2026-03-05_audit_pipeline_v2.1.md)
- **Skema inti (Pydantic V2) backend:** [mikrotik.py](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/schemas/mikrotik.py#L330-L505)
  - `AnalysisMetadata`, `AnalysisStages`, `TrendAnalysisResponse`, `AdvancedAnalyticsResponse`, `HealthScoreResponse`, `InsightItem`, `AnalysisResults`, `AnalysisResponse`.
  - Aturan V2.4.1: seluruh output API menggunakan **camelCase** via `alias_generator=to_camel` dan `jsonable_encoder(..., by_alias=True)`.
- **Kontrak global response (`AnalysisResponse`):**
  - `status: str`
  - `metadata: AnalysisMetadata` (boardId, interfaceName, range, granularity, tempTable, cached, processedAt)
  - `stages: AnalysisStages` (stage1Lock, stage2Trend, stage3_5Analytics, stage6Scoring, stage7Insight)
  - `results: AnalysisResults` dengan isi:
    - `trend: TrendAnalysisResponse` (summary, series, metadata akurasi)
    - `analytics: AdvancedAnalyticsResponse` (correlation, habit, anomaly, metadata)
    - `healthScore: HealthScoreResponse` (totalScore, components, metadata)
    - `insights: List[InsightItem]`

Kontrak ini menjadi dasar mapping ke `analysisData` di frontend.

---

## 3. Backend Pipeline V2.4 (Stage 0–7)

### 3.1. Endpoint Utama

- File: [analysis_v2.py](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/api_v2/endpoints/analysis_v2.py#L113-L267)
- Endpoints kunci:
  - `GET /api/v2/analysis/{board_id}/pipeline-v21/` → `execute_pipeline_v21` (sync, response_model=`AnalysisResponse`).
  - `POST /api/v2/analysis/{board_id}/pipeline-v21/async/` → `execute_pipeline_v21_async` (async, Celery).
  - `GET /api/v2/analysis/tasks/{task_id}/status/` → `get_task_status`.
  - `GET /api/v2/analysis/{board_id}/scoped-analysis/` → Context Lock Stage 1 saja.

### 3.2. Stage 0 — Normalization

- Implementasi utama: [normalization_v2.run_normalization_preview](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/services/normalization_v2.py) *(dirujuk, tidak diulang penuh di sini)*.
- Pada pipeline sync (V2.4):
  - `execute_pipeline_v21` memanggil `run_normalization_preview` lebih dulu, dengan parameter:
    - `board_id`, `start_time`, `end_time`, `granularity`, `fill_gaps=True`, `interface_name`.
  - Output `normalized_data` kemudian diteruskan ke Stage 1 sebagai `normalized_source`.
- Audit:
  - **Sesuai** dengan RCA V2.4: Stage 0 sekarang wajib berjalan sebelum Stage 1 (perbaikan dari deviasi V2.3 / awal V2.1).
  - Metadata akurasi (validCount, dsb.) dipakai untuk memberi warning bila data raw sangat terbatas.

### 3.3. Stage 1 — Scope & Context Lock

- Implementasi: [analysis_service.create_scoped_dataset](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/services/analysis_service.py)  
  Dipanggil dari:
  - Sync: `execute_pipeline_v21`
  - Async: `_run_pipeline` di [pipeline_tasks.py](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/tasks/pipeline_tasks.py#L30-L72)
- Fungsi:
  - Menerima `normalized_source` dari Stage 0.
  - Membuat **temporary table** yang sudah ter-filter `board_id`, waktu, interface, dan granularity.
  - Menjadi Single Source of Truth untuk Stage 2–7.
- Audit:
  - Temp table dibersihkan (`DROP TABLE IF EXISTS`) baik di `execute_pipeline_v21` (sync) maupun di Celery task (`_run_pipeline`), sehingga risiko bloat DB menurun.

### 3.4. Stage 2 — Trend & Aggregation

- Implementasi: [analysis_service.get_trend_analysis](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/services/analysis_service.py#L717-L775)
- Fungsi utama:
  - Mengambil ringkasan statistik traffic, resource, users dari temp table.
  - Menghitung directional metrics (trend_direction, growth_percent, delta_value, peak, trough, volatility_score).
  - Menentukan `accuracy_pct` gabungan (dynamic accuracy + legacy accuracy) → `TrendMetadata`.
- Output:
  - `TrendAnalysisResponse` dengan:
    - `summary.traffic`, `summary.resource`, `summary.dataQuality`, `summary.directional`.
    - `series` time-series (rx, tx, cpu, mem, moving average).
    - `metadata.accuracyPct`, `metadata.isLowAccuracy`, `metadata.version`.
- Audit:
  - Selaras dengan dokumen spesifik Stage 2 (Trend Aggregation Flow).
  - `accuracy_pct` dimanfaatkan frontend untuk labeling akurasi (Insight & Trend).

### 3.5. Stage 3–5 — Advanced Analytics

- Implementasi: [analysis_service.get_advanced_analytics](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/services/analysis_service.py#L778-L846)
- Isi:
  - Stage 3 (Correlation): korelasi Pearson `corr(rx, cpu)`.
  - Stage 4 (Habit): distribusi `avg_rx` per jam (`hour`) untuk Habit/Peak Hour.
  - Stage 5 (Anomaly): deteksi titik outlier via Z-Score.
- Output:
  - `AdvancedAnalyticsResponse`:
    - `correlation.rx_vs_cpu`
    - `habit.peak_hours[]`
    - `anomaly.detected_count`, `anomaly.items[]`
    - `metadata.source_id`, `metadata.processed_at`
- Audit:
  - Backend sudah menghitung core signal yang diperlukan; frontend memetakan ulang untuk kebutuhan visual (Matrix, Habit, Anomaly).

### 3.6. Stage 6 — Health Score

- Implementasi: [analysis_service.calculate_health_score](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/services/analysis_service.py#L849-L910)
- Logika:
  - Stability 30% — dari variasi traffic (Coefficient of Variation) pada `series.rx`.
  - Utilization 30% — dari `100 - avg_cpu`.
  - Anomaly Penalty 40% — penalti per anomali (8 poin, maksimum 40).
  - Menghasilkan `total_score`, `components.stability`, `components.utilization`, `components.anomaly_penalty`, `components.anomaly_score`.
  - Metadata:
    - `is_low_confidence` dan `accuracy_pct` diturunkan dari `TrendMetadata.accuracy_pct`.
- Audit:
  - Sesuai aturan bobot 30/30/40 di dokumen global V2.1.
  - Memberikan satu angka agregat untuk dipakai di UI (Health Score & Insight).

### 3.7. Stage 7 — Insights

- Implementasi: [analysis_service.generate_insights](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/services/analysis_service.py#L913-L1059)
- Logika insight:
  - Health insight berdasarkan rentang skor (SUCCESS/WARNING/CRITICAL).
  - Traffic & Stability insight bila stabilitas rendah.
  - Anomaly insight berdasarkan `anomaly.detected_count`.
  - Resource insight bila `avg_cpu` tinggi.
  - User layer insight (V2.4.1) untuk jumlah pengguna aktif.
  - Habit insight bila `peak_hours` tersedia.
- Metadata insight:
  - `source_id`, `accuracy_pct`, `is_low_confidence`, `raw_timestamp` untuk traceability.
- Audit:
  - Sesuai prinsip **Data Storytelling** dan **Transparency Policy** (menonjolkan akurasi dan kondisi kesehatan).

---

## 4. Jalur Eksekusi: Sync vs Async

### 4.1. Jalur Sync (Manual Run)

- Endpoint: [execute_pipeline_v21](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/api_v2/endpoints/analysis_v2.py#L113-L267)
- Flow ringkas:
  1. Validasi waktu (`endTime > startTime`).
  2. Opsional: cek cache Redis (key berbasis boardId, interfaceName, range, granularity).
  3. Jalankan Stage 0 → Stage 1 → Stage 2–7 (service layer).
  4. Bungkus ke `AnalysisResponse`, validasi, dan encode ke camelCase (via `jsonable_encoder(..., by_alias=True)`).
  5. Simpan ke Redis jika `use_cache == True`.
- Output: struktur `AnalysisResponse` lengkap (status, metadata, stages, results).

### 4.2. Jalur Async (Queue / Celery)

- Task: [execute_full_pipeline_v21_task](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/tasks/pipeline_tasks.py#L15-L27)
- Flow:
  1. Celery task membuat event loop, memanggil `_run_pipeline` (async).
  2. `_run_pipeline` menjalankan Stage 0–7 dengan update progress berkala (state PROGRESS) melalui `update_state`.
  3. Hasil akhirnya mengembalikan dict dengan struktur:
     - `status`, `board_id`, `metadata.range`, `metadata.granularity`, `metadata.temp_table`, `results.{trend, analytics, health_score, insights}`.
  4. Endpoint `get_task_status` membaca status Celery dan menambahkan field `progress`, `currentStage`, `result` atau `error`.
- Audit:
  - Jalur async sudah lengkap (Stage 0–7 sama seperti sync), bedanya output belum diselaraskan penuh ke `AnalysisResponse` (tidak ada `stages`, `metadata.board_id/interface_name`, nama key `health_score`).

---

## 5. Frontend Workflow Analisis V2

### 5.1. Global State & Context Lock

- Store:
  - [analysisStore.js](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/store/analysisStore.js)
    - `useContextLockStore`: menyimpan `selectedBoardId`, `selectedInterfaceName`, `timeRange`, `granularity`, `isLocked`.
    - `useAnalysisStore`: menyimpan `normalizationStatus`, `normalizationData`, `analysisData`, `currentTaskId`, `taskStatus`, `progress`, `currentStage`, `error`, `scopedMetadata`.
- HCI:
  - Context Lock mencegah perubahan filter saat pipeline berjalan (`isLocked === true`).

### 5.2. Stage 1 UI — ScopeFilterStage

- Komponen: [ScopeFilterStage.jsx](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/ScopeFilterStage.jsx)
- Fungsi utama:
  - Memilih board, interface, rentang waktu, dan granularity.
  - Pre-flight check normalisasi via `getNormalizationStatus` (Stage 0 health).
  - Menyimpan metadata scope ke store (`setScopedMetadata`).
  - Menyediakan dua jalur eksekusi:
    - **Async (queue):** `handleLockAndRun` memanggil `executeAnalysisAsync` → backend `pipeline-v21/async`.
    - **Manual (sync):** `handleManualRun` memanggil `executeAnalysisSync` → backend `pipeline-v21/`.

### 5.3. Polling Async Task

- Hook: [useAnalysisTaskPolling.js](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/hooks/useAnalysisTaskPolling.js)
- Tugas:
  - Melakukan polling ke `/analysis/tasks/{taskId}/status/` tiap 2 detik saat `taskStatus` PENDING/STARTED/PROGRESS.
  - Mengupdate `progress`, `currentStage`, dan `analysisData` ketika `state === 'SUCCESS'` (menggunakan `data.result` dari Celery).
  - Melepas Context Lock (`setLocked(false)`) saat selesai atau gagal.

### 5.4. Mapping Data ke Komponen Stage 2–7

- Komponen stage:
  - Stage 2 (Trend): [TrendChart.jsx](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/TrendChart.jsx)  
    Menggunakan `analysisData.stage2.series`, `summary`, `metadata.accuracyPct`.
  - Stage 3 (Correlation): [CorrelationMatrix.jsx](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/CorrelationMatrix.jsx)  
    Menggunakan `analysisData.stage3.matrix`, `metrics`, `metadata.accuracyPct`.
  - Stage 4 (Habit): [HabitPatternAnalysis.jsx](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/HabitPatternAnalysis.jsx)  
    Menggunakan `analysisData.stage4.hodProfile`, `dowProfile`, `stabilityMetrics`, `metadata.sampleDays`.
  - Stage 5 (Anomaly): [AnomalyAnalysis.jsx](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/AnomalyAnalysis.jsx)  
    Menggunakan `analysisData.stage5.events`, `anomalies`, `summary.penaltyScore`, `metadata.accuracyPct`.
  - Stage 6 (Capacity & Health): [CapacityForecast.jsx](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/CapacityForecast.jsx)  
    Menggunakan `analysisData.stage6.healthScore`, `forecastData`, `capacityMetadata`, `scoringMetrics.confidenceScore`.
  - Stage 7 (Insights): [InsightCard.jsx](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/InsightCard.jsx)  
    Menggunakan kombinasi `analysisData.stage2`, `stage4`, `stage5`, `stage6`, `stage7.insights`.

---

## 6. Perubahan Penting V2.4 Terkait Analisis

### 6.1. Integrasi Stage 0 ke Pipeline

- Sesuai RCA V2.4:  
  - Sebelumnya Stage 1 langsung memakai raw data, melewati normalisasi.
  - V2.4 telah memperbaiki: `run_normalization_preview` selalu dipanggil sebelum `create_scoped_dataset` (baik sync maupun async).

### 6.2. Pembersihan Temp Table

- `DROP TABLE IF EXISTS {temp_table}` dilakukan di:
  - `execute_pipeline_v21` (sync) dalam blok `finally`.
  - Celery `_run_pipeline` (async) setelah pipeline selesai.

### 6.3. Mapping Manual Run (Sync) → analysisData

- Di frontend, jalur manual run kini memetakan `AnalysisResponse` ke `analysisData.stage2–stage7` via helper:
  - Lokasi: [ScopeFilterStage.jsx](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/ScopeFilterStage.jsx#L23-L105)
  - Fungsi `mapAnalysisResponseToStages`:
    - Jika response sudah punya `stage2`–`stage7`, langsung dipakai (idempotent).
    - Jika belum:
      - `results.trend` → `stage2`.
      - `results.healthScore` / `results.health_score` → `stage6.healthScore`, `stage6.scoringMetrics.confidenceScore`, `stage6.capacityMetadata` default.
      - `results.insights` → `stage7.insights`, plus metadata board/range/interface.
    - Metadata global (range, granularity, processedAt) disimpan di `analysisData.metadata`.
- Dampak:
  - Jalur **manual run** kini mengisi Trend, Insight, dan Health Score sesuai ekspektasi komponen UI.

---

## 7. Temuan Audit & Rekomendasi

### 7.1. Kesesuaian vs Desain Global

- **Positif:**
  - Stage 0–7 backend telah terimplementasi dan diverifikasi dengan script E2E ([e2e_pipeline_v24.py](file:///E:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/scripts/e2e_pipeline_v24.py#L238-L263)).
  - Integrasi Stage 0 ke pipeline sudah **SESUAI** dengan rekomendasi RCA V2.4.
  - Context Lock di frontend sesuai dokumen [Frontend_Workflow_Design_V2.1.md] dan [ScopeFilterStageAlur.md](file:///E:/mikrotik_api/docs/analisis_data_v2.4/docs/ScopeFilterStageAlur.md).
  - Jalur manual run (sync) kini selaras dengan kontrak visual Stage 2–7.

### 7.2. Gap & Risiko Residual

1. **Perbedaan Struktur Output Sync vs Async**
   - Sync (`execute_pipeline_v21`) mengembalikan `AnalysisResponse` dengan key camelCase dan field `stages` lengkap.
   - Async (`execute_full_pipeline_v21_task` → `get_task_status`) mengembalikan `result` dengan struktur mirip tetapi:
     - Tidak memiliki `stages`.
     - Menggunakan `health_score` (snake_case) di dalam `results`, bukan `healthScore`.
   - Frontend `useAnalysisTaskPolling` saat ini langsung `setAnalysisData(data.result)` tanpa mapping seperti `mapAnalysisResponseToStages`.
   - **Risiko:** Ketidakkonsistenan struktur `analysisData` antara manual run vs async run; beberapa komponen bisa tidak terisi dengan benar jika hanya mengandalkan async path.

2. **Stage 3–5 & 6 Belum Seluruhnya Diproyeksikan ke `analysisData.stage3–stage6`**
   - Backend sudah menyediakan `analytics` (correlation, habit, anomaly) dan `healthScore` lengkap.
   - Di frontend, hanya sebagian sinyal yang sudah dimodelkan penuh ke struktur `stage3`, `stage4`, `stage5`, dan `stage6` (misalnya Habit & Anomaly UI sudah siap, tapi jalur mapping dari `results.analytics` ke bentuk yang diharapkan UI belum sepenuhnya terdokumentasi di satu titik pusat).
   - **Risiko:** Inkonsistensi bila bentuk `AdvancedAnalyticsResponse` berubah, atau UI menambah metrik baru tanpa menyesuaikan mapping.

### 7.3. Rekomendasi Teknis

1. **Samakan Kontrak Data untuk Async & Sync**
   - Di backend, pertimbangkan untuk:
     - Mengubah `_run_pipeline` agar mengembalikan objek yang sudah divalidasi `AnalysisResponse` (atau minimal bentuk yang identik) sebelum dikirim ke Celery result.
     - Atau, di endpoint `get_task_status`, lakukan normalisasi: `TaskStatusResponse.result` di-set ke hasil `AnalysisResponse.model_validate(...)` lalu `model_dump(by_alias=True)`.
   - Di frontend, gunakan kembali helper `mapAnalysisResponseToStages` juga untuk data yang datang dari `getTaskStatus` (async path).

2. **Centralized Mapping Layer di Frontend**
   - Extract fungsi mapping `AnalysisResponse` → `analysisData.stage2–stage7` ke util tersendiri (misal di `src/features/analysis_v2/utils/mapAnalysisResponse.js`) dan gunakan di:
     - `handleManualRun` (sync).
     - `useAnalysisTaskPolling` saat `state === 'SUCCESS'` (async).
   - Tujuan: menghindari duplikasi dan menjaga kontrak data konsisten.

3. **Dokumentasikan Kontrak `analysisData` Secara Formal**
   - Tambahkan satu dokumen singkat yang memetakan:
     - `results.trend` → `analysisData.stage2`
     - `results.analytics` → `stage3`, `stage4`, `stage5`
     - `results.healthScore` → `stage6`
     - `results.insights` → `stage7`
   - Ini akan memudahkan tim ketika menambah sinyal baru atau mengubah struktur backend.

---

## 8. Kesimpulan

- Backend dan frontend untuk Analisis Data V2.4 sudah mengikuti prinsip utama arsitektur V2.1 (Stage 0–7, Raw Data Primary, Context Lock, Accuracy Labeling).
- Integrasi Stage 0 dan pembersihan temp table telah menutup temuan kritikal dari audit sebelumnya.
- Jalur **manual run/sync** kini sudah selaras dengan kontrak UI dan memberikan pengalaman eksplorasi cepat tanpa queue.
- Jalur **async/Celery** secara fungsional sudah kuat, namun masih perlu sedikit normalisasi bentuk output agar benar-benar identik dengan `AnalysisResponse` dan mudah dipetakan ke `analysisData.stage2–stage7`.
- Dengan menyelesaikan rekomendasi pada bagian 7.3, pipeline Analisis Data V2.4 akan memiliki:
  - Kontrak data yang konsisten di seluruh jalur (sync & async).
  - Traceability yang kuat dari raw → trend → analytics → health → insight.
  - Fondasi yang kokoh untuk penambahan fitur analitik lanjutan di versi berikutnya.

