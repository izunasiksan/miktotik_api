ATURAN_PENANGANAN_MISSING_DATA_V2.1
(VERSION V2.1 – GLOBAL DATA INTEGRITY)

A. DEFINISI & KLASIFIKASI MISSING DATA
======================================

Sistem mengklasifikasikan missing data (data hilang) ke dalam tiga kategori utama:

1. **Missing Completely at Random (MCAR)**:
   - Hilangnya data tidak bergantung pada nilai data yang diobservasi maupun yang hilang.
   - Contoh: Gangguan koneksi sesaat yang menyebabkan satu paket data gagal terkirim (Random Outage).
   - Penanganan: Listwise deletion (jika sampel besar) atau Mean/Median Imputation.

2. **Missing at Random (MAR)**:
   - Hilangnya data bergantung pada variabel lain yang teramati, tetapi tidak pada data yang hilang itu sendiri.
   - Contoh: Perangkat tertentu (Old Board) lebih sering kehilangan log resource daripada perangkat baru.
   - Penanganan: Multiple Imputation (MI) atau Regression Imputation menggunakan variabel terkait.

3. **Missing Not at Random (MNAR)**:
   - Hilangnya data bergantung pada nilai data yang hilang itu sendiri.
   - Contoh: Sensor traffic gagal mencatat data jika traffic melampaui ambang batas tertentu (Overload).
   - Penanganan: Interpolasi linear, Forward-fill (FFill), atau Backward-fill (BFill) dengan peringatan "Uncertain Data".

B. PROSEDUR DETEKSI DINI (PIPELINE)
==================================

Deteksi wajib dilakukan di setiap tahap pipeline:

- **Stage 0 (Normalization)**:
  - WAJIB menandai gap waktu yang hilang menggunakan field `isGap: true`.
  - Hitung persentase data hilang awal per metrik.
- **Stage 1 (Scope & Filter)**:
  - Validasi apakah subset data yang dipilih (Board/Time Range) memiliki integritas cukup.
  - Tolak permintaan jika missing data > 50% di seluruh rentang waktu.
- **Stage 2 (Trend Aggregation)**:
  - Hitung `completeness_score` sebelum agregasi.
  - Dokumentasikan jumlah record asli vs record yang diimputasi.

C. ALGORITMA PEMILIHAN STRATEGI
==============================

| Karakteristik Data | Tipe Missing | Strategi Rekomendasi | Keterangan |
|-------------------|--------------|-----------------------|------------|
| Deret Waktu (Timeseries) | MNAR | Interpolasi Linear / Spline | Mempertahankan tren temporal |
| Deret Waktu (Timeseries) | MCAR | Forward-fill (FFill) | Gunakan nilai terakhir yang valid |
| Data Kategorikal | MCAR/MAR | Mode Imputation | Gunakan nilai tersering |
| Data Numerik (Non-Timeseries) | MCAR | Mean/Median Imputation | Median lebih stabil terhadap outlier |
| Data Korelasi Tinggi | MAR | Regression Imputation | Gunakan variabel dependen sebagai prediktor |
| Analisis Berat (Heavy) | MAR/MNAR | Multiple Imputation (MI) | Memberikan estimasi varians yang lebih baik |
| Persentase Sangat Kecil (<1%) | MCAR | Listwise Deletion | Hapus record tanpa bias signifikan |

D. THRESHOLD & TINDAKAN (PERSENTASE MISSING DATA)
================================================

Batas maksimal per kolom/metrik:

1. **0% - 5% (Safe Zone)**:
   - Tindakan: Imputasi otomatis (FFill atau Linear Interpolation).
   - Labeling: "Complete (Automated Imputation)".
2. **5% - 15% (Caution Zone)**:
   - Tindakan: Gunakan Multiple Imputation atau Regression.
   - Labeling: "Partial (Quality Assured)".
   - Alert: Berikan informasi kepada user tentang imputasi.
3. **15% - 30% (Risky Zone)**:
   - Tindakan: HANYA boleh dianalisis jika tren masih terlihat jelas.
   - Labeling: "Low Confidence Data".
   - Dokumentasi: Wajib mencantumkan alasan penggunaan data ini di log audit.
4. **> 30% (Critical Zone)**:
   - Tindakan: DILARANG untuk analisis agregat (Insight/Forecast).
   - Rekomendasi: Data dibuang atau ditandai sebagai "Insufficient Data".

E. DOKUMENTASI & LOG AUDIT
==========================

Setiap keputusan penanganan missing data WAJIB dicatat dalam `missing_data_audit_log`:
- `raw_id_range`: Rentang ID data mentah yang terdampak.
- `missing_type`: Klasifikasi (MCAR/MAR/MNAR).
- `strategy_used`: Algoritma yang dipilih.
- `impact_score`: Perubahan RMSE sebelum dan sesudah imputasi.
- `authorized_by`: Modul/User yang melakukan eksekusi.

F. VALIDASI HASIL IMPUTASI
==========================

Gunakan metrik berikut untuk mengevaluasi kualitas imputasi:
- **RMSE (Root Mean Square Error)**: Mengukur deviasi terhadap data valid terdekat.
- **MAE (Mean Absolute Error)**: Mengukur rata-rata kesalahan absolut.
- **Cohen’s d**: Memastikan distribusi data (mean/variance) tidak bergeser secara signifikan setelah imputasi.

G. UNIT TESTING & REVIEW
========================

1. **Automated Testing**:
   - WAJIB menyertakan mock data dengan berbagai pola missing data (Random, Cluster, Periodic).
   - Pastikan fungsi penanganan mengembalikan status error jika melewati threshold.
2. **Review Berkala**:
   - Setiap kuartal (3 bulan), tim analis wajib meninjau akurasi interpolasi terhadap data asli yang masuk kemudian.
   - Sesuaikan threshold jika RMSE rata-rata melampaui standar kualitas (misal: RMSE > 0.1).

END OF DOCUMENT
