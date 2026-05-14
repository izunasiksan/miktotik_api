import { useMemo } from 'react';

/**
 * Hook khusus untuk Decision Layer (Layer DIAGNOSTIC + PRESCRIPTIVE)
 * Bertanggung jawab atas kesimpulan insight, scoring kesiapan, dan klasifikasi risiko.
 */
export const useInsightEngine = ({
  reportData,
  period,
  limit,
  corrValue,
  anomaliesList,
  resourceAnomalies,
  dataQuality,
  integrityAudit,
  filters,
  metricMetadata // Added metadata
}) => {

  const methodologyAudit = useMemo(() => {
    if (!reportData || reportData.length === 0) return null;
    
    const sampleSize = reportData.length;
    const hasGaps = integrityAudit?.timeGaps > 0;
    const hasOutliers = dataQuality?.outOfBounds > 0;
    
    // Check for metric anomalies from metadata
    const metricAnomalies = Object.values(metricMetadata || {}).some(m => !m.isHealthy);
    
    const readinessSteps = [
      { step: 'Scope', status: !!period && !!limit, label: 'Definisi Ruang Lingkup' },
      { step: 'Filter', status: true, label: 'Pembersihan Data (Standardization)' },
      { step: 'Agregasi', status: sampleSize >= 1, label: 'Kecukupan Sampel Agregasi' },
      { step: 'Metadata', status: !!metricMetadata && !metricAnomalies, label: 'Validasi Satuan & Range' }, // New Step
      { step: 'Korelasi', status: !!corrValue && sampleSize >= 3, label: 'Hasil Uji Korelasi Backend' },
      { step: 'Pola', status: (anomaliesList?.length > 0 || resourceAnomalies?.length > 0) && !hasGaps, label: 'Deteksi Pola Anomali' },
      { step: 'Validasi', status: sampleSize >= 7 && !hasOutliers, label: 'Stabilitas Validasi (Min 7 Hari)' }
    ];

    const completedSteps = readinessSteps.filter(s => s.status).length;
    const readinessScore = Math.round((completedSteps / readinessSteps.length) * 100);

    return {
      algorithm: "Backend Engine (Standardized)",
      threshold: "Dynamic Correlation (Backend)",
      sampleSize,
      isReliable: sampleSize >= 7 && !hasGaps && !!corrValue && !metricAnomalies,
      readinessScore,
      readinessSteps,
      status: readinessScore === 100 ? 'Siap Insight' : readinessScore > 60 ? 'Butuh Penyesuaian' : 'Tidak Layak'
    };
  }, [reportData, integrityAudit, dataQuality, period, limit, corrValue, anomaliesList, resourceAnomalies, metricMetadata]);

  const filteredFindings = useMemo(() => {
    const rawFindings = [
      {
        category: 'Validasi Alur Insight',
        issue: methodologyAudit?.readinessScore < 100 ? `Alur baru mencapai ${methodologyAudit.readinessScore}% dari total kesiapan.` : 'Seluruh tahapan alur data-ke-insight tervalidasi.',
        mitigation: 'Ikuti 7 tahapan panduan ALUR INSIGHT untuk memastikan akurasi keputusan.',
        risk: methodologyAudit?.readinessScore < 80 ? 'HIGH' : 'LOW',
        riskColor: methodologyAudit?.readinessScore < 80 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
      },
      // New Metric Integrity Finding
      {
        category: 'Integritas Satuan (Metrics)',
        issue: Object.values(metricMetadata || {}).some(m => !m.isHealthy) 
          ? `Terdeteksi anomali pada range nilai berdasarkan satuan yang ditetapkan.` 
          : 'Mapping satuan & range nilai tervalidasi.',
        mitigation: 'Tinjau panel "Metadata & Pemetaan Satuan" dan lakukan override manual jika perlu.',
        risk: Object.values(metricMetadata || {}).some(m => !m.isHealthy) ? 'HIGH' : 'LOW',
        riskColor: Object.values(metricMetadata || {}).some(m => !m.isHealthy) ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
      },
      {
        category: 'Kelengkapan Data',
        issue: dataQuality?.missingFields > 0 ? `Terdapat ${dataQuality.missingFields} data kosong.` : 'Data lengkap (Full coverage).',
        mitigation: 'Menggunakan pickNum() untuk mapping field alternatif dan default value 0.',
        risk: dataQuality?.missingFields > 0 ? 'MEDIUM' : 'LOW',
        riskColor: dataQuality?.missingFields > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
      },
      {
        category: 'Akurasi Nilai',
        issue: 'Potensi outlier pada CPU/Memory (Nilai > 100% atau < 0%).',
        mitigation: 'Penerapan filter batas atas (100%) dan bawah (0%) pada audit data.',
        risk: dataQuality?.outOfBounds > 0 ? 'HIGH' : 'LOW',
        riskColor: dataQuality?.outOfBounds > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
      },
      {
        category: 'Bias Analisis',
        issue: integrityAudit?.timeGaps > 0 ? 'Gap pada data harian dapat mendistorsi rata-rata.' : 'Tidak ditemukan bias temporal.',
        mitigation: 'Gunakan pembobotan median daripada mean jika gap terdeteksi.',
        risk: integrityAudit?.timeGaps > 0 ? 'MEDIUM' : 'LOW',
        riskColor: integrityAudit?.timeGaps > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
      }
    ];

    return rawFindings.filter(f => {
      const matchRisk = filters.riskLevel === 'ALL' || f.risk === filters.riskLevel;
      const matchSearch = filters.search === '' || 
        f.category.toLowerCase().includes(filters.search.toLowerCase()) || 
        f.issue.toLowerCase().includes(filters.search.toLowerCase());
      return matchRisk && matchSearch;
    });
  }, [dataQuality, integrityAudit, methodologyAudit, filters.riskLevel, filters.search, metricMetadata]);

  return {
    methodologyAudit,
    filteredFindings
  };
};
