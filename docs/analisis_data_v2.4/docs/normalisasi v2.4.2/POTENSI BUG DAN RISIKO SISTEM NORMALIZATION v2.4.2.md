POTENSI BUG DAN RISIKO SISTEM NORMALIZATION v2.4.2

1. KEY MISMATCH PADA TIMESTAMP ISO
Mapping menggunakan:

key = t.isoformat()

Namun data dari database bisa memiliki perbedaan format:
contoh:

2026-03-07T10:00:00
vs
2026-03-07T10:00:00.000000

Ini bisa menyebabkan bucket dianggap gap.

Solusi:
normalisasi format timestamp secara konsisten.

------------------------------------------------

2. TIMELINE BISA SANGAT BESAR
Walaupun ada guard:

MAX_TIMELINE_POINTS = 100000

Namun query dengan:

granularity = hour
range = 10 tahun

akan menghasilkan:

87600 data point

ini masih cukup berat untuk API.

------------------------------------------------

3. MEMORY PAYLOAD BESAR
Response API mengirim:

traffic[]
resource[]
users[]

Jika timeline besar, payload JSON bisa sangat besar.

Solusi:
tambahkan limit atau pagination.

------------------------------------------------

4. RAW TIMESTAMP TIDAK SELALU TERISI
Pada mode non-gap:

rawTimestamp = None

Ini membuat metadata tidak konsisten.

------------------------------------------------

5. IMPUTATION STRATEGY BISA CONFUSING
Saat rx_strategy != tx_strategy:

imputationStrategy = "mixed"

Namun user tidak langsung tahu strategi apa yang dipakai.

Walaupun ada:

imputationStrategyRx
imputationStrategyTx

tetapi frontend harus memprosesnya.

------------------------------------------------

6. COUNT QUERY MASIH MAHAL
Bagian ini:

select(func.count()).select_from(model)

untuk board tertentu masih bisa mahal jika
tabel sangat besar.

------------------------------------------------

7. POTENSI CPU LOAD SAAT IMPUTATION
Jika timeline besar:

handle_missing_data()

akan memproses array besar.

Ini bisa meningkatkan latency.

------------------------------------------------

8. DUPLIKASI KODE NORMALIZATION
Tiga fungsi:

_normalize_traffic
_normalize_resource
_normalize_users

memiliki struktur hampir sama.

Ini meningkatkan maintenance cost.

------------------------------------------------

9. POTENSI FLOAT OVERFLOW
Jika data upstream rusak:

value = 1e309

walaupun _safe_float digunakan,
masih perlu validasi tambahan pada input pipeline.

------------------------------------------------

10. METADATA ACCURACY GLOBAL BISA BIAS
accuracyPct global dihitung:

average dari semua point

Ini bisa bias jika dataset kecil tapi banyak gap.

------------------------------------------------

KESIMPULAN

Sistem sudah stabil untuk production,
namun perlu perhatian pada:

- payload size
- timeline explosion
- timestamp normalization
- query performance