# Catatan Keambiguan Logika Data (Audit & Analysis) - Final Version

Dokumen ini mencatat keambiguan (ambiguity) yang ditemukan selama proses audit kode pada modul frontend `analysis_audit.jsx` dan hooks terkait, serta keputusan final yang diambil.

## 1. KEAMBIGUAN SUMBER DATA (FIELD AMBIGUITY)

### A. CPU Usage Field Ambiguity
**Status**: Ditangani di `analysis_utils.jsx`.

- **Masalah**: Backend mengirim lebih dari satu kandidat nama field: `cpu`, `cpu_usage`, `cpu_percent`, `cpu_p`, `cpu_load`, `avg_cpu`, `sum_cpu`.
- **Risiko**: Nilai salah dipakai atau perbedaan sumber field antar endpoint.
- **Solusi**: Semua data masuk melalui `standardizeTableData` menggunakan `pickNum()` dengan urutan prioritas tetap.
- **Keputusan Final**: Frontend tidak boleh membaca field CPU langsung dari raw response. Hanya satu field final yang digunakan: `cpu_percent_standard`.

### B. Memory Field Ambiguity
**Status**: Semi-tertangani (Butuh Metadata Backend).

- **Masalah**: Memory bisa berupa **Free Memory (Bytes)** atau **Memory Usage (%)**.
- **Ambiguitas**: Nilai < 100 diasumsikan persen, namun bisa jadi bytes kecil akibat error.
- **Mitigasi Saat Ini**: Jika nilai > 1000 dianggap bytes, dengan flag otomatis `is_mem_bytes`.
- **Rekomendasi Final**: Backend **WAJIB** mengirim field eksplisit `memory_percent` dan `memory_bytes`. Frontend tidak boleh melakukan inferensi jenis unit secara heuristik.

## 2. KEAMBIGUAN PERHITUNGAN (CALCULATION AMBIGUITY)

### A. Traffic Mbps Conversion
**Status**: Perlu standarisasi global.

- **Masalah**: Penggunaan 1000 (SI) vs 1024 (Binary). Monitoring network biasanya menggunakan SI (10^6).
- **Risiko**: Diskrepansi laporan dengan perangkat monitoring lain.
- **Keputusan**: Menggunakan standar **SI (1000)** untuk network throughput (Mbps).

### B. Health Score Logic
**Status**: Resolved.

- **Masalah Lama**: Skor flat (equal weight) di mana missing field dianggap sama berat dengan CPU > 100%.
- **Solusi**: **Weighted Health Scoring** (CPU/Traffic weight 3, Missing value weight 1). Hasil lebih realistis secara sistem.

## 3. KEAMBIGUAN TEMPORAL (TIME-SERIES AMBIGUITY)

**Status**: Parsial (Butuh Metadata Backend).

- **Masalah**: Interval data tidak konsisten (1m, 5m, harian). Deteksi gap menggunakan 1.5x interval normal yang tidak selalu diketahui.
- **Risiko**: False positive atau false negative pada deteksi gap.
- **Rekomendasi**: Backend harus mengirim `sampling_interval_seconds`. Frontend menggunakan nilai tersebut untuk `gap_threshold = interval * 1.5`. Tanpa metadata interval, audit temporal dianggap tidak valid.

## 4. KEAMBIGUAN PERAN (ROLE AMBIGUITY)

**Status**: Resolved.

- **Masalah Lama**: Hook `useAnalysisAuditLogic` mencampur UI state, data audit, statistik, dan insight logic.
- **Solusi**: Refactoring menjadi 4 hook granular: `useAnalysisUI`, `useDataAudit`, `useDescriptiveStats`, dan `useInsightEngine`.
- **Status**: Arsitektur kini memiliki *clean separation of concern*.

## 5. KEAMBIGUAN STATUS INSIGHT (READINESS AMBIGUITY)

**Status**: Belum Final (Prinsip Arsitektur).

- **Masalah**: Frontend masih menghitung sebagian statistik inferensial.
- **Risiko**: Inkonsistensi hasil antara frontend dan backend (Z-Score, Regression).
- **Prinsip Arsitektur**:
    - **Frontend**: Consumer, Renderer, Validasi ringan, Descriptive stats sederhana.
    - **Backend**: Agregasi berat, Inferensial statistik, Korelasi, Prediksi, Anomaly detection kompleks.
- **Rekomendasi Final**: Semua statistik inferensial harus berasal dari backend. Frontend tidak boleh menghitung ulang.
