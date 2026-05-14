⚠️ Potensi Bug yang Masih Ada
1. _build_timeline() bisa menghasilkan timeline kosong

Kode:

cur = _truncate(start, granularity)

while cur < end and guard < MAX_TIMELINE_POINTS:

Jika:

start_time = 2025-01-01 12:10
granularity = day

_truncate() akan menghasilkan:

2025-01-01 00:00

Jika:

end_time = 2025-01-01 01:00

maka:

cur < end → False

sehingga timeline kosong.

Solusi

Tambahkan fallback:

if not pts:
    pts.append(_truncate(start, granularity))
⚠️ 2. _step_for(year) masih tidak akurat

Kode:

if granularity == "year":
    return timedelta(days=365)

Masalah:

Leap year = 366

Walaupun kamu handle year di _build_timeline, _step_for masih misleading.

Lebih aman:

if granularity == "year":
    return timedelta(days=365)  # fallback only

atau jangan gunakan step untuk year sama sekali.

⚠️ 3. Potensi crash jika MissingDataHandler return NaN

Bagian ini:

rx = float(rx) if rx is not None else 0.0

Jika handler mengembalikan:

NaN
inf
-inf

maka hasil tetap invalid.

Solusi aman:

def safe_float(x):
    try:
        v = float(x)
        if math.isfinite(v):
            return v
    except:
        pass
    return 0.0
⚠️ 4. accuracy_pct bisa >100

Di bagian:

avg_acc = (acc_dl + acc_ul) / 2.0

Jika backend upstream memberi:

accuracy_pct = 120

hasil bisa:

>100

Solusi:

avg_acc = max(0.0, min(avg_acc, 100.0))
⚠️ 5. missingGaps hanya dari traffic

Di return metadata:

"missingGaps": [r["timestamp"] for r in traffic if r.get("isGap")]

Padahal kamu punya:

traffic
resource
users

Sehingga gap dari resource/users tidak terlihat.

Solusi:

missing_gaps = {
   "traffic": [...],
   "resource": [...],
   "users": [...]
}
⚠️ 6. Query rowCounts bisa berat pada database besar

Bagian ini:

stmt = select(func.count()).select_from(model)

Jika tabel:

> 10 juta rows

akan mahal.

Solusi yang lebih scalable:

pg_class.reltuples

atau materialized stats.

⚠️ 7. imputationStrategy hanya RX

Di traffic:

"imputationStrategy": rx_strategy.value

Padahal:

rx_strategy
tx_strategy

Jika berbeda strategy → metadata salah.

Solusi:

imputationStrategyRx
imputationStrategyTx
⚠️ 8. _parse_iso_datetime() bisa double parse

Kode:

datetime.fromisoformat(s.replace("Z", "+00:00"))

Jika string:

2025-01-01T10:00:00+00:00

maka replace tidak masalah.

Namun jika:

2025-01-01T10:00:00Z

hasil:

+00:00

benar, tapi double fallback parse juga ada.

Tidak fatal tapi redundant.

⚠️ 9. combined_valid menggunakan max

Kode:

combined_valid = max(
    traffic_meta.get("validCount", 0),
    resource_meta.get("validCount", 0),
    users_meta.get("validCount", 0)
)

Padahal logically harusnya:

sum

karena valid data adalah total dataset.

⚠️ 10. users tidak memiliki displayDate

Traffic dan resource punya:

"displayDate"

users tidak.

Ini bisa menyebabkan frontend chart mismatch.