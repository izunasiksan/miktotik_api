# 03: KOMUNIKASI API & PENANGANAN ERROR V2.1
**(Tanggal: 2026-03-05 | Fokus: Ketahanan & Transparansi)**
**Status: Verified & Implemented**

## 1. PENDAHULUAN
Aturan komunikasi API V2.1 dirancang untuk menangani beban tinggi dan potensi kegagalan koneksi ke Mikrotik Board melalui Backend.

---

## 2. STANDAR KOMUNIKASI (AXIOS/FETCH)

### **2.1 Global Axios Instance**
Gunakan instance tunggal untuk konfigurasi interceptors:
```javascript
const api = axios.create({
  baseURL: process.env.VITE_API_URL,
  timeout: 10000, // 10 detik default timeout
  headers: { 'Content-Type': 'application/json' }
});

// Request Interceptor: Auth Token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### **2.2 Asynchronous Tasks (Celery Integration)**
Gunakan pola polling untuk endpoint async:
1.  **POST `/analysis/pipeline/execute/async`**: Menerima `task_id`.
2.  **GET `/analysis/tasks/{task_id}/status`**: Polling status (`PENDING`, `STARTED`, `SUCCESS`, `FAILURE`).
3.  **INTERVAL**: Polling setiap 1-3 detik.

---

## 3. GLOBAL ERROR HANDLING (FRONTEND)

### **3.1 Klasifikasi Error**
| HTTP Status | Kategori | UI Response |
| :--- | :--- | :--- |
| `401` | Unauthorized | Redirect ke `/login` & Hapus token. |
| `403` | Forbidden | Tampilkan `AccessDenied.jsx`. |
| `404` | Not Found | Tampilkan `ResourceNotFound.jsx`. |
| `429` | Rate Limit | Tampilkan Toast: "Terlalu banyak request, mohon tunggu". |
| `500+` | Server Error | Tampilkan `ServerError.jsx` atau Toast Error. |
| `503` | Circuit Open | Tampilkan: "Server sedang dalam pemeliharaan (Circuit Breaker)". |

### **3.2 Penanganan Khusus Backend Audit**
Berdasarkan [Audit Backend (Temuan 4)](file:///e:/mikrotik_api/docs/analisis%20data%20v2/assessment/2026-03-05_audit_backend_implementation.md#A4), Frontend harus mengenali status **Circuit Breaker**:
- **Skenario**: Jika backend mengembalikan error terkait `pybreaker`.
- **UI Feedback**: Nonaktifkan fitur dashboard dan tampilkan status "Database Maintenance" untuk mencegah *cascading failure*.

---

## 4. CIRCUIT BREAKER FRONTEND (RETRY LOGIC)

Jangan melakukan retry tanpa batas pada kegagalan API.
- **Retry Strategy**: Maksimal 3 kali percobaan dengan *exponential backoff*.
- **Library**: Gunakan `axios-retry` atau logic manual di React Query.

---

## 5. EXAMPLE CODE (ERROR BOUNDARY)

Gunakan `ErrorBoundary` untuk membungkus modul-modul kritis:
```jsx
// AnalysisModuleWrapper.jsx
<ErrorBoundary fallback={<AnalysisErrorView />}>
  <TrendChart />
  <HealthGauge />
</ErrorBoundary>
```

---
**Referensi Backend:** [analysis_v2.py](file:///e:/mikrotik_api/backend/app/api_v2/endpoints/analysis_v2.py) | [database.py](file:///e:/mikrotik_api/backend/app/core/database.py)
