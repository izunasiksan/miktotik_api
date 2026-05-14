# Dokumentasi Sequence pada Tabel Terpartisi

Dokumen ini menjelaskan implementasi `SEQUENCE` manual pada tabel-tabel yang menggunakan skema pemisahan (partitioning) berdasarkan rentang waktu (`PARTITION BY RANGE`).

## Latar Belakang
Pada PostgreSQL, penggunaan `SERIAL` atau `BIGSERIAL` secara otomatis membuat sequence yang terikat pada tabel tersebut. Namun, pada tabel terpartisi:
1.  **Global ID**: Kita memerlukan ID yang unik di seluruh partisi, bukan hanya di dalam satu partisi tertentu.
2.  **Best Practice**: Disarankan menggunakan tipe data `BIGINT` dengan `DEFAULT nextval('nama_sequence')` agar pengelolaan sequence lebih fleksibel dan tidak terikat langsung pada tabel induk (parent table) yang sebenarnya tidak menyimpan data.

## Daftar Sequence yang Ditambahkan
Berikut adalah daftar sequence yang ditambahkan pada `schema.sql` Versi 2.2:

| Nama Sequence | Tabel Terkait | Kolom PK |
| :--- | :--- | :--- |
| `board_events_event_id_seq` | `board_events` | `event_id` |
| `board_client_stats_stat_id_seq` | `board_client_stats` | `stat_id` |
| `board_resource_stats_resource_id_seq` | `board_resource_stats` | `resource_id` |
| `board_speed_stats_speed_id_seq` | `board_speed_stats` | `speed_id` |
| `board_interface_usage_usage_id_seq` | `board_interface_usage` | `usage_id` |
| `board_pppoe_usage_usage_id_seq` | `board_pppoe_usage` | `usage_id` |
| `hotspot_usage_raw_raw_id_seq` | `hotspot_usage_raw` | `raw_id` |

## Implementasi pada Schema
Setiap tabel di atas didefinisikan dengan pola berikut:

```sql
CREATE TABLE nama_tabel (
    kolom_id BIGINT NOT NULL DEFAULT nextval('nama_sequence'),
    ...
    PRIMARY KEY (kolom_id, kolom_waktu)
) PARTITION BY RANGE (kolom_waktu);
```

## Penggunaan pada Triggers
Sequence ini juga digunakan secara eksplisit pada trigger, misalnya pada `fungsi_auto_log_status()`:

```sql
INSERT INTO board_events (event_id, ...)
VALUES (nextval('board_events_event_id_seq'), ...);
```

## Cara Reset Sequence
Jika database di-reset atau data di-truncate, sequence dapat di-reset menggunakan perintah:

```sql
ALTER SEQUENCE nama_sequence RESTART WITH 1;
```
