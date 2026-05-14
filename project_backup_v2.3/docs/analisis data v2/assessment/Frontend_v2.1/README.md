# FRONTEND DEVELOPMENT GUIDELINES V2.1
**(Tanggal: 2026-03-05 | Status: Authoritative Document)**

## 1. PENDAHULUAN
Dokumen ini merupakan panduan komprehensif untuk pengembangan frontend dalam ekosistem Mikrotik API V2.1. Panduan ini dirancang untuk menyelaraskan implementasi frontend dengan arsitektur backend yang telah diaudit dalam [2026-03-05_audit_backend_implementation.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/2026-03-05_audit_backend_implementation.md).

## 2. NAVIGASI DOKUMENTASI
Silakan merujuk pada modul-modul berikut untuk detail teknis:

1.  **[01_INTEGRATION_MAP.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/Frontend_v2.1/01_INTEGRATION_MAP.md)**
    - Peta alur integrasi frontend-backend (Stage 0-7).
    - Sinkronisasi status normalisasi dan analisis.
2.  **[02_ARCHITECTURE_STATE.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/Frontend_v2.1/02_ARCHITECTURE_STATE.md)**
    - Standar penamaan komponen (Atomic Design).
    - Strategi State Management (Context API/Zustand).
    - Struktur folder dan modularisasi kode.
3.  **[03_API_COMMUNICATION.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/Frontend_v2.1/03_API_COMMUNICATION.md)**
    - Aturan komunikasi API (Async/Await).
    - Penanganan error global dan lokal.
    - Mekanisme retry dan circuit breaker frontend.
4.  **[04_UI_UX_GUIDELINES.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/Frontend_v2.1/04_UI_UX_GUIDELINES.md)**
    - Panduan Styling (Tailwind/CSS Modules).
    - Prinsip HCI dan Usability Heuristics.
    - Desain responsif dan aksesibilitas (WCAG).
5.  **[05_QA_DEPLOYMENT.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/Frontend_v2.1/05_QA_DEPLOYMENT.md)**
    - Strategi Testing (Unit, Integration, E2E).
    - Checklist validasi sebelum deployment (Pre-flight).

## 3. PRINSIP UTAMA
- **Context Locking**: Frontend harus mengunci konteks (Board ID & Time Range) untuk memastikan konsistensi data di seluruh modul analisis.
- **Transparency**: Selalu tampilkan `accuracy_pct` jika data yang ditampilkan berasal dari proses normalisasi atau agregasi.
- **Fail-Safe**: Implementasikan `ErrorBoundary` di setiap modul besar untuk mencegah kegagalan aplikasi secara total.

---
**Dirancang Oleh:** AI Pair Programmer / Senior Frontend Architect
**Referensi Backend:** [BACKEND_DOCUMENTATION_LOGV2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/BACKEND_DOCUMENTATION_LOGV2.1.md)
