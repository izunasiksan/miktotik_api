# AUDIT & INVESTIGASI NORMALISASI DATABASE V2.4
**Tanggal Audit:** 2026-03-07
**Status:** COMPLETE

## 1. Identifikasi Struktur Data (Current State)

### Lapisan Database (PostgreSQL)
*   **Tabel Master:** `master_users`, `mikrotik_boards` (Tersentralisasi).
*   **Tabel Relasional:** `board_credentials`, `vpn_profiles`, `user_board_access` (Normalisasi 3NF).
*   **Tabel Time-Series (Partitioned):** `board_client_stats`, `board_resource_stats`, `board_speed_stats`. Menggunakan *Composite Primary Key* (`id`, `log_time`) untuk mendukung partisi range native PostgreSQL.
*   **Tabel Agregasi:** `board_daily_summary`, `board_monthly_summary`, `hotspot_usage_monthly`. Dirancang untuk performa dashboard tanpa harus melakukan scan jutaan baris data mentah.

### Lapisan Backend (FastAPI + SQLAlchemy)
*   **Model ORM:** Pemetaan 1:1 dengan skema database. Relasi didefinisikan secara eksplisit menggunakan `relationship()` dengan strategi `lazy='selectin'` atau `joinedload` untuk optimasi query.
*   **Serialization:** Menggunakan Pydantic `BaseSchema` dengan `alias_generator=to_camel` untuk memastikan frontend menerima format `camelCase` sementara backend tetap menggunakan `snake_case`.

## 2. Evaluasi Redundansi & Inkonsistensi

### Redundansi Terencana (Performance Trade-off)
1.  **Tabel Summary:** Data di `board_daily_summary` adalah agregasi dari tabel stats harian. Ini adalah redundansi teknis (denormalisasi parsial) untuk menghindari query `AVG/SUM` yang mahal secara realtime.
2.  **Accuracy Pct:** Kolom `accuracy_pct` diduplikasi di hampir semua tabel stats untuk audit kualitas data per-entry tanpa join ke tabel metadata log.

### Mitigasi Inkonsistensi
*   **Database Constraints:** Penggunaan `ON DELETE CASCADE` dan `UniqueConstraint` memastikan integritas referensial.
*   **Redis Caching:** Response API di-cache di Redis. Risiko inkonsistensi (stale data) dimitigasi dengan TTL pendek (5 menit untuk stats, 1 jam untuk reports).

## 3. Analisis Tingkat Normalisasi

| Tingkat | Status | Analisis |
| :--- | :--- | :--- |
| **1NF** | **Lulus** | Tidak ada grup berulang. Semua kolom memiliki nilai atomik. |
| **2NF** | **Lulus** | Tabel partitioned menggunakan *Composite PK*. Semua kolom non-key bergantung sepenuhnya pada keseluruhan PK (termasuk dimensi waktu). |
| **3NF** | **Lulus** | Tidak ada ketergantungan transitif. Contoh: Detail site group di `mikrotik_boards` bersifat deskriptif, bukan referensi ke tabel master site yang memiliki atribut sendiri. |
| **BCNF** | **Lulus** | Setiap determinan adalah candidate key dalam konteks tabel fungsional. |

## 4. Dampak Performa Query

*   **Sebelum Normalisasi (Conventional/Flat Table):**
    *   Satu tabel raksasa untuk semua stats + info board.
    *   Query lambat saat data > 10 juta baris karena index bloat.
    *   Update info board mengunci jutaan baris data log.
*   **Sesudah Normalisasi (V2.4 Implementation):**
    *   **Partitioning:** Query stats harian hanya scan partisi spesifik (O(1) partition pruning).
    *   **Aggregation:** Dashboard load time < 100ms karena hanya membaca 1 baris di `board_daily_summary` vs scan 1440 baris (per menit) di stats mentah.
    *   **Integritas:** Update password Mikrotik hanya di `board_credentials`, tidak menyentuh data monitoring.

## 5. Assessment Kompleksitas Frontend

*   **Data Transformation:** Frontend menerima data bersih dalam format `camelCase`. Beban transformasi dipindahkan ke Backend melalui Pydantic Alias.
*   **Denormalization On-the-Fly:** Frontend melakukan "Join" visual untuk beberapa komponen (misal: menggabungkan data `boardResponse` dengan `statsResponse` di state management Vue/React) untuk menjaga konsistensi UI tanpa harus meminta backend mengirimkan object raksasa yang ter-denormalisasi.

## 6. Proof-of-Concept (POC)

### A. Skema Database (Normalized Schema)
```sql
-- Memisahkan detail hardware dari identitas board
CREATE TABLE board_hardware_info (
    hardware_id SERIAL PRIMARY KEY,
    board_id    UUID REFERENCES mikrotik_boards(board_id),
    cpu_model   VARCHAR(100),
    core_count  INT,
    total_memory BIGINT
);
```

### B. Backend Logic (Handling Complex Relation)
```python
# Model SQLAlchemy dengan Nested Relationship
class BoardHardware(Base):
    __tablename__ = "board_hardware_info"
    board_id = Column(UUID, ForeignKey("mikrotik_boards.board_id"))
    board = relationship("MikrotikBoard", back_populates="hardware")

# API Endpoint dengan Eager Loading
@router.get("/{board_id}")
async def get_board_detail(board_id: UUID, db: AsyncSession):
    stmt = select(MikrotikBoard).options(
        selectinload(MikrotikBoard.hardware)
    ).where(MikrotikBoard.board_id == board_id)
    # ... logic
```

### C. Frontend Denormalizer (TypeScript)
```typescript
// Fungsi untuk menggabungkan data normalized di frontend
const denormalizeBoardData = (boards: Board[], hardware: Hardware[]) => {
  return boards.map(b => ({
    ...b,
    hardware: hardware.find(h => h.boardId === b.boardId) || null
  }));
};
```

## 7. Rekomendasi Strategi Optimal
1.  **Gunakan Normalisasi 3NF** untuk data transaksional dan identitas (Users, Boards, Config).
2.  **Terapkan Denormalisasi Terencana (Agregasi)** untuk data analitik/dashboard guna menjaga skalabilitas.
3.  **Wajibkan CamelCase Mapping** di backend (Pydantic) agar kontrak API tetap konsisten dengan standar frontend modern.
