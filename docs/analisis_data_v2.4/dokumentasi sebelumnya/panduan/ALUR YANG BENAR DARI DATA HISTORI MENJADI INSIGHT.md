# 🚀 ALUR DATA HISTORI MENJADI INSIGHT (7-STEP WORKFLOW)

Dokumen ini menjelaskan alur teknis dan logis transformasi data mentah di PostgreSQL menjadi keputusan strategis (Insight) yang digunakan dalam aplikasi Mikrotik API Monitoring.

---

### 1️⃣ AUDIT (Validasi & Kesiapan Data)
**Tujuan**: Memastikan data historis lengkap dan bersih sebelum dianalisis.
- **Validasi**: Cek kelengkapan data 30 hari terakhir (Raw Data Retention Policy).
- **Integritas**: Pastikan tidak ada *missing values* atau *extreme outliers* akibat kegagalan polling.
- **Pure Historical**: Memastikan data berasal 100% dari database, bukan API real-time.
- **Threshold**: Menentukan batas minimum data yang layak diolah (misal: min 24 jam data kontinu).

### 2️⃣ TREND (Pola Pertumbuhan)
**Tujuan**: Melihat arah pergerakan variabel dalam rentang waktu panjang.
- **Metode**: Menggunakan *Linear Regression* untuk menentukan garis tren.
- **Indikator**: Pertumbuhan trafik (Download/Upload), kenaikan user aktif (Hotspot/PPPoE).
- **Signifikansi**: Apakah kenaikan trafik bersifat organik (bertahap) atau mendadak?

### 3️⃣ KORELASI (Hubungan Antar Variabel)
**Tujuan**: Mencari "Penyebab" melalui hubungan statistik antar data.
- **Analisis**: Hubungan antara *Traffic vs User Active* atau *Traffic vs CPU Load*.
- **Metode**: *Pearson Correlation Coefficient*.
- **Insight Awal**: Jika trafik naik tapi user tetap, kemungkinan ada *heavy downloader* atau anomali pada salah satu interface.

### 4️⃣ KEBIASAAN (Pola Waktu & Peak Hour)
**Tujuan**: Memetakan perilaku jaringan berdasarkan dimensi waktu (Jam/Hari).
- **Agregasi**: Menghitung rata-rata per jam dalam 7 hari terakhir.
- **Identifikasi**: Kapan *Peak Hour* terjadi? (Pagi jam 09:00 atau Malam jam 20:00).
- **Optimasi**: Dasar penentuan jadwal maintenance agar tidak mengganggu jam sibuk.

### 5️⃣ ANOMALI (Deteksi Penyimpangan)
**Tujuan**: Menemukan kejadian luar biasa yang bukan bagian dari tren normal.
- **Metode**: *Z-Score Analysis* (Data dengan skor > 2.0 dianggap anomali).
- **Contoh**: *Spike* trafik mendadak di jam 02:00 pagi saat user sedang rendah.
- **Validasi**: Membedakan antara *Event* (kejadian khusus satu kali) vs *Trend* (pola berulang).

### 6️⃣ KAPASITAS (Prediksi & Bottleneck)
**Tujuan**: Menentukan sisa umur resource sebelum mencapai batas (Threshold).
- **Forecasting**: Prediksi kapan *CPU Load* atau *Bandwidth* akan menyentuh 90%.
- **Bottleneck**: Identifikasi interface mana yang paling sering mendekati kapasitas maksimal (P95 Traffic).
- **Perencanaan**: Dasar pengajuan upgrade perangkat atau penambahan bandwidth.

### 7️⃣ INSIGHT & KEPUTUSAN
**Tujuan**: Menjawab "Apa yang harus dilakukan?" berdasarkan 6 langkah sebelumnya.
- **Struktur Insight**:
    1. **Apa yang terjadi?** (Fakta: Trafik naik 20% di Site A).
    2. **Mengapa terjadi?** (Penyebab: Korelasi tinggi dengan penambahan user PPPoE).
    3. **Apa dampaknya?** (Risiko: Kapasitas penuh dalam 2 minggu ke depan).
    4. **Apa tindakannya?** (Rekomendasi: Upgrade uplink atau redistribusi user).

---

### 💡 PRINSIP UTAMA
> **Data + Konteks = Informasi**
> **Informasi + Analisis = Insight**
> **Insight + Tindakan = Keputusan Bisnis**

**Catatan Teknis**: 
- Seluruh analisis wajib menggunakan data agregasi (Daily/Monthly) untuk performa query.
- Gunakan data mentah (Raw) hanya pada tahap **Audit** dan **Anomali**.