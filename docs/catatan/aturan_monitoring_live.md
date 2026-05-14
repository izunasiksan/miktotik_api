# Aturan Monitoring Live (Real-Time Management)

Dokumen ini menetapkan aturan ketat (strict rules) untuk implementasi fitur Monitoring Live dan Manajemen Langsung ke perangkat Mikrotik. Aturan ini krusial untuk UX yang responsif dan keamanan operasi jaringan.

## 1. Aturan Interaksi API (Backend to Router)

### 1.1 Sifat Request
*   Semua request Live **WAJIB** bersifat *On-Demand* (hanya dieksekusi saat user meminta).
*   **WAJIB** menggunakan operasi *Asynchronous* (Async I/O) agar tidak memblokir thread utama server backend.
*   **DILARANG** melakukan operasi blocking yang lama (> 30 detik) dalam satu HTTP request standar. Untuk operasi lama, gunakan *Background Task* + *Polling Status*.

### 1.2 Timeout & Latency
*   Setiap koneksi ke router **WAJIB** memiliki timeout yang jelas (maksimal 10 detik untuk read, 5 detik untuk connect).
*   Frontend **HARUS** menampilkan indikator *Loading* selama proses request berlangsung.
*   Jika timeout terjadi, user **HARUS** mendapat pesan error yang jelas ("Device Unreachable" atau "Request Timed Out"), bukan spinner tanpa henti.

### 1.3 Caching Strategy
*   Untuk data yang tidak berubah hitungan milidetik (seperti daftar Interface statis), **DISARANKAN** menggunakan Cache (Redis) dengan TTL singkat (5-10 detik).
*   Ini mencegah "Spam Refresh" dari user yang bisa membebani CPU router.

## 2. Aturan Keamanan & Izin

### 2.1 Otorisasi
*   Hanya user dengan role yang sesuai (misal: Admin/Superuser) yang boleh melakukan operasi *Write* (Reboot, Disable Interface, Kick User).
*   Operasi *Read* (View Status) boleh diberikan ke user level Monitor.

### 2.2 Kredensial
*   Password router **TIDAK BOLEH** dikirim ke Frontend. Dekripsi dilakukan di Backend saat hendak menghubungi router.
*   Log aktivitas **WAJIB** mencatat siapa yang melakukan aksi Live Management (Audit Trail).

## 3. Aturan Kualitas Data

### 3.1 Validitas
*   Data yang ditampilkan di tab Live **HARUS** berasal dari kondisi terkini router, bukan data database kemarin.
*   Jika koneksi gagal, **JANGAN** tampilkan data cache usang tanpa peringatan. Tampilkan error state.

### 3.2 Pemisahan UI
*   Tab Live Management (Interfaces, PPPoE, Hotspot) **HARUS** dipisahkan secara visual atau struktural dari tab Historical Overview.
*   User harus sadar bahwa perubahan di sini berdampak langsung ke perangkat.

## 4. Implementasi Fitur Spesifik

### 4.1 Ping & Tools
*   Ping Check **WAJIB** menggunakan ICMP nyata atau API `/ping` ke router, **BUKAN** simulasi random.
*   Hasil harus menampilkan Latency (ms) dan Packet Loss (%).

### 4.2 Resource Intensive Commands
*   Perintah berat seperti `/tool/torch` atau `/packet/sniffer` **HARUS** dibatasi durasinya (misal: auto-stop setelah 30 detik) dan memiliki tombol "Stop" manual.
