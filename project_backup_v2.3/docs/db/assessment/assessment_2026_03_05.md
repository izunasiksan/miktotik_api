# Database Structure Assessment - 2026-03-05
**Project**: Mikrotik Management System
**Status**: Diimplementasikan (sebagai bagian dari transisi ke Versi 2.2)

## **1. Latar Belakang**
Assessment ini dibuat untuk mendokumentasikan perubahan pada struktur database eksisting sesuai dengan Aturan #4 dari *DATABASE RESET & STRUCTURE RULE*. Perubahan ini bertujuan untuk meningkatkan skalabilitas, presisi data, dan performa query analitik.

## **2. Detail Perubahan Struktur (MODIFY TYPE & CHANGE)**

### **A. Perubahan Tipe Data (MODIFY TYPE)**
| Tabel | Kolom | Tipe Lama | Tipe Baru | Alasan |
|:---|:---|:---|:---|:---|
| `board_daily_summary` | `total_download`, `total_upload` | `NUMERIC(10,2)` | `NUMERIC(15,2)` | Kapasitas traffic lebih besar tanpa kehilangan presisi. |
| `board_monthly_summary` | `total_download`, `total_upload` | `BIGINT` | `NUMERIC(15,2)` | Menyamakan tipe data dengan layer harian dan mendukung presisi. |
| `board_speed_stats` | `download_speed`, `upload_speed` | `NUMERIC(10,2)` | `NUMERIC(15,2)` | Konsistensi tipe data di seluruh skema statistik. |
| `hotspot_usage_monthly` | `total_download`, `total_upload` | `BIGINT` | `NUMERIC(15,2)` | Mendukung data traffic dalam skala Petabyte. |

### **B. Perubahan ID pada Tabel Partitioned (REPLACE BIGSERIAL)**
| Tabel | Kolom | Perubahan | Alasan |
|:---|:---|:---|:---|
| `board_client_stats` | `client_stat_id` | `BIGSERIAL` -> `BIGINT` | Menghindari konflik sequence antar partisi. |
| `board_resource_stats` | `stat_id` | `BIGSERIAL` -> `BIGINT` | Standarisasi tabel partitioned. |
| `board_events` | `event_id` | `BIGSERIAL` -> `BIGINT` | Standarisasi tabel partitioned. |
| `hotspot_usage_raw` | `usage_id` | `BIGSERIAL` -> `BIGINT` | Standarisasi tabel partitioned. |

## **3. Penambahan Struktur Baru (Sesuai Aturan #3)**
*Perubahan ini diperbolehkan langsung di schema.sql, namun dicatat di sini untuk referensi.*

- **Kolom Baru**: `accuracy_pct` (NUMERIC(5,2)) pada `board_daily_summary` & `board_monthly_summary`.
- **Index Baru**:
  - GIN Index pada `audit_logs.details`.
  - Index pada semua Foreign Keys (`board_id`, `owner_id`).
  - Composite Index `(board_id, log_date)` pada tabel summary.

## **4. Kesimpulan & Rekomendasi**
Perubahan ini bersifat *non-breaking* untuk query yang sudah ada namun memerlukan reset database (Aturan #5 & #6) untuk memastikan struktur PostgreSQL sinkron dengan `schema.sql` terbaru.

**Direkomendasikan**: Segera lakukan reset database jika terdapat ketidaksesuaian antara database aktif dengan `schema.sql` Versi 2.2.
