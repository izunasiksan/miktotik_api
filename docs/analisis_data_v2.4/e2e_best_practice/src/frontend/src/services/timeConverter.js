/**
 * Utilitas Konversi Waktu Otomatis dengan Indikator Akurasi
 * Berdasarkan: docs/analisis data v2/global/aturan_konversi_waktu_V2.1.md
 */

export const TIME_UNITS = {
  MONTH: 'month',
  DAY: 'day',
  HOUR: 'hour',
  MINUTE: 'minute',
  SECOND: 'second'
};

const THRESHOLDS = {
  [TIME_UNITS.MONTH]: { sub: TIME_UNITS.DAY, size: 30 },
  [TIME_UNITS.DAY]: { sub: TIME_UNITS.HOUR, size: 24 },
  [TIME_UNITS.HOUR]: { sub: TIME_UNITS.MINUTE, size: 60 },
  [TIME_UNITS.MINUTE]: { sub: TIME_UNITS.SECOND, size: 60 }
};

/**
 * Mengonversi nilai antar skala waktu dan menghitung akurasi data.
 * 
 * @param {number|number[]} nilai - Nilai tunggal atau array nilai untuk diagregasi (AVG)
 * @param {string} satuanAsal - Satuan waktu asal (second, minute, hour, day, month)
 * @param {string} satuanTujuan - Satuan waktu tujuan (second, minute, hour, day, month)
 * @returns {Object} Hasil konversi dan informasi akurasi
 */
export function convertTimeScale(nilai, satuanAsal, satuanTujuan) {
  // 1. Validasi Input
  const validUnits = Object.values(TIME_UNITS);
  if (!validUnits.includes(satuanAsal) || !validUnits.includes(satuanTujuan)) {
    throw new Error(`Satuan tidak valid: ${satuanAsal} -> ${satuanTujuan}`);
  }

  // Normalisasi input ke array
  const dataArray = Array.isArray(nilai) ? nilai : [nilai];
  if (dataArray.length === 0) {
    return { value: 0, accuracy: '0% akurat', isWarning: true, message: 'Data kosong' };
  }

  // Hitung rata-rata awal
  const avgValue = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

  // Jika satuan sama
  if (satuanAsal === satuanTujuan) {
    return {
      value: avgValue,
      accuracy: '100% akurat',
      isWarning: false,
      message: 'Satuan sama, tidak ada konversi'
    };
  }

  // 2. Logika Konversi Otomatis
  const targetThreshold = THRESHOLDS[satuanTujuan];

  // Cek apakah konversi 1 tingkat ke atas (misal: day -> month)
  if (targetThreshold && targetThreshold.sub === satuanAsal) {
    const T = targetThreshold.size;
    const count = dataArray.length;
    const accuracyPct = Math.min(100, Math.round((count / T) * 100));
    
    return {
      value: avgValue,
      accuracy: `${accuracyPct}% akurat`,
      isWarning: accuracyPct < 100,
      message: accuracyPct < 100 
        ? `telah dikonversi hanya ${accuracyPct}% akurat` 
        : '100% akurat'
    };
  }

  // 3. Penanganan konversi multi-level (Opsional/Fallback)
  // Untuk saat ini hanya mendukung 1 tingkat sesuai permintaan aturan
  return {
    value: avgValue,
    accuracy: 'Konversi tidak didukung',
    isWarning: true,
    message: `Sistem saat ini hanya mendukung konversi 1 tingkat (misal: ${satuanAsal} ke ${targetThreshold?.sub || 'satuan di atasnya'})`
  };
}
