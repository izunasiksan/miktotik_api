# 01. PROBLEM IDENTIFICATION: ANALISIS DATA V2.1

## Ringkasan Eksekutif
Audit terhadap Layanan Analisis Data V2.1 menunjukkan kegagalan operasional yang disebabkan oleh ketidakkonsistenan mendasar antara Frontend dan Backend dalam hal penamaan atribut, tipe data, dan struktur tabel. Hal ini menyebabkan fitur filtering tidak berfungsi, UI mengalami "hang" atau menampilkan data kosong, serta kegagalan dalam proses normalisasi (Stage 0).

## Temuan Masalah Utama

### 1. Ketidakkonsistenan Penamaan Atribut (Naming Convention)
Ditemukan perbedaan gaya penulisan (CamelCase vs snake_case) dan nama atribut fungsional antara berbagai endpoint:
- **Endpoint Normalisasi**: Menggunakan `start_date` dan `end_date`.
- **Endpoint Pipeline**: Menggunakan `start_time` dan `end_time`.
- **Payload Request**: Menggunakan `bucketSource` dan `usageUnit` (CamelCase), sementara service internal mengharapkan `bucket_source` dan `usage_unit` (snake_case).
- **Frontend State**: Menggunakan `timeRange.start` dan `timeRange.end`.

### 2. Mismatch Tipe Data (Data Type Mismatch)
Terjadi degradasi presisi data akibat penggunaan tipe data yang tidak tepat pada level API:
- **Date vs DateTime**: Endpoint `/normalization/preview` menggunakan tipe data `date`, yang memaksa pemotongan (truncation) waktu pada jam/menit/detik. Hal ini menyebabkan analisis sub-day (misal: filter 08:00 - 12:00) tidak mungkin dilakukan di tahap preview.
- **ISO 8601 Parsing**: Terdapat variasi dalam penanganan format ISO 8601 (dengan/tanpa 'Z') yang menyebabkan error parsing pada beberapa skenario environment.

### 3. Masalah Penamaan Tabel (Table Naming)
Penggunaan tabel temporary di Stage 1 (Context Lock) memiliki risiko konflik jika penamaan tidak cukup unik atau jika proses pembersihan (cleanup) gagal:
- **Scoped Dataset**: Penamaan tabel temporary `scoped_...` di PostgreSQL tidak menyertakan identitas task secara eksplisit dalam semua skenario, yang dapat menyebabkan tabrakan data (race condition) pada konkurensi tinggi.

### 4. Struktur Output (Result Schema)
Struktur objek `meta` yang dikembalikan oleh backend tidak sesuai dengan ekspektasi frontend:
- **Nesting Meta**: Backend mengirimkan `meta: { traffic: { validCount: ... } }`, sementara Frontend (NormalizationStage.jsx) mencoba mengakses `meta.validCount` secara langsung. Hal ini menyebabkan UI menampilkan status "Tidak Diketahui" atau 0% akurasi.

## Dampak Bisnis & Teknis
- **User Experience**: Pengguna tidak dapat melakukan filter data dengan akurat.
- **Data Integrity**: Analisis dilakukan pada rentang waktu yang salah akibat truncating date.
- **System Stability**: Error 500 sering terjadi akibat kegagalan validasi skema (Pydantic ValidationError).

---
**Auditor:** AI Pair Programmer
**Target Versi:** V2.3 (Mitigasi & Perbaikan)
