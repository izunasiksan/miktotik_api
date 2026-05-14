# Fitur Filtering Insight

Dokumen ini merinci fitur filtering yang tersedia pada modul Analysis Insight, termasuk fitur yang telah diadopsi dari halaman Reports lama untuk meningkatkan fleksibilitas analisis.

## 1. Filter Global (Global Controls)
Filter ini mengontrol cakupan data untuk seluruh dashboard insight.
- **Board Selector**: Memilih perangkat MikroTik tertentu atau opsi "All Boards" (mendatang) untuk analisis agregat.
- **Periode (Daily/Monthly)**: Menentukan resolusi data (Harian atau Bulanan).
- **Date Range Picker**: Filter tanggal kustom menggunakan `startDate` dan `endDate`. Jika dipilih, filter ini akan mengesampingkan limit default.
- **Data Limit**: Memilih jumlah titik data (7, 14, 30, 60, 90) saat filter tanggal tidak digunakan.
- **Usage Unit (MB/GB/TB)**: Skala satuan data untuk seluruh metrik traffic.
- **Compare Previous**: Menampilkan perbandingan performa dengan periode waktu sebelumnya (Delta).

## 2. Fitur yang Diadopsi dari Reports.jsx
Berikut adalah fitur filtering lanjutan yang telah/dapat diadopsi untuk memperkaya modul Insight:

### A. Pencarian Nama (Name Filter)
- **Fungsi**: Memungkinkan pengguna mencari string tertentu pada kolom Interface Name, Username PPPoE, atau Hotspot User.
- **Lokasi**: Tersedia pada tab detail (Interfaces, PPPoE, Hotspot).

### B. Mode Agregasi Pivot (Pivot Aggregation)
- **Fungsi**: Memilih metode perhitungan saat data dikelompokkan (Pivot).
- **Opsi**: `Sum` (Total), `Max` (Puncak), `Avg` (Rata-rata).
- **Kegunaan**: Berguna untuk melihat total traffic pelanggan selama sebulan (`Sum`) vs traffic tertinggi yang pernah dicapai (`Max`).
- **Status**: **Sudah Terintegrasi** di dashboard Insight. Opsi ini akan muncul secara otomatis saat pengguna membuka tab Interfaces, PPPoE, Hotspot, atau Clients.

### C. Client Limit
- **Fungsi**: Mengatur jumlah baris data yang diambil khusus untuk statistik klien (PPPoE/Hotspot).
- **Default**: 60-100 baris.

### D. Tampilan Kompak (Compact Mode)
- **Fungsi**: Mengurangi padding dan ukuran chart agar lebih banyak informasi tampil dalam satu layar tanpa scroll berlebih.

## 3. Strategi Implementasi
Semua filter ini dipusatkan di komponen `GlobalControls.jsx` dan dikelola oleh state di `Analysis.jsx`. Data diproses secara reaktif menggunakan `useMemo` di dalam hook `useAnalysisData.js` untuk memastikan performa tetap optimal meskipun menggunakan filter yang kompleks.

---
*Dokumen ini diperbarui secara berkala sesuai dengan penambahan fitur filtering baru.*
