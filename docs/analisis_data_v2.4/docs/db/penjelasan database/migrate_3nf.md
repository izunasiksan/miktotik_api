# Penjelasan Migrasi 3NF (Identity & Config)

## 0. Informasi Koneksi Database
Gunakan konfigurasi berikut untuk mengakses database yang telah diperbarui:
- **Host**: `localhost`
- **Port**: `5432`
- **Database Name**: `db_master_mikrotik`
- **User**: `postgres`
- **Password**: `root`

## 1. Latar Belakang Normalisasi 3NF
Berdasarkan audit database versi 2.4, ditemukan ketergantungan transitif (*transitive dependency*) pada tabel `master_users` dan `mikrotik_boards`. Sebelumnya, informasi seperti `role`, `site_group`, dan `board_model` disimpan sebagai string langsung di tabel utama. Hal ini menyebabkan:
- **Redundansi Data**: String yang sama diulang berkali-kali.
- **Resiko Inkonsistensi**: Penulisan "Admin" dan "admin" dianggap berbeda.
- **Keterbatasan Metadata**: Sulit menambahkan informasi tambahan (misal: permissions per role, lokasi per site) tanpa mengubah struktur tabel utama.

Normalisasi ke **Third Normal Form (3NF)** dilakukan untuk memastikan setiap kolom non-kunci hanya bergantung pada kunci primer (*primary key*).

## 2. Daftar Perubahan Skema
### Tabel Master Baru
| Tabel | Deskripsi |
| :--- | :--- |
| `master_roles` | Menyimpan definisi role (admin, teknisi, viewer) dan JSON permissions. |
| `master_sites` | Menyimpan daftar lokasi/site, alamat, dan kontak PIC. |
| `master_board_models` | Menyimpan spesifikasi hardware (CPU, RAM, Core) per model RouterBoard. |

### Perubahan Relasi (Foreign Key)
- `master_users.role` (string) → `master_users.role_id` (FK to `master_roles.role_id`).
- `mikrotik_boards.site_group` (string) → `mikrotik_boards.site_id` (FK to `master_sites.site_id`).
- `mikrotik_boards.board_model` (string) → `mikrotik_boards.model_id` (FK to `master_board_models.model_id`).

## 3. Langkah-Langkah Migrasi
Migrasi dilakukan secara bertahap untuk menjaga integritas data:
1. **Penyediaan Tabel**: Membuat tabel master dengan `CREATE TABLE IF NOT EXISTS`.
2. **Ekstraksi Data**: Mengambil nilai unik dari tabel lama menggunakan `SELECT DISTINCT` dan memasukkannya ke tabel master.
3. **Penambahan Kolom**: Menambahkan kolom ID baru dengan sifat *nullable* terlebih dahulu.
4. **Pemetaan Data**: Menjalankan query `UPDATE` dengan `JOIN` untuk mengisi kolom ID berdasarkan kecocokan nilai string lama.
5. **Finalisasi**: Mengubah kolom menjadi `NOT NULL` dan menambahkan *Foreign Key Constraint*.

**Contoh Query Migrasi Site:**
```sql
INSERT INTO master_sites (site_name)
SELECT DISTINCT site_group FROM mikrotik_boards;

UPDATE mikrotik_boards b 
SET site_id = s.site_id 
FROM master_sites s 
WHERE b.site_group = s.site_name;
```

## 4. Risiko dan Mitigasi
- **Risiko Deadlock**: Terjadi jika migrasi dijalankan saat transaksi padat. 
  - *Mitigasi*: Jalankan migrasi pada jam *maintenance* atau gunakan `LOCK TABLE` secara eksplisit.
- **Kehilangan Data**: String lama yang tidak terpetakan akan menyebabkan FK null.
  - *Mitigasi*: Validasi data string sebelum migrasi dan gunakan nilai default jika perlu.
- **Downtime**: Perubahan struktur tabel besar bisa memakan waktu.
  - *Mitigasi*: Lakukan migrasi di environment staging terlebih dahulu untuk estimasi waktu.

## 5. Skrip Rollback
Jika terjadi kegagalan, gunakan skrip berikut untuk kembali ke struktur awal:
```sql
-- 1. Hapus Constraints & Kolom FK
ALTER TABLE master_users DROP COLUMN IF EXISTS role_id;
ALTER TABLE mikrotik_boards DROP COLUMN IF EXISTS site_id;
ALTER TABLE mikrotik_boards DROP COLUMN IF EXISTS model_id;

-- 2. Hapus Tabel Master
DROP TABLE IF EXISTS master_board_models;
DROP TABLE IF EXISTS master_sites;
DROP TABLE IF EXISTS master_roles;
```

## 6. Tabel Uji (Test Case)
| ID | Skenario | Langkah | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| TC-01 | Migrasi Role | Cek `master_roles` setelah migrasi. | Berisi 'admin', 'teknisi', 'viewer'. |
| TC-02 | Konsistensi User | Cek `role_id` pada user 'admin'. | Terisi ID yang merujuk ke role 'admin'. |
| TC-03 | Penanganan Null | Board dengan `board_model` NULL. | `model_id` pada board tersebut tetap NULL (opsional). |
| TC-04 | Duplikasi String | String site sama tapi beda case (Site A vs site a). | Jika database case-sensitive, akan muncul 2 entry di `master_sites`. |
| TC-05 | Integritas FK | Coba hapus site yang masih digunakan board. | Gagal karena `FOREIGN KEY constraint`. |

## 7. Validasi Hasil
Gunakan query berikut untuk memverifikasi keberhasilan migrasi:
- **Cek Baris**: `SELECT COUNT(*) FROM master_sites;` (Harus sama dengan jumlah `site_group` unik sebelumnya).
- **Cek Orphan Data**: `SELECT count(*) FROM mikrotik_boards WHERE site_id IS NULL;` (Harus 0 jika data awal bersih).
- **Cek Constraint**: `\d mikrotik_boards` (Pastikan `site_id` memiliki status `NOT NULL` dan `REFERENCES`).
