# Panduan Setup Redis Integrasi v2.4 (Redis-as-a-Service)

Dokumentasi ini berisi instruksi lengkap untuk mengintegrasikan Redis melalui Docker container dengan konfigurasi localhost untuk menghubungkan frontend dan backend secara terpisah dalam ekosistem Mikrotik API v2.4.

## 1. Persiapan Struktur v2.4
Pastikan Anda berada di folder `e:\mikrotik_api\docs\analisis_data_v2.4\` untuk mengakses semua file konfigurasi.

### **Isi Folder Integrasi Redis v2.4:**
- [docker-compose.redis.yml](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docker-compose.redis.yml): Konfigurasi Docker Redis Service.
- [redis_backend_client.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/redis_backend_client.py): Implementasi Redis Client di Backend (Python/FastAPI).
- [redis_frontend_adapter.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/redis_frontend_adapter.js): Implementasi Redis Adapter di Frontend (React).
- [05_REDIS_ARCHITECTURE_V2.4.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/05_REDIS_ARCHITECTURE_V2.4.md): Dokumentasi arsitektur, troubleshooting, dan best practices.

### **Laporan Audit & Pengembangan v2.4:**
- [01_PROBLEM_IDENTIFICATION_V2.4.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/01_PROBLEM_IDENTIFICATION_V2.4.md): Identifikasi masalah utama.
- [02_ROOT_CAUSE_ANALYSIS_V2.4.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/02_ROOT_CAUSE_ANALYSIS_V2.4.md): Analisis akar masalah.
- [03_MITIGATION_STRATEGY_V2.4.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/03_MITIGATION_STRATEGY_V2.4.md): Strategi mitigasi.
- [04_AUDIT_CHECKLIST_V2.4.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/04_AUDIT_CHECKLIST_V2.4.md): Checklist audit pengembangan.
- [06_E2E_AUDIT_REPORT_V2.4.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/06_E2E_AUDIT_REPORT_V2.4.md): **Laporan Audit Komprehensif E2E**.
- [07_REMEDIATION_PLAN_V2.4.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/07_REMEDIATION_PLAN_V2.4.md): **Rencana Perbaikan Teknis**.
- [08_COMPARATIVE_ANALYSIS_SSOT_V2.4.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/08_COMPARATIVE_ANALYSIS_SSOT_V2.4.md): **Laporan Perbandingan & Transisi SSOT**.
- [09_RELEASE_NOTES_V2.4.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/09_RELEASE_NOTES_V2.4.md): **Catatan Rilis Final v2.4 (Stable)**.

---

## 2. Langkah Setup (Quick Start)

### **Langkah 1: Jalankan Redis Container**
Jalankan perintah berikut di terminal:
```bash
docker-compose -f docs/analisis_data_v2.4/docker-compose.redis.yml up -d
```
Redis akan aktif di **localhost:6379** dengan password default: `mikrotik_api_v24`.

### **Langkah 2: Konfigurasi Backend (Python)**
Salin isi [redis_backend_client.py](file:///e:/mikrotik_api/docs/analisis_data_v2.4/redis_backend_client.py) ke dalam folder `backend/app/core/` dan update `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=mikrotik_api_v24
```

### **Langkah 3: Konfigurasi Frontend (React)**
Gunakan [redis_frontend_adapter.js](file:///e:/mikrotik_api/docs/analisis_data_v2.4/redis_frontend_adapter.js) di folder `frontend/src/services/` untuk mengelola cache UI dan session management.

---

## 3. Contoh Penggunaan Redis (Operasi GET/SET/DEL)

### **Backend (Python Async)**:
```python
from app.core.redis_backend_client import redis_manager

# Simpan Data (SET)
await redis_manager.set_cache("user_session_123", {"user_id": 1, "role": "admin"}, expire=3600)

# Ambil Data (GET)
user_data = await redis_manager.get_cache("user_session_123")

# Hapus Data (DEL)
await redis_manager.delete_cache("user_session_123")
```

### **Frontend (React)**:
```javascript
import RedisAdapter from './services/redis_frontend_adapter';

// Simpan Cache Analisis (SET)
await RedisAdapter.set('analysis_v2_cache', { status: 'completed', data: results });

// Ambil Cache (GET)
const cache = await RedisAdapter.get('analysis_v2_cache');

// Hapus Cache (DEL)
await RedisAdapter.del('analysis_v2_cache');
```

---

## 4. Keuntungan Integrasi v2.4
1. **Pemisahan Layanan**: Backend dan Frontend tetap native, sementara Redis terisolasi di Docker.
2. **Keamanan Localhost**: Komunikasi terenkripsi dengan password di jalur lokal 127.0.0.1.
3. **Session Stability**: State management UI tetap terjaga meskipun backend di-restart (Hot Reload).

---
*Dibuat untuk update Mikrotik API v2.4 - Analisis Data & Pipeline Integrasi.*
