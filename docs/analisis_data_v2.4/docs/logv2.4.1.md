# LOG UPDATE v2.4.1

## [2026-03-06] - FIX ROUTER SELECTION ISSUE

### Deskripsi Masalah
Pada halaman `/analysis-v2`, dropdown router hanya menampilkan `()` dan router tidak dapat dipilih. Hal ini disebabkan oleh ketidaksesuaian penamaan properti (naming convention) antara Frontend (camelCase) dan Backend (snake_case).

### Perubahan yang Dilakukan
1. **Backend - Base Schema (app/schemas/base.py)**:
   - Mengubah `alias_generator` menjadi format yang lebih sederhana `alias_generator=to_camel` untuk memastikan Pydantic v2 menghasilkan alias camelCase secara otomatis untuk validasi dan serialisasi.
   - UPDATE 2.4.1 Sinkronisasi Naming Convention.

2. **Backend - Boards Endpoint (app/api/endpoints/boards.py)**:
   - Memperbarui `read_boards` untuk menggunakan `jsonable_encoder(boards, by_alias=True)`. Ini memastikan response yang dikirim ke Frontend menggunakan key camelCase (misal: `boardId`, `boardName`, `ipAddress`) sesuai ekspektasi.
   - Memperbarui logika caching Redis untuk menyimpan dan mengambil data dalam format camelCase.
   - UPDATE 2.4.1 Sinkronisasi Naming Convention & Redis Cache Fix.

3. **Backend - Reports & Analysis Endpoints (app/api/endpoints/reports.py, analysis.py)**:
   - Audit dan perbaikan seluruh endpoint reports dan analysis untuk memastikan seluruh response menggunakan camelCase.
   - Menambahkan `by_alias=True` pada `jsonable_encoder` di seluruh return statement dan penyimpanan cache Redis.
   - Memastikan cache Redis untuk heavy analysis, daily/monthly reports, dan client stats tersimpan dalam format camelCase.
   - UPDATE 2.4.1 Sinkronisasi Naming Convention & Redis Cache Serialization Fix.

4. **Backend - Users & Dashboard Endpoints (app/api/endpoints/users.py, dashboard.py)**:
   - Sinkronisasi naming convention camelCase untuk endpoint manajemen user dan ringkasan dashboard.
   - Memastikan response user list, create, update, dan dashboard summary menggunakan camelCase secara konsisten.
   - UPDATE 2.4.1 Sinkronisasi Naming Convention.

5. **Frontend - ScopeFilterStage Component (src/features/analysis_v2/components/molecules/ScopeFilterStage.jsx)**:
   - Memastikan mapping data router menggunakan properti camelCase (`b.boardId`, `b.boardName`, `b.ipAddress`).
   - UPDATE 2.4.1 Sinkronisasi Naming Convention.

6. **Frontend - API Service (src/services/api.js)**:
   - Memastikan endpoint `getBoards` mengarah ke `/api/v1/boards/` dan menangani response dengan benar.
   - UPDATE 2.4.1 Sinkronisasi Naming Convention.

### Status
- [x] Investigasi Akar Masalah
- [x] Perbaikan Skema Pydantic
- [x] Perbaikan Endpoint Serializer (Boards, Reports, Analysis, Users, Dashboard)
- [x] Verifikasi Sinkronisasi Frontend-Backend
- [x] Update Dokumentasi Log
- [x] Audit Endpoint V2 Lainnya untuk Konsistensi camelCase

**Catatan**: Seluruh perubahan telah mengikuti aturan "UPDATE 2.4.1" dengan komentar yang jelas di setiap file yang dirubah.
