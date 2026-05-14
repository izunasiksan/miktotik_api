# AUDITOR DRAFT: Sinkronisasi Normalisasi Global (Week 1)

**Status**: SIAP EKSEKUSI
**Domain**: Frontend Analysis Module (`Analysis.jsx` & Sub-pages)
**Prioritas**: Tinggi (Week 1 Plan)

---

## 1. IDENTIFIKASI DOMAIN
Audit ini mencakup sinkronisasi alur data dari `useAnalysisController` melalui `Analysis.jsx` menuju seluruh sub-komponen analisis untuk memastikan unit data konsisten (Mbps/GB) sebelum mencapai UI.

**File Utama**: 
- `e:\mikrotik_api\frontend\src\pages\Analysis.jsx` (Central Normalization)
- `e:\mikrotik_api\frontend\src\pages\analysis\hooks\useAnalysisData.jsx` (Derived Data)
- `e:\mikrotik_api\frontend\src\pages\analysis\analysis_trend.jsx` (Sub-page)
- `e:\mikrotik_api\frontend\src\pages\analysis\analysis_kapasitas.jsx` (Sub-page)

---

## 2. DAMPAK & RISIKO
- **Dampak**: 
  - Konsistensi unit di seluruh dashboard (tidak ada lagi Mbps vs MB/s yang membingungkan).
  - Normalisasi tersentralisasi mempermudah perubahan unit global di masa depan.
- **Risiko**:
  - **Double Conversion**: Jika parent mengirim data Mbps tapi child masih memanggil `toMbps()`, angka akan menjadi sangat kecil.
  - **Mitigasi**: Sinkronisasi Week 1 hanya menyiapkan data, Week 2 akan menghapus fungsi konversi di child secara bertahap.

---

## 3. HASIL AUDIT
Ditemukan bahwa dataset berikut saat ini dilewatkan ke sub-komponen dalam bentuk **RAW BYTES**, yang memaksa sub-komponen melakukan konversi manual:
- `heavyAnalysis` (Nested object: `percentiles`, `top_growth_users`).
- `interfaceAnalysis` (Array of objects).
- `trafficSeries` (Array of objects).
- `capacityStats` (Object with `p95`, `p99`, `max`).

---

## 4. REKOMENDASI EKSEKUSI (PROPOSAL PERUBAHAN)

### A. Modifikasi `Analysis.jsx`
Menambahkan blok normalisasi untuk dataset lainnya di level parent:

```jsx
// e:\mikrotik_api\frontend\src\pages\Analysis.jsx

// 1. Normalisasi heavyAnalysis (Nested)
const normalizedHeavyAnalysis = useMemo(() => {
  if (!heavyAnalysis || !isLocked) return heavyAnalysis;
  const result = { ...heavyAnalysis };
  if (result.percentiles) {
    // Normalisasi field p95_dl, p99_dl, dsb.
    result.percentiles = normalizeRawData([result.percentiles], normalizationConfig)[0];
  }
  return result;
}, [heavyAnalysis, isLocked, normalizationConfig]);

// 2. Normalisasi interfaceAnalysis
const normalizedInterfaceAnalysis = useMemo(() => {
  if (!interfaceAnalysis || !isLocked) return interfaceAnalysis;
  return normalizeRawData(interfaceAnalysis, normalizationConfig);
}, [interfaceAnalysis, isLocked, normalizationConfig]);

// 3. Normalisasi trafficSeries & capacityStats
const normalizedTrafficSeries = useMemo(() => {
  if (!trafficSeries || !isLocked) return trafficSeries;
  return normalizeRawData(trafficSeries, normalizationConfig);
}, [trafficSeries, isLocked, normalizationConfig]);

const normalizedCapacityStats = useMemo(() => {
  if (!capacityStats || !isLocked) return capacityStats;
  return normalizeRawData([capacityStats], normalizationConfig)[0];
}, [capacityStats, isLocked, normalizationConfig]);
```

### B. Update Props di `Analysis.jsx`
Pastikan props yang dilewatkan ke `AnalysisInsight`, `AnalysisTrend`, dan `AnalysisKapasitas` menggunakan versi `normalized`.

### C. Verifikasi
- Buka Tab **0. Normalisasi Data** untuk mengunci config.
- Cek Tab **6. Prediksi Kapasitas** untuk memastikan angka P95/P99 sesuai dengan unit yang dipilih (Mbps/GB).

---
**Rekomendasi Akhir**: Saya merekomendasikan untuk menerapkan perubahan ini di `Analysis.jsx` sebagai langkah pertama sinkronisasi global.
