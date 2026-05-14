# TESTING PHILOSOPHY & STANDAR GLOBAL FRONTEND V2.1
**(Tanggal: 2026-03-05 | Status: ACTIVE | Versi: 2.1)**

## 1. TUJUAN (CORE MISSION)
Sistem analitik Mikrotik API V2.1 mengolah data kritis (Bandwidth, CPU, Memory) yang memerlukan tingkat akurasi tinggi. Filosofi testing frontend bukan sekadar mencari bug, melainkan **menjamin integritas data (SSOT) dari backend tetap terjaga hingga ke visualisasi pengguna.**

---

## 2. LAYER PENGUJIAN (TESTING PYRAMID)

### **2.1 Layer 1: Unit Testing (Integritas Data & Logic)**
*   **Fokus**: Utility functions, Formatting, dan Zustand Stores.
*   **Wajib**: 
    *   Validasi **Context Lock** (Mencegah perubahan input saat analisis berjalan).
    *   Validasi **Normalization Logic** (Penanganan data null, k conversion, dan akurasi).
*   **Tool**: Vitest.

### **2.2 Layer 2: Integration Testing (Workflow Integrity)**
*   **Fokus**: Interaksi antar komponen dalam fitur (misal: `AnalysisV2` container).
*   **Wajib**:
    *   Polling status Celery (PENDING -> STARTED -> SUCCESS).
    *   Error Boundary (Menangkap crash pada chart/visualisasi tanpa menjatuhkan seluruh aplikasi).
*   **Tool**: React Testing Library + MSW.

### **2.3 Layer 3: UX Audit (HCI Compliance)**
*   **Fokus**: Kepatuhan terhadap Nielsen's Heuristics.
*   **Wajib**:
    *   Visibility of System Status (Progress bar pada Stage 0).
    *   User Control (Reset Filters).
    *   Error Prevention (Indikator Low Confidence).
*   **Tool**: Manual Audit + Lighthouse Accessibility.

---

## 3. CHECKLIST VALIDASI GLOBAL (AUDIT-READY)

| Kategori | Requirement | Status |
| :--- | :--- | :--- |
| **Data Integrity** | Akurasi (`accuracy_pct`) tampil pada setiap chart Stage 2-7 | ✅ Mandatory |
| **Context Lock** | Filter (Board/Time) terkunci saat `taskStatus` = `STARTED` | ✅ Mandatory |
| **Resilience** | UI tidak crash jika backend mengembalikan data anomali (NaN/Infinity) | ✅ Mandatory |
| **HCI** | Kontras warna minimal 4.5:1 (WCAG AA) | ✅ Recommended |

---

## 4. PROSEDUR TESTING SEBELUM RELEASE (PRE-FLIGHT)
1.  Jalankan `npm run lint` (Mencegah runtime error dasar).
2.  Jalankan `npm run test` (Verifikasi store & logic).
3.  Audit manual pada 3 skenario kritis:
    *   Analisis data normal (7 hari).
    *   Analisis data kosong (0 hari).
    *   Analisis data anomali (High packet loss/Z-score > 3).

---
**Referensi Dokumentasi:**
- [05_QA_DEPLOYMENT.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/Frontend_v2.1/05_QA_DEPLOYMENT.md)
- [ANALYTICS_EXECUTION_RULE_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/ANALYTICS_EXECUTION_RULE_V2.1.md)
