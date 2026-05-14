1. POTENSI BUG: SQL Injection pada temp_table

Bagian ini:

await db.execute(text(f"DROP TABLE IF EXISTS {temp_table}"))

temp_table berasal dari:

analysis_service.create_scoped_dataset()

Jika suatu saat nama table tidak di-sanitize, maka bisa terjadi SQL injection.

Contoh worst case:

temp_table = "temp_table; DROP TABLE users;"
Solusi aman

Gunakan identifier quoting:

from sqlalchemy.sql import text

await db.execute(
    text("DROP TABLE IF EXISTS :tbl").bindparams(tbl=temp_table)
)

atau minimal whitelist:

temp_analysis_[uuid]
2. POTENSI MEMORY BLOAT pada Redis Cache

Cache key sekarang:

analysis_v21_{board_id}_{interface_name}_{start}_{end}_{granularity}

Jika user bebas memilih:

startTime
endTime
granularity
interface

Cache bisa explode menjadi ribuan key.

Contoh:

1 board
100 interface
10 range
3 granularity

= 3000 cache key

Redis memory akan cepat penuh.

Solusi umum

Batasi range caching.

Misalnya hanya cache:

hour <= 7 days
day <= 1 year
month <= 10 year
3. POTENSI BUG: datetime timezone ambiguity

Parameter API:

startTime
endTime

FastAPI akan parse menjadi datetime.

Tapi tidak ada enforcement timezone.

Jika frontend kirim:

2026-03-01T00:00

itu naive datetime.

Jika DB menyimpan UTC, maka:

range bisa offset
Solusi lebih aman

Tambahkan validator:

if start_time.tzinfo is None:
    start_time = start_time.replace(tzinfo=timezone.utc)

atau enforce ISO:

2026-03-01T00:00:00Z
4. POTENSI BUG: cache validation tidak strong

Bagian ini:

return AnalysisResponse.model_validate(json.loads(cached_res))

Masalah:

Jika schema berubah (misalnya V2.5), cache lama bisa menyebabkan error.

Saat ini:

except Exception → recalc

ini aman, tapi lebih baik cache versioning.

Solusi

Tambahkan prefix version.

v2_4_analysis_

atau

analysis_v21_v2_4_
5. POTENSI BUG: parallel query seharusnya async gather

Di sini:

for m in metrics:
    rows = await analysis_service.time_aggregate(...)

Query berjalan sequential.

Padahal semua query independen.

Jika setiap query 100ms:

5 query → 500ms

Padahal bisa:

100ms parallel
Solusi

Gunakan:

import asyncio

tasks = [
    analysis_service.time_aggregate(...metric=m)
    for m in metrics
]

results = await asyncio.gather(*tasks)

Ini bisa membuat endpoint 5x lebih cepat.

6. POTENSI BUG: duplicate logic pppoe/hotspot

Endpoint ini:

top_pppoe_v2
top_hotspot_v2

logic hampir identik.

Jika suatu saat format berubah:

risk inconsistent behaviour
Solusi

Buat helper:

def format_top_usage(rows, unit="bytes"):
7. POTENSI BUG: aggregate_all merge memory overhead

Bagian ini:

keys = sorted(set(...))

Jika range:

1 year hourly

= 8760 rows.

Jika multi metrics + multi entity:

memory overhead bisa besar.

Biasanya analytics API menggunakan:

streaming merge

atau

SQL join aggregate