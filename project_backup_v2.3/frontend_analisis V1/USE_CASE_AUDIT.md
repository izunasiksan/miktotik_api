# Use Case Audit & Validasi Data (Frontend)

Dokumen ini merinci skenario penggunaan (use cases) pada modul Audit Data berdasarkan 4 layer hooks yang telah direfaktorisasi.

## 1. Use Case: Kontrol UI & Interaksi (useAnalysisUI)
**Aktor**: User (Administrator/Analyst)

| Skenario | Deskripsi | Komponen Terkait |
| :--- | :--- | :--- |
| **Penyaringan Risiko** | User memfilter temuan berdasarkan tingkat risiko (HIGH/MEDIUM/LOW/ALL). | `GlobalControls`, `filteredFindings` |
| **Pencarian Temuan** | User mencari kata kunci spesifik pada tabel dokumentasi temuan. | `Search Input`, `filteredFindings` |
| **Pengaturan Limit Tabel** | User mengubah jumlah baris yang ditampilkan (10/20/50/all) pada tabel audit log. | `TableLimitSelector` |
| **Pemicuan Agregasi Manual** | User menekan tombol "Trigger Agregasi" untuk memperbarui data dari backend. | `RefreshCw Button` |

## 2. Use Case: Validasi & Kualitas Data (useDataAudit)
**Aktor**: Sistem (Otomatis)

| Skenario | Deskripsi | Logika / Aturan |
| :--- | :--- | :--- |
| **Weighted Health Scoring** | Menghitung skor kesehatan data dengan bobot (CPU/Traffic=3, Missing=1). | `dataQuality.healthScore` |
| **Deteksi Out of Bounds** | Mengidentifikasi jika CPU usage > 100% atau Traffic bernilai negatif. | `dataQuality.outOfBounds` |
| **Audit Integritas Waktu** | Mendeteksi celah (gap) pada data time-series (selisih > 1.5x interval normal). | `integrityAudit.timeGaps` |
| **Audit Baris Anomali** | Menampilkan detail baris data yang cacat untuk kebutuhan debugging. | `dataQuality.anomalyRows` |

## 3. Use Case: Statistik & Visualisasi (useDescriptiveStats)
**Aktor**: Sistem & User

| Skenario | Deskripsi | Komponen Terkait |
| :--- | :--- | :--- |
| **Ringkasan Real-time** | Menampilkan Avg CPU, Mem, dan Top 3 Interface teraktif saat ini. | `SummaryCards` |
| **Eksplorasi Pivot** | Menampilkan ringkasan agregat (Traffic, Resource, Client) dalam 10 sampel terakhir. | `PivotTables` |
| **Verifikasi Data Mentah** | Menampilkan 10 baris data mentah terakhir untuk pembanding audit. | `HelperTables` |
| **Konversi Unit Otomatis** | Mengubah bytes ke unit yang sesuai (KB/MB/GB/TB) secara otomatis. | `formatBytesAuto` |

## 4. Use Case: Kesiapan Keputusan (useInsightEngine)
**Aktor**: Sistem (Decision Support)

| Skenario | Deskripsi | Hasil / Output |
| :--- | :--- | :--- |
| **Validasi Alur Insight** | Memeriksa apakah 7 tahapan (Scope, Filter, Agregasi, dll) sudah terpenuhi. | `methodologyAudit.readinessScore` |
| **Klasifikasi Temuan** | Mengelompokkan masalah menjadi temuan audit dengan mitigasi risiko. | `filteredFindings` |
| **Penentuan Status Layak** | Menentukan apakah data "Siap Insight", "Butuh Penyesuaian", atau "Tidak Layak". | `methodologyAudit.status` |
