# RENCANA KERJA: IMPLEMENTASI NORMALISASI 3NF (IDENTITY & CONFIG)
**Versi:** 1.0
**Target Lapisan:** Database, Backend (SQLAlchemy), Frontend (Pydantic)
**Status:** DRAFT - Rencana Eksekusi

## 1. Latar Belakang & Tujuan
Berdasarkan hasil audit normalisasi database V2.4, ditemukan beberapa potensi pelanggaran **Third Normal Form (3NF)** pada data identitas (Users & Boards) di mana terdapat *Transitive Dependency* pada kolom string deskriptif.

**Tujuan:** 
*   Menghilangkan redundansi data string.
*   Memastikan integritas data melalui *Foreign Key Constraints*.
*   Memudahkan pengelolaan metadata (misal: penambahan info detail site tanpa mengubah tabel board).

---

## 2. Analisis Pelanggaran 3NF Saat Ini

| Tabel | Kolom Pelanggar | Alasan (Transitive Dependency) |
| :--- | :--- | :--- |
| `master_users` | `role` | Role saat ini hanya string. Jika ingin menambahkan `permissions` per role, maka user bergantung pada role, dan permissions bergantung pada role (User -> Role -> Permissions). |
| `mikrotik_boards` | `site_group` | Site group adalah string. Jika ingin menambahkan info `lokasi`, `kontak`, atau `PIC` per site, maka Board -> Site -> Info Site. |
| `mikrotik_boards` | `board_model` | Model adalah string. Jika ingin menyimpan spesifikasi teknis (RAM, CPU core) per model, maka Board -> Model -> Spec. |

---

## 3. Usulan Perubahan Skema (3NF)

### A. Tabel Master Baru
1.  **`master_roles`**: Menyimpan daftar role (admin, teknisi, viewer) dan metadata (permissions).
2.  **`master_sites`**: Menyimpan daftar site (Umum, Site A, Site B) dan metadata (lokasi, PIC).
3.  **`master_board_models`**: Menyimpan daftar model hardware (RB750Gr3, CCR2004, dll) dan spesifikasinya.

### B. Refaktorisasi Tabel Identitas
*   **`master_users`**: Ganti kolom `role` (string) menjadi `role_id` (FK to `master_roles`).
*   **`mikrotik_boards`**: Ganti kolom `site_group` (string) menjadi `site_id` (FK to `master_sites`).
*   **`mikrotik_boards`**: Ganti kolom `board_model` (string) menjadi `model_id` (FK to `master_board_models`).

---

## 4. Tahapan Implementasi (Roadmap)

### Tahap 1: Persiapan Database (SQL Migration)
1.  Buat tabel master baru (`master_roles`, `master_sites`, `master_board_models`).
2.  Gunakan script `INSERT INTO ... SELECT DISTINCT ...` untuk migrasi data string unik ke tabel master baru.
3.  Tambahkan kolom FK baru (nullable) ke tabel target.
4.  Jalankan `UPDATE` untuk mengisi FK berdasarkan mapping string lama.
5.  Ubah kolom FK menjadi `NOT NULL` dan tambahkan `FOREIGN KEY CONSTRAINT`.
6.  Hapus kolom string lama.

### Tahap 2: Pembaruan Backend (SQLAlchemy & Pydantic)
1.  Update [mikrotik.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/models/mikrotik.py) & `user.py` untuk mendefinisikan model master baru dan relasi `relationship()`.
2.  Update [schemas/mikrotik.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/e2e_best_practice/src/app/schemas/mikrotik.py) untuk menyertakan data master (misal: `BoardResponse` menyertakan object `site` utuh).
3.  Implementasi *Eager Loading* (`joinedload` atau `selectinload`) pada API endpoints untuk menghindari *N+1 query problem*.

### Tahap 3: Pembaruan Frontend
1.  Sesuaikan komponen UI (Dropdown/Select) agar mengambil data dari endpoint master baru (misal: `/api/v1/master/sites`).
2.  Sesuaikan tabel/list agar menampilkan label dari object relasional (misal: `board.site.site_name`).

---

## 5. Dampak & Mitigasi
*   **Dampak:** Perubahan skema akan memutus query yang masih mengandalkan kolom string lama.
*   **Mitigasi:** Gunakan SQL Views untuk sementara waktu yang menggabungkan tabel master agar aplikasi lama (jika ada) tetap bisa membaca kolom string melalui view tersebut.

---

## 6. Contoh Proof-of-Concept (SQL)
```sql
-- Contoh migrasi site_group
CREATE TABLE master_sites (
    site_id SERIAL PRIMARY KEY,
    site_name VARCHAR(50) UNIQUE NOT NULL,
    location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migrasi data unik
INSERT INTO master_sites (site_name)
SELECT DISTINCT site_group FROM mikrotik_boards;

-- Tambah relasi
ALTER TABLE mikrotik_boards ADD COLUMN site_id INT REFERENCES master_sites(site_id);
UPDATE mikrotik_boards b SET site_id = s.site_id FROM master_sites s WHERE b.site_group = s.site_name;
```
