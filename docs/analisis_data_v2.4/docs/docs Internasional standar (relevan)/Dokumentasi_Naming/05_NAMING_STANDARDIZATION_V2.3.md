# 05. NAMING STANDARDIZATION V2.3

## 1. Pendahuluan
Dokumen ini menetapkan standar penamaan (Naming Convention) yang wajib diikuti di seluruh ekosistem proyek Mikrotik API versi 2.3. Tujuannya adalah untuk menyelesaikan masalah inkonsistensi penamaan atribut, tipe data, dan struktur tabel yang diidentifikasi dalam `bigIssue.md`.

## 2. Aturan Umum Penamaan
| Layer | Convention | Contoh |
| :--- | :--- | :--- |
| **Frontend (React/JSX)** | `camelCase` | `startTime`, `bucketSource`, `usageUnit` |
| **Backend (Python/FastAPI)** | `snake_case` | `start_time`, `bucket_source`, `usage_unit` |
| **Database (PostgreSQL)** | `snake_case` | `board_id`, `log_time`, `accuracy_pct` |
| **API Request/Response** | `camelCase` (Internal mapping ke `snake_case`) | `startTime` -> `start_time` |

## 3. Standarisasi Atribut Kunci (Key Attributes)
Gunakan nama atribut berikut secara konsisten di semua endpoint Analisis Data V2.1+:

### 3.1. Parameter Waktu (Time Parameters)
Wajib menggunakan tipe data **DateTime ISO 8601** (`YYYY-MM-DDTHH:mm:ssZ`).
- **Frontend**: `startTime`, `endTime`
- **Backend**: `start_time`, `end_time`
- **Dilarang**: Menggunakan `startDate`/`endDate` (tipe `date`) yang memotong presisi jam/menit/detik.

### 3.2. Parameter Filter & Scope
- **Frontend**: `boardId`, `bucketSource`, `usageUnit`
- **Backend**: `board_id`, `bucket_source`, `usage_unit`

### 3.3. Metadata Akurasi & Normalisasi
- **Frontend**: `accuracyPct`, `validCount`, `totalCount`
- **Backend**: `accuracy_pct`, `valid_count`, `total_count`
- **Response Structure**: `accuracy_pct` harus berada di **top-level** objek response untuk kemudahan akses UI.

## 4. Standarisasi Nama Tabel & Objek Database
### 4.1. Tabel Permanen (Permanent Tables)
- Menggunakan prefix kategori: `board_`, `hotspot_`, `pppoe_`, `user_`, `telegram_`, `automation_`.
- Contoh: `board_resource_stats`, `hotspot_usage_raw`.

### 4.2. Tabel Temporary (Stage 1 Context Lock)
- Format: `temp_scoped_{board_id_hex}_{unique_suffix}_{timestamp}`
- Contoh: `temp_scoped_a1b2c3d4_e5f6g7h8_1741270830`
- **Tujuan**: Mencegah race condition dan tabrakan data antar user/task.

## 5. Pemetaan Otomatis (Auto-Mapping Strategy)
Untuk menjaga konsistensi tanpa menulis mapping manual yang rentan error:

### 5.1. Backend (Pydantic V2)
Gunakan `alias_generator` pada `ConfigDict` untuk memetakan `camelCase` dari Frontend ke `snake_case` Backend secara otomatis:
```python
from pydantic import BaseModel, ConfigDict, AliasGenerator
from pydantic.alias_generators import to_camel, to_snake

class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=AliasGenerator(
            validation_alias=to_camel,    # Terima camelCase dari Frontend
            serialization_alias=to_camel, # Kirim camelCase ke Frontend
        ),
        populate_by_name=True,
    )
```

### 5.2. Frontend (API Service)
Pastikan payload yang dikirimkan ke API selalu menggunakan `camelCase` yang sudah didefinisikan di dokumen ini.

## 6. Audit & Kepatuhan
Setiap perubahan kode baru atau refaktorisasi wajib merujuk pada dokumen ini. Ketidakpatuhan terhadap standar penamaan ini akan dianggap sebagai bug V2.3.

---
**Status:** FINAL (V2.3 Standard)
**Tanggal Update:** 2026-03-06
**Auditor:** AI Pair Programmer
