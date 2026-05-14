# Dokumentasi Inkonsistensi Struktur Data (SSOT: schema.sql)
# UPDATE 2.4.1 - Investigasi Menyeluruh

Dokumen ini mencatat perbedaan antara `schema.sql` (Single Source of Truth) dengan implementasi di Backend (Pydantic & SQLAlchemy) dan Frontend (API Service).

## 1. Tabel: `board_client_stats`
| Kategori | Deskripsi Inkonsistensi | Status |
| :--- | :--- | :--- |
| **Field Hilang** | `accuracy_pct` (NUMERIC(5,2)) tidak ada di `BoardClientStat` SQLAlchemy model. | ✅ Selesai (UPDATE 2.4.1) |
| **Tipe Data** | `stat_id` di schema adalah `BIGINT` dengan sequence manual, di SQLAlchemy menggunakan `BigInteger` dengan `autoincrement=True`. | ✅ Sesuai |
| **Constraint** | Schema menggunakan `PARTITION BY RANGE (log_time)`, SQLAlchemy model belum mendefinisikan partitioning (memerlukan logic manual/library tambahan). | ⚠️ Warning |

## 2. Tabel: `board_resource_stats`
| Kategori | Deskripsi Inkonsistensi | Status |
| :--- | :--- | :--- |
| **Field Hilang** | `accuracy_pct` (NUMERIC(5,2)) tidak ada di `BoardResourceStat` SQLAlchemy model. | ✅ Selesai (UPDATE 2.4.1) |
| **Tipe Data** | `uptime` di schema adalah `INTERVAL`, di SQLAlchemy sudah menggunakan `Interval`. | ✅ Sesuai |

## 3. Tabel: `board_speed_stats`
| Kategori | Deskripsi Inkonsistensi | Status |
| :--- | :--- | :--- |
| **Field Hilang** | `accuracy_pct` (NUMERIC(5,2)) tidak ada di `BoardSpeedStat` SQLAlchemy model. | ✅ Selesai (UPDATE 2.4.1) |
| **Presisi Data** | `download_mbps` & `upload_mbps` di schema `NUMERIC(15,2)`, di SQLAlchemy `Numeric(10,2)`. Berpotensi overflow untuk traffic sangat tinggi. | ✅ Selesai (UPDATE 2.4.1) |

## 4. Tabel: `board_daily_summary`
| Kategori | Deskripsi Inkonsistensi | Status |
| :--- | :--- | :--- |
| **Field Hilang** | `accuracy_pct` (NUMERIC(5,2)) tidak ada di SQLAlchemy model dan Pydantic `DailySummaryResponse`. | ✅ Selesai (UPDATE 2.4.1) |
| **Presisi Data** | Traffic fields (`avg_download`, dll) di schema `NUMERIC(15,2)`, di SQLAlchemy `Numeric(10,2)`. | ✅ Selesai (UPDATE 2.4.1) |

## 5. Tabel: `board_monthly_summary`
| Kategori | Deskripsi Inkonsistensi | Status |
| :--- | :--- | :--- |
| **Field Hilang** | `accuracy_pct` (NUMERIC(5,2)) tidak ada di SQLAlchemy model dan Pydantic `MonthlySummaryResponse`. | ✅ Selesai (UPDATE 2.4.1) |
| **Tipe Data** | `avg_download` & `avg_upload` di schema `NUMERIC(15,2)`, di SQLAlchemy `BigInteger`. Ini akan menghilangkan desimal (Mbps). | ✅ Selesai (UPDATE 2.4.1) |

## 6. Tabel: `telegram_recipients`
| Kategori | Deskripsi Inkonsistensi | Status |
| :--- | :--- | :--- |
| **Relasi** | Relasi ke `master_users` (`user_id`) ada di schema tapi tidak didefinisikan secara eksplisit di SQLAlchemy model `TelegramRecipient`. | ⚠️ Pending |

## 7. Tabel: `hotspot_usage_monthly`
| Kategori | Deskripsi Inkonsistensi | Status |
| :--- | :--- | :--- |
| **Field Hilang** | `accuracy_pct` (NUMERIC(5,2)) tidak ada di SQLAlchemy model. | ✅ Selesai (UPDATE 2.4.1) |
| **Field Hilang** | `is_frequent_user` (BOOLEAN) ada di schema tapi tidak ada di Pydantic `HotspotUsageMonthlyResponse`. | ✅ Selesai (UPDATE 2.4.1) |

## 8. General / Cross-Table
| Kategori | Deskripsi Inkonsistensi | Status |
| :--- | :--- | :--- |
| **Partitioning** | Seluruh tabel stats/logs di schema menggunakan `PARTITION BY RANGE`. Implementasi Backend saat ini belum menangani pembuatan partisi secara otomatis atau query spesifik partisi. | 🛑 Strategis |
| **Triggers** | `trg_pencatat_status` untuk `board_events` didefinisikan di schema. Pastikan backend tidak melakukan duplikasi logic logging manual yang bertabrakan. | ✅ Info |
| **Generated Columns** | `total_active` di `board_client_stats` adalah `STORED` generated column. SQLAlchemy menggunakan `Computed`, ini sudah sinkron. | ✅ Sesuai |

## Rencana Tindakan (Implementation Plan)
1. **Update SQLAlchemy Models**: Menambahkan `accuracy_pct` ke semua model stats & summary. ✅ Selesai
2. **Fix Monthly Summary Types**: Mengubah `BigInteger` menjadi `Numeric(15,2)` untuk traffic fields di `BoardMonthlySummary`. ✅ Selesai
3. **Update Pydantic Schemas**: Menambahkan field `accuracy_pct` dan `is_frequent_user` agar frontend bisa menampilkan indikator kualitas data. ✅ Selesai
4. **Sync Precision**: Menyeragamkan semua field `NUMERIC` menjadi `(15,2)` sesuai schema SSOT. ✅ Selesai
5. **Frontend API Service**: Memastikan pemanggilan API menggunakan camelCase secara konsisten (saat ini sudah sebagian besar camelCase). ✅ Terverifikasi
