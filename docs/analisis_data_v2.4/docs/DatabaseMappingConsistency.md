# Konsistensi Pemetaan Database: Logic vs Physical Schema

Dokumen ini berfungsi sebagai referensi tunggal untuk memetakan istilah tabel yang digunakan dalam **Dokumentasi Logic (Stage 0-7)** dengan nama tabel fisik yang ada di database **PostgreSQL**.

## 1. Pemetaan Utama (P0)

Untuk menghindari ambiguitas dalam pengembangan lintas stack (Frontend, Backend, Database), berikut adalah pemetaan resmi:

| Istilah Dokumentasi Logic | Nama Tabel Fisik (PostgreSQL) | Deskripsi |
| :--- | :--- | :--- |
| **`board_usage_stats`** | **`board_interface_usage`** | Data akumulasi penggunaan bandwidth per interface (Daily/Monthly). |
| `board_speed_stats` | `board_speed_stats` | Data traffic real-time/high-resolution. |
| `board_resource_stats` | `board_resource_stats` | Data penggunaan CPU, Memory, Uptime. |
| `board_client_stats` | `board_client_stats` | Data jumlah client (Leases, Hotspot active). |
| `board_pppoe_usage` | `board_pppoe_usage` | Data penggunaan khusus user PPPoE. |
| `hotspot_usage_raw` | `hotspot_usage_raw` | Data penggunaan khusus user Hotspot. |

## 2. Mengapa Ada Perbedaan?

1.  **Evolusi Skema**: Nama `board_usage_stats` adalah istilah fungsional yang digunakan sejak versi V2.1 untuk merujuk pada "statistik penggunaan board".
2.  **Spesifisitas Database**: Di level database, nama `board_interface_usage` dipilih untuk lebih spesifik menunjukkan bahwa data tersebut adalah akumulasi penggunaan (usage) per interface.
3.  **Standar V2.4.1**: Dalam update terbaru, semua referensi di dokumentasi baru dan frontend (via API camelCase `boardUsageStats`) akan secara internal memanggil tabel `board_interface_usage`.

## 3. Implementasi di Frontend (V2.4.1)

Setiap komponen di `e2e_best_practice/src/frontend/src/features/analysis_v2/components/molecules/` yang melakukan fetch data dengan kategori `usage` secara otomatis akan mengambil data dari tabel `board_interface_usage` melalui API layer.

---
**Status**: Terverifikasi sesuai [schema.sql](file:///e:/mikrotik_api/docs/analisis_data_v2.4/docs/db/schema.sql) dan [01 AUDIT_SCOPE_FILTER_FLOW.md](file:///e:/mikrotik_api/docs/analisis_data_v2.4/dokumentasi%20sebelumnya/analisis%20data%20v2/spesifik/01%20AUDIT_SCOPE_FILTER_FLOW.md).
