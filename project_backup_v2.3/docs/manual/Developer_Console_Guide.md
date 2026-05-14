# Panduan Pengguna: Developer Console (God Mode)

## 1. Pendahuluan
Developer Console adalah antarmuka khusus yang dirancang untuk pengembang dan administrator sistem (Super Admin) untuk melakukan pemantauan mendalam, debugging, dan operasi tingkat rendah pada Mikrotik Management System.

**PENTING:** Fitur ini memiliki kuasa penuh atas sistem. Gunakan dengan sangat hati-hati.

## 2. Akses & Navigasi
- **URL**: `/developer` (Terpisah dari dashboard utama)
- **Syarat Akses**: Hanya user dengan role `admin` atau `developer` yang dapat mengakses halaman ini.
- **Cara Masuk**:
  1. Login sebagai Admin.
  2. Ketik URL `/developer` di browser secara manual (Fitur ini disembunyikan dari sidebar untuk keamanan).
  3. Halaman akan terbuka dengan tampilan penuh.

## 3. Fitur & Cara Penggunaan

### A. System Internals
Menampilkan "denyut nadi" sistem backend secara real-time.
- **Status Indikator**: Hijau (Online), Kuning (Warning), Merah (Critical).
- **Raw Dashboard Stats**: Melihat data JSON mentah yang dikirim oleh endpoint dashboard summary. Berguna untuk memverifikasi apakah frontend menerima data yang benar.

### B. API Tester
Alat pengujian HTTP Request (mirip Postman) yang terintegrasi langsung di browser.
- **Method**: Pilih GET, POST, PUT, atau DELETE.
- **Endpoint**: Masukkan path relatif (contoh: `/boards` atau `/users`).
- **Body**: Masukkan payload JSON untuk request POST/PUT.
- **Response**: Melihat status code, headers, dan body response dari server.
- **Authentication**: Token JWT otomatis disisipkan dalam setiap request.

### C. Database Viewer
Penjelajah data tabel secara cepat (Read-Only di tampilan ini).
- Klik kartu (Boards, Users, Logs) untuk melihat isi tabel dalam format JSON mentah.
- Berguna untuk melihat kolom-kolom tersembunyi yang mungkin tidak ditampilkan di UI standar.

### D. SQL Query Runner (⚠️ DANGER ZONE)
Eksekusi perintah SQL langsung ke database PostgreSQL.
- **Fungsi**: Menjalankan query `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
- **Cara Pakai**:
  1. Ketik query SQL di editor (contoh: `SELECT * FROM mikrotik_boards WHERE is_online = true;`).
  2. Klik tombol **EXECUTE SQL**.
  3. Hasil akan muncul dalam bentuk tabel di bawah editor.
- **Peringatan**: Tidak ada tombol "Undo". Pastikan query Anda benar sebelum dieksekusi.

### E. Server Logs (Live Stream)
Melihat log aplikasi backend secara real-time (tailing).
- **Teknologi**: Menggunakan WebSocket untuk streaming baris log baru saat kejadian terjadi.
- **Fitur**:
  - **Auto-scroll**: Otomatis menggulir ke baris paling baru.
  - **Pause/Reconnect**: Hentikan sementara aliran log untuk membaca detail.
  - **Clear**: Bersihkan layar log.

### F. Prometheus Metrics
Integrasi dengan sistem monitoring eksternal.
- Menyediakan tautan cepat ke endpoint `/metrics` yang digunakan oleh Prometheus.
- Menampilkan panduan metrik apa saja yang tersedia (CPU, Memory, Request Count).

### G. Environment Variables
Menampilkan konfigurasi `.env` yang sedang aktif di sisi Frontend.
- Berguna untuk memastikan aplikasi terhubung ke URL API yang benar (`VITE_API_URL`).

## 4. Troubleshooting
- **WebSocket Disconnected**: Jika status log "Disconnected", pastikan backend berjalan dan port WebSocket tidak diblokir firewall. Coba klik tombol "Reconnect".
- **Access Denied**: Pastikan user Anda memiliki role `admin`. Logout dan login kembali jika baru saja mengubah role.
