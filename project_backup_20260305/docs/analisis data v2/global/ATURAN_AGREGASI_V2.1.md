ATURAN_AGREGASI_V2.1
(VERSION V2.1 – TIME AGGREGATION RULES)

Version : 2.1 (High-Granularity Focus)
Status  : Authoritative Specification
Scope   : Frontend + Backend + Database


============================================================
1. CORE PRINCIPLES (RAW FIDELITY)
============================================================

1.1 Raw Data as Primary Source (Single Source of Truth)
- Semua bucket waktu dihasilkan oleh Backend dari sumber data mentah (Raw Logs).
- DILARANG menggunakan intermediate aggregation tables yang mereduksi detail data kecuali esensial untuk performa query kritis.
- Agregasi dilakukan secara "on-the-fly" saat request untuk menjamin data terbaru dan paling akurat.

1.2 Deep Traceability
- Setiap bucket data wajib menyertakan metadata asal: `raw_timestamp`, `source_id`, dan `granularity_info`.
- Transformasi data tidak boleh menghapus informasi waktu asli dari sumber (Preserve Raw Precision).

1.3 Deterministic & Atomic
- Parameter input yang sama HARUS menghasilkan bucket yang sama secara konsisten.
- Semua metric (Traffic + Resource) dikembalikan dalam satu response tunggal untuk sinkronisasi waktu yang sempurna.
- Tidak diperbolehkan query terpisah per metric yang dapat menyebabkan "time-drift".


============================================================
2. AGGREGATION INPUT CONTRACT
============================================================

Endpoint:
GET /analysis/{board_id}/aggregate-all/

Required Parameters:
- start_time  : ISO-8601 UTC
- end_time    : ISO-8601 UTC
- granularity : raw | 1m | 5m | 15m | hour | day | month | year | auto
  * 'raw' mengembalikan data asli tanpa agregasi waktu.
- agg         : sum|avg|min|max|count

Rules:
- start_time ≤ end_time
- Jika granularity = 'raw', parameter 'agg' diabaikan (mengambil data titik per titik).
- Range maksimal untuk 'raw' query dibatasi (misal: max 1 jam) untuk mencegah overload.


============================================================
3. AGGREGATION OUTPUT CONTRACT (STRICT FIDELITY)
============================================================

Response Format:

[
  {
    "period": "ISO-8601 UTC (Bucket Start)",
    "download_mbps": number|null,
    "upload_mbps": number|null,
    "download_bytes": number|null,
    "upload_bytes": number|null,
    "cpu_load": number|null,
    "free_memory": number|null,
    "total_memory": number|null,
    "metadata": {
      "raw_timestamp": "ISO-8601 UTC (Actual Event Time)",
      "source_granularity": "String (e.g., '1s', '30s')",
      "source_id": "String (Raw Log ID)",
      "accuracy_pct": Number (0-100)
    }
  }
]

Rules:
- Semua metric wajib ada di setiap bucket.
- Jika tidak ada data → null.
- Metadata wajib diisi untuk setiap titik data guna mendukung traceability Stage 7.


============================================================
4. GRANULARITY RULE (AUTO - HIGH RESOLUTION)
============================================================

Jika granularity = auto, Backend menerapkan resolusi tertinggi yang memungkinkan:

Range ≤ 6 jam         → raw / 1m
Range ≤ 2 hari        → 5m / 15m
Range ≤ 30 hari       → hour
Range ≤ 365 hari      → day
Range > 365 hari      → month

Rule ini wajib konsisten antara backend dan frontend untuk menjamin integritas visual.


============================================================
5. PIPELINE PROCESSING RULES (RAW TO INSIGHT)
============================================================

5.1 No Downsampling in Early Stages
- Stage 0 (Normalization) dan Stage 1 (Audit) WAJIB menggunakan raw data.
- Downsampling hanya diperbolehkan di Stage 2 (Aggregation) untuk kebutuhan visualisasi.
