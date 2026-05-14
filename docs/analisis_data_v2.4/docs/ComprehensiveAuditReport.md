# Audit Report: CamelCase Consistency & Data Integrity (v2.4.1)
**Tanggal Audit**: 2026-03-07
**Status**: In Progress / Sebagian Besar Selesai (90%)
**Fokus**: Sinkronisasi Naming Convention (camelCase) & Konsistensi Data SSOT (schema.sql)

## **1. Pendahuluan**
Audit ini dilakukan untuk memastikan seluruh response API dari Backend (FastAPI) menggunakan format **camelCase** sesuai dengan standar Frontend, serta memastikan integritas data antara Database (SQLAlchemy) dan Pydantic Schema berdasarkan Single Source of Truth (`schema.sql`).

## **2. Hasil Audit & Perbaikan: Naming Convention**
Ketidakkonsistenan penamaan properti (snake_case vs camelCase) telah diidentifikasi sebagai penyebab utama kegagalan render di Frontend (terutama pada fitur router selection dan analysis).

### **Backend - Pydantic BaseSchema**
- **Masalah**: `alias_generator` sebelumnya menggunakan logic kustom yang tidak konsisten.
- **Perbaikan**: Diperbarui menggunakan `alias_generator=to_camel` di `BaseSchema`. Seluruh model Pydantic kini mewarisi behavior ini secara otomatis.
- **File Terkait**: [base.py](file:///e:\mikrotik_api\docs\analisis_data_v2.4\e2e_best_practice\src\app\schemas\base.py)

### **Backend - API Endpoints (FastAPI)**
- **Masalah**: Penggunaan `jsonable_encoder` tanpa parameter `by_alias=True` menyebabkan response tetap dalam format snake_case meskipun Pydantic schema sudah memiliki alias camelCase.
- **Perbaikan**: Seluruh endpoint kritikal telah diperbarui untuk menyertakan `jsonable_encoder(data, by_alias=True)`.
- **Status Per File**:
  - `boards.py`: 12+ endpoint diperbarui (read_boards, read_board_pppoe, delete_board_hotspot, dll).
  - `users.py`: Endpoint `read_user_access` dan `grant_user_access` diperbarui.
  - `auth.py`: Endpoint `login_access_token` dan `read_users_me` diperbarui.
  - `reports.py` & `analysis.py`: Seluruh return statement dan logic Redis caching disinkronkan.

### **Redis Caching**
- **Masalah**: Data yang disimpan di Redis masih menggunakan format snake_case, sehingga saat di-retrieve oleh Frontend, terjadi error "undefined property".
- **Perbaikan**: Logic serialisasi Redis kini menggunakan `jsonable_encoder(by_alias=True)` sebelum data disimpan.

### **Frontend - Analysis V2 Molecules**
- **Masalah**: Beberapa komponen molekul di `features/analysis_v2` masih merujuk ke field snake_case (seperti `source_id`, `processed_at`) atau menggunakan sumber data yang salah untuk kalkulasi Health Score.
- **Perbaikan**: 
  - `InsightCard.jsx`: Memperbaiki 4+ inconsistency camelCase (`sourceId`, `scopedMetadata`, `processedAt`, `normalizationMetrics`, `completenessScore`) dan menyesuaikan sumber `anomalyPenalty` ke `summary.penaltyScore`.
  - `TrendChart.jsx`: Memperbarui label versi Gap Data (V2.1) dan menyesuaikan threshold Z-Score menjadi 2.5 untuk mengurangi false positives.
  - `CapacityForecast.jsx`, `AnomalyAnalysis.jsx`, `HabitPatternAnalysis.jsx`, `CorrelationMatrix.jsx`: Verifikasi konsistensi camelCase dan pembersihan sisa-sisa mapping manual snake_case.
  - `NormalizationStage.jsx`: Memastikan reset data preview lama sebelum fetch baru dan sinkronisasi naming `accuracyPct`.

## **3. Hasil Audit & Perbaikan: Integritas Data (SSOT)**
Berdasarkan perbandingan dengan `schema.sql`, ditemukan beberapa field yang hilang atau tipe data yang tidak presisi di level SQLAlchemy model.

### **Field `accuracy_pct`**
- **Masalah**: Field `accuracy_pct` (NUMERIC(5,2)) ada di database tapi hilang di model SQLAlchemy dan Pydantic.
- **Perbaikan**: Ditambahkan ke model: `BoardClientStat`, `BoardResourceStat`, `BoardSpeedStat`, `BoardDailySummary`, `BoardMonthlySummary`, dan `HotspotUsageMonthly`.

### **Presisi Numerik**
- **Masalah**: Penggunaan `BigInteger` untuk field rata-rata traffic (seperti `avg_download`) menghilangkan data desimal (Mbps).
- **Perbaikan**: Diubah menjadi `Numeric(15,2)` agar sesuai dengan `schema.sql`.

### **Unit Testing**
- **Status**: ✅ **Lulus (Passed)**
- **Hasil**: 5 skenario pengujian unit telah berhasil dijalankan untuk memvalidasi:
  1. `BaseSchema` menghasilkan alias camelCase secara otomatis.
  2. `jsonable_encoder` menghasilkan output camelCase saat `by_alias=True`.
  3. Logika Redis caching di endpoint menghasilkan data camelCase (simulasi mock).
  4. Schema bersarang (nested) juga mengikuti aturan camelCase.
  5. **Pengecualian Khusus**: Schema `Token` tetap menggunakan snake_case (`access_token`) untuk mematuhi standar OAuth2 dan kompatibilitas dengan `authStore.js`.
- **File Terkait**: [test_camel_case.py](file:///e:\mikrotik_api\docs\analisis_data_v2.4\e2e_best_practice\src\app\tests\test_camel_case.py)

## **4. Status Pekerjaan (Checklist)**
- [x] Perbaikan Skema Pydantic (BaseSchema to_camel)
- [x] Update Endpoint `boards.py` (camelCase + jsonable_encoder)
- [x] Update Endpoint `auth.py` & `users.py`
- [x] Sinkronisasi Redis Cache (camelCase serialization)
- [x] Verifikasi & Perbaikan Frontend Molecules (Analysis V2)
- [x] Penambahan field `accuracy_pct` di model SQLAlchemy
- [x] Audit & Update `telegram.py`, `backups.py`, `automation.py`
- [x] Unit Test untuk validasi camelCase lintas layer (Passed)
- [x] Verifikasi konsistensi camelCase pada caching Redis di runtime (Verified via Mock Unit Test)

## **5. Catatan Tambahan**
Seluruh perubahan kode ditandai dengan komentar `UPDATE 2.4.1` untuk memudahkan tracking dan rollback jika diperlukan. Dokumentasi ini akan terus diperbarui seiring dengan penyelesaian tugas pending.
