# Add Fitur Multi-Entity — Stage 1 Scope & Filter (V2)

Dokumen ini mendeskripsikan penambahan dukungan pemilihan multi-entity (≥2 entitas sekaligus) pada Stage 1 — Scope & Filter untuk Analisis V2, tanpa mengubah sistem V1.

## Tujuan
- Memungkinkan analisis lintas beberapa entitas sekaligus (contoh: beberapa interface uplink, beberapa user PPPoE/Hotspot, beberapa site_group) dalam satu periode yang sama.
- Memberi opsi penggabungan “total” dan/atau tampilan “per-entity” untuk eksplorasi yang fleksibel.

## Prinsip & Batasan
- V2 terisolasi, tidak mengubah route/kontrak/data V1.
- Semua agregasi berat (gabung, group by, union time series) dilakukan di backend.
- Tidak ada perubahan schema.sql; menggunakan tabel yang ada.
- UI hanya memilih dan mengirim daftar entitas; hasil agregasi datang dari backend.

## Mode Multi-Entity
1) Multi-select dalam satu entityType (disarankan untuk tahap awal)
   - interface: pilih beberapa port/label (mis. ether1 + ether10).
   - pppoe: pilih beberapa username PPPoE.
   - hotspot: pilih beberapa user hotspot.
   - site_group: pilih beberapa grup lokasi.

2) Lintas-entity (advanced, opsional tahap lanjut)
   - Kombinasi antar entityType (mis. beberapa interface + beberapa pppoe) dalam satu permintaan.
   - Membutuhkan kontrak yang lebih kaya untuk labeling dan normalisasi.

## Kontrak API V2 (Usulan)
Semua endpoint berada di namespace `/api/v2` dan tidak memengaruhi V1.

### A. Multi-Entity per Board
GET `/v2/analysis/{boardId}/aggregate-all/`

Parameter (query):
- `start_time`, `end_time`, `granularity`, `agg`
- entitas (opsi sesuai entityType yang dipilih):
  - `interface[]=ether1&interface[]=ether10`
  - `pppoe[]=userA&pppoe[]=userB`
  - `hotspot[]=user1&hotspot[]=user2`
  - `site_group[]=Umum&site_group[]=Gedung-A` (hanya jika backend mengizinkan lintas board per site_group, lihat poin B)
- opsi kontrol:
  - `combine=total|per_entity|both` (default: `total`)
  - `fill_gap=zero|null` (default: `zero`) — cara mengisi gap pada time series gabungan.

Response (contoh):
```json
{
  "meta": {
    "granularity": "day",
    "combine": "both",
    "mode": "server"
  },
  "total": [
    { "period": "2026-03-01T00:00:00Z", "value": 123.4, "unit": "Mbps" }
  ],
  "series_by_entity": [
    {
      "key": "interface:ether1",
      "label": "ether1",
      "series": [ { "period": "2026-03-01T00:00:00Z", "value": 70.2, "unit": "Mbps" } ]
    },
    {
      "key": "interface:ether10",
      "label": "ether10",
      "series": [ { "period": "2026-03-01T00:00:00Z", "value": 53.2, "unit": "Mbps" } ]
    }
  ]
}
```

### B. Multi-Entity lintas Board via Site Group
GET `/v2/analysis/site-groups/{site_group}/aggregate-all/`

- Mendukung `site_group` tunggal; untuk beberapa grup: `site_group[]=Umum&site_group[]=Gedung-A` (atau pakai POST body jika terlalu panjang).
- Semantik agregasi: union seluruh board dalam grup tersebut (backend melakukan GROUP BY sesuai granularity).

### C. POST Body (opsional untuk beban parameter besar)
POST `/v2/analysis/{boardId}/aggregate-all/`
```json
{
  "start_time": "2026-03-01T00:00:00Z",
  "end_time": "2026-03-07T23:59:59Z",
  "granularity": "day",
  "agg": "avg",
  "entity": {
    "interface": ["ether1","ether10"],
    "pppoe": [],
    "hotspot": []
  },
  "combine": "both",
  "fill_gap": "zero"
}
```

## Normalisasi & Pipeline
- Stage 0 (Normalisasi V2) tetap melakukan normalisasi time series hasil backend.
- Untuk `combine=per_entity|both`, frontend dapat menampilkan:
  - total (gabungan) untuk ringkasan,
  - daftar series per entitas untuk detail.
- Backend menyelaraskan time index (period) agar normalisasi konsisten.

## UI/UX Stage 1 — Scope & Filter
- EntityType: tetap satu pilihan utama, tetapi Entity Name menjadi multi-select (chips/combobox).
- Pilihan tambahan:
  - Toggle “Gabungkan sebagai Total” (map ke `combine`).
  - Toggle “Tampilkan Per Entitas” (map ke `combine`).
  - Batas jumlah pilihan (mis. max 10) untuk menjaga performa.
- Semua daftar/opsi (interface, pppoe, hotspot, site_group) diambil dari backend (autocomplete/paging).

## Validasi
- `start_time ≤ end_time`
- granularity konsisten dengan period (UI sudah membatasi).
- Minimal satu entitas dipilih saat entityType ≠ board.
- Batas jumlah entitas tidak dilampaui.

## Kinerja
- Gunakan indeks yang relevan di backend (mis. pada tabel ringkasan harian/bulanan).
- Implementasikan cache query (staleTime) dan batasi `series_by_entity` jika terlalu besar.
- Pertimbangkan `POST` untuk payload list yang panjang.

## Backward Compatibility & Fallback
- Jika backend belum mendukung multi-entity, abaikan parameter list dan kembalikan hasil single-entity atau total saja (respons tetap 200 dengan `combine` tereduksi).
- Fallback ke V1 tidak mendukung multi-entity; UI harus menonaktifkan mode multi-entity saat fallback aktif.

## Penerimaan (Acceptance)
- [ ] UI mendukung multi-select Entity Name sesuai entityType.
- [ ] Backend menerima daftar entitas dan mengembalikan total/per-entity sesuai `combine`.
- [ ] Normalisasi V2 berjalan untuk total dan per-entity tanpa error.
- [ ] Performa acceptable pada data produksi (tidak ada freeze di UI).
- [ ] Tidak ada perubahan pada V1.

## Langkah Implementasi
1. Tambah kontrol multi-select di Stage 1 untuk Entity Name.
2. Tambah opsi `combine` dan `fill_gap` di UI, kirim ke backend.
3. Implement endpoint V2 aggregate-all yang menerima list entitas dan mengembalikan total/per-entity.
4. Perluas Stage 2 agar bisa menampilkan total + per-entity (opsional, atau tab toggle).
5. Uji lint/typecheck dan verifikasi manual via Network tab.

## Rujukan
- Dokumen entitas tunggal: “add fitur entity stage 1 scope&filter.md”
- Aturan pipeline V2: folder `docs/analisis data v2/global/`

