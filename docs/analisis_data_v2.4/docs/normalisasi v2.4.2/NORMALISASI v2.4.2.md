========================================================
NORMALIZATION FLOW RULE V2.4.2 (SNAKE_CASE VERSION)
========================================================

TUJUAN
Dokumen ini mendefinisikan aturan pipeline normalisasi data
untuk sistem network analytics backend dengan standar
snake_case pada seluruh field, metadata, dan struktur
internal pipeline.

Versi 2.4.2 memperkenalkan:

- timeline safety guard
- metadata gap payload limit
- improved resource metrics
- deterministic timeline builder
- safe numeric handling
- missing data handler integration

========================================================
NAMING CONVENTION
========================================================

Semua field backend, database, dan pipeline internal
WAJIB menggunakan snake_case.

Contoh field:

raw_timestamp
source_id
source_table
source_granularity
accuracy_pct
is_gap
imputation_strategy
memory_usage_pct
cpu_usage_pct

API response dapat menggunakan snake_case secara langsung
atau dikonversi ke camelCase oleh serializer frontend.

========================================================
SOURCE OF TRUTH TABLE
========================================================

Pipeline normalization menggunakan tabel berikut sebagai
single source of truth.

board_speed_stats
board_resource_stats
board_client_stats
board_interface_usage
board_pppoe_usage
hotspot_usage_raw

Semua tabel minimal harus memiliki field berikut:

timestamp
board_id atau source_id
metric values

========================================================
STAGE 0 — NORMALIZATION
========================================================

Stage 0 bertanggung jawab melakukan normalisasi data mentah.

Stage ini TIDAK BOLEH:

- melakukan agregasi
- menghapus data mentah
- mengubah nilai metric asli

Stage ini HANYA boleh:

- normalisasi format timestamp
- normalisasi field name
- memastikan numeric safety
- membangun timeline
- menandai data gap

FIELD WAJIB:

timestamp
raw_timestamp
source_id
source_table
accuracy_pct

Contoh output:

{
  "timestamp": "2026-03-07T10:00:00Z",
  "raw_timestamp": "2026-03-07T10:00:00Z",
  "source_id": "router_01",
  "source_table": "board_speed_stats",
  "accuracy_pct": 100
}

========================================================
TIMELINE GENERATION RULE
========================================================

Timeline generator harus membangun titik waktu secara
deterministic berdasarkan granularity query.

Granularity yang diperbolehkan:

second
minute
hour
day

Untuk mencegah memory explosion diterapkan guard berikut:

MAX_TIMELINE_POINTS = 100000

Jika timeline melebihi batas:

1. query harus ditolak
atau
2. granularity otomatis diperbesar.

Jika start dan end berada pada bucket yang sama,
timeline tetap harus menghasilkan minimal satu titik.

========================================================
GAP PRESERVATION RULE
========================================================

Data gap tidak boleh dihapus.

Jika timestamp tidak memiliki data maka sistem harus
menghasilkan record dengan flag:

is_gap = true

Contoh:

{
  "timestamp": "2026-03-07T10:05:00Z",
  "rx_bps": null,
  "tx_bps": null,
  "is_gap": true,
  "accuracy_pct": 0
}

========================================================
MISSING DATA HANDLING
========================================================

Pipeline harus menggunakan missing_data_handler
untuk menangani missing data.

Flow:

detect_missing_data()
select_strategy()
handle_missing_data()

Strategi imputasi yang tersedia:

linear_interpolation
forward_fill
backward_fill
zero_fill

Jika data diimputasi maka:

accuracy_pct = 50

Metadata harus menyertakan:

imputation_strategy
is_gap

Contoh:

{
  "timestamp": "2026-03-07T10:10:00Z",
  "rx_bps": 1200000,
  "tx_bps": 800000,
  "is_gap": false,
  "imputation_strategy": "linear_interpolation",
  "accuracy_pct": 50
}

========================================================
NUMERIC SAFETY RULE
========================================================

Semua metric numerik harus menggunakan tipe float64.

Nilai berikut harus ditangani dengan aman:

null
nan
infinity
invalid numeric string

Gunakan fungsi safe_float() untuk memastikan nilai
yang masuk ke pipeline valid.

========================================================
TRACEABILITY RULE
========================================================

Setiap data point harus memiliki metadata untuk audit
dan debugging pipeline.

Metadata minimal:

raw_timestamp
source_id
source_table
accuracy_pct

Contoh:

{
  "timestamp": "2026-03-07T10:00:00Z",
  "rx_bps": 1000000,
  "tx_bps": 800000,
  "metadata": {
      "raw_timestamp": "2026-03-07T10:00:00Z",
      "source_id": "router_01",
      "source_table": "board_speed_stats",
      "accuracy_pct": 100
  }
}

========================================================
METADATA PAYLOAD LIMIT
========================================================

Metadata terkait missing gaps harus dibatasi untuk
menghindari payload API yang terlalu besar.

missing_gaps metadata dibatasi:

MAX_GAP_METADATA = 100

Contoh:

metadata["missing_gaps"] = gaps[:100]

========================================================
RESOURCE METRICS NORMALIZATION
========================================================

Pipeline harus menormalisasi resource metrics berikut:

cpu_usage_pct
memory_usage_pct
temperature_c
uptime_seconds

Perhitungan memory usage:

memory_usage_pct =
((total_memory - free_memory) / total_memory) * 100

========================================================
IDEMPOTENT RULE
========================================================

Normalization harus bersifat idempotent.

Jika input identik maka output harus identik.

Hal ini penting untuk:

data reproducibility
analytics reliability
debugging pipeline

========================================================
PAYLOAD LIMIT RULE
========================================================

Response API tidak boleh menghasilkan payload terlalu besar.

Batas rekomendasi:

max_payload_size = 5 MB

Jika dataset besar maka sistem harus menggunakan:

pagination
time windowing
granularity adjustment

========================================================
PIPELINE FLOW OVERVIEW
========================================================

Stage 0  normalization
Stage 1  scope_filter
Stage 2  trend_aggregation
Stage 3  correlation_analysis
Stage 4  habit_detection
Stage 5  anomaly_validation
Stage 6  capacity_forecast
Stage 7  insight_generation

Stage 0 bertanggung jawab menjaga integritas
data mentah.

========================================================
VERSI HISTORY
========================================================

v2.4.2
- timeline safety guard
- deterministic timeline builder
- metadata gap payload limit
- improved memory usage calculation
- safe numeric handling

========================================================
END OF DOCUMENT
========================================================