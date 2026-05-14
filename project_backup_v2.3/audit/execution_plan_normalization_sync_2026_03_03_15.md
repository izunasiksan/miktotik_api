# EXECUTION PLAN: GLOBAL NORMALIZATION SYNC (MINGGU 1)
**Tanggal:** 2026-03-03
**Auditor:** AI Auditor & Assessor
**Status:** DRAFT FOR APPROVAL
**Prioritas:** HIGH

## 1. PENDAHULUAN
Rencana ini bertujuan untuk mensinkronisasi proses normalisasi data di level `Analysis.jsx` agar seluruh sub-komponen menerima data yang sudah dalam satuan yang benar (Normalized State), menghilangkan kebutuhan konversi manual di tingkat card.

## 2. DETAIL PERUBAHAN TEKNIS

### A. Modifikasi Analysis.jsx
Menambahkan normalisasi untuk seluruh dataset yang diterima dari controller.

```jsx
// Analysis.jsx

// 1. Normalisasi Heavy Analysis
const normalizedHeavyAnalysis = useMemo(() => {
  if (!heavyAnalysis || !isLocked) return heavyAnalysis;
  
  const result = { ...heavyAnalysis };
  
  // Normalisasi Percentiles
  if (result.percentiles) {
    result.percentiles = {
      ...result.percentiles,
      p95_dl: convertValue(result.percentiles.p95_dl, 'BYTES', usageUnit),
      p99_dl: convertValue(result.percentiles.p99_dl, 'BYTES', usageUnit),
      p95_ul: convertValue(result.percentiles.p95_ul, 'BYTES', usageUnit),
      p99_ul: convertValue(result.percentiles.p99_ul, 'BYTES', usageUnit),
    };
  }

  // Normalisasi Anomalies
  if (result.anomalies) {
    result.anomalies = result.anomalies.map(a => ({
      ...a,
      value: a.type === 'traffic' ? convertValue(a.value, 'BYTES', usageUnit) : a.value
    }));
  }

  return result;
}, [heavyAnalysis, isLocked, usageUnit]);

// 2. Normalisasi Interface Analysis
const normalizedInterfaceAnalysis = useMemo(() => {
  if (!interfaceAnalysis || !isLocked) return interfaceAnalysis;
  return interfaceAnalysis.map(iface => ({
    ...iface,
    download_value: convertValue(iface.download_value, 'BYTES', usageUnit),
    upload_value: convertValue(iface.upload_value, 'BYTES', usageUnit),
  }));
}, [interfaceAnalysis, isLocked, usageUnit]);
```

### B. Modifikasi useAnalysisData.jsx
Menyederhanakan logika karena data yang masuk sudah ternormalisasi.

```jsx
// useAnalysisData.jsx

// Hapus penggunaan toMbps dan bytesToUnit di dalam hook ini jika usageUnit sudah diterapkan di Analysis.jsx
const totalBytes = useMemo(() => sum(totals), [totals]); 
// Nilai ini akan otomatis dalam unit yang dipilih (misal MB) jika totals diambil dari normalized reportRows.
```

### C. Modifikasi TrafficKpiCard.jsx
Menghilangkan konversi manual.

```jsx
// TrafficKpiCard.jsx
const displayValue = React.useMemo(() => {
  if (isLoading) return '...';
  // Nilai value sudah ternormalisasi dari Analysis.jsx
  return `${Number(value || 0).toFixed(2)} ${usageUnit}`;
}, [value, usageUnit, isLoading]);
```

## 3. RISIKO & MITIGASI
*   **Risiko:** Double conversion (Konversi dua kali) jika card tidak segera diupdate setelah `Analysis.jsx` diupdate.
*   **Mitigasi:** Perubahan harus dilakukan secara atomik (bersamaan) untuk `Analysis.jsx` dan sub-komponen terkait.

## 4. KESIMPULAN AUDITOR
Rencana eksekusi ini aman dan direkomendasikan untuk menstandarisasi tampilan data di seluruh dashboard. Sesuai aturan **LARANGAN AUDITOR**, kode sumber belum diubah. Mohon persetujuan user untuk melakukan eksekusi (merubah kode).
