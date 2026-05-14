# PRE-FLIGHT CHECK: Sinkronisasi Normalisasi Global (Week 1)

**Tanggal**: 2026-03-03
**Status**: DRAFT FOR AUDIT
**Domain**: Frontend Analysis Module (`Analysis.jsx` & Sub-pages)

---

## 1. IDENTIFIKASI DOMAIN
Audit ini mencakup sinkronisasi alur data dari `useAnalysisController` melalui `Analysis.jsx` menuju seluruh sub-komponen analisis.

**Dataset Target:**
- `reportRows` (Digunakan di Insight, Trend, Korelasi)
- `heavyAnalysis` (Digunakan di Insight)
- `interfaceAnalysis` (Digunakan di Insight, Trend)
- `pppoeAnalysis` / `hotspotAnalysis` / `clientsAnalysis` (Trend)
- `trafficSeries` / `capacityStats` (Kapasitas, Anomali)

---

## 2. DAMPAK & RISIKO
| Dampak | Deskripsi |
| :--- | :--- |
| **Konsistensi** | Semua angka di seluruh tab akan menggunakan basis normalisasi yang sama (SI 1000). |
| **Penyederhanaan** | Menghilangkan kebutuhan sub-komponen untuk mengetahui `usageUnit` secara mendalam. |
| **Performa** | Normalisasi dilakukan sekali di level parent menggunakan `useMemo`. |

| Risiko | Mitigasi |
| :--- | :--- |
| **Double Conversion** | **KRITIKAL**: Jika data sudah dalam Mbps dari parent, sub-komponen DILARANG memanggil `toMbps()` lagi. |
| **Struktur Data** | Pastikan `normalizeRawData` menangani object nested (seperti `heavyAnalysis.percentiles`). |
| **Breaking Changes** | Perubahan di `Analysis.jsx` akan berdampak pada 7+ sub-halaman sekaligus. |

---

## 3. HASIL AUDIT
1. **Existing Logic**: Saat ini hanya `reportData` dan `filteredReportData` yang dinormalisasi di `Analysis.jsx` ([L38-48](file:///e:/mikrotik_api/frontend/src/pages/Analysis.jsx#L38-48)).
2. **Redundansi**: `TrafficKpiCard` ([L9-11](file:///e:/mikrotik_api/frontend/src/pages/analysis/components/TrafficKpiCard.jsx#L9-11)) masih melakukan konversi manual berdasarkan `usageUnit`.
3. **Inkonsistensi**: Beberapa dataset seperti `capacityStats` dihitung langsung di controller tanpa melalui pipeline normalisasi yang bisa dikustomisasi user.

---

## 4. REKOMENDASI EKSEKUSI

### A. Update Analysis.jsx (Week 1)
Tambahkan blok normalisasi untuk dataset lainnya:

```jsx
// Contoh untuk heavyAnalysis
const normalizedHeavyAnalysis = useMemo(() => {
  if (!heavyAnalysis || !isLocked) return heavyAnalysis;
  // Implementasikan normalisasi untuk nested object percentiles
  return {
    ...heavyAnalysis,
    percentiles: normalizeRawData([heavyAnalysis.percentiles], normalizationConfig)[0]
  };
}, [heavyAnalysis, isLocked, normalizationConfig]);

// Contoh untuk trafficSeries
const normalizedTrafficSeries = useMemo(() => {
  if (!trafficSeries || !isLocked) return trafficSeries;
  return normalizeRawData(trafficSeries, normalizationConfig);
}, [trafficSeries, isLocked, normalizationConfig]);
```

### B. Strategi Rollout
1. **Phase 1**: Implementasi `useMemo` di `Analysis.jsx` untuk semua dataset.
2. **Phase 2**: Teruskan data hasil normalisasi ke props sub-komponen.
3. **Phase 3 (Week 2)**: Refactor sub-komponen untuk menghapus dependensi pada `toMbps` / `bytesToUnit`.

---
**Rekomendasi Auditor**: **PROCEED WITH CAUTION**. 
Fokus pada `heavyAnalysis` dan `trafficSeries` terlebih dahulu karena dampaknya paling terlihat di dashboard Insight dan Kapasitas.
