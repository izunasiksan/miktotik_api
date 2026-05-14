# Laporan Perbandingan Dokumentasi & Transisi SSOT (v2.1 - v2.4)

## 1. Ringkasan Eksekutif
Laporan ini merinci proses ekstraksi, perbandingan, dan transisi dari dokumentasi historis (v2.1, v2.3) ke dokumentasi terbaru v2.4. Tujuan utama adalah memastikan **Analisis Data v2.4** menjadi satu-satunya sumber kebenaran (*Single Source of Truth*) dengan mengadopsi kekuatan arsitektur masa lalu sambil memperbaiki kegagalan operasional yang teridentifikasi.

---

## 2. Analisis Perbandingan: Adopsi, Modifikasi, & Eliminasi

### **A. Elemen yang Diadopsi (Kekuatan Historis)**
- **Pipeline 8-Tahap (Stage 0-7)**: Struktur pipeline dari v2.1 tetap dipertahankan karena secara arsitektural sudah sangat matang.
- **Context Locking (Stage 1)**: Penggunaan *Temporary Tables* untuk mengunci dataset (v2.1) tetap menjadi standar utama untuk menjamin integritas data.
- **Raw Data Primary**: Prinsip bahwa filtering harus dilakukan pada data mentah (*SSOT*) sebelum agregasi tetap dipertahankan.

### **B. Elemen yang Dimodifikasi (Peningkatan v2.4)**
- **Standardisasi Penamaan**: 
    - *Lama (v2.1)*: Inkonsistensi `start_date` vs `start_time`.
    - *Baru (v2.4)*: Penyeragaman total ke format ISO-8601 dengan nama atribut `startTime` dan `endTime` di seluruh layer (Frontend & Backend).
- **Strategi Normalisasi (Stage 0)**:
    - *Lama*: Imputasi linear sederhana.
    - *Baru*: Penambahan validasi `accuracy_pct` yang lebih ketat dan penanganan *gap* data yang lebih cerdas untuk visualisasi UI yang lebih halus.
- **Keamanan Password**:
    - *Lama*: Standar Argon2/AES-256 (Kritikal).
    - *Baru*: Fleksibilitas "Development-First" (default 'root' untuk dev) dengan tetap mewajibkan enkripsi AES-256 untuk kredensial Mikrotik.

### **C. Elemen yang Dieliminasi (Masalah Teratasi)**
- **Dual Naming Convention**: Menghilangkan penggunaan *CamelCase* di payload backend (v2.1/v2.3) untuk menghindari error parsing `ModuleNotFoundError` atau `ValidationError`.
- **Async-Sync Mix di Celery**: Menghilangkan pola `loop.run_until_complete` yang berisiko *blocking* (teridentifikasi di audit v2.4) dan beralih ke manajemen event loop yang lebih aman.
- **Apscheduler di Main Process**: Menghilangkan ketergantungan pada penjadwal internal FastAPI untuk tugas berat, memindahkannya sepenuhnya ke Celery Beat.

---

## 3. Matriks Perubahan Arsitektur

| Komponen | Status v2.1/v2.3 | Status v2.4 (SSOT) | Justifikasi |
| :--- | :--- | :--- | :--- |
| **Data Source** | Raw & Summary (Campuran) | **Strict Raw Primary** | Menjamin akurasi 100% pada filtering. |
| **Time Precision** | Date (Truncated) | **DateTime (Microsecond)** | Memungkinkan filter sub-day yang akurat. |
| **Task Runner** | Apscheduler + Celery | **Celery Beat (Dedicated)** | Mencegah *Event Loop Blocking* di API. |
| **Redis Client** | Native Client | **SafeRedisClient (Fail-Open)** | Meningkatkan reliabilitas saat Redis down. |
| **UI Interaction** | Direct Meta Access | **Structured Schema Proxy** | Mencegah crash UI akibat nesting data. |

---

## 4. Validasi SSOT (Single Source of Truth)
Dokumentasi v2.4 di folder `docs/` telah divalidasi untuk mencakup seluruh aspek kritis dari versi sebelumnya:
1. **Integritas**: Mempertahankan prinsip *Context Lock* Stage 1.
2. **Keamanan**: Mempertahankan standar enkripsi kredensial.
3. **Performa**: Memperbaiki bottleneck penjadwalan tugas.
4. **Usability**: Menjamin relevansi data antara UI dan Database.

**Keputusan Strategis**: Mulai tanggal 06 Maret 2026, seluruh pengembangan WAJIB mengacu pada folder `e:\mikrotik_api\docs\analisis_data_v2.4\docs\`. Dokumentasi di folder `dokumentasi sebelumnya/` hanya bersifat arsip dan tidak boleh dijadikan referensi implementasi kode baru.

---
*Laporan ini disusun oleh AI Pair Programmer untuk memastikan transisi teknologi yang mulus.*
