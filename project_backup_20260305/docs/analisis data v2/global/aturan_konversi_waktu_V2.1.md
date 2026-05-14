# ATURAN KONVERSI WAKTU OTOMATIS & AKURASI DATA (V2.1)

## 1. PENDAHULUAN
Dokumen ini menetapkan standar logika untuk melakukan konversi antar satuan waktu yang berbeda (bulan, hari, jam, menit, detik) dalam sistem analisis data Mikrotik. Fokus utama dari aturan ini adalah untuk menangani perbedaan skala waktu antara ketersediaan data (available data) dan permintaan analisis (requested analysis) sambil memberikan indikator akurasi yang transparan kepada pengguna.

---

## 2. LOGIKA KONVERSI & AMBANG BATAS (THRESHOLDS)

Sistem harus mampu mendeteksi satuan asal dan satuan tujuan secara otomatis, kemudian menerapkan rumus berikut:

| Konversi | Satuan Asal | Satuan Tujuan | Ambang Batas (T) | Rumus Agregasi | Perhitungan Akurasi |
|---|---|---|---|---|---|
| **Hari ke Bulan** | Hari | Bulan | 30 Hari | `AVG(data_hari)` | `(Jumlah Hari / 30) * 100%` |
| **Jam ke Hari** | Jam | Hari | 24 Jam | `AVG(data_jam)` | `(Jumlah Jam / 24) * 100%` |
| **Menit ke Jam** | Menit | Jam | 60 Menit | `AVG(data_menit)` | `(Jumlah Menit / 60) * 100%` |
| **Detik ke Menit** | Detik | Menit | 60 Detik | `AVG(data_detik)` | `(Jumlah Detik / 60) * 100%` |

---

## 3. ATURAN PENAMPILAN AKURASI

Jika jumlah data yang tersedia kurang dari Ambang Batas (T), sistem **WAJIB** menampilkan informasi tingkat akurasi dengan format:
> *"Telah dikonversi, hanya [X]% akurat"*

**Contoh Kasus:**
- Permintaan: **Bulanan**, Data tersedia: **7 Hari**.
  - Hasil: Rata-rata dari 7 hari tersebut.
  - Akurasi: `(7/30) * 100 = 23.3%`.
  - Pesan: "Telah dikonversi, hanya 23% akurat".

---

## 4. IMPLEMENTASI FUNGSI (PSEUDO-CODE)

```javascript
/**
 * Fungsi Konversi Waktu Otomatis
 * @param {Array} values - Array nilai data mentah
 * @param {String} unitFrom - 'month'|'day'|'hour'|'minute'|'second'
 * @param {String} unitTo - 'month'|'day'|'hour'|'minute'|'second'
 * @returns {Object} { value: Number, accuracy: String, isWarning: Boolean }
 */
function convertTimeScale(values, unitFrom, unitTo) {
    const thresholds = {
        'month': { sub: 'day', size: 30 },
        'day': { sub: 'hour', size: 24 },
        'hour': { sub: 'minute', size: 60 },
        'minute': { sub: 'second', size: 60 }
    };

    // 1. Validasi Input
    const validUnits = ['month', 'day', 'hour', 'minute', 'second'];
    if (!validUnits.includes(unitFrom) || !validUnits.includes(unitTo)) {
        throw new Error("Satuan waktu tidak valid");
    }

    // Jika satuan sama, kembalikan rata-rata tanpa peringatan
    if (unitFrom === unitTo) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return { value: avg, accuracy: "100% akurat", isWarning: false };
    }

    // 2. Logika Konversi (Hanya menangani 1 tingkat ke atas untuk akurasi)
    if (thresholds[unitTo] && thresholds[unitTo].sub === unitFrom) {
        const T = thresholds[unitTo].size;
        const count = values.length;
        const avg = values.reduce((a, b) => a + b, 0) / count;
        
        const accuracyPct = Math.min(100, Math.round((count / T) * 100));
        
        return {
            value: avg,
            accuracy: accuracyPct < 100 ? `telah dikonversi hanya ${accuracyPct}% akurat` : "100% akurat",
            isWarning: accuracyPct < 100
        };
    }

    // TODO: Implementasi untuk loncatan satuan lebih dari 1 tingkat (misal Menit ke Hari)
    return { value: 0, accuracy: "Konversi tidak didukung", isWarning: true };
}
```

---

## 5. SKENARIO UNIT TEST

| No | Input (Count) | Satuan Asal | Satuan Tujuan | Ekspektasi Akurasi | Keterangan |
|---|---|---|---|---|---|
| 1 | 30 | Hari | Bulan | 100% | Data lengkap 1 bulan |
| 2 | 7 | Hari | Bulan | 23% | Data kurang dari 30 hari |
| 3 | 24 | Jam | Hari | 100% | Data lengkap 1 hari |
| 4 | 7 | Jam | Hari | 29% | Data kurang dari 24 jam |
| 5 | 60 | Menit | Jam | 100% | Data lengkap 1 jam |
| 6 | 45 | Menit | Jam | 75% | Data kurang dari 60 menit |
| 7 | 60 | Detik | Menit | 100% | Data lengkap 1 menit |
| 8 | 15 | Detik | Menit | 25% | Data kurang dari 60 detik |

---

## 6. PENANGANAN ERROR & VALIDASI
- **Satuan Tidak Dikenal**: Sistem harus melempar error jika `unitFrom` atau `unitTo` di luar daftar standar.
- **Data Kosong**: Jika `values` kosong, kembalikan nilai 0 dengan akurasi 0%.
- **Nilai Non-Numerik**: Pastikan seluruh elemen dalam array `values` adalah angka valid sebelum diproses.
