# Peta Navigasi Mikrotik Management System

Dokumen ini memetakan struktur navigasi aplikasi untuk memastikan konektivitas antar halaman yang jelas dan konsisten.

## Struktur Hierarki

### Level 0: Root
- **Login** (`/login`): Pintu masuk aplikasi. Redirect otomatis jika belum terautentikasi.
- **App Layout** (`/`): Wrapper utama yang berisi Sidebar, Navbar, dan Breadcrumbs.

### Level 1: Menu Utama (Sidebar)
Semua menu ini dapat diakses langsung dari Sidebar dan memiliki Breadcrumb `Home > [Nama Menu]`.

1. **Dashboard** (`/`)
   - Pusat informasi dan ringkasan status sistem.
   - **Navigasi Internal**: Widget dapat diklik (opsional) untuk menuju ke menu terkait (misal: klik widget "Total Router" -> `/boards`).

2. **Devices (Router List)** (`/boards`)
   - Daftar semua router yang terdaftar.
   - **Aksi**: 
     - Klik baris tabel -> Menuju ke **Router Detail**.
     - Tombol "Add Router" -> Modal Tambah Router.

3. **Reports** (`/reports`)
   - Laporan statistik dan performa.
   - **Navigasi Internal (Tabs)**:
     - Summary (Ringkasan Harian/Bulanan)
     - Interfaces
     - PPPoE
     - Hotspot

4. **Automation** (`/automation`)
   - Manajemen tugas otomatis dan konfigurasi massal.
   - **Aksi**: Tombol "New Job" -> Modal Buat Job Baru.

5. **ZTP Queue** (`/ztp`)
   - Antrian Zero Touch Provisioning.
   - **Aksi**: Approve/Reject router yang menunggu provisioning.

6. **Users** (`/users`) *[Admin Only]*
   - Manajemen pengguna aplikasi.
   - **Aksi**: Tambah/Edit/Hapus User.

7. **Audit Logs** (`/audit-logs`) *[Admin Only]*
   - Riwayat aktivitas sistem.
   - Read-only.

8. **Settings** (`/settings`)
   - Konfigurasi global aplikasi.

### Level 2: Detail Pages
Halaman ini tidak ada di sidebar, diakses melalui interaksi di Level 1.

1. **Router Detail** (`/boards/:id`)
   - **Akses**: Dari `/boards`.
   - **Breadcrumb**: `Home > Devices > [Router Name/Details]`
   - **Navigasi Kembali**: 
     - Breadcrumb Link (`Devices`).
     - Tombol `< Back` di header halaman.
   - **Navigasi Internal (Tabs)**:
     - Overview
     - Interfaces
     - Logs
     - Backups
     - PPPoE
     - Hotspot
     - VPN

### Level Khusus: Isolated Tools
Halaman ini sengaja dipisahkan dari layout utama untuk keamanan atau kebutuhan tampilan penuh.

1. **Developer Console** (`/developer`) *[Super Admin Only]*
   - **Akses**: URL Manual (Hidden Feature).
   - **Tampilan**: Full Screen (Tanpa Sidebar/Navbar standar).
   - **Navigasi Kembali**: Tombol `<` (Back to Dashboard) di header console.

## Komponen Navigasi

### 1. Sidebar
- **Fungsi**: Navigasi utama antar modul.
- **Perilaku**: 
  - Responsif (Drawer di mobile, Fixed di desktop).
  - Menandai menu aktif.

### 2. Breadcrumbs
- **Lokasi**: Di atas konten utama setiap halaman (kecuali Dashboard).
- **Format**: `Home > Parent > Child`.
- **Fungsi**: Memberikan konteks lokasi dan navigasi cepat ke level sebelumnya.

### 3. Action Buttons
- **Back Button**: Ikon panah kiri (`ArrowLeft`) pada halaman detail dan Developer Console.
- **Links**: Teks berwarna biru atau tombol ikon untuk navigasi kontekstual.
