# Dokumentasi Seeding Data v2.4.1

## 1. Perbandingan v2.2 vs v2.4.1 (3NF Mapping)

| Fitur / Tabel | Versi 2.2 (Lama) | Versi 2.4.1 (Baru - 3NF) | Keterangan |
| :--- | :--- | :--- | :--- |
| **Master User** | Menggunakan string `role` | Menggunakan `role_id` (FK ke `master_roles`) | Normalisasi role user |
| **Mikrotik Boards** | Menggunakan string `site_group` | Menggunakan `site_id` (FK ke `master_sites`) | Normalisasi data site/lokasi |
| **Mikrotik Boards** | Menggunakan string `board_model` | Menggunakan `model_id` (FK ke `master_board_models`) | Normalisasi spesifikasi hardware |
| **Tabel Baru** | Belum ada | `master_roles`, `master_sites`, `master_board_models` | Tabel master pendukung 3NF |
| **Tabel Baru** | Belum ada | `telegram_recipients`, `audit_logs`, `hotspot_usage_monthly` | Fitur tambahan v2.4.1 |
| **Partitioning** | Manual/Hardcoded | Dinamis (Bulanan) | Script membuat partisi otomatis |
| **Integritas Data** | Lemah (String) | Kuat (Foreign Key Constraints) | Menghindari anomali data |

## 2. Panduan Eksekusi

### Prasyarat
- Python 3.10+
- Library: `asyncpg`, `faker`, `passlib`, `argon2-cffi`
- Database PostgreSQL yang sudah memiliki schema v2.4.1 (`schema.sql`)

### Cara Menjalankan Seeding
```bash
python seed_v2_4_1.py
```

### Cara Menjalankan Rollback
```bash
python rollback_v2_4_1.py
```

### Cara Menjalankan Unit Test
```bash
python test_v2.4.1_seed.py
```

## 3. Metadata Dataset (Default)
- **Users**: 15 records (Roles: Admin, Teknisi, Viewer)
- **Boards**: 10 records (Models: RB4011, CCR1009, hEX lite, RB750Gr3, CCR2004)
- **Sites**: 5 locations (Jakarta, Bandung, Surabaya, Medan, Makassar)
- **History**: 30 hari data statistik (Client, Resource, Speed, Usage)
- **Partisi**: Otomatis dibuat untuk bulan berjalan dan masa depan.

## 4. Troubleshooting

| Masalah | Penyebab | Solusi |
| :--- | :--- | :--- |
| `ModuleNotFoundError` | Library belum terinstal | Jalankan `pip install asyncpg faker passlib argon2-cffi` |
| `ConnectionRefusedError` | DB URL salah atau DB mati | Periksa konstanta `DB_URL` di dalam script |
| `ForeignKeyViolation` | Urutan hapus data salah | Gunakan script `rollback_v2_4_1.py` yang sudah mendukung CASCADE |
| `TypeError: ... not serializable` | Tipe data khusus (IP/UUID) di snapshot | Update fungsi `serializer` (Sudah diperbaiki di v2.4.1) |

## 5. Snapshot & Recovery
Script rollback akan secara otomatis menyimpan snapshot data master ke folder `./snapshots/` dalam format JSON sebelum menghapus data. Ini dapat digunakan untuk recovery darurat jika terjadi kesalahan eksekusi.
