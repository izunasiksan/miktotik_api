# Aturan Kerja Audit & Validasi Data (audit.jsx)

Dokumen ini menjelaskan aturan-aturan, kebijakan, dan batas (threshold) yang digunakan dalam proses audit data pada modul Audit & Validasi Data.

## 1. Aturan Validasi Kualitas Data (Quality Audit)
Proses audit kualitas memeriksa integritas setiap baris data (row-level) berdasarkan parameter berikut:

### 1.1 Deteksi Nilai Null & NaN
- Setiap kolom wajib memiliki nilai.
- Jika kolom bernilai `null`, `undefined`, atau `NaN`, baris data tersebut dianggap cacat kualitas.
- Data cacat ini ditampilkan di tabel temuan (Findings) dengan label **Data Null/NaN**.

### 1.2 Deteksi Nilai di Luar Batas (Out of Bounds)
- **CPU Usage**: Maksimum 100%. Nilai > 100 dianggap data sampah (garbage data).
- **Memory Usage**: Maksimum 100%. Nilai > 100 dianggap data sampah.
- **Traffic Usage**: Nilai negatif dianggap tidak valid.

## 2. Aturan Integritas Timeline (Timeline Integrity)
Proses audit integritas memeriksa urutan dan kesinambungan data time-series.

### 2.1 Deteksi Celah Waktu (Gap Detection)
- Data time-series diurutkan berdasarkan timestamp terbaru.
- Jika selisih waktu antara dua baris data yang berurutan melebihi 2x lipat dari rata-rata interval data, maka dianggap terdapat **Time Gap (Celah Data)**.
- Interval standar yang diharapkan adalah berdasarkan periode sampling (misal: 1 menit, 5 menit, dst).

## 3. Aturan Validasi Metodologi (Methodology Validation)
Aturan untuk menentukan apakah data sudah siap untuk diolah menjadi insight (Insight Readiness).

### 3.1 Kecukupan Sampel
- Minimal sampel data untuk menghasilkan insight yang valid adalah 10 sampel.
- Jika sampel < 10, insight akan diberi peringatan "Kurang Data".

### 3.2 Korelasi & Anomali
- Insight dianggap "Berbobot" jika terdapat korelasi antara resource usage dan traffic usage.
- Anomali yang terdeteksi harus memiliki validitas > 70% berdasarkan skor korelasi.

## 4. Aturan Arsitektur Kode (Refactoring Rules)
Berdasarkan aturan workspace `filespesifik.md`, struktur kode `audit.jsx` harus mengikuti kebijakan berikut:

### 4.1 Pemisahan Komponen (Component Separation)
- Komponen UI yang besar (> 200 baris) wajib dipecah menjadi sub-komponen kecil.
- Sub-komponen disimpan di folder `components/` lokal pada modul tersebut.

### 4.2 Logika dalam Hooks (Hooks-based Logic)
- Seluruh logika pemrosesan data (fetch, filter, state, audit) dilarang berada langsung di file `.jsx` utama.
- Logika wajib dipindahkan ke custom hook di folder `hooks/` lokal (misal: `useAnalysisAuditLogic.js`).

### 4.3 Pemformatan Data (Formatting Rules)
- **Unit Bytes**: Gunakan fungsi `formatBytesAuto` untuk konversi otomatis ke KB/MB/GB/TB.
- **Waktu**: Gunakan format `HH:mm:ss` untuk tabel detail dan `DD/MM HH:mm` untuk tabel pivot.
- **Angka**: Maksimum 2 angka di belakang koma (decimal places).
