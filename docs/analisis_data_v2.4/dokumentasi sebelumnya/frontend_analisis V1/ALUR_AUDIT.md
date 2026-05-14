# Alur Kerja Audit & Validasi Data (audit.jsx)

Dokumen ini menjelaskan alur kerja pemrosesan data pada modul Audit & Validasi Data, mulai dari penerimaan data mentah hingga visualisasi hasil audit.

## 1. Arsitektur Data
Proses audit menggunakan pola **Separation of Concerns** (Pemisahan Tanggung Jawab):
- **Container (`analysis_audit.jsx`)**: Mengatur tata letak (layout) dan mendistribusikan data ke sub-komponen.
- **Logic Hook (`useAnalysisAuditLogic.js`)**: Mesin utama yang memproses audit dan agregasi data.
- **Sub-Components**: Menampilkan hasil akhir audit dalam bentuk kartu, tabel, dan pivot.

## 2. Tahapan Alur Kerja (Workflow)

### Tahap 1: Inisialisasi Data
- Data mentah (`reportData`) diterima dari backend melalui props.
- Jika data kosong atau sedang loading, komponen menampilkan state loading atau placeholder.

### Tahap 2: Standardisasi Data
- Sebelum dihitung, data diproses melalui `standardizeTableData` di [analysis_utils.jsx](file:///e:/mikrotik_api/frontend/src/pages/analysis/analysis_utils.jsx).
- Memastikan field-field penting tersedia dan memiliki format yang seragam.

### Tahap 3: Mesin Audit (Audit Engine)
`useAnalysisAuditLogic.js` menjalankan 3 audit utama secara paralel:
1.  **Audit Kualitas Data**: Memeriksa nilai `null`, `NaN`, atau nilai yang berada di luar batas wajar (out of bounds).
2.  **Audit Integritas Timeline**: Mendeteksi celah (gap) waktu pada data time-series.
3.  **Validasi Metodologi**: Menentukan apakah data cukup berkualitas untuk menghasilkan insight (berdasarkan korelasi, anomali, dan kecukupan sampel).

### Tahap 4: Agregasi & Derivasi Statistik
- **Pivot Aggregator**: Menghitung rata-rata, total, dan nilai puncak (peak) untuk Traffic, Resource, dan User usage.
- **Stats Derivator**: Menghitung ringkasan real-time seperti Avg CPU, Mem, dan Interface teraktif.
- **Helper Tables**: Mengambil 10 sampel data terbaru untuk verifikasi manual.

### Tahap 5: Visualisasi & Feedback
- Hasil audit ditampilkan dalam kartu ringkasan di bagian atas.
- Tabel temuan (Findings) menampilkan baris data yang bermasalah secara spesifik.
- Tabel pivot memberikan ringkasan agregat untuk validasi cepat.

## 3. Diagram Alur (Logika)
`reportData` → `standardizeTableData` → `Audit Logic (Quality/Integrity/Methodology)` → `Aggregated Stats` → `Render UI`
