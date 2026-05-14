# 🎓 PANDUAN RINGKAS: CARA MEMBACA GRAFIK ANALISIS (PURE HISTORICAL)

Panduan ini membantu Anda memahami data yang ditampilkan di dashboard analisis berdasarkan 7-Step Workflow.

---

### 1️⃣ Memahami Tren (Trend Line)
- **Apa itu?**: Garis diagonal (regresi linear) di grafik.
- **Cara Baca**: 
  - Jika garis **Naik**, artinya penggunaan bandwidth atau user bertumbuh secara organik.
  - Jika garis **Datar**, kondisi stabil.
  - Jika garis **Turun**, ada penurunan penggunaan.
- **Tindakan**: Gunakan untuk perencanaan kapasitas 1-3 bulan ke depan.

### 2️⃣ Hubungan Data (Korelasi)
- **Apa itu?**: Grafik sebaran (scatter) yang membandingkan dua variabel (misal: Trafik vs CPU).
- **Cara Baca**:
  - Titik membentuk garis diagonal = Korelasi Tinggi (Wajar: Trafik naik, CPU naik).
  - Titik menyebar acak = Tidak Ada Hubungan (Cek apakah ada proses background di router).
- **Tindakan**: Jika CPU tinggi tapi trafik rendah, router mungkin sedang mengalami beban sistem berat (bukan trafik).

### 3️⃣ Jam Sibuk (Peak Hour)
- **Apa itu?**: Grafik batang/area per jam.
- **Cara Baca**: Cari puncak tertinggi (Peak).
- **Tindakan**: Jangan lakukan maintenance atau perubahan konfigurasi di jam ini.

### 4️⃣ Deteksi Anomali (Z-Score)
- **Apa itu?**: Titik-titik berwarna merah yang berada di luar garis putus-putus.
- **Cara Baca**: 
  - Skor **> 2.0** = Kejadian luar biasa (lonjakan trafik mendadak atau gangguan).
  - Skor **Kritis (> 2.5)** = Perlu audit segera.
- **Tindakan**: Klik detail anomali untuk melihat kapan kejadian tersebut terjadi dan bandingkan dengan log kejadian di lapangan.

### 5️⃣ Kapasitas & P95 (Bottleneck)
- **Apa itu?**: Nilai P95 (Percentile 95).
- **Cara Baca**: Mengabaikan 5% lonjakan tertinggi untuk mendapatkan nilai beban "asli" yang harus ditanggung link.
- **Tindakan**: Jika P95 sudah mendekati 90% dari total bandwidth, segera lakukan upgrade.

---

**Ingat**: Seluruh data ini adalah **Pure Historical Data** dari database PostgreSQL (Data 30 hari terakhir). Data tidak diambil secara real-time dari Mikrotik saat Anda membuka halaman ini untuk menjaga performa router tetap optimal.
