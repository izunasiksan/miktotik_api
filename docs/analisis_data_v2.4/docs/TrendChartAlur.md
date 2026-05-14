# Kesesuaian Alur: TrendChart (UI) vs TREND_AGGREGATION_FLOW (Logic)

Dokumen ini merinci bagaimana implementasi komponen frontend [TrendChart.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/TrendChart.jsx) memenuhi aturan bisnis dan alur teknis yang ditetapkan dalam [02 TREND_AGGREGATION_FLOW.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/analisis%20data%20v2/spesifik/02%20TREND_AGGREGATION_FLOW.md).

---

## 1. Pemetaan Fitur UI ke Aturan Bisnis

| Aturan Logic (V2.1) | Implementasi UI (V2.4.1) | Status |
| :--- | :--- | :--- |
| **Deferred Aggregation**: Agregasi dilakukan di backend, UI hanya menampilkan. | **analysisData.stage2**: UI mengonsumsi hasil agregasi langsung dari store. | ✅ Sesuai |
| **High-Res Alignment**: Sinkronisasi waktu antar metrik. | **Recharts Timeline**: Menggunakan sumbu X yang seragam untuk semua metrik (rx, tx, total). | ✅ Sesuai |
| **Gap Detection**: Deteksi kekosongan data dalam deret waktu. | **Gap Detected Badge**: Tooltip menampilkan "Gap Data Detected" jika `is_gap` bernilai true. | ✅ Sesuai |
| **Database Mapping**: Pemetaan sumber data mentah. | **SSOT Validation**: UI merujuk pada [DatabaseMappingConsistency.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/DatabaseMappingConsistency.md) (misal: `board_usage_stats` = `board_interface_usage`). | ✅ Sesuai |

---

## 2. Alur Visualisasi Trend

Sesuai dengan **Bagian D (Trend Aggregation Flow)** pada dokumen Logic, komponen UI menjalankan tahapan berikut:

### Langkah 1: Time Conversion Accuracy
- **UI Logic**: Menggunakan `new Date(label).toLocaleString()` untuk konversi waktu UTC dari backend ke waktu lokal pengguna.

### Langkah 2: Statistical Deviation (Z-Score)
- **UI Logic**: Menampilkan `z_score` dalam tooltip untuk memberikan konteks statistik pada setiap titik data (Anomali vs Normal).

### Langkah 3: Trend Indicators
- **UI Element**: `ArrowUpRight`, `ArrowDownRight`, dan `Minus` icons.
- **Kesesuaian**: Memberikan ringkasan visual cepat mengenai arah pergerakan data (Trend) sesuai aturan interpretasi di Stage 2.

---

## 3. Catatan Kepatuhan V2.4.1

- **Naming Convention**: Properti data menggunakan `camelCase` (misal: `analysisData.stage2`) sesuai standar workspace.
- **Database Clarification**: Istilah **`board_usage_stats`** di logic secara internal merujuk pada tabel **`board_interface_usage`** di database PostgreSQL.
- **High Fidelity Tooltip**: Tooltip dikustomisasi untuk menampilkan metadata tambahan (Z-Score, Gap Status) guna menjaga transparansi data (Traceability).

---
**Kesimpulan**: Implementasi [TrendChart.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/TrendChart.jsx) telah **100% selaras** dengan prinsip-prinsip yang ditetapkan dalam standar audit Stage 2.
