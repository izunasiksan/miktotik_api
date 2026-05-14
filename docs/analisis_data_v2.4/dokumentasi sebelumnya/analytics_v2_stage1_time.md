# Analytics V2 — Stage 1 (Time-based Separation)

## Ringkas
- Memisahkan entitas berdasarkan basis waktu dengan navigasi intuitif.
- Mendukung periode: daily, monthly, yearly, dan custom range.
- Komponen baru: Timeline, Calendar Picker, Auto-refresh, Prev/Next window, Entity Preview.
- Terintegrasi dengan API V2 tanpa memengaruhi V1.

## Komponen
- Period & Limit: Pilih jenis period (daily/monthly/yearly/custom) dan banyaknya window untuk scope cepat.
- Calendar Picker: Dua input tanggal untuk custom range (start–end).
- Granularity: auto/hour/day/month/year, disarankan menyesuaikan period.
- Timeline: Visual slot waktu; klik slot untuk memilih sub-range.
- Auto-refresh: Hidupkan pembaruan data real-time (15s/30s/60s) saat Time Lock aktif.
- Prev/Next Window: Geser jendela waktu saat ini ke arah sebelumnya/berikutnya.
- Entity Preview: Panel ringkas saat hover chip entity (nama dan rentang aktif).
- Combine: total/per_entity/both untuk mode multi-entity.

## Navigasi Waktu
1. Pilih period (daily/monthly/yearly) atau gunakan custom range melalui calendar.
2. Gunakan Quick Range (Today/Yesterday/Last 7/Last 30/This Month/Last Month/YTD) untuk preset cepat.
3. Klik slot pada Timeline untuk memilih sub-range di dalam rentang aktif.
4. Gunakan Prev/Next untuk menggeser jendela waktu secara utuh.
5. Aktifkan Auto-refresh untuk pembaruan real-time saat Time Lock aktif.

## Operasi Berbasis Waktu
- Validasi & Apply akan memeriksa parameter waktu dan memastikan granularity sesuai.
- Time Lock mengunci rentang agar pipeline downstream konsisten.
- Auto-refresh akan memicu reload data periodik jika rentang terkunci.

## Entity Preview
- Arahkan penunjuk ke chip entity untuk melihat informasi ringkas:
  - Nama entity
  - Rentang waktu aktif (start → end)
  - Petunjuk navigasi (timeline, Prev/Next)

## Integrasi API
- Aggregasi V2:
  - GET /api/v2/analysis/{board_id}/aggregate-all/
  - Parameter: start_time, end_time, granularity, agg
  - Multi-entity interface[]: combine=total|per_entity|both
- Listing pendukung:
  - Site groups: GET /api/v2/analysis/boards/site-groups
  - Interfaces: GET /api/v2/analysis/{board_id}/interfaces
  - PPPoE users: GET /api/v2/analysis/{board_id}/users/pppoe
  - Hotspot users: GET /api/v2/analysis/{board_id}/users/hotspot

## Edge Case
- end_time ≤ start_time: ditolak saat validasi.
- Granularity tidak cocok dengan period: disesuaikan otomatis.
- Slot timeline kosong: tampilkan informasi kebutuhan periode.

## Tutorial Singkat
1. Pilih period atau set custom range melalui calendar.
2. Sesuaikan granularity sesuai period.
3. Tambahkan entity (chips) dan pilih combine bila perlu.
4. Gunakan Timeline untuk memilih sub-range.
5. Tekan Validate & Apply lalu Reload Data.
6. Aktifkan Auto-refresh bila ingin pembaruan real-time.
7. Arahkan ke chip entity untuk melihat pratinjau.

## Catatan
- Semua agregasi berat dilakukan di backend.
- Fitur V2 sepenuhnya terisolasi; V1 tidak berubah.
