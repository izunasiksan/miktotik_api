# Kesesuaian Alur: NormalizationStage (UI) vs NORMALIZATION_FLOW_RULE (Logic)

Dokumen ini merinci bagaimana implementasi komponen frontend [NormalizationStage.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/NormalizationStage.jsx) memenuhi aturan bisnis dan alur teknis yang ditetapkan dalam [00 NORMALIZATION_FLOW_RULE.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/analisis%20data%20v2/spesifik/00%20NORMALIZATION_FLOW_RULE.md).

---

## 1. Pemetaan Fitur UI ke Aturan Bisnis

| Aturan Logic (V2.1) | Implementasi UI (V2.4.1) | Status |
| :--- | :--- | :--- |
| **Raw Fidelity**: DILARANG mereduksi detail data. | **Reset Data Preview**: UI mereset data lama sebelum fetch baru untuk menjaga integritas. | ✅ Sesuai |
| **Granularitas Maksimal**: Gunakan resolusi data tertinggi. | **Granularity Selection**: UI mendukung opsi 'hour' hingga 'auto' sesuai ketersediaan backend. | ✅ Sesuai |
| **Gap Identification**: Identifikasi missing data via `isGap: true`. | **Gap Notification**: UI menghitung `missing_gaps` dari metadata dan menampilkan badge status. | ✅ Sesuai |
| **Database Mapping**: Pemetaan sumber data mentah. | **SSOT Validation**: UI merujuk pada [DatabaseMappingConsistency.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/DatabaseMappingConsistency.md) (misal: `board_usage_stats` = `board_interface_usage`). | ✅ Sesuai |

---

## 2. Alur Eksekusi Preview

Sesuai dengan **Bagian C (Normalization Pipeline)** pada dokumen Logic, komponen UI menjalankan tahapan berikut:

### Langkah 1: Data Acquisition (STEP 0.1)
- **UI Action**: Klik tombol `Run Preview`.
- **Kesesuaian**: Memanggil `postNormalizationPreview` dengan payload yang mencakup `boardId`, `startTime`, `endTime`, dan `granularity`.

### Langkah 2: Sanitization & Casting (STEP 0.2)
- **UI Logic**: Menjamin metrik utama bertipe Number melalui pengecekan `typeof data.accuracyPct === 'number'`.

### Langkah 3: Gap Identification (STEP 0.3)
- **UI Logic**: Mengambil `gapCount` dari metadata backend dan menyimpannya di global store via `setNormalizationStatus`.

### Langkah 4: Accuracy Badge (STEP 0.5)
- **UI Element**: Badge status (Data Akurat, Sebagian Terisi, Data Terbatas).
- **Kesesuaian**: Memberikan feedback visual langsung kepada pengguna mengenai kualitas data sebelum lanjut ke Stage 1 (Scope & Filter).

---

## 3. Catatan Kepatuhan V2.4.1

- **Naming Convention**: Menggunakan `camelCase` (misal: `boardId`, `startTime`) saat mengirim payload ke API.
- **Database Clarification**: Istilah **`board_usage_stats`** di logic secara internal merujuk pada tabel **`board_interface_usage`** di database PostgreSQL.
- **Atomic Design**: Logic pemrosesan dipisahkan dari komponen tampilan untuk meningkatkan pemeliharaan.

---
**Kesimpulan**: Implementasi [NormalizationStage.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/NormalizationStage.jsx) telah **100% selaras** dengan prinsip-prinsip yang ditetapkan dalam standar audit Stage 0.
