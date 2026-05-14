UNIT NORMALIZATION & VALIDATION LAYER
(Tambahan Pilihan Satuan untuk Setiap Atribut)

TUJUAN:
Memberikan opsi satuan pada setiap atribut numerik agar:

Bisa dinormalisasi

Bisa divalidasi konsistensinya

Tidak terjadi ambiguity antar tabel (Mbps vs Bytes)

A. SPEED ATTRIBUTES (Bandwidth)

Atribut Terkait:

download_mbps

upload_mbps

avg_download

max_download

avg_upload

max_upload

Satuan Default Database:

Mbps

Pilihan Satuan Tambahan:

Kbps

Mbps

Gbps

Standarisasi Internal (disarankan):

Simpan dalam Mbps

Tampilkan sesuai pilihan user

Rumus Konversi:

1 Mbps = 1000 Kbps

1 Gbps = 1000 Mbps

Validasi:

Tidak boleh negatif

Maksimal sesuai kapasitas interface

B. BYTE-BASED ATTRIBUTES (Traffic / Storage)

Atribut Terkait:

total_download_bytes

total_upload_bytes

total_tx_bytes

total_rx_bytes

upload_bytes

download_bytes

daily_download

daily_upload

total_download

total_upload

free_memory

free_hdd

Satuan Default Database:

Bytes

Pilihan Satuan Tambahan:

Bytes

KB

MB

GB

TB

Standarisasi Internal (disarankan):

Simpan dalam Bytes

Tampilkan dalam satuan yang dipilih user

Rumus Konversi (Binary):

1 KB = 1024 Bytes

1 MB = 1024 KB

1 GB = 1024 MB

1 TB = 1024 GB

Validasi:

Tidak boleh negatif

Tidak boleh overflow BIGINT

C. PERCENTAGE ATTRIBUTES

Atribut Terkait:

cpu_load

avg_cpu_load

max_cpu_load

Satuan Default:

Percent (%)

Pilihan Satuan Tambahan:

Percent (%)

Decimal (0.0 – 1.0)

Standarisasi Internal:

Simpan dalam percent (0–100)

Jika decimal dipilih:
value_decimal = value_percent / 100

Validasi:

Range 0 – 100

D. USER COUNT ATTRIBUTES

Atribut Terkait:

total_hotspot

total_pppoe

total_active

avg_hotspot_users

max_hotspot_users

avg_pppoe_users

max_pppoe_users

frequency_days

Satuan:

Unit (count)

Pilihan Tambahan:

Tidak ada konversi satuan

Hanya integer validation

Validasi:

Tidak boleh negatif

Harus integer

E. TIME ATTRIBUTES

Atribut Terkait:

uptime

daily_uptime

total_uptime

Default:

INTERVAL (database)

BIGINT (detik) pada beberapa tabel

Pilihan Satuan Tambahan:

Seconds

Minutes

Hours

Days

Standarisasi Internal (disarankan):

Simpan dalam seconds

Konversi ke tampilan sesuai pilihan

Rumus:

1 minute = 60 seconds

1 hour = 3600 seconds

1 day = 86400 seconds

Validasi:

Tidak boleh negatif

F. NORMALIZATION MATRIX (Standar Internal Sistem)

SPEED → Mbps
BYTES → Bytes
PERCENT → Percent (0-100)
COUNT → Integer
TIME → Seconds

Semua input user dikonversi ke standar internal sebelum:

Disimpan

Dikunci

Diaggregasi

G. VALIDATION RULES GLOBAL

Unit Consistency Check

Tidak boleh mencampur Mbps dan Bytes dalam agregasi tanpa konversi

Range Validation

CPU: 0 – 100

Bandwidth: >= 0

Bytes: >= 0

Overflow Protection

BIGINT max value check

Lock After Selection

Setelah unit dipilih dan dikonversi,
tidak boleh diubah sebelum reset
FLOW DENGAN NORMALISASI

RAW DATABASE VALUE
↓
User pilih satuan
↓
Konversi ke satuan standar internal
↓
Validasi range & konsistensi
↓
Lock config
↓
Masuk ke analisis waktu