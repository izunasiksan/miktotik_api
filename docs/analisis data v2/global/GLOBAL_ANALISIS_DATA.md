# GLOBAL_ANALISIS_DATA (V2.1)
(VERSION V2.1 – GLOBAL ANALYTICS FRAMEWORK)
Last Modified: 2026-03-05
Status: Finalized & Implemented

Dokumen ini mendefinisikan standar alur analisis data sistem Mikrotik API, mengintegrasikan prinsip Raw Data Primary, sistem konversi waktu otomatis, dan SOP penanganan missing data yang ketat untuk menjamin integritas analisis dari Stage 0 hingga Stage 7.

---

## 1. DEFINISI & FILOSOFI ANALISIS (V2.1)
Langkah awal untuk menentukan arah analisis dengan filosofi **Raw Data Primary**.
*   **Tujuan:** Mengidentifikasi masalah performa jaringan (throughput, latency, stability) menggunakan data resolusi tinggi.
*   **Prinsip Utama:** 
    *   **Raw Fidelity:** Dilarang melakukan downsampling prematur di level database.
    *   **Deferred Aggregation:** Agregasi hanya dilakukan pada tahap presentasi (Stage 7).
    *   **Deep Traceability:** Setiap hasil analisis harus dapat dilacak kembali ke `raw_timestamp` aslinya.

## 2. PENGUMPULAN DATA (COLLECTION)
Mendapatkan data mentah (Raw Data) langsung dari sumber utama sesuai skema PostgreSQL.
*   **Sumber Utama (SSOT):** Tabel RAW seperti `board_speed_stats`, `board_usage_stats`, `board_resource_stats`, dll.
*   **Metadata Mandatory:** `source_id`, `raw_timestamp`, `granularity_source`.
*   **Referensi:** [revisi_logika_raw_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/revisi_logika_raw_V2.1.md).

## 3. PEMBERSIHAN DATA & NORMALISASI (STAGE 0)
Tahap krusial untuk memastikan kualitas data sebelum masuk ke pipeline analisis.
*   **Penanganan Missing Data (WAJIB):**
    *   Deteksi klasifikasi (MCAR, MAR, MNAR).
    *   Imputasi berdasarkan threshold (<5%: FFill, 5-15%: Regression, >15%: Interpolation).
    *   **Referensi:** [aturan_penanganan_missing_data_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_penanganan_missing_data_V2.1.md).
*   **Standarisasi Unit:** Selaraskan semua satuan (bytes to Mbps, ms to seconds) menggunakan sistem konversi otomatis.
*   **Referensi Konversi:** [aturan_konversi_waktu_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_konversi_waktu_V2.1.md).

## 4. ANALISIS DATA EKSPLORATIF & FILTER (STAGE 1)
Memahami karakteristik data melalui statistik deskriptif dan penguncian konteks (Context Lock).
*   **Aktivitas:** Identifikasi distribusi data, outliers, dan korelasi awal.
*   **Context Lock:** Terapkan filter `start_date`, `end_date`, dan `granularity` secara final. Tidak ada re-filter di tahap berikutnya.

## 5. PIPELINE ANALISIS MENDALAM (STAGE 2 - STAGE 6)
Proses transformasi data satu arah (forward-only) tanpa circular dependency.
*   **Stage 2 (Trend):** Hitung slope, delta, dan growth menggunakan data yang sudah bersih.
*   **Stage 3 (Correlation):** Analisis hubungan antar variabel (misal: CPU Load vs Traffic).
*   **Stage 4 (Habit):** Identifikasi pola perilaku harian/mingguan.
*   **Stage 5 (Anomaly):** Deteksi penyimpangan data menggunakan algoritma statistik.
*   **Stage 6 (Health Score):** Agregasi final metrik kesehatan (Stability 30%, Utilization 30%, Anomaly 40%).

## 6. INTERPRETASI & VISUALISASI (STAGE 7)
Menyajikan temuan dalam bentuk yang dapat ditindaklanjuti dengan informasi akurasi yang transparan.
*   **Transparency Policy:** Jika data hasil konversi waktu (misal Jam ke Hari) tidak mencapai threshold durasi penuh, WAJIB menampilkan label akurasi (contoh: "Akurasi 23%").
*   **Data Storytelling:** Fokus pada penyelesaian masalah yang didefinisikan di tahap awal.

---

## CHANGELOG (V2.1)
| Versi | Tanggal | Perubahan Signifikan |
| :--- | :--- | :--- |
| 2.1 | 2026-03-05 | Integrasi Pipeline Stage 0-7, Raw Data Primary, SOP Missing Data V2.1, dan Aturan Konversi Waktu V2.1. |
| 2.0 | Sebelumnya | Definisi alur analisis dasar (OSEMN/CRISP-DM). |

---
**END OF DOCUMENT**
