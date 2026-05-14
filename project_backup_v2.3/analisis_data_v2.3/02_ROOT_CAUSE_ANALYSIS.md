# 02. ROOT CAUSE ANALYSIS: ANALISIS DATA V2.1

## Latar Belakang
Kegagalan filtering dan error UI pada Analisis Data V2.1 berakar dari transisi arsitektur yang tidak tuntas antara V2.0 ke V2.1. Implementasi dilakukan secara terpisah (backend-first vs frontend-later) tanpa validasi skema kontrak API yang sinkron.

## Analisis Akar Masalah (Root Causes)

### 1. Divergensi Kontrak API (API Contract Divergence)
Akar masalah terbesar adalah penggunaan model data yang berbeda untuk fungsionalitas yang sama:
- **Penyebab**: `NormalizationRequest` di `normalization_v2.py` didesain untuk preview harian (tipe data `date`), sementara pipeline utama (`analysis_v2.py`) didesain untuk presisi tinggi (tipe data `datetime`).
- **Dampak**: Frontend mengirimkan payload yang tidak seragam, sehingga backend menolak request atau mengolah data dengan rentang waktu yang tidak sesuai.

### 2. Inkonsistensi Penamaan Atribut (Naming Inconsistency)
- **Penyebab**: Kurangnya standarisasi dalam penulisan skema model (mix of camelCase dan snake_case).
- **Detail**: Frontend (Vite/React) cenderung menggunakan camelCase (`bucketSource`), sementara Backend (FastAPI/SQLAlchemy) menggunakan snake_case (`bucket_source`). Pada implementasi V2.1, pemetaan (mapping) antara keduanya tidak dilakukan secara otomatis oleh Pydantic alias, melainkan manual dan tidak lengkap.

### 3. Struktur Output JSON Tidak Terstandarisasi
- **Penyebab**: Perubahan skema output pada service `normalization_v2.py` yang menambahkan nesting (`meta.traffic` dan `meta.resource`) tidak diikuti dengan update pada komponen frontend `NormalizationStage.jsx`.
- **Dampak**: Properti `accuracy_pct` yang sebelumnya berada di top-level menjadi "hilang" dari pandangan UI, menyebabkan komponen `DataQualityAlert` tidak dapat menampilkan status akurasi data yang benar.

### 4. Fragmentasi State Management (Store vs Local State)
- **Penyebab**: Meskipun `zustand` sudah diperkenalkan di `analysisStore.js`, beberapa komponen masih menyimpan state filter secara lokal atau melakukan pemrosesan data mentah di level komponen.
- **Dampak**: "Race condition" terjadi saat `timeRange` diubah namun store global belum ter-update sepenuhnya sebelum request API dikirimkan.

### 5. Kurangnya Validasi ISO 8601 yang Ketat
- **Penyebab**: Perbedaan cara frontend menghasilkan string ISO (dengan `toISOString()`) dan ekspektasi backend terhadap zona waktu (UTC 'Z' suffix).
- **Dampak**: Truncation manual string di frontend (`split('T')[0]`) untuk memenuhi kebutuhan endpoint `date` mengakibatkan hilangnya presisi waktu yang sangat dibutuhkan untuk analisis performa (Stage 2-5).

## Kesimpulan
Kesalahan bukan pada algoritma analisis itu sendiri, melainkan pada **antarmuka komunikasi (API Interface)** dan **sinkronisasi metadata**. Pembaruan V2.3 harus fokus pada penyatuan kontrak API dan standardisasi penamaan atribut di seluruh ekosistem aplikasi.

---
**Auditor:** AI Pair Programmer
**Target Versi:** V2.3 (Mitigasi & Perbaikan)
