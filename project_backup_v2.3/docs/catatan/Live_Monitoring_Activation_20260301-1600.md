# Live Monitoring Activation: PPPoE & Hotspot

**Tanggal:** 2026-03-01
**Status:** Completed
**Author:** AI Assistant

## Ringkasan Perubahan
Mengaktifkan fitur monitoring dan manajemen sesi pengguna secara langsung (Live) dari router Mikrotik melalui backend API. Ini menggantikan placeholder atau chart historis dengan data real-time dan kemampuan aksi (Disconnect).

## Backend (`boards.py`)
1.  **Response Enhancement:** Menambahkan field `.id` pada endpoint `GET` untuk PPPoE dan Hotspot sessions. Field ini diperlukan untuk operasi penghapusan yang akurat.
2.  **New Endpoints:**
    - `DELETE /boards/{board_id}/pppoe/{username}/`: Menghapus sesi PPPoE aktif.
    - `DELETE /boards/{board_id}/hotspot/{username}/`: Menghapus sesi Hotspot aktif.
    - Implementasi menggunakan `routeros_api` pool dan threading executor untuk operasi async non-blocking.

## Frontend
1.  **New Component (`HotspotMonitor.jsx`):**
    - Komponen baru untuk menampilkan tabel sesi Hotspot aktif secara real-time.
    - Fitur: Auto-refresh (15s), Search/Filter, dan Disconnect User.
    - Menggantikan `HotspotAnalytics.jsx` pada tab "Live Management".
2.  **Updated `RouterDetail.jsx`:**
    - Mengintegrasikan `HotspotMonitor` pada tab "Hotspot".
    - Memastikan konsistensi UI antara Interfaces, PPPoE, Hotspot, dan VPN.

## Manfaat Teknis
- **Real-time Control:** Teknisi dapat melihat dan memutus koneksi pengguna bermasalah secara instan.
- **Accurate Operation:** Penggunaan ID internal RouterOS (`.id`) mencegah kesalahan target saat melakukan disconnect.
- **Improved UX:** Pemisahan jelas antara "Live Monitoring" (operasional) dan "Historical Analytics" (pelaporan).
