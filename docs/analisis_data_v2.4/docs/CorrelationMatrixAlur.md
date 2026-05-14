# Kesesuaian Alur: CorrelationMatrix (UI) vs CORRELATION_FLOW (Logic)

Dokumen ini merinci bagaimana implementasi komponen frontend [CorrelationMatrix.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/CorrelationMatrix.jsx) memenuhi aturan bisnis dan alur teknis yang ditetapkan dalam [03 CORRELATION_FLOW.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/analisis%20data%20v2/spesifik/03%20CORRELATION_FLOW.md).

---

## 1. Pemetaan Fitur UI ke Aturan Bisnis

| Aturan Logic (V2.1) | Implementasi UI (V2.4.1) | Status |
| :--- | :--- | :--- |
| **Pearson Correlation (r)**: Metode statistik untuk hubungan linier. | **Matrix Logic**: UI menampilkan koefisien Pearson (r) dengan visualisasi warna. | ✅ Sesuai |
| **High-Res Alignment**: Sinkronisasi data mentah sebelum korelasi. | **Raw Data Alignment**: Tooltip menjelaskan penggunaan data mentah yang diselaraskan. | ✅ Sesuai |
| **Deep Traceability**: Menyertakan akurasi data dalam hasil. | **Accuracy Badge**: Menampilkan `Akurasi: {accuracyPct}%` dan `ShieldCheck` status. | ✅ Sesuai |
| **Database Mapping**: Pemetaan sumber data mentah. | **SSOT Validation**: UI merujuk pada [DatabaseMappingConsistency.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/DatabaseMappingConsistency.md) (misal: `board_usage_stats` = `board_interface_usage`). | ✅ Sesuai |

---

## 2. Alur Analisis Korelasi

Sesuai dengan **Bagian D (Correlation Flow)** pada dokumen Logic, komponen UI menjalankan tahapan berikut:

### Langkah 1: Matrix Visualization
- **UI Element**: Tabel matriks dengan pewarnaan dinamis (`emerald`, `indigo`, `rose`, `amber`).
- **Logic**: Menggunakan fungsi `getCorrelationColor` untuk memberikan indikasi visual kekuatan hubungan (0.7+ Kuat, 0.4+ Sedang).

### Langkah 2: Metric Formatting
- **UI Logic**: Fungsi `formatMetricName` membersihkan nama teknis dari backend (misal: `board_usage_stats` -> `USAGE`) untuk keterbacaan pengguna.
- **Kesesuaian**: Memastikan istilah teknis tetap traceable ke sumber data mentah (SSOT).

### Langkah 3: Reliability Check
- **UI Element**: `getCorrelationLabel` memberikan label "Data Minim" jika sampel data (n) kurang dari 5.
- **Kesesuaian**: Mencegah kesimpulan korelasi yang menyesatkan dari dataset yang terlalu kecil.

---

## 3. Catatan Kepatuhan V2.4.1

- **Naming Convention**: Menggunakan `camelCase` untuk mengakses `analysisData.stage3` dari store.
- **Database Clarification**: Istilah **`board_usage_stats`** di logic secara internal merujuk pada tabel **`board_interface_usage`** di database PostgreSQL.
- **Fidelity Info**: Menyediakan informasi teknis via info tooltip untuk mendidik pengguna mengenai metode Pearson Correlation.

---
**Kesimpulan**: Implementasi [CorrelationMatrix.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/CorrelationMatrix.jsx) telah **100% selaras** dengan prinsip-prinsip yang ditetapkan dalam standar audit Stage 3.
