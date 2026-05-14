# Perbandingan: ScopeFilterStage.md vs AUDIT_SCOPE_FILTER_FLOW.md

## Ringkasan Perbandingan
Kedua dokumen ini saling melengkapi dalam arsitektur sistem analisis data, namun memiliki fokus yang berbeda: satu pada **implementasi antarmuka (UI)** dan satu pada **logika bisnis/alur data (Backend/Database)**.

| Dimensi | [ScopeFilterStage.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/ScopeFilterStage.md) | [01 AUDIT_SCOPE_FILTER_FLOW.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/analisis%20data%20v2/spesifik/01%20AUDIT_SCOPE_FILTER_FLOW.md) |
| :--- | :--- | :--- |
| **Fokus Utama** | Implementasi Frontend (React Component) | Arsitektur & Logika Pipeline (Backend/DB) |
| **Versi** | **V2.4.1** (CamelCase, Atomic Design) | **V2.1** (Raw Data Primary, Initial Indexing) |
| **Target Pengguna** | Frontend Developer / UI Engineer | Backend Developer / Data Engineer / Auditor |
| **Cakupan Teknis** | React Hooks, Zustand, Tailwind, Lucide Icons | SQL, SSOT, Pipeline Stages (0-7), Gap Management |
| **Unit Penggerak** | User Interaction (Klik, Input, Select) | Automated Pipeline / Async Processing |

---

## Detail Analisis

### 1. Evolusi Versi (V2.1 vs V2.4.1)
- **AUDIT_SCOPE_FILTER_FLOW (V2.1)** menetapkan fondasi teknis: penggunaan Raw Data sebagai SSOT, pentingnya indexing `(board_id, log_time DESC)`, dan struktur 8 stage analisis.
- **ScopeFilterStage.md (V2.4.1)** adalah manifestasi modern dari Stage 1 tersebut di sisi frontend. Perubahan besar di versi ini adalah sinkronisasi penamaan (camelCase) untuk request/response API sesuai aturan workspace terbaru.

### 2. Implementasi Prinsip "Context Lock"
- **Logic (V2.1)**: Menyebutkan perlunya mengunci konteks analisis untuk menjaga integritas data antar stage.
- **UI (V2.4.1)**: Mengimplementasikan "Context Lock (P0)" secara nyata menggunakan `isLocked` state di global store (Zustand). Saat terkunci, input UI (Router selection, Time Range) dinonaktifkan untuk mencegah perubahan parameter di tengah proses.

### 3. Pre-Flight Validation
- **Logic (V2.1)**: Mewajibkan validasi 4 bagian (Domain, Dampak, Hasil Teknis, Rekomendasi).
- **UI (V2.4.1)**: Menyediakan tombol "Run Pre-Flight" yang memanggil API `getNormalizationStatus`. UI menampilkan peringatan jika `accuracyPct < 100%`, menjalankan rekomendasi teknis secara otomatis sebelum pipeline dimulai.

### 4. Sumber Data (SSOT)
- **Logic (V2.1)**: Menekankan penggunaan Raw Data sebagai SSOT dan melarang penggunaan summary table sebagai sumber utama filtering. 
- **Database Mapping**: Perlu dicatat bahwa **`board_usage_stats`** dalam dokumen logic merujuk pada tabel **`board_interface_usage`** di PostgreSQL.
- **UI (V2.4.1)**: Memastikan parameter yang dikirim ke backend (via `executeAnalysisAsync`) mencakup `boardId` dan `startTime/endTime` yang tepat, sehingga backend dapat memproses Raw Data sesuai prinsip SSOT.

## Kesimpulan
[ScopeFilterStage.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/ScopeFilterStage.md) adalah panduan **bagaimana cara membangun** antarmuka yang patuh, sementara [AUDIT_SCOPE_FILTER_FLOW.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/analisis%20data%20v2/spesifik/01%20AUDIT_SCOPE_FILTER_FLOW.md) adalah panduan **apa aturannya** dan **mengapa** alur tersebut harus diikuti. Kepatuhan V2.4.1 terhadap prinsip V2.1 tetap terjaga melalui mekanisme penguncian konteks dan validasi data awal.
