# 📖 Panduan Pengguna Mikrotik Management System

## 1. Login & Dashboard
1.  Buka browser dan akses `http://localhost:3000` (Frontend) atau URL production.
2.  Login menggunakan akun yang diberikan admin.
3.  **Dashboard Utama** menampilkan ringkasan:
    *   Total Router Online/Offline.
    *   Grafik Trafik Gabungan.
    *   Status Alert Terakhir.

## 2. Manajemen Router (Boards)
1.  Masuk ke menu **Boards**.
2.  Klik **Add Board** untuk menambah router baru.
    *   **IP Address:** IP router yang bisa diakses oleh server.
    *   **Username/Password:** Kredensial Mikrotik (akan dienkripsi).
    *   **Port:** Default 8728 (API).
3.  Klik icon **Mata** untuk melihat detail statistik router.
4.  Klik icon **Shield** untuk konfigurasi VPN.
5.  Klik icon **Download** untuk melihat backup.

## 3. Laporan & Export
1.  Masuk ke menu **Reports**.
2.  Pilih rentang tanggal (Start Date - End Date).
3.  Pilih tipe laporan (Harian/Bulanan).
4.  Klik **Export PDF** atau **Export CSV** untuk mengunduh data.

## 4. Troubleshooting
*   **Router Offline?** Cek koneksi ping dari server ke router. Pastikan user API aktif di Mikrotik (`/user print`).
*   **Grafik Kosong?** Pastikan scheduler berjalan (`docker logs mikrotik_worker`).
*   **Lupa Password?** Hubungi Super Admin untuk reset.
