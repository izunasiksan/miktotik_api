# 05: STRATEGI TESTING & CHECKLIST VALIDASI V2.1
**(Tanggal: 2026-03-05 | Fokus: Kualitas & Kesiapan Produksi)**

## 1. PENDAHULUAN
Strategi testing V2.1 bertujuan untuk meminimalkan bug UI dan kegagalan integrasi pipeline analisis yang memiliki data sensitif.

---

## 2. STRATEGI TESTING (QA LAYER)

### **2.1 Unit Testing (Vitest/Jest)**
- **Target**: Komponen Atoms, Molecules, dan Helper functions.
- **Requirement**: Cakupan test (coverage) minimal 80%.
- **Contoh Test Case**:
    - `StatCard` harus menampilkan nilai "N/A" jika prop data `null`.
    - `date-formatter.js` harus memproses timezone UTC ke lokal dengan benar.

### **2.2 Integration Testing (React Testing Library)**
- **Target**: Organisms (misal: `GlobalControls`, `AnalysisPipelineContainer`).
- **Requirement**: Memastikan interaksi antar komponen berjalan (misal: klik tombol "Generate" memicu API call).
- **Mocking**: Gunakan `MSW` (Mock Service Worker) untuk meniru respon backend.

### **2.3 End-to-End (E2E) Testing (Cypress/Playwright)**
- **Target**: Alur utama pengguna (User Journey).
- **Skenario Kritis**:
    1. Login -> Pilih Board -> Jalankan Analisis -> Verifikasi Chart Tampil.
    2. Ganti Board saat analisis sedang berjalan (Uji Context Locking).
    3. Respon UI saat Backend mengembalikan error 503 (Uji Circuit Breaker UI).

---

## 3. CHECKLIST VALIDASI PRE-DEPLOYMENT (PRE-FLIGHT)

Pastikan seluruh item berikut tercentang sebelum melakukan merge ke branch `main` atau deployment.

### **3.1 Fungsionalitas (Functional)**
- [ ] [ ] Context Lock (Board ID & Time Range) berfungsi di seluruh modul.
- [ ] [ ] Polling status task Celery (Stage 1-7) berjalan tanpa kebocoran memori.
- [ ] [ ] Normalisasi Stage 0 diperiksa sebelum analisis dijalankan.
- [ ] [ ] Form validasi (range waktu, input numerik) aktif.

### **3.2 Visual & UX (UI/UX)**
- [ ] [ ] Label `accuracy_pct` tampil di setiap grafik data agregasi.
- [ ] [ ] Loading states (Skeleton/Overlay) tampil saat fetching data besar.
- [ ] [ ] Tooltip deskriptif tampil pada anomali dan low accuracy data.
- [ ] [ ] Aplikasi responsif di Mobile, Tablet, dan Desktop.

### **3.3 Performa & Keamanan (Non-Functional)**
- [ ] [ ] Bundle size optimal (Code splitting di setiap modul fitur).
- [ ] [ ] Tidak ada API token atau kunci rahasia yang bocor di log console.
- [ ] [ ] Error Boundary membungkus modul-modul kritis.
- [ ] [ ] Accessibility check (Aria labels & contrast ratio) lolos verifikasi.

---

## 4. SKENARIO EDGE CASE (PENGUJIAN EKSTRIM)

| Skenario | Ekspektasi Hasil |
| :--- | :--- |
| **Data Kosong (No Data)** | Tampilkan `EmptyState.jsx` (Ikon + Pesan Informatif). |
| **Koneksi Terputus** | Tampilkan Toast: "Offline Mode: Data mungkin tidak mutakhir". |
| **Task Gagal (FAILURE)** | Tampilkan Detail Error dari Backend + Tombol "Retry". |
| **Refresh saat Task Jalan** | Restore state dari LocalStorage/SessionStorage dan lanjutkan polling. |

---
**Referensi Backend:** [verify_pipeline_v21.py](file:///e:/mikrotik_api/backend/verify_pipeline_v21.py) | [2026-03-05_audit_backend_implementation.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/2026-03-05_audit_backend_implementation.md)
