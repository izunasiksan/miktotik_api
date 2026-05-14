============================================================
HISTORICAL DATA ANALYSIS FLOW - V2.1
Last Modified: 2026-03-05
Status: Finalized & Implemented
Deterministic • Atomic • Raw Data Primary Focus
============================================================

Version : 2.1 (Global Data Integrity)
Status  : Authoritative Specification
Scope   : Historical Analysis (Trend, Insight, KPI)
Mode    : Production-Grade Deterministic


============================================================
1. CORE PRINCIPLES (V2.1)
============================================================

1.1 Raw Data Primary Source
- Semua bucket waktu historis dihasilkan oleh Backend langsung dari Raw Logs.
- Agregasi dilakukan secara "on-the-fly" untuk menjamin resolusi data tertinggi.
- Dilarang menggunakan intermediate aggregation table yang mereduksi fidelitas.

1.2 Atomic & Unit-Aligned
- Semua metric (Traffic, Resource, CPU) dikembalikan dalam satu response sinkron.
- Unit diselaraskan secara otomatis sesuai [aturan_konversi_waktu_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_konversi_waktu_V2.1.md).

1.3 Deterministic Imputation
- Missing data ditangani secara otomatis di level backend sebelum dikirim ke frontend.
- SOP Imputasi mematuhi [aturan_penanganan_missing_data_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_penanganan_missing_data_V2.1.md).

1.4 Full Traceability
- Setiap record wajib menyertakan metadata `raw_timestamp`, `source_id`, dan `accuracy_pct`.


============================================================
2. END-TO-END PIPELINE (V2.1)
============================================================

DATABASE (Raw Table SSOT)
    ↓
Backend Normalization (Stage 0: Missing Data + Unit Conversion)
    ↓
Backend Filtering (Stage 1: Context Lock)
    ↓
Atomic Historical Dataset (Stage 2-6: Scoped & Imputed)
    ↓
Frontend Presentation (Stage 7: Insight with Accuracy Label)


============================================================
3. BACKEND AGGREGATION CONTRACT
============================================================

Endpoint:
GET /analysis/{board_id}/aggregate-all/

Required Parameters:
- start_time  (ISO-8601 UTC)
- end_time    (ISO-8601 UTC)
- granularity (raw | 1m | 5m | 15m | hour | day | month | auto)
- agg         (sum|avg|min|max|count)

Rules:
- start_time ≤ end_time.
- Granularity 'raw' mengembalikan data asli titik-per-titik.
- Semua metric dihitung dalam satu query terintegrasi.


============================================================
4. RESPONSE STRUCTURE (STRICT V2.1)
============================================================

[
  {
    "period": "ISO-8601 UTC (Bucket Start)",
    "download_mbps": number|null,
    "upload_mbps": number|null,
    "cpu_load": number|null,
    "free_memory": number|null,
    "metadata": {
      "raw_timestamp": "ISO-8601 UTC",
      "source_id": "string",
      "accuracy_pct": number (0-100)
    }
  }
]

Rules:
- Metadata `accuracy_pct` wajib disertakan jika terjadi konversi unit waktu.


============================================================
5. GRANULARITY RULE (AUTO - HIGH RESOLUTION)
============================================================
Range ≤ 6 jam         → raw / 1m
Range ≤ 2 hari        → 5m / 15m
Range ≤ 30 hari       → hour
Range ≤ 365 hari      → day
Range > 365 hari      → month

END OF DOCUMENT
