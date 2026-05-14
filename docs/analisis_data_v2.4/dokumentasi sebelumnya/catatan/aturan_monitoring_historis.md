# Aturan Monitoring Historis

Dokumen ini menetapkan aturan ketat (strict rules) untuk implementasi dan pengelolaan fitur Monitoring Historis di dalam sistem Mikrotik API. Aturan ini bertujuan menjaga performa sistem, integritas data, dan mencegah overloading pada perangkat router.

## 1. Aturan Pengumpulan Data (Polling)

### 1.1 Interval & Penjadwalan
*   **WAJIB** memiliki interval polling yang dapat dikonfigurasi (default: min 60 detik).
*   **DILARANG** melakukan polling dengan interval < 10 detik untuk resource berat (seperti `/tool/torch` atau `/ip/firewall/connection/print`).
*   **HARUS** menggunakan mekanisme *jitter* (jeda acak kecil) antar request router untuk mencegah lonjakan trafik jaringan serentak.

### 1.2 Koneksi & Efisiensi
*   **WAJIB** menutup koneksi API (logout) setelah siklus polling selesai, atau menggunakan *connection pooling* yang dikelola dengan ketat.
*   **DILARANG** membuka koneksi baru untuk setiap item data; gunakan satu sesi koneksi untuk mengambil semua metrik yang dibutuhkan dalam satu siklus.
*   **HARUS** mengambil data spesifik (kolom tertentu) saja, bukan `print detail` (contoh: `.proplist=name,bytes-in,bytes-out` bukan dump semua properti).

### 1.3 Error Handling
*   Jika koneksi gagal, worker **TIDAK BOLEH** crash. Harus mencatat error di log dan melanjutkan ke target router berikutnya.
*   Jika gagal berturut-turut > 3 kali, status router di database harus diupdate menjadi `OFFLINE` atau `UNREACHABLE`.

## 2. Aturan Penyimpanan Database

### 2.1 Struktur Data
*   Tabel historis **WAJIB** memiliki indeks pada kolom `board_id` dan `log_time` untuk performa query.
*   Tabel **HARUS** didesain untuk *write-heavy workload*.

### 2.2 Retensi & Pembersihan
*   **WAJIB** ada mekanisme rotasi atau penghapusan data lama (Data Retention Policy).
*   Data mentah > 30 hari **HARUS** dihapus atau diarsipkan (kecuali data agregat).

## 3. Aturan Konsumsi Data (Frontend/API)

### 3.1 Penyajian
*   Endpoint statistik **WAJIB** mendukung parameter `limit` dan `date_range` untuk mencegah pengambilan jutaan baris data sekaligus.
*   Data historis di Dashboard (Overview) **TIDAK BOLEH** diklaim sebagai data "Live/Real-time". Harus diberi label waktu pengambilan terakhir (Last Updated).

### 3.2 Fallback
*   Jika data historis kosong (misal worker mati), API **HARUS** mengembalikan array kosong atau status yang sesuai, bukan error 500.

## 4. Batasan (Constraints)
*   Monitoring historis **HANYA** untuk data: Resource (CPU/Mem/Disk), Traffic Counter Interface, Jumlah User Aktif.
*   **BUKAN** untuk: Log debug realtime, Packet sniffing, atau konfigurasi yang sering berubah.
