/**
 * STAGE 4 — HABITS & PATTERNS
 * Menganalisis pola berulang (HOD, DOW) dari ScopedDataset (Stage 1).
 * Mengacu pada 04 HABIT_PATTERN_RULE.md
 */

/**
 * Menghitung HabitMetrics dari ScopedDataset.
 * @param {Object} scopedDataset Dataset dari Stage 1 (Context Locked).
 * @returns {Object|null} HabitMetrics berisi profil HOD & DOW.
 */
export const calculateHabitMetricsV2 = (scopedDataset) => {
  if (!scopedDataset?.data || scopedDataset.data.length === 0) return null;

  const data = scopedDataset.data;
  const granularity = scopedDataset.meta?.granularity;

  // Inisialisasi Profil
  const hodProfile = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0,
    traffic: { download: 0, upload: 0 },
    resource: { cpu: 0, memory: 0 }
  }));

  const dowProfile = Array.from({ length: 7 }, (_, i) => ({
    day: i, // 0=Sunday (sesuai Date.getDay())
    count: 0,
    traffic: { download: 0, upload: 0 },
    resource: { cpu: 0, memory: 0 }
  }));

  // Pemetaan Nama Hari
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Iterasi Dataset (O(n))
  data.forEach(row => {
    // Abaikan gap (isGap=true dari Stage 0)
    if (row.isGap) return;

    const date = new Date(row.period);
    if (isNaN(date.getTime())) return;

    const hour = date.getHours();
    const day = date.getDay();

    // 1. Akumulasi HOD (hanya jika granularity <= hour)
    if (granularity === 'hour' || granularity === 'auto') {
      const hSlot = hodProfile[hour];
      hSlot.count++;
      hSlot.traffic.download += row.traffic?.download || 0;
      hSlot.traffic.upload += row.traffic?.upload || 0;
      hSlot.resource.cpu += row.resource?.cpu || 0;
      hSlot.resource.memory += row.resource?.memory || 0;
    }

    // 2. Akumulasi DOW
    const dSlot = dowProfile[day];
    dSlot.count++;
    dSlot.traffic.download += row.traffic?.download || 0;
    dSlot.traffic.upload += row.traffic?.upload || 0;
    dSlot.resource.cpu += row.resource?.cpu || 0;
    dSlot.resource.memory += row.resource?.memory || 0;
  });

  // Hitung Rata-rata (Finalisasi Profil)
  const finalizeProfile = (profile) => {
    return profile.map(slot => {
      const n = slot.count || 1;
      return {
        ...slot,
        traffic: {
          download: slot.traffic.download / n,
          upload: slot.traffic.upload / n
        },
        resource: {
          cpu: slot.resource.cpu / n,
          memory: slot.resource.memory / n
        }
      };
    });
  };

  const finalHod = finalizeProfile(hodProfile);
  const finalDow = finalizeProfile(dowProfile).map(d => ({ ...d, name: dayNames[d.day] }));

  // Hitung Metaparameter (Indeks Pola)
  const calculateMetaparameters = (profile, metricKey, subKey) => {
    const values = profile.map(s => s[metricKey][subKey]);
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    
    // CV (Consistency)
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const cv = mean === 0 ? 0 : stdDev / mean;

    // Peak-to-Baseline
    const max = Math.max(...values);
    const peakToBaseline = mean === 0 ? 0 : max / mean;

    return { cv, peakToBaseline, mean, max };
  };

  // Sample Validation (Threshold Rule)
  const uniqueDays = new Set(data.map(r => r.period.split('T')[0])).size;
  const isHodStable = uniqueDays >= 7;
  const isDowStable = uniqueDays >= 14;

  return {
    hod: finalHod,
    dow: finalDow,
    meta: {
      uniqueDays,
      isHodStable,
      isDowStable,
      hodMetrics: calculateMetaparameters(finalHod, 'traffic', 'download'),
      dowMetrics: calculateMetaparameters(finalDow, 'traffic', 'download'),
      stabilityMessage: (!isHodStable || !isDowStable) ? 'Data belum cukup stabil (Low Sample)' : 'Data stabil'
    }
  };
};
