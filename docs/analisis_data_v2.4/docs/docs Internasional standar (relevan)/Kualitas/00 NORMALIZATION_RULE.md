NORMALIZATION_RULE V2.1
(VERSION V2.1 – ENFORCED WITH RAW FIDELITY)
Last Modified: 2026-03-05
Status: Finalized & Implemented

Pipeline Stage Summary:
- Stage 0: Normalization (High Granularity Preservation & Raw Fidelity)
- Stage 1: Scope & Filter (Context Lock & Initial Indexing)
- Stage 2: Trend & Aggregation (Deferred Aggregation & Time Conversion Accuracy)
- Stage 3: Correlation (Deep Traceability & High-Res Alignment)
- Stage 4: Habits & Patterns (Granular Baseline & Stability Scoring)
- Stage 5: Anomaly Validation (Granular Validation & Penalty Scoring)
- Stage 6: Capacity Forecast (Granular Projection & Utilization Scoring)
- Stage 7: Insight (Traceable Insight & Health Score SSOT)

============================================================
A. TUJUAN & GRANULARITAS (RAW FIDELITY V2.1)
============================================

Normalisasi menjamin bahwa seluruh data dari:

* KPI
* Summary
* Heavy analysis
* Entities

memiliki:

* Struktur field seragam
* Unit konsisten
* Timestamp selaras (Preserve Raw Precision)
* Tipe data valid
* Metadata untuk Deep Traceability
* Aman untuk agregasi & derivasi (Deferred Aggregation)

34→PRINSIP RAW DATA PRIMARY (V2.1):
35→- DILARANG melakukan downsampling atau pembulatan timestamp di Stage 0.
36→- WAJIB mempertahankan detail asli dari sumber data (raw precision).
37→- Transformasi harus menyimpan metadata: `raw_timestamp`, `source_id`, dan `accuracy_pct`.
38→- Integrasi SOP: Patuhi [aturan_penanganan_missing_data_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_penanganan_missing_data_V2.1.md) untuk deteksi awal gap.

Normalisasi bersifat:

* Pure
* Idempotent
* Immutable
* Deterministic
* High-Granularity (Fidelity)

| `mac_address` | `MACADDR` | `NOT NULL` | Alamat fisik perangkat (Unique Hardware ID). |
| `ip_address` | `INET` | `NOT NULL` | Alamat IP perangkat untuk koneksi API/SSH. |

**Single Source of Truth (SSOT) Tables:**
*   **`board_speed_stats`**: Real-time bandwidth (Micro-spikes detection).
*   **`board_resource_stats`**: CPU, RAM, HDD, Uptime (Hardware health).
*   **`board_client_stats`**: Active User Count (Hotspot & PPPoE).
*   **`board_usage_stats`**: Daily accumulation (Quota audit).
*   **`board_pppoe_usage`**: Per-user PPPoE usage (Billing/Heavy downloader).
*   **`hotspot_usage_raw`**: Per-user Hotspot usage & Uptime (Voucher analysis).

============================================================
B. PRINSIP ARSITEKTURAL
=======================

1. API hanya berada di:
   src/services/

2. Normalisasi dilakukan di:

   * Controller V2 (mis. useAnalysisV2Controller)
   * Util V2 terkait
   * Sebelum masuk ke Stage 1 (Scope & Filter)

3. Normalizer DILARANG:

   * Mengakses atau memodifikasi file/logika V1
   * Mengubah makna statistik backend
   * Menghitung ulang heavy metrics
   * Mengubah severity / anomaly
   * Menyentuh layer database

4. Normalizer WAJIB:

   * Mengembalikan struktur baru (tidak mutasi input)
   * Konsisten lintas tab (Trend / Insight / Audit)

============================================================
C. STANDAR FIELD
================

---

## TRAFFIC (NormalizedDataset)

Struktur wajib:

{
rx: Number|null,
tx: Number|null,
total: Number|null,
unit: String,
timestamp: ISO-8601 (UTC) (Raw Fidelity),
displayDate: String,
isGap: Boolean,
metadata: {
  raw_timestamp: ISO-8601,
  source_granularity: String,
  source_id: String,
  accuracy_pct: Number (0-100)
}
}

Rules:

* Mapping: download_mbps/bytes -> rx, upload_mbps/bytes -> tx
* total = (isFinite(rx) ? rx : 0) + (isFinite(tx) ? tx : 0)
* Jika backend memberikan null, simpan sebagai null (untuk isGap detection)
* Unit harus eksplisit (misal: "Mbps" atau "Bytes")
* Simpan `raw_timestamp` asli untuk auditability 1:1

---

## RESOURCE (NormalizedDataset)

Struktur wajib:

{
cpu_percent_standard: Number|null (0–100),
free_memory: Number|null,
total_memory: Number|null,
mem_usage: Number|null (0-100),
timestamp: ISO-8601 (UTC) (Raw Fidelity),
displayDate: String,
isGap: Boolean,
metadata: {
  raw_timestamp: ISO-8601,
  source_granularity: String,
  source_id: String,
  accuracy_pct: Number (0-100)
}
}

Rules:

* cpu_percent_standard = cpu_load (jika cpu_load tersedia)
* mem_usage = ((total_memory - free_memory) / total_memory) * 100 (jika keduanya tersedia)
* Guard: cpu_percent_standard tidak boleh >100 atau <0
* Jangan asumsi kapasitas jika total_memory null

============================================================
D. WAKTU
========

1. Backend exchange:
   ISO-8601 (UTC)

2. UI display:
   toLocaleDateString()

3. Timestamp harus konsisten:
   Gunakan satu field utama (mis. timestamp)

4. Jika sumber memakai:

   * date
   * time
   * epoch
     maka lakukan konversi eksplisit sebelum agregasi

============================================================
E. UNIT POLICY
==============

1. Mode Server:

   * Traffic diasumsikan Mbps
   * Konsumsi apa adanya
   * Tidak lakukan konversi ulang

2. Mode Frontend:

   * Konversi byte-unit eksplisit
   * Konversi sebelum derivasi

3. Dilarang:

   * Menggabungkan Mbps dan byte-unit tanpa konversi
   * Menghitung percentile/delta pada unit campuran

============================================================
F. CASTING & VALIDASI
=====================

1. Semua metrik wajib Number

2. Drop atau flag:

   * NaN
   * Infinity
   * undefined

3. Tidak boleh implicit string → number conversion
   Gunakan parse eksplisit

4. Catat metadata kualitas data:

   * validCount
   * droppedCount
   * gapCount

Tanpa menyimpan nilai mentah sensitif.

============================================================
G. FILL GAPS
============

Aktif hanya jika:

* Time-lock aktif
* Rentang eksplisit tersedia

Prosedur:

1. Bangun timeline sesuai granularity

2. Tambahkan placeholder jika bucket kosong:

   {
   rx: 0,
   tx: 0,
   total: 0,
   isGap: true
   }

3. Jangan hapus gap tanpa penanda

4. Derivasi sensitif wajib dapat mengecualikan isGap

============================================================
H. PERFORMA
===========

1. Gunakan array mapping
2. Hindari nested loop tidak perlu
3. Gunakan memoization di hook derivasi
4. Jangan re-normalisasi tanpa perubahan dependensi

============================================================
I. KEAMANAN & LOGGING
=====================

1. Jangan log payload mentah

2. Log hanya:

   * jumlah record
   * jumlah drop
   * granularity
   * periode

3. Validasi filter sebelum normalisasi berat:

   * period
   * start_date
   * end_date
   * granularity

============================================================
J. PRE-FLIGHT CHECK (PERUBAHAN NORMALISASI)
===========================================

1. Identifikasi Domain

   * Frontend: YES
   * Backend: NO
   * Database: NO

2. Dampak & Risiko

   * Percentile bias
   * Peak salah
   * Delta tidak akurat
   * Gap terhitung sebagai data valid

3. Audit

   * Field sesuai standar
   * Unit konsisten
   * Tidak ada NaN
   * isGap bekerja
   * Output immutable

4. Uji Wajib

   * Dataset campuran unit
   * Granularity berbeda
   * Dataset dengan gap
   * Idempotensi (run 2x hasil sama)

============================================================
K. FINAL ENFORCEMENT
====================

Jika normalisasi:

* Mengubah nilai statistik backend
* Mencampur unit tanpa konversi
* Menghapus gap tanpa penanda
* Memodifikasi input

maka dianggap melanggar arsitektur resmi sistem analitik.

============================================================
L. INTEGRASI ASSESSMENT FRONTEND_V2.1
====================================

1. Verifikasi Stage 0 (01_INTEGRATION_MAP.md)
- Panggil endpoint `/analysis/normalization/status` sebelum memulai Stage 1-7.
- Terapkan label akurasi pada komponen yang menampilkan data ringkasan:
  - 100%: Hijau "Data Akurat"
  - 80–99%: Kuning "Data Sebagian Terisi"
  - < 80%: Merah "Data Terbatas – Estimasi Saja"
- Saat status `PENDING`, tampilkan overlay "Menyiapkan Data..." dan lanjutkan proses normalisasi async jika diperlukan.

2. Context Locking (02_ARCHITEKTUR_STATE.md)
- Saat task analisis berjalan, kunci input `board_id`, `time_range`, dan `granularity`.
- Gunakan shared state (Zustand) untuk ContextLockStore & AnalysisStore:
  - ContextLockStore: selectedBoardId, timeRange, granularity, isLocked
  - AnalysisStore: normalizationStatus, analysisData, currentTaskId, taskStatus, error

3. Komunikasi API & Ketahanan (03_API_COMMUNICATION.md)
- Axios instance tunggal dengan:
  - baseURL dari VITE_API_URL
  - timeout 10–15 detik
  - Authorization Bearer dari localStorage
- Retry terbatas (maks. 3) dengan exponential backoff (axios-retry).
- Polling Celery task `/analysis/tasks/{task_id}/status` setiap 1–3 detik.
- Tanggapi status khusus:
  - 401: hapus token, redirect ke /login
  - 429: tampilkan toast rate limit
  - 503: tampilkan status Circuit Breaker

4. UI/UX & HCI (04_UI_UX_GUIDELINES.md)
- Visibility of System Status:
  - Progress bar/overlay untuk Stage 0.
- Konsistensi warna:
  - Emerald = Akurat/Normal, Amber = Peringatan, Rose = Anomali/Kritis.
- Aksesibilitas:
  - Focus ring yang jelas, kontras warna 4.5:1, aria-label untuk komponen visual.

5. Standar Traceability Tambahan
- metadata wajib menyertakan:
  - raw_timestamp, source_granularity, source_id, accuracy_pct
  - source_table (SSOT asal data), untuk audit 1:1

6. Checklist Kepatuhan Implementasi (Client)
- Tidak ada downsampling/pembulatan timestamp pada Stage 0.
- Tidak ada filtering/agregasi pada Stage 0.
- Idempotensi: input sama → output identik.
- Penandaan gap eksplisit (isGap) & tidak diperlakukan sebagai data valid tanpa pengecualian eksplisit.
- Validasi unit & casting angka eksplisit (no implicit string→number).

END OF DOCUMENT
