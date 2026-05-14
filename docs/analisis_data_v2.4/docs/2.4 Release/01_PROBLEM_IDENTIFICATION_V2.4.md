# 01. PROBLEM IDENTIFICATION: ANALISIS DATA V2.4

## 1. Konteks Masalah
Meskipun pembaruan V2.3 telah berhasil menstandardisasi penamaan atribut (`startTime`, `endTime`) dan mengaktifkan infrastruktur pendukung (Redis/Scheduler), ditemukan isu kritis pada **relevansi data** dan **akurasi filtering**. Layanan analisis data V2.3 dianggap belum layak digunakan secara profesional karena ketidakmampuan menyajikan informasi yang akurat bagi pengguna (UI).

## 2. Deskripsi Masalah (V2.3)
Berdasarkan laporan [issue_v2.3.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/issue_v2.3.md), terdapat tiga domain utama kegagalan:

### A. Kegagalan Filtering & Relevansi Data
- **Data Mismatch**: Data yang ditampilkan seringkali tidak relevan dengan parameter filter yang dipilih (misal: filter 1 jam terakhir menampilkan data dari hari sebelumnya atau data kosong).
- **Logic Fault**: Pengambilan data dari database tidak mengikuti logika bisnis yang seharusnya (misal: salah memilih tabel sumber antara `raw` dan `summary`).
- **Inaccurate Information**: Hasil agregasi (MAX/AVG) memberikan nilai yang tidak masuk akal atau tidak sesuai dengan kondisi trafik real-time Mikrotik.

### B. Kendala Integrasi UI (Frontend)
- **Error Handling Buruk**: UI sering mengalami crash atau menampilkan status "Error" yang tidak deskriptif saat proses filtering gagal di backend.
- **Payload Overload**: Backend mengirimkan data yang terlalu besar atau tidak terstruktur, sehingga menyulitkan frontend untuk melakukan rendering grafik/tabel.
- **Inconsistent State**: Status "Loading" di UI tidak sinkron dengan proses background task (Celery), menyebabkan UI terlihat "hang".

### C. Ketidakpatuhan terhadap Pipeline Analysis
- **Stage 1 Breach**: Adanya indikasi re-filtering pada Stage 2 (Trend) atau Stage 3 (Correlation), yang melanggar prinsip *Context Lock* pada [AUDIT_SCOPE_FILTER_RULE.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/spesifik/01%20AUDIT_SCOPE_FILTER_RULE.md).

## 3. Dampak Bisnis & Operasional
- **Ketidakpercayaan Pengguna**: Pengguna tidak dapat mengandalkan laporan analisis untuk pengambilan keputusan (misal: penambahan bandwidth atau limitasi user).
- **Inefisiensi Sumber Daya**: Server melakukan komputasi berat (query) namun menghasilkan output yang salah, membuang resource CPU dan Memory.
- **Hambatan Pengembangan**: Developer sulit melakukan debug karena banyaknya "false positive" pada log analisis.

## 4. Target Perbaikan V2.4
Update V2.4 bertujuan untuk:
1. Menjamin **100% akurasi data** melalui perbaikan logika filtering di Stage 1.
2. Memastikan **relevansi informasi** dengan menyelaraskan query backend terhadap kebutuhan visualisasi UI.
3. Meningkatkan **resilience UI** terhadap kegagalan filter melalui error handling yang lebih matang.

---
*Dokumen ini merupakan bagian dari siklus perbaikan Analisis Data V2.4.*
