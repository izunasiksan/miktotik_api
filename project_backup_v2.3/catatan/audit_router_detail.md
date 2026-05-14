# Audit Fitur Router Detail (Boards > Detail)

Dokumen ini memetakan sumber data, alur kerja, dan status implementasi fitur pada halaman Detail Router di Mikrotik Management API.

## 1. Ringkasan Arsitektur Data

Sistem menggunakan pendekatan hibrida untuk penyajian data:
1.  **Data Statis & Konfigurasi**: Disimpan di Database PostgreSQL (`mikrotik_boards`, `board_credentials`).
2.  **Data Monitoring (Polling)**: Diambil secara berkala oleh `polling_worker.py` dan disimpan sebagai *time-series data* di Database.
3.  **Data Real-time (On-Demand)**: Idealnya diambil langsung dari Router via API saat user meminta, namun saat ini sebagian masih *mock/dummy*.

## 2. Pemetaan Fitur & Sumber Data

Berikut adalah analisis per komponen di halaman `RouterDetail.jsx`.

### A. Header & Informasi Dasar
*   **Tampilan**: Nama Board, IP, Identity, Model, RouterOS Version.
*   **Sumber Data**: Database (`mikrotik_boards`).
*   **Mekanisme**: `GET /boards/{id}/`.
*   **Status**: ✅ **Terimplementasi & Valid**. Data berasal dari database lokal yang diupdate saat proses *Add Board* atau *Edit Board*.

### B. Statistik Resource (Overview Tab)
*   **Tampilan**: CPU Load, Free Memory, Free HDD, Uptime.
*   **Sumber Data**: Database (`board_resource_stats`).
*   **Mekanisme**:
    *   *Frontend*: `GET /boards/{id}/stats/` (Auto-refresh 10s).
    *   *Backend*: Query 10 record terakhir dari tabel statistik.
    *   *Ingestion*: `polling_worker.py` mengambil data dari Mikrotik setiap siklus polling.
*   **Status**: ✅ **Terimplementasi & Valid**. Mengandalkan worker background. Jika worker mati, data tidak update.

### C. Quick Actions (Ping Check)
*   **Tampilan**: Tombol "Ping Check" dengan notifikasi Toast.
*   **Sumber Data**: Simulasi Backend (Saat ini).
*   **Mekanisme**: `POST /boards/{id}/ping/`.
*   **Status**: ⚠️ **Simulasi**.
    *   *Current*: Menggunakan `random.choice` untuk status online/offline.
    *   *Target*: Implementasi ping ICMP riil atau request ke Mikrotik API.

### D. Interfaces Tab
*   **Tampilan**: Daftar antarmuka (Ethernet, VLAN, WiFi) dengan status trafik.
*   **Sumber Data**: Dummy Data (Hardcoded di Backend).
*   **Mekanisme**: `GET /boards/{id}/interfaces/`.
*   **Status**: ❌ **Placeholder / Dummy**.
    *   *Backend*: Mengembalikan list statis `[ether1, ether2, wlan1]`.
    *   *Worker*: Sebenarnya `polling_worker.py` sudah mengambil data interface usage, namun API belum menghubungkannya.
    *   *Rekomendasi*: Ubah endpoint untuk mengambil data terakhir dari `board_interface_usages` atau *live query* ke Mikrotik.

### E. PPPoE & Hotspot Tabs
*   **Tampilan**: Daftar user aktif PPPoE dan Hotspot.
*   **Sumber Data**: Kosong / Dummy.
*   **Mekanisme**: `GET /boards/{id}/pppoe/` dan `GET /boards/{id}/hotspot/`.
*   **Status**: ❌ **Belum Terimplementasi (Empty List)**.
    *   *Backend*: Mengembalikan `[]`.
    *   *Worker*: `polling_worker.py` memiliki logika untuk `BoardPppoeUsage` dan `HotspotUsageRaw`.
    *   *Rekomendasi*: Hubungkan API dengan tabel hasil polling atau implementasikan *live proxy* ke Mikrotik.

### F. VPN Tab
*   **Tampilan**: Daftar profil VPN (Secret/User).
*   **Sumber Data**: Database (`vpn_profiles`).
*   **Mekanisme**: `GET /boards/{id}/vpn/`.
*   **Status**: ✅ **Terimplementasi (CRUD)**. Data disimpan di database lokal untuk manajemen konfigurasi. Perlu sinkronisasi ke Mikrotik (Provisioning) yang belum diaudit di sini.

## 3. Temuan Kritis & Rekomendasi

1.  **Ambiguitas Sumber Data Interface/PPPoE/Hotspot**:
    *   Frontend meminta data seolah-olah real-time.
    *   Backend memberikan respons dummy.
    *   Worker sebenarnya sudah mengumpulkan data historis.
    *   **Solusi**: Tentukan apakah tab ini untuk *Monitoring Historis* (ambil dari DB) atau *Live Management* (ambil dari Mikrotik saat itu juga). Untuk halaman Detail, biasanya *Live Management* lebih disukai untuk melihat status terkini.

2.  **Ping Check Palsu**:
    *   Fitur ping saat ini hanya simulasi dan menyesatkan jika digunakan untuk diagnosis jaringan nyata.
    *   **Solusi**: Segera ganti dengan logika ping ICMP (misal: `pythonping` atau eksekusi command ping sistem).

3.  **Ketergantungan pada Worker**:
    *   Statistik (CPU/Mem) di frontend bergantung sepenuhnya pada `polling_worker.py`. Jika worker tidak berjalan, angka di dashboard akan *stuck*.
    *   **Solusi**: Tambahkan indikator "Last Updated" di frontend agar user tahu jika data sudah usang.

## 4. Rencana Aksi (Roadmap)

1.  **Fase 1 (Validasi)**: Hapus dummy data. Jika data belum siap, kembalikan error 501 (Not Implemented) atau data kosong yang jujur, daripada data palsu.
2.  **Fase 2 (Integrasi)**: Sambungkan endpoint `/interfaces`, `/pppoe`, `/hotspot` ke mekanisme *Live Fetch* menggunakan `routeros_api` (library yang sudah ada di project).
3.  **Fase 3 (Optimasi)**: Gunakan Redis untuk cache data live selama 5-10 detik untuk mencegah overload ke router Mikrotik jika banyak user merefresh halaman.
