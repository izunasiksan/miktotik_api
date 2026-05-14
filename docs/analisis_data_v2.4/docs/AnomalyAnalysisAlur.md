# Kesesuaian Alur: AnomalyAnalysis (UI) vs ANOMALY_VALIDATION_FLOW (Logic)

Dokumen ini merinci bagaimana implementasi komponen frontend [AnomalyAnalysis.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/AnomalyAnalysis.jsx) memenuhi aturan bisnis dan alur teknis yang ditetapkan dalam [05 ANOMALY_VALIDATION_FLOW_RULE.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/analisis%20data%20v2/spesifik/05%20ANOMALY_VALIDATION_FLOW_RULE.md).

---

## 1. Pemetaan Fitur UI ke Aturan Bisnis

| Aturan Logic (V2.1) | Implementasi UI (V2.4.1) | Status |
| :--- | :--- | :--- |
| **Event Merging**: Penggabungan anomali yang berdekatan menjadi satu event. | **Events List**: UI menampilkan daftar event anomali yang telah divalidasi dan digabungkan. | ✅ Sesuai |
| **Severity Scoring**: Penentuan tingkat keparahan berdasarkan Z-Score. | **Anomaly Tooltip**: Menampilkan label keparahan (Extreme, Significant, Normal) berdasarkan abs(Z). | ✅ Sesuai |
| **Granular Validation**: Validasi anomali pada resolusi data tertinggi. | **Scatter Chart**: Visualisasi titik data anomali secara granular menggunakan `anomalies` dataset. | ✅ Sesuai |
| **Database Mapping**: Pemetaan sumber data mentah. | **SSOT Validation**: UI merujuk pada [DatabaseMappingConsistency.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/DatabaseMappingConsistency.md) (misal: `board_usage_stats` = `board_interface_usage`). | ✅ Sesuai |

---

## 2. Alur Validasi Anomali

Sesuai dengan **Bagian D (Anomaly Validation Flow)** pada dokumen Logic, komponen UI menjalankan tahapan berikut:

### Langkah 1: Detection & Scatter Plot
- **UI Element**: `ScatterChart` memetakan titik data dengan `z_score` pada sumbu Y.
- **Kesesuaian**: Memungkinkan identifikasi outlier secara visual dengan cepat.

### Langkah 2: Severity Categorization
- **UI Logic**: Fungsi `getSeverityColor` memetakan level keparahan (High, Medium, Low) ke palet warna UI.
- **Kesesuaian**: Membantu pengguna memprioritaskan penanganan berdasarkan urgensi teknis.

### Langkah 3: Penalty Assessment
- **UI Logic**: Anomali yang terdeteksi berkontribusi 40% pada Penalty Score yang dihitung di Stage 7.
- **Kesesuaian**: Menjamin anomali divalidasi sebelum mempengaruhi Health Score akhir.

---

## 3. Catatan Kepatuhan V2.4.1

- **Naming Convention**: Menggunakan `camelCase` untuk mengakses `analysisData.stage5` dari store.
- **Database Clarification**: Istilah **`board_usage_stats`** di logic secara internal merujuk pada tabel **`board_interface_usage`** di database PostgreSQL.
- **Traceability**: Tooltip menampilkan waktu lokal presisi (HH:mm:ss) untuk setiap titik anomali guna memudahkan audit log di perangkat.

---
**Kesimpulan**: Implementasi [AnomalyAnalysis.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/AnomalyAnalysis.jsx) telah **100% selaras** dengan prinsip-prinsip yang ditetapkan dalam standar audit Stage 5.
