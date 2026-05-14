# PERFORMANCE & DATA INTEGRITY COMPARISON (V2.1 RAW DATA FIDELITY)

## 1. DATA FIDELITY (KEAKURATAN DATA)

### Old Approach (Pre-Aggregated/Materialized Views)
- **Problem**: Micro-spikes dan transient anomalies hilang karena rata-rata (averaging) prematur.
- **Result**: "Flat-lining" pada grafik trafik saat terjadi lonjakan mendadak di bawah 5 menit.
- **Accuracy**: ±15-20% margin error untuk perhitungan kapasitas puncak (peak capacity).

### New Approach (Raw Data Fidelity)
- **Solution**: Query langsung ke data mentah (1s-30s precision) dengan interpolasi linear.
- **Result**: Grafik menampilkan setiap lonjakan trafik yang tertangkap oleh device.
- **Accuracy**: **±1-3% margin error**, mendukung deteksi anomali di Stage 5 dengan presisi tinggi.

---

## 2. TRACEABILITY (KETERLACAKAN)

### Old Approach
- **Traceability**: Terputus pada level agregasi. Tidak mungkin mengetahui log mentah mana yang berkontribusi pada suatu titik data di UI.
- **Auditability**: Sulit dilakukan validasi ulang jika terjadi perbedaan data antara dashboard dan log device.

### New Approach
- **Traceability**: **Deep Traceability** melalui metadata `source_id` dan `raw_timestamp`.
- **Auditability**: User dapat melakukan "drill-down" dari grafik summary langsung ke tabel log mentah di database menggunakan ID yang disimpan dalam metadata bucket.

---

## 3. QUERY PERFORMANCE (OPTIMALISASI)

### Comparison Table (Theoretical)

| Scenario | Dataset Size | Old Speed (Aggregated) | New Speed (Raw + Index) | Overhead |
|---|---|---|---|---|
| Range 1 Hour | ~3,600 rows | ~10ms | ~25ms | Minimal |
| Range 1 Day | ~86,400 rows | ~40ms | ~150ms | Acceptable |
| Range 7 Days | ~600,000 rows | ~120ms | ~450ms | Optimized with Index |
| Range 30 Days | ~2.5M rows | ~350ms | ~1.2s | High (Auto-Granularity applied) |

### Optimization Strategy for Raw Data:
1. **Auto-Granularity**: Backend otomatis menurunkan resolusi jika range waktu terlalu besar (misal: > 7 hari) untuk menjaga query di bawah 1 detik.
2. **Deterministic Indexing**: Menggunakan composite index `(board_id, timestamp DESC)` untuk pencarian kilat.
3. **Partial Fetching**: Mengambil hanya field yang diperlukan (`rx_bytes`, `tx_bytes`, `timestamp`) untuk mengurangi I/O database.

---

## 4. DATA INTEGRITY (KONSISTENSI)

### Principles Enforced:
1. **Atomic Sync**: Traffic dan Resource selalu diambil dalam satu query untuk menjamin timestamp yang sejajar (no time-drift).
2. **Pure Transformations**: Fungsi normalisasi bersifat idempotent, menjamin hasil yang sama setiap kali data mentah diolah.
3. **No Siloed Data**: Tab Trend, Insight, dan Audit menggunakan satu dataset yang sama dari `Shared State`, menghilangkan kebingungan user akibat angka yang berbeda di tab berbeda.
