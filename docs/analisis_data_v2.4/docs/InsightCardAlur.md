# Kesesuaian Alur: InsightCard (UI) vs INSIGHT_FLOW (Logic)

Dokumen ini merinci bagaimana implementasi komponen frontend [InsightCard.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/InsightCard.jsx) memenuhi aturan bisnis dan alur teknis yang ditetapkan dalam [07 INSIGHT_FLOW_RULE.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/analisis%20data%20v2/spesifik/07%20INSIGHT_FLOW_RULE.md).

---

## 1. Pemetaan Fitur UI ke Aturan Bisnis

| Aturan Logic (V2.1) | Implementasi UI (V2.4.1) | Status |
| :--- | :--- | :--- |
| **Health Score SSOT**: Perhitungan skor kesehatan tunggal dari berbagai metrik. | **Health Metrics Memo**: UI menghitung skor kesehatan menggunakan formula: `0.3*Stability + 0.3*Utilization - (0.4*AnomalyPenalty)`. | ✅ Sesuai |
| **Signal Merging**: Penggabungan sinyal dari Stage 3-6 menjadi satu ringkasan eksekutif. | **Signal Merging Logic**: UI menggabungkan anomali, risiko kapasitas, dan korelasi kuat ke dalam daftar `topSignals`. | ✅ Sesuai |
| **Traceability to Raw Data**: Setiap wawasan harus dapat ditelusuri ke sumber datanya. | **Source ID & Links**: Setiap sinyal memiliki `source_id` dan tautan balik (`link`) ke stage asalnya. | ✅ Sesuai |
| **Database Mapping**: Pemetaan sumber data mentah. | **SSOT Validation**: UI merujuk pada [DatabaseMappingConsistency.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/DatabaseMappingConsistency.md) (misal: `board_usage_stats` = `board_interface_usage`). | ✅ Sesuai |

---

## 2. Alur Pembentukan Wawasan (Insight)

Sesuai dengan **Bagian D (Insight Flow)** pada dokumen Logic, komponen UI menjalankan tahapan berikut:

### Langkah 1: Health Score Calculation
- **UI Logic**: Mengambil data dari Stage 4 (Stability), Stage 5 (Anomaly Penalty), dan Stage 6 (Utilization) untuk menghitung `finalScore`.
- **Kesesuaian**: Memberikan indikator performa utama (KPI) yang objektif mengenai kesehatan sistem.

### Langkah 2: Executive Summary (Signal Merging)
- **UI Element**: Daftar sinyal teratas (`topSignals`).
- **Kesesuaian**: Mengikuti aturan interpretasi lintas stage (Cross-Stage Interpretation) untuk memberikan wawasan yang komprehensif.

### Langkah 3: Reliability Assessment
- **UI Logic**: `isLowConfidence` mengecek akurasi data dari Stage 2.
- **Kesesuaian**: Memberikan peringatan transparansi jika wawasan didasarkan pada data dengan akurasi rendah.

---

## 3. Catatan Kepatuhan V2.4.1

- **Naming Convention**: Menggunakan `camelCase` untuk mengakses seluruh data stage dari store.
- **Database Clarification**: Istilah **`board_usage_stats`** di logic secara internal merujuk pada tabel **`board_interface_usage`** di database PostgreSQL.
- **Executive UI**: Desain kartu menggunakan `lucide-react` icons (Lightbulb, Zap, ShieldCheck) untuk menyoroti status kesehatan secara visual.

---
**Kesimpulan**: Implementasi [InsightCard.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/InsightCard.jsx) telah **100% selaras** dengan prinsip-prinsip yang ditetapkan dalam standar audit Stage 7.
