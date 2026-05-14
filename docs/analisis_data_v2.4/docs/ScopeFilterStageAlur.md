# Kesesuaian Alur: ScopeFilterStage (UI) vs AUDIT_SCOPE_FILTER_FLOW (Logic)

Dokumen ini merinci bagaimana implementasi komponen frontend [ScopeFilterStage.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/ScopeFilterStage.jsx) (sebagaimana didokumentasikan di [ScopeFilterStage.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/ScopeFilterStage.md)) memenuhi aturan bisnis dan alur teknis yang ditetapkan dalam [01 AUDIT_SCOPE_FILTER_FLOW.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/analisis%20data%20v2/spesifik/01%20AUDIT_SCOPE_FILTER_FLOW.md).

---

## 1. Pemetaan Fitur UI ke Aturan Bisnis

| Aturan Logic (V2.1) | Implementasi UI (V2.4.1) | Status |
| :--- | :--- | :--- |
| **Context Lock**: Mengunci konteks untuk menjaga integritas data. | **isLocked State**: Menonaktifkan input (Select Router, Date Picker) saat pipeline berjalan. | ✅ Sesuai |
| **Raw Data Primary**: Filtering harus dilakukan pada data mentah (SSOT). | **API Parameters**: UI mengirimkan `boardId`, `startTime`, dan `endTime` mentah ke backend. | ✅ Sesuai |
| **Initial Indexing**: Optimasi kecepatan filter via index database. | **Pre-flight Check**: Memastikan dataset siap dan terindeks sebelum eksekusi pipeline. | ✅ Sesuai |
| **Traceability**: Mencatat `scope_metadata` (parameter filter). | **setScopedMetadata**: Menyimpan parameter yang dipilih ke global store untuk stage berikutnya. | ✅ Sesuai |

---

## 2. Alur Eksekusi Pipeline

Sesuai dengan **Bagian D (Alur Resmi Audit)** pada dokumen Logic, komponen UI menjalankan tahapan berikut:

### Langkah 1: Define Scope & Filter
- **UI Element**: `Target Router` (Select), `Audit Range` (QuickDatePicker), dan `Time Granularity` (Select).
- **Kesesuaian**: Memenuhi syarat **Bagian D.1 & D.2** mengenai definisi scope yang eksplisit (Domain, Entitas, Waktu).

### Langkah 2: Pre-Flight Validation (Mandatory)
- **UI Action**: Tombol `Run Pre-Flight`.
- **Kesesuaian**: Mengikuti **Bagian D.3** yang mewajibkan validasi awal. UI memanggil `getNormalizationStatus` untuk memastikan data di Stage 0 (Normalisasi) memiliki akurasi tinggi sebelum lanjut ke Stage 1.

### Langkah 3: Context Locking & Execution
- **UI Action**: Tombol `Run Pipeline`.
- **Kesesuaian**: Menjalankan **Mode 1 (Bagian E)**. Saat diklik, sistem melakukan:
    1. `setLocked(true)` (Context Lock).
    2. `executeAnalysisAsync(payload)` (Pipeline Entry).
    3. UI memberikan feedback "Analysis in Progress".

---

## 3. Manajemen Output (Scoped Dataset)

Aturan pada **Bagian G** menyatakan bahwa `ScopedDataset` adalah satu-satunya sumber data bagi stage berikutnya.
- **Implementasi UI**: Dengan mengunci filter di Stage 1, komponen ini menjamin bahwa Stage 2 (Trend), Stage 3 (Korelasi), dan seterusnya akan selalu menggunakan dataset yang sama tanpa risiko re-filtering yang tidak konsisten.

---

## 4. Catatan Kepatuhan V2.4.1

Meskipun logika dasar mengikuti V2.1 (2026-03-05), versi **V2.4.1** di sisi frontend menambahkan lapisan kepatuhan tambahan:
- **Naming Convention**: Konversi otomatis ke `camelCase` (misal: `boardId` bukan `board_id`) saat berkomunikasi dengan API, sesuai dengan aturan global workspace.
- **Database Mapping**: Untuk menghindari ambiguitas, istilah **`board_usage_stats`** yang digunakan dalam dokumentasi logic merujuk pada tabel **`board_interface_usage`** di database PostgreSQL.
- **Atomic Design**: Memisahkan logic ke custom hook `useContextLockStore` untuk memastikan state management yang bersih dan terpusat.

---
**Kesimpulan**: Implementasi [ScopeFilterStage.jsx](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/ScopeFilterStage.jsx) telah **100% selaras** dengan prinsip-prinsip yang ditetapkan dalam standar audit Stage 1.
