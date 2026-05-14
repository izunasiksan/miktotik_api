# Alur Kerja Monitoring Live (Real-Time Management)

Dokumen ini menjelaskan alur kerja sistem monitoring dan manajemen langsung (live) yang berinteraksi dengan router Mikrotik secara real-time saat diminta oleh pengguna.

## 1. Definisi & Tujuan
Monitoring Live bertujuan untuk memberikan visibilitas status terkini dan kemampuan kontrol langsung terhadap perangkat. Data ini diambil **SAAT ITU JUGA** (On-Demand) ketika user membuka halaman atau menekan tombol, dan umumnya tidak disimpan permanen di database statistik.

## 2. Komponen Terlibat
1.  **Frontend**: Pemicu permintaan (User Action).
2.  **API Backend**: Perantara (Proxy) yang meneruskan permintaan ke router.
3.  **RouterOS API (`routeros_api`)**: Driver komunikasi ke perangkat Mikrotik.
4.  **Redis Cache (Opsional)**: Penyimpanan sementara untuk mencegah overload request berulang dalam waktu singkat.
5.  **Perangkat Mikrotik**: Sumber data utama.

## 3. Alur Kerja (Workflow)

### A. Permintaan Data (Live Fetch)
1.  **Trigger**: User membuka tab spesifik (misal: "Interfaces") atau menekan tombol (misal: "Ping Check").
2.  **API Call**: Frontend memanggil endpoint API (misal: `GET /boards/{id}/interfaces/live`).
3.  **Auth Check**: Backend memvalidasi sesi user dan izin akses.
4.  **Connection**: Backend membuka koneksi API sementara ke router target menggunakan kredensial yang tersimpan (dekripsi password on-the-fly).
5.  **Execution**: Backend mengirim perintah API Mikrotik (misal: `/interface/print`, `/ping`, `/system/reboot`).

### B. Respons & Caching
1.  **Raw Response**: Router mengembalikan hasil perintah.
2.  **Processing**: Backend memproses hasil (filtering, formatting).
3.  **Caching (Short-Term)**: Jika fitur cache aktif, hasil disimpan di Redis dengan TTL singkat (5-10 detik).
    *   *Jika request berikutnya datang dalam < 5 detik, data diambil dari Redis.*
4.  **Return**: Data dikirimkan kembali ke Frontend.

### C. Aksi Manajemen (Write Operations)
1.  **Command**: User melakukan aksi (misal: Disable Interface, Kick User Hotspot).
2.  **Execution**: Backend mengirim perintah "Set" atau "Remove" ke router.
3.  **Verification**: Backend memverifikasi keberhasilan perintah (biasanya via return code atau trap error).
4.  **Feedback**: User menerima notifikasi sukses/gagal (Toast Notification).

## 4. Tab & Fitur Terkait
Fitur berikut di Dashboard menggunakan mekanisme Monitoring Live:
*   **Interfaces Tab**: Status link, traffic rate saat ini, error packet.
*   **PPPoE Tab**: Daftar user aktif saat ini, kick user.
*   **Hotspot Tab**: Daftar host aktif, session time, kick user.
*   **VPN Tab (Status)**: Status koneksi VPN aktif.
*   **Tools/Diagnostics**: Ping, Traceroute, Torch, Reboot, Shutdown.
*   **Terminal**: Web Terminal (jika diimplementasikan).

## 5. Penanganan Kegagalan (Error Handling)
*   **Timeout**: Jika router tidak merespons dalam X detik (default: 5-10s), API mengembalikan timeout error.
*   **Unreachable**: Jika router mati/offline, API mengembalikan status 503 Service Unavailable atau pesan error spesifik.
*   **Auth Failure**: Jika password router berubah dan tidak sesuai database, API mengembalikan error otentikasi.
