# Kesesuaian Alur: HabitPatternAnalysis (UI) vs HABIT_PATTERN_FLOW (Logic)

Dokumen ini merinci bagaimana implementasi komponen frontend [HabitPatternAnalysis.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/HabitPatternAnalysis.jsx) memenuhi aturan bisnis dan alur teknis yang ditetapkan dalam [04 HABIT_PATTERN_FLOW.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/analisis%20data%20v2/spesifik/04%20HABIT_PATTERN_FLOW.md).

---

## 1. Pemetaan Fitur UI ke Aturan Bisnis

| Aturan Logic (V2.1) | Implementasi UI (V2.4.1) | Status |
| :--- | :--- | :--- |
| **Baseline Profile**: Pembentukan pola HOD (Hour of Day) dan DOW (Day of Week). | **HOD/DOW Charts**: UI menampilkan visualisasi profil per jam dan per hari. | ✅ Sesuai |
| **Stability Scoring**: Mengukur kekonsistenan pola perilaku. | **Stability Score Badge**: UI menampilkan skor stabilitas dan status (Stable/Unstable). | ✅ Sesuai |
| **Granular Baseline**: Menggunakan data resolusi tinggi untuk baseline. | **Baseline Profile (SSOT)**: Tooltip header menegaskan penggunaan baseline dari data mentah. | ✅ Sesuai |
| **Database Mapping**: Pemetaan sumber data mentah. | **SSOT Validation**: UI merujuk pada [DatabaseMappingConsistency.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/DatabaseMappingConsistency.md) (misal: `board_usage_stats` = `board_interface_usage`). | ✅ Sesuai |

---

## 2. Alur Analisis Kebiasaan (Habits)

Sesuai dengan **Bagian D (Habit Pattern Flow)** pada dokumen Logic, komponen UI menjalankan tahapan berikut:

### Langkah 1: Profiling HOD (Hour of Day)
- **UI Element**: `formattedHodData` memetakan jam 00:00 - 23:00 ke dalam grafik area.
- **Kesesuaian**: Memungkinkan identifikasi jam sibuk (peak hours) secara visual.

### Langkah 2: Profiling DOW (Day of Week)
- **UI Element**: `formattedDowData` memetakan hari Min - Sab ke dalam grafik garis.
- **Kesesuaian**: Memungkinkan identifikasi perbedaan perilaku antar hari dalam seminggu.

### Langkah 3: Reliability Assessment
- **UI Logic**: `isLowSample` mengecek apakah jumlah sampel hari (`sampleDays`) kurang dari 7.
- **Kesesuaian**: Memberikan peringatan jika data tidak cukup untuk membentuk pola yang valid.

---

## 3. Catatan Kepatuhan V2.4.1

- **Naming Convention**: Menggunakan `camelCase` untuk mengakses `analysisData.stage4` dari store.
- **Database Clarification**: Istilah **`board_usage_stats`** di logic secara internal merujuk pada tabel **`board_interface_usage`** di database PostgreSQL.
- **Stability Metrics**: Skor stabilitas berkontribusi 30% pada perhitungan Health Score akhir di Stage 7.

---
**Kesimpulan**: Implementasi [HabitPatternAnalysis.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/HabitPatternAnalysis.jsx) telah **100% selaras** dengan prinsip-prinsip yang ditetapkan dalam standar audit Stage 4.
