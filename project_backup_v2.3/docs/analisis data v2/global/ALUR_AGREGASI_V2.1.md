ALUR_AGREGASI_V2.1
(VERSION V2.1 – RAW DATA FIDELITY & AGGREGATION FLOW)

Version: 2.1 (High-Granularity Focus)
Scope: Frontend + Backend + Database
Status: Authoritative Reference


============================================================
1. PRINCIPLES (RAW FIDELITY)
============================================================

1.1 Raw Data as Primary Source
- Sumber data utama WAJIB berasal dari tabel log mentah (Raw Logs) atau tabel dengan fidelitas tertinggi.
- DILARANG menggunakan materialized view atau intermediate aggregation table yang mereduksi detail data kecuali esensial untuk performa query kritis.
- Agregasi dilakukan secara "on-the-fly" saat request untuk menjamin data terbaru dan paling akurat.

1.2 Deep Traceability
- Setiap titik data (bucket) wajib membawa metadata asal: `raw_timestamp`, `source_id`, dan `granularity_info`.
- Transformasi data tidak boleh menghapus informasi waktu asli dari sumber (Preserve Raw Precision).

1.3 Deterministic Behavior
- Input yang sama (start_time, end_time, granularity) HARUS menghasilkan bucket yang identik secara deterministik.
- Tidak boleh ada pembulatan prematur yang merusak tren mikro.

1.4 Atomic Processing
- Seluruh metrik diproses dalam satu pipeline eksekusi tunggal untuk menjaga sinkronisasi waktu antar metrik.


============================================================
2. REQUEST CONTRACT (MANDATORY)
============================================================

Endpoint:
GET /analysis/{board_id}/aggregate-all/

Required Query Parameters:
- start_time  (ISO-8601, UTC)
- end_time    (ISO-8601, UTC)
- granularity (raw | 5m | 15m | hour | day | month | year)
  * 'raw' mengembalikan data asli tanpa agregasi waktu.
- agg         (sum|avg|min|max|count)

Example:
GET /analysis/UUID/aggregate-all/
    ?start_time=2025-01-01T00:00:00Z
    &end_time=2025-01-01T01:00:00Z
    &granularity=raw
    &agg=avg


============================================================
3. RESPONSE STRUCTURE (STRICT FIDELITY)
============================================================

[
  {
    "period": "ISO-8601 UTC (Bucket Start)",
    "download_mbps": 12.34567,
    "upload_mbps": 4.21234,
    "cpu_load": 23.5,
    "free_memory": 523423423,
    "total_memory": 1073741824,
    "metadata": {
      "raw_timestamp": "ISO-8601 UTC (Actual Event Time)",
      "source_granularity": "String (e.g., '1s', '30s')",
      "source_id": "String (Raw Log ID)",
      "accuracy_pct": Number (0-100)
    }
  }
]

Rules:
- Presisi Angka: Simpan hingga 5 digit desimal untuk menghindari error akumulasi.
- Bucket Tetap Dibuat: Walau data null, bucket tetap ada untuk menjaga kontinuitas timeline.
- Metadata: WAJIB ada di setiap record untuk memungkinkan drill-down ke raw data.


============================================================
4. GRANULARITY RULE (DETERMINISTIC)
============================================================

Jika granularity = auto:
- Range <= 6 jam         → raw / 1m (jika tersedia)
- Range <= 2 hari        → 5m / 15m
- Range <= 30 hari       → hour
- Range <= 365 hari      → day
- Range > 365 hari       → month

Rule ini menjamin user mendapatkan resolusi tertinggi yang mungkin ditangani oleh UI tanpa mengorbankan detail mikro.


============================================================
5. PIPELINE TRANSFORMASI (RAW TO INSIGHT)
============================================================

1. DATA ACQUISITION: Query langsung ke tabel `raw_traffic_log` dan `raw_resource_log`.
2. FILTERING: Terapkan start_time, end_time, dan board_id pada level raw index.
3. ON-THE-FLY AGGREGATION: Lakukan agregasi (avg/max/dll) hanya jika granularity > raw.
4. METADATA TAGGING: Sisipkan informasi sumber ke setiap bucket hasil agregasi.
