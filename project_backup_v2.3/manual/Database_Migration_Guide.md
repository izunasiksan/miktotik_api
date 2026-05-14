# Panduan Migrasi Data PostgreSQL Docker
**(Volume Docker Internal -> Bind Mount Lokal)**

**Tanggal:** 01 Maret 2026
**Lingkup:** Memindahkan data dari volume internal Docker (`pgdata`) ke folder lokal (`./postgres_data`) agar data aman dan mudah diakses.

---

## ⚠️ PERINGATAN PENTING
**JANGAN MENGHAPUS VOLUME LAMA (`mikrotik_api_pgdata`) SEBELUM MIGRASI SUKSES.**
Data di dalam volume Docker bersifat persisten tetapi sulit diakses langsung dari Windows Explorer.

---

## Langkah 1: Persiapan & Backup (PENTING)

Sebelum melakukan apa pun, kita harus memastikan container database lama berjalan untuk mengambil datanya.

1.  **Kembalikan konfigurasi `docker-compose.yml` sementara ke volume lama** (Jika Anda sudah mengubahnya ke `./postgres_data`).
    *   Ubah bagian `volumes` di service `db`:
        ```yaml
        # docker-compose.yml
        volumes:
          - pgdata:/var/lib/postgresql/data  # Kembali ke volume lama
        ```
    *   Tambahkan kembali definisi volume di paling bawah file jika sudah dihapus:
        ```yaml
        volumes:
          pgdata:
        ```

2.  **Jalankan Container Database Lama:**
    ```powershell
    docker-compose up -d db
    ```

3.  **Backup Data (Dump SQL):**
    Jalankan perintah ini untuk menyimpan seluruh isi database ke file `backup_full.sql` di komputer Anda:
    ```powershell
    docker-compose exec -T db pg_dumpall -U postgres > backup_full.sql
    ```
    *   *Catatan: File `backup_full.sql` akan muncul di folder project `e:\mikrotik_api`.*
    *   *Periksa ukuran file tersebut. Jika 0KB, berarti backup gagal.*

4.  **Matikan Container:**
    ```powershell
    docker-compose down
    ```

---

## Langkah 2: Konfigurasi Bind Mount Baru

Sekarang kita arahkan Docker untuk menggunakan folder lokal.

1.  **Edit `docker-compose.yml`:**
    Ubah kembali bagian `volumes` untuk menggunakan folder lokal:
    ```yaml
    # docker-compose.yml
    services:
      db:
        # ...
        volumes:
          - ./postgres_data:/var/lib/postgresql/data # Folder lokal baru
    
    # Hapus bagian volumes: pgdata di bawah file (opsional)
    ```

2.  **Bersihkan Folder Tujuan (Jika Ada):**
    Pastikan folder `postgres_data` kosong atau belum ada. Docker akan membuatnya otomatis.

3.  **Jalankan Container Database Baru:**
    ```powershell
    docker-compose up -d db
    ```
    *   *Docker akan menginisialisasi database baru yang KOSONG di folder `./postgres_data`.*

---

## Langkah 3: Restore Data

Sekarang kita masukkan data dari file backup ke database baru yang kosong.

1.  **Tunggu Database Siap:**
    Cek statusnya dengan `docker-compose ps`. Pastikan statusnya `healthy`.

2.  **Restore Data:**
    Jalankan perintah ini untuk mengimpor data:
    ```powershell
    type backup_full.sql | docker-compose exec -T db psql -U postgres
    ```
    *   *Jika menggunakan Command Prompt (CMD), gunakan perintah di atas.*
    *   *Jika menggunakan PowerShell, gunakan:*
        ```powershell
        Get-Content backup_full.sql | docker-compose exec -T db psql -U postgres
        ```

3.  **Verifikasi Data:**
    Masuk ke dalam container dan cek apakah tabel/data sudah ada:
    ```powershell
    docker-compose exec db psql -U postgres -d db_master_mikrotik
    # Di dalam psql console:
    \dt  -- List tables
    SELECT * FROM master_user; -- Cek user
    \q   -- Keluar
    ```

---

## Langkah 4: Selesai

Sekarang aplikasi Anda sudah menggunakan folder lokal `./postgres_data`.
*   Data aman di folder komputer Anda.
*   Anda bisa membackup folder `postgres_data` secara langsung (saat container mati).
*   Anda bisa menghapus volume lama `mikrotik_api_pgdata` jika sudah yakin migrasi berhasil:
    ```powershell
    docker volume rm mikrotik_api_pgdata
    ```

---

## Troubleshooting

### Error: "role 'postgres' already exists" saat Restore
Ini normal karena `pg_dumpall` menyertakan perintah pembuatan role. Anda bisa mengabaikannya.

### Error: "database 'db_master_mikrotik' already exists"
Ini juga normal karena script inisialisasi Docker mungkin sudah membuat database kosong. `pg_dumpall` akan menimpa atau menambahkan data ke dalamnya.

### Permission Denied pada `./postgres_data`
Di Windows/WSL, ini jarang terjadi. Jika terjadi di Linux, pastikan user yang menjalankan Docker memiliki hak akses tulis ke folder tersebut.
