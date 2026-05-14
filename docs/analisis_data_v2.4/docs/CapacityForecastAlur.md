# Kesesuaian Alur: CapacityForecast (UI) vs CAPACITY_FORECAST_FLOW (Logic)

Dokumen ini merinci bagaimana implementasi komponen frontend [CapacityForecast.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/CapacityForecast.jsx) memenuhi aturan bisnis dan alur teknis yang ditetapkan dalam [06 CAPACITY_FORECAST_FLOW_RULE.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/analisis%20data%20v2/spesifik/06%20CAPACITY_FORECAST_FLOW_RULE.md).

---

## 1. Pemetaan Fitur UI ke Aturan Bisnis

| Aturan Logic (V2.1) | Implementasi UI (V2.4.1) | Status |
| :--- | :--- | :--- |
| **Projected Value**: Prediksi beban di masa depan (Horizon). | **Forecast Chart**: UI menampilkan garis proyeksi berdasarkan `projected_value`. | ✅ Sesuai |
| **Confidence Band**: Rentang probabilitas prediksi (Upper/Lower Bound). | **Confidence Band**: UI menggunakan grafik area untuk memvisualisasikan rentang kepercayaan. | ✅ Sesuai |
| **Time-To-Capacity (TTC)**: Estimasi waktu hingga kapasitas terlampaui. | **TTC Badge**: UI menghitung dan menampilkan estimasi tanggal (misal: "24 Mar") dan status (CRITICAL/WARNING). | ✅ Sesuai |
| **Database Mapping**: Pemetaan sumber data mentah. | **SSOT Validation**: UI merujuk pada [DatabaseMappingConsistency.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/DatabaseMappingConsistency.md) (misal: `board_usage_stats` = `board_interface_usage`). | ✅ Sesuai |

---

## 2. Alur Proyeksi Kapasitas

Sesuai dengan **Bagian D (Capacity Forecast Flow)** pada dokumen Logic, komponen UI menjalankan tahapan berikut:

### Langkah 1: Utilization & Headroom Calculation
- **UI Logic**: Menghitung `utilization` (penggunaan %) dan `headroom` (sisa kapasitas) untuk setiap titik proyeksi.
- **Kesesuaian**: Memberikan konteks kapasitas sisa secara real-time pada setiap titik waktu di masa depan.

### Langkah 2: Conservative TTC Rule
- **UI Logic**: Menetapkan TTC saat `upper_bound >= capacity`. Ini adalah pendekatan konservatif untuk mencegah *over-utilization*.
- **Kesesuaian**: Memberikan peringatan dini (Early Warning System) sebelum kapasitas benar-benar habis.

### Langkah 3: Confidence Scoring
- **UI Element**: Menampilkan `Confidence Score` dari metadata backend.
- **Kesesuaian**: Memberikan informasi mengenai tingkat kepercayaan terhadap prediksi tersebut (Traceability).

---

## 3. Catatan Kepatuhan V2.4.1

- **Naming Convention**: Menggunakan `camelCase` untuk mengakses `analysisData.stage6` dari store.
- **Database Clarification**: Istilah **`board_usage_stats`** di logic secara internal merujuk pada tabel **`board_interface_usage`** di database PostgreSQL.
- **Memoized Logic**: Menggunakan `useMemo` untuk melakukan kalkulasi derivasi (TTC, Utilization) di sisi frontend guna menjaga performa UI.

---
**Kesimpulan**: Implementasi [CapacityForecast.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/CapacityForecast.jsx) telah **100% selaras** dengan prinsip-prinsip yang ditetapkan dalam standar audit Stage 6.
