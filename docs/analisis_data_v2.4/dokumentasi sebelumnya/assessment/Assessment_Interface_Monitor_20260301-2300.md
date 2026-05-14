# 📋 TECHNICAL FEATURE ASSESSMENT
**Bahasa Indonesia**
**Tanggal:** 2026-03-01
**Target Assessment:** Live Interface Traffic Monitor
**Domain:** Frontend & Backend
**Severity Level:** MEDIUM

---

## 1. DESKRIPSI & TUJUAN
* **Tujuan Fitur:** Memberikan visualisasi trafik real-time (upload/download) per interface dengan kontrol interval dinamis dan manajemen status interface (enable/disable).
* **Target Pengguna:** Network Administrator yang membutuhkan pemantauan trafik mendalam saat troubleshooting atau monitoring aktif.

## 2. AUDIT TEKNOLOGI & STACK (COMPLIANCE CHECK)
* [x] **Backend:** Menggunakan `async def` (FastAPI) untuk endpoint monitoring? (Rencana: Ya)
* [x] **Database:** Tidak menyimpan data live ke DB (In-Memory/Direct Proxy)? (Rencana: Ya, direct to RouterOS)
* [x] **Frontend:** Menggunakan Recharts untuk visualisasi? (Rencana: Ya)
* [x] **State Management:** Menggunakan React Query atau Custom Hook untuk polling interval? (Rencana: Ya)

## 3. ANALISIS RISIKO (RISK ASSESSMENT)
* **Dampak Sistem:** 
  - Peningkatan beban CPU pada Router Mikrotik jika interval < 3 detik.
  - Peningkatan traffic network antara Backend dan Router.
* **Risiko Downtime:** Rendah (Fitur isolasi, tidak memblokir fungsi utama).
* **Mitigasi:**
  - Validasi interval minimum di Backend (1 detik).
  - Otomatis stop polling saat komponen unmount atau tab tidak aktif (Page Visibility API).

## 4. SPESIFIKASI ALUR (FLOW SPEC)

### A. Tampilan & Interaksi (Frontend)
1.  **Interface List:**
    - Menampilkan daftar interface dengan filter (VLAN, Physical, PPPoE).
    - Baris interface dapat diklik untuk membuka **Live Monitor Panel** (Modal/Drawer).
2.  **Live Monitor Panel:**
    - **Chart:** AreaChart (Recharts) menampilkan `rx-bits-per-second` (Download) dan `tx-bits-per-second` (Upload).
    - **Interval Control:** Slider/Dropdown untuk mengubah interval refresh (1s - 20s). Default: 5s.
    - **Stats:** Menampilkan Total Download & Total Upload (Akumulasi sesi atau counter interface).
    - **Actions:** Tombol Toggle "Enable/Disable" Interface dengan konfirmasi.

### B. Logika Backend (API)
1.  **Endpoint Monitoring:**
    - `GET /api/v1/interfaces/{board_id}/{interface_name}/monitor`
    - Menggunakan perintah Mikrotik `/interface/monitor-traffic` (via API `once` command) untuk mendapatkan data instan `rx-bits-per-second` dan `tx-bits-per-second`.
    - *Alternatif:* Menggunakan `/interface/print` dengan detail stats jika `monitor-traffic` terlalu berat untuk single request HTTP, namun `monitor-traffic` lebih akurat untuk "live speed".
2.  **Endpoint Actions:**
    - `POST /api/v1/interfaces/{board_id}/{interface_name}/toggle` (Body: `{ "action": "enable" | "disable" }`)

## 5. REKOMENDASI & TINDAK LANJUT
* **Keputusan:** **APPROVED** untuk implementasi.
* **Tugas Lanjutan:**
  1.  [Backend] Buat endpoint `monitor_traffic` yang memanggil `routeros_api` command `/interface/monitor-traffic`.
  2.  [Backend] Buat endpoint `toggle_interface` untuk enable/disable.
  3.  [Frontend] Buat komponen `InterfaceTrafficChart` menggunakan Recharts.
  4.  [Frontend] Implementasi logic polling dinamis (bisa berubah interval tanpa reload).
  5.  [Frontend] Tambahkan filter kategori interface di tabel utama.

---
*Assessment dilakukan oleh: AI Assistant (Trae)*
