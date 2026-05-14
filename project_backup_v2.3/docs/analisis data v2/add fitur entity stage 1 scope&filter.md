# Add Fitur Entity — Stage 1 Scope & Filter (V2)

Dokumen ini merinci perluasan “Entity” pada Stage 1 — Scope & Filter untuk Analisis V2, berdasarkan struktur database terkini dan prinsip implementasi V2 yang terisolasi dari V1.

## Tujuan
- Memperluas cakupan pemilihan entitas analisis agar lebih kontekstual (per lokasi, per antarmuka prioritas, per segmen klien).
- Tetap mematuhi aturan: agregasi berat dilakukan di backend, V2 non-breaking, dan V1 tidak diubah.

## Prinsip & Aturan
- V2 terisolasi penuh dari V1 (endpoint terpisah, tidak override V1).
- Frontend tidak melakukan agregasi berat; semua agregasi dan daftar data dihasilkan backend.
- Tidak ada perubahan skema database; memanfaatkan tabel yang sudah ada.
- Integrasi UI mengikuti rule “file panjang” (komponen dipisah jika perlu).

## Entity Baru yang Diusulkan
1. site_group (mikrotik_boards.site_group)
   - Deskripsi: Kelompok lokasi/cluster perangkat.
   - Kegunaan: Analisa lintas-perangkat per lokasi (agregasi multi-board).
   - UI: Tambahkan opsi entityType “site_group”; Entity Name berupa dropdown nilai unik “site_group”.
   - Catatan: Wajib agregasi server-side untuk multi-board.

2. interface (board_interface_configs)
   - Tambahan opsi:
     - Toggle “Hanya Uplink” → board_interface_configs.is_primary_uplink = true.
     - Dropdown “Interface (Label)” → gunakan interface_label untuk UX yang lebih jelas.
     - Toggle “Hanya yang aktif” → board_interface_configs.is_active = true.
   - Kegunaan: Memilih port prioritas (uplink) dan/atau port aktif dengan label human-friendly.
   - UI: Muncul saat entityType=interface; name diisi dari server (autocomplete/dropdown).

3. clients (board_client_stats)
   - Deskripsi: Analisa tren jumlah klien (pppoe/hotspot/total) menggunakan time series board_client_stats.
   - UI: entityType “clients”; Entity Name: pilihan “pppoe | hotspot | total”.
   - Kegunaan: Melihat dinamika beban pengguna per board.

4. pppoe & hotspot user (opsional, listing nama)
   - Sumber: daftar user dari sistem (paging dan pencarian server-side).
   - UI: Autocomplete entityName saat entityType=pppoe/hotspot.
   - Catatan: Hanya daftar dan filter; agregasi tetap di backend.

## Perubahan UI Stage 1 (Ringkas)
- Entity Type (dropdown) ditambah opsi: site_group, clients.
- Entity Name (dinamis):
  - site_group → dropdown nilai unik.
  - interface → dropdown/autocomplete label + toggle uplink + toggle aktif.
  - pppoe/hotspot → autocomplete username (server-side).
  - clients → pilihan pp­poe/hotspot/total.
- Validasi tetap berlaku (granularity vs period, tanggal valid, dsb.).

Rujukan UI: `frontend/src/analytics_v2/components/Stage1ScopeFilterPanel.jsx`

## Spesifikasi Endpoint V2 (Usulan)
Semua endpoint hanya contoh pola; implementasi disarankan pada namespace `/api/v2` agar tidak memengaruhi V1.

1) Site Group
- GET `/v2/boards/site-groups`
  - Response: `[{ "site_group": "Umum", "count": 12 }, ...]`
- GET `/v2/analysis/site-groups/{site_group}/aggregate-all/?start_time&end_time&granularity&agg`
  - Menghasilkan timeseries agregat lintas board pada grup tersebut.

2) Interface Metadata per Board
- GET `/v2/boards/{boardId}/interfaces?active=true&primary=true&q=&limit=`
  - Response: `[{ "interface_name": "ether1", "interface_label": "Uplink FO", "is_active": true, "is_primary_uplink": true }, ...]`

3) PPPoE / Hotspot Users (listing)
- GET `/v2/users/pppoe?q=&limit=`, GET `/v2/users/hotspot?q=&limit=`
  - Response: `[{ "username": "user1" }, ...]`

4) Clients Series (pppoe/hotspot/total)
- GET `/v2/analysis/{boardId}/clients/series?type=pppoe|hotspot|total&start_time&end_time&granularity`
  - Sumber data: `board_client_stats` (time series).
  - Response contoh:
    ```json
    [
      { "period": "2026-03-01T00:00:00Z", "pppoe": 35, "hotspot": 12, "total": 47 },
      ...
    ]
    ```

## Kontrak Parameter
- period: custom | daily | monthly | yearly
- limit: integer > 0 (untuk period≠custom)
- granularity: auto | hour | day | month | year (disesuaikan dengan period)
- entityType: board | interface | pppoe | hotspot | site_group | clients
- entityName: string opsional (ditentukan sesuai entityType)
- Hanya kombinasi valid yang diterima (UI membatasi pilihan; backend memvalidasi ulang).

## Validasi & Aturan Aggregasi
- Frontend dilarang melakukan SUM/COUNT/JOINS berat.
- Multi-board (site_group) dihitung di DB/Backend (SQL GROUP BY).
- Interface uplink/aktif difilter di backend (query dengan kondisi is_primary_uplink/is_active).
- Autocomplete selalu server-side (pencarian nama interface/username).

## Dampak ke Pipeline
- Normalisasi (Stage 0) dan tahapan berikutnya tetap memakai data hasil backend.
- Tidak ada perubahan output V1; semua rute V2 bersifat tambahan.

## Penerimaan (Acceptance Checklist)
- [ ] EntityType baru muncul di UI dan hanya menampilkan kontrol yang relevan.
- [ ] Autocomplete/dropdown memuat daftar dari backend (bukan hardcoded).
- [ ] Validasi period–granularity berjalan dan error message jelas.
- [ ] Agregasi berat dilakukan di backend; UI responsif dan tidak lambat.
- [ ] V2 tidak memengaruhi endpoint/kode V1.

## Rencana Implementasi Bertahap
1. Tambah opsi entityType di UI beserta kontrol dinamis.
2. Tambah endpoint V2 untuk site-group, interface metadata, user listing, dan clients series.
3. Integrasikan query di controller V2 dan normalisasi pipeline existing.
4. Tambah test manual (Network tab) dan uji lint/typecheck.

## Catatan
- Tidak ada perubahan schema.sql.
- Dokumentasi ini bersifat panduan implementasi; endpoint dapat disesuaikan selama prinsip di atas dipatuhi.

