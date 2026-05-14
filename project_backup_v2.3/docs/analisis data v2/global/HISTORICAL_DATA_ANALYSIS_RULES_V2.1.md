HISTORICAL_DATA_ANALYSIS_RULES V2.1
(VERSION V2.1 – RAW DATA PRIMARY & DATA INTEGRITY)

============================================================
A. CORE PRINCIPLE (V2.1)
============================================================

1. **Raw Data Primary Source**: Analisis data historis WAJIB menggunakan data mentah (Raw Data) sebagai sumber utama.
2. **SSOT (Single Source of Truth)**: Gunakan tabel RAW langsung (board_speed_stats, board_usage_stats, dst.).
3. **No Redundant Aggregation**: Dilarang menggunakan materialized view atau intermediate table yang mereduksi fidelitas data.
4. **On-the-Fly Aggregation**: Agregasi dilakukan saat request untuk menjamin resolusi tertinggi.

============================================================
B. DATA INTEGRITY RULES (V2.1)
============================================================

1. **Missing Data SOP**: Setiap data historis wajib melalui filter deteksi & imputasi sesuai [aturan_penanganan_missing_data_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_penanganan_missing_data_V2.1.md).
2. **Time Conversion Accuracy**: Konversi unit waktu wajib mencantumkan metadata akurasi sesuai [aturan_konversi_waktu_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_konversi_waktu_V2.1.md).
3. **Deep Traceability**: Setiap titik data wajib memiliki `raw_timestamp`, `source_id`, dan `accuracy_pct`.

============================================================
C. ANALYSIS WORKFLOW
============================================================

1. **Read-Only Context**: Analisis hanya membaca output dari Stage 1 (Context Lock).
2. **No Re-filter**: Dilarang memfilter ulang periode atau entitas setelah Stage 1.
3. **Health Score Weighting**:
   - Stability: 30%
   - Utilization: 30%
   - Anomaly: 40%
   (Referensi: [revisi_logika_raw_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/revisi_logika_raw_V2.1.md))

============================================================
D. PERFORMANCE & SCALABILITY
============================================================

1. **Indexed Query**: Semua query historis wajib menggunakan index pada `board_id` dan `raw_timestamp`.
2. **Chunking**: Query data 'raw' dalam rentang waktu lama wajib dilakukan secara bertahap (chunking) untuk mencegah memori penuh.
3. **Frontend Role**: Frontend dilarang melakukan kalkulasi berat; hanya bertanggung jawab atas derivasi ringan dan visualisasi.

============================================================
E. VISUALIZATION RULES
============================================================

1. **Gap Representation**: Data kosong (null) wajib direpresentasikan sebagai celah (gap) pada grafik, bukan garis nol (0).
2. **Accuracy Labels**: Tampilkan indikator "Low Accuracy" jika data hasil konversi tidak mencapai durasi threshold.

END OF DOCUMENT
