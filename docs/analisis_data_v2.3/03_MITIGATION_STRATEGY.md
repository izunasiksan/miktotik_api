# 03. MITIGATION STRATEGY & ARCHITECTURE UPDATE V2.3

## Strategi Utama: Unifikasi Kontrak API (API Unification)
Mitigasi V2.3 akan berfokus pada standardisasi penamaan atribut (snake_case di backend, camelCase di frontend) serta penggunaan tipe data `datetime` (ISO 8601) secara konsisten di seluruh pipeline analisis.

## Langkah Perbaikan Teknis

### 1. Update Skema Backend (Pydantic & FastAPI)
Ubah model `NormalizationRequest` untuk mendukung presisi `datetime` dan standardisasi field:
- **Perubahan**: Ganti `start_date` dan `end_date` (tipe `date`) menjadi `start_time` dan `end_time` (tipe `str/datetime`).
- **Standardisasi**: Gunakan `alias_generator` Pydantic untuk mendukung transisi camelCase (frontend) ke snake_case (backend) secara otomatis.
- **Output**: Pastikan `accuracy_pct` dikirimkan sebagai properti top-level dalam response JSON.

### 2. Refaktor Frontend API Services (`api.js`)
Hilangkan semua pemrosesan string manual yang mengurangi presisi:
- **Perbaikan**: Gunakan string ISO 8601 lengkap (`YYYY-MM-DDTHH:mm:ssZ`) untuk semua parameter waktu.
- **Sync**: Pastikan penamaan parameter di `api.js` selaras dengan parameter query/body di backend.

### 3. Standarisasi State Store (`analysisStore.js`)
- **Peningkatan**: Pastikan `timeRange` di Zustand Store menjadi sumber tunggal (SSOT) bagi semua komponen filter.
- **Locking**: Perkuat logika `isLocked` untuk memastikan tidak ada perubahan filter saat `taskStatus` bernilai `PENDING` atau `STARTED`.

### 4. Perbaikan Komponen UI (`NormalizationStage.jsx` & `ScopeFilterStage.jsx`)
- **UI Logic**: Update cara komponen membaca metadata hasil normalisasi dari `meta.traffic` dan `meta.resource`.
- **Validation**: Tambahkan validasi client-side yang lebih ketat sebelum tombol "Run Analysis" aktif, memastikan semua parameter (Board, Start, End) sudah terisi dengan benar.

### 5. Keamanan & Stabilitas Tabel Temporary
- **Unifikasi ID**: Tambahkan `task_id` atau `user_id` ke dalam nama tabel temporary (`scoped_{board_id}_{timestamp}`) untuk mencegah tabrakan data antar user.
- **Fail-safe Cleanup**: Implementasikan middleware atau background task yang secara berkala membersihkan tabel temporary yang tertinggal (orphaned tables).

## Rencana Implementasi (Timeline)
1.  **Phase 1**: Update Backend Models & Services (Segera).
2.  **Phase 2**: Refaktor Frontend API & Store (Segera).
3.  **Phase 3**: Integrasi & Testing End-to-End.
4.  **Phase 4**: Audit Final & Deployment.

---
**Auditor:** AI Pair Programmer
**Versi Target:** V2.3
