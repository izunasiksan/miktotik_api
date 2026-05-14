# 📊 BLUEPRINT: LIVE INTERFACE TRAFFIC MONITOR

**Dokumen Resmi | Status: STRICT MODE AKTIF**
**Versi:** 1.0.0
**Tanggal:** 2026-03-01
**Tujuan:** Panduan implementasi fitur monitoring trafik real-time pada interface Mikrotik.

---

## 1. DESKRIPSI ALUR KERJA (USER FLOW)

### 1.1 INTERAKSI PENGGUNA (FRONTEND)
1.  **Navigasi:** Pengguna masuk ke halaman `Reports > Interfaces` atau `Devices > Interfaces`.
2.  **Filter & Seleksi:**
    - Terdapat Filter Dropdown: **"All Types", "Physical", "VLAN", "PPPoE"**.
    - Baris interface menampilkan status (Active/Disabled).
3.  **Monitoring:**
    - Pengguna mengklik salah satu baris interface (misal: `ether1`).
    - **Modal/Drawer** muncul menampilkan **Live Chart Traffic**.
    - Interval Default: **5 detik**.
4.  **Kontrol Dinamis:**
    - Pengguna menggeser slider interval dari 1s hingga 20s.
    - Chart memperbarui kecepatan refresh sesuai nilai slider.
5.  **Manajemen Interface:**
    - Tombol **"Enable/Disable"** tersedia di panel monitoring.
    - Konfirmasi wajib muncul sebelum aksi destruktif (Disable).

### 1.2 LOGIKA SISTEM (BACKEND)
1.  **Endpoint Monitoring:**
    - Menerima request `GET /api/v1/interfaces/{board_id}/{interface_name}/monitor`.
    - Backend mengeksekusi perintah Mikrotik API: `/interface/monitor-traffic interface={name} once`.
    - Mengembalikan JSON: `{ "rx-bits-per-second": 12345, "tx-bits-per-second": 67890 }`.
2.  **Endpoint Actions:**
    - Menerima request `POST /api/v1/interfaces/{board_id}/{interface_name}/toggle`.
    - Backend mengeksekusi perintah Mikrotik API: `/interface/enable` atau `/interface/disable`.
    - Mengembalikan status sukses/gagal.

---

## 2. SPESIFIKASI API & DATA

### 2.1 GET /api/v1/interfaces/{board_id}/{interface_name}/monitor
**Request:**
- Path Param: `board_id` (UUID), `interface_name` (String).
- Query Param: `interval` (Optional, default 5, min 1, max 20) - *Note: Interval dihandle oleh Frontend polling, API hanya mengembalikan data instan saat dipanggil.*

**Response (200 OK):**
```json
{
  "interface": "ether1",
  "rx_bps": 1500000,
  "tx_bps": 500000,
  "rx_total_bytes": 102400000,
  "tx_total_bytes": 51200000,
  "status": "running",
  "timestamp": "2026-03-01T23:05:00Z"
}
```

### 2.2 POST /api/v1/interfaces/{board_id}/{interface_name}/toggle
**Request:**
```json
{
  "action": "enable" // atau "disable"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Interface ether1 enabled successfully."
}
```

---

## 3. IMPLEMENTASI FRONTEND (REACT)

### 3.1 KOMPONEN UTAMA
1.  **`InterfaceList.jsx`**: Menampilkan tabel interface dengan filter.
2.  **`InterfaceMonitorModal.jsx`**: Modal chart monitoring.
3.  **`TrafficChart.jsx`**: Recharts wrapper untuk visualisasi.

### 3.2 STATE MANAGEMENT
- **`useInterval` Hook**: Mengatur polling data setiap X detik.
- **`dataPoints` State**: Array object `{ timestamp, rx, tx }` (Max 60 points).
- **`isMonitoring` State**: Boolean untuk start/stop polling saat modal tertutup.

### 3.3 FILTER LOGIC
- **Type Detection**:
  - `ether*` -> Physical
  - `vlan*` -> VLAN
  - `pppoe-*` -> PPPoE
  - `bridge*` -> Bridge

---

## 4. ATURAN LIVE MONITORING (RULESET)

### 4.1 INTERVAL & PERFORMANCE
- **Default Interval:** 5 detik.
- **Minimum Interval:** 1 detik (Warning: High Load).
- **Maximum Interval:** 20 detik.
- **Auto-Pause:** Polling WAJIB berhenti jika modal ditutup atau tab browser tidak aktif.

### 4.2 DATA VISUALIZATION
- **Unit Konversi:** Bit per second (bps) -> Mbps/Gbps (Auto-scale).
- **Chart Type:** Area Chart (Stacked atau Overlay).
- **Color:** Download (Green/Blue), Upload (Red/Orange).

### 4.3 ERROR HANDLING
- **Timeout:** Jika API timeout > 5s, tampilkan "Connection unstable".
- **Disconnect:** Jika router offline, hentikan polling dan tampilkan error.

---

## 5. RENCANA EKSEKUSI (NEXT STEPS)

1.  [Backend] Implementasi `routeros_api` call untuk `monitor-traffic`.
2.  [Backend] Implementasi `enable/disable` logic.
3.  [Frontend] Buat Modal Monitoring dengan Chart.
4.  [Frontend] Integrasikan API Monitoring ke Chart.
5.  [Frontend] Tambahkan Filter Type di Tabel Interface.

---
*Blueprint dibuat oleh: AI Assistant (Trae)*
