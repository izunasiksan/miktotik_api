# DOKUMENTASI PERUBAHAN: LIVE MONITORING & PAGINATION

**Tanggal:** 2026-03-01
**Kategori:** Backend & Frontend Optimization

## RINGKASAN
Implementasi pagination, server-side filtering, dan perbaikan parsing data pada modul Interface Monitoring untuk menangani jumlah interface yang besar (VLANs) dan meningkatkan UX.

## DETAIL PERUBAHAN

### 1. Backend (`app/api/endpoints/boards.py`)
*   **Endpoint:** `GET /boards/{board_id}/interfaces/`
*   **Perubahan:**
    *   Menambahkan parameter query: `skip` (int, default 0), `limit` (int, default 100), `search` (str), `interface_type` (str).
    *   Implementasi logic filtering dan slicing list Python (`interfaces[skip : skip + limit]`) karena `routeros_api` tidak mendukung server-side pagination native.
    *   Response format diubah menjadi: `{ "data": [...], "total": int, "skip": int, "limit": int }`.
    *   Penambahan error handling spesifik untuk `routeros_api.exceptions.RouterOsApiConnectionError`.

### 2. Frontend Service (`src/services/api.js`)
*   **Fungsi:** `getInterfaces`
*   **Perubahan:**
    *   Update signature function untuk menerima parameter pagination dan filter.
    *   Passing parameter ke Axios request.

### 3. Frontend UI (`src/components/router/InterfaceList.jsx`)
*   **Fitur Baru:**
    *   **Pagination Controls:** Tombol Next/Previous dan indikator halaman.
    *   **Server-side Search:** Input pencarian sekarang memicu API call dengan parameter `search`.
    *   **Filter Type:** Dropdown filter tipe interface memicu API call dengan parameter `interface_type`.
*   **Perbaikan UI:**
    *   Menghapus kolom "Type" (ether/vlan) dan memindahkannya ke teks sekunder kecil di bawah nama interface (sesuai request user).
    *   Menambahkan kolom **Total TX** dan **Total RX** dengan format `formatBytes` (Auto B/KB/MB/GB).
    *   Memperbaiki mapping status: Menggunakan properti `disabled` dari API (sebelumnya `is_disabled` undefined).

### 4. Frontend Modal (`src/components/router/InterfaceMonitorModal.jsx`)
*   **Optimasi:**
    *   Menggunakan `useQuery` dengan polling interval (3 detik) menggantikan `useEffect` manual.
    *   Implementasi `formatBits` untuk live speed (bps/Kbps/Mbps).
    *   Penanganan state `loading` dan `error` yang lebih graceful.

## CATATAN TEKNIS
*   **RouterOS API Limitation:** RouterOS API Protocol (API v1) tidak memiliki fitur `LIMIT/OFFSET` native pada command `/interface/print`. Pagination dilakukan di layer aplikasi (Python) setelah fetch semua data (atau filtered data). Ini adalah trade-off yang dapat diterima untuk skala < 1000 interfaces.
*   **Concurrency:** Koneksi ke RouterOS bersifat sinkronus. Saat ini dijalankan di thread pool default FastAPI. Perlu monitoring jika load meningkat.
