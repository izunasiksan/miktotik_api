# Dokumentasi Implementasi Interface Monitor
**Tanggal:** 2026-03-01 23:15
**Kategori:** Backend & Frontend
**Fitur:** Real-time Interface Traffic Monitor & Control

## 1. Ringkasan Perubahan
Implementasi fitur monitoring trafik interface secara real-time (live) dan kontrol status interface (Enable/Disable) pada dashboard router detail.

## 2. File yang Dimodifikasi/Dibuat

### Backend
*   `app/api/endpoints/boards.py`:
    *   Menambahkan endpoint `GET /{board_id}/interfaces/{interface_name}/monitor`: Mengambil data trafik RX/TX realtime dari Mikrotik.
    *   Menambahkan endpoint `POST /{board_id}/interfaces/{interface_name}/toggle`: Mengubah status interface (Enable/Disable).

### Frontend
*   `src/services/api.js`:
    *   Menambahkan fungsi `getInterfaceTraffic(boardId, interfaceName)`.
    *   Menambahkan fungsi `toggleInterface(boardId, interfaceName, action)`.
*   `src/components/router/InterfaceList.jsx`:
    *   Integrasi `InterfaceMonitorModal`.
    *   Menambahkan tombol aksi "Monitor" dan "Enable/Disable".
    *   Menambahkan fitur pencarian (search) dan filter tipe interface (Ethernet, VLAN, Bridge, PPPoE).
*   `src/components/router/InterfaceMonitorModal.jsx` (BARU):
    *   Komponen modal untuk menampilkan grafik trafik realtime (Area Chart).
    *   Kontrol interval refresh (1-20 detik).
    *   Peringatan penggunaan CPU tinggi jika interval < 3 detik.
    *   Pembersihan interval otomatis (cleanup) saat modal ditutup untuk mencegah memory leak.

## 3. Alur Logika (Logic Flow)
1.  **Monitoring:**
    *   Frontend meminta data ke endpoint `/monitor` setiap N detik (default 5s).
    *   Backend melakukan koneksi SSH/API ke router Mikrotik menggunakan `routeros_api` (sinkronus) yang dibungkus dalam `run_in_executor` (asinkronus) agar tidak memblokir event loop FastAPI.
    *   Data dikembalikan ke Frontend dan ditampilkan dalam grafik `recharts`.
2.  **Toggle Status:**
    *   User menekan tombol Enable/Disable.
    *   Frontend memanggil endpoint `/toggle`.
    *   Backend mengeksekusi perintah `/interface/enable` atau `/interface/disable` ke router.
    *   Frontend melakukan invalidasi query React Query untuk memperbarui daftar interface.

## 4. Catatan Keamanan & Performa
*   Koneksi ke router menggunakan kredensial terenkripsi.
*   Interval monitoring dibatasi minimal 1 detik di frontend.
*   Peringatan visual diberikan jika interval terlalu agresif.
