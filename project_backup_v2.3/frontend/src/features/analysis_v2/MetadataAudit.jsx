import React from 'react';
import { Database, Lock, CheckCircle, AlertTriangle, Fingerprint, Info, XCircle } from 'lucide-react';
import { METRIC_REGISTRY } from '../analysis_utils.jsx';

const MetadataAudit = ({
  metricMetadata,
  reportData,
  processedData,
  normalizationConfig
}) => {
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [selectedAttr, setSelectedAttr] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [query, setQuery] = React.useState('');

  const attributes = React.useMemo(() => Object.keys(metricMetadata || {}), [metricMetadata]);
  React.useEffect(() => {
    if (!selectedAttr && attributes.length > 0) {
      setSelectedAttr(attributes[0]);
    }
  }, [attributes, selectedAttr]);

  const resolveTargetUnit = React.useCallback((key) => {
    const meta = METRIC_REGISTRY[key];
    if (!meta) return undefined;
    if (meta.type === 'traffic' || meta.type === 'resource') return normalizationConfig?.bytes?.unit || meta.unit;
    if (meta.type === 'speed') return normalizationConfig?.speed?.unit || meta.unit;
    if (meta.type === 'time') return normalizationConfig?.time?.unit || meta.unit;
    if (meta.type === 'usage' || meta.type === 'percentage') return normalizationConfig?.percentage?.unit || meta.unit;
    if (meta.type === 'quantity' || meta.type === 'count') return normalizationConfig?.count?.unit || meta.unit;
    return meta.unit;
  }, [normalizationConfig]);

  const dynamicRows = React.useMemo(() => {
    if (!selectedAttr) return [];
    const src = Array.isArray(reportData) ? reportData : [];
    const tgt = Array.isArray(processedData) ? processedData : [];
    const rows = src.map((r, i) => {
      const rawVal = r?.[selectedAttr];
      const normVal = tgt?.[i]?.[selectedAttr];
      const time = r?.log_time || r?.log_date || r?.log_month || r?.created_at || '';
      return { time, rawVal, normVal };
    });
    const q = (query || '').toString().toLowerCase();
    const filtered = q ? rows.filter(r => String(r.rawVal ?? '').toLowerCase().includes(q) || String(r.normVal ?? '').toLowerCase().includes(q) || String(r.time ?? '').toLowerCase().includes(q)) : rows;
    return filtered;
  }, [reportData, processedData, selectedAttr, query]);

  const totalPages = Math.max(1, Math.ceil(dynamicRows.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const pagedRows = React.useMemo(() => {
    const start = (pageClamped - 1) * pageSize;
    return dynamicRows.slice(start, start + pageSize);
  }, [dynamicRows, pageClamped, pageSize]);

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <Database size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-800">Metadata & Pemetaan Satuan Otomatis</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Menganalisis tipe data & pola nilai kolom</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
          <Lock size={10} />
          Sistem Validasi Aktif
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(metricMetadata || {}).map(([key, meta]) => (
          <div key={key} className={`p-3 rounded-lg border transition-all ${meta.isHealthy ? 'bg-gray-50 border-gray-100' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-gray-700 truncate max-w-[120px]">{key}</span>
              <div className="flex items-center gap-1">
                <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase ${
                  meta.data_type === 'number' ? 'bg-blue-100 text-blue-700' :
                  meta.data_type === 'datetime' ? 'bg-purple-100 text-purple-700' :
                  meta.data_type === 'boolean' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {meta.data_type || 'UNKNOWN'}
                </span>
                <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase ${
                  meta.type === 'traffic' ? 'bg-blue-100 text-blue-700' :
                  meta.type === 'speed' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {meta.unit}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Status</span>
                <span className={`text-[9px] font-black ${meta.isHealthy ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {meta.isHealthy ? 'CONSISTENT' : 'ANOMALY DETECTED'}
                </span>
              </div>
              {meta.anomalyCount > 0 && (
                <div className="mt-1 px-1.5 py-0.5 bg-white/50 rounded border border-amber-100 text-[8px] text-amber-700 font-bold italic">
                  Found {meta.anomalyCount} values out of range
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New Data Flow Verification Section (Mencegah Misconcept/Misvalue) */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Fingerprint size={16} className="text-blue-500" />
          <h4 className="text-xs font-black text-gray-700 uppercase">Verifikasi Transformasi (Audit Sampel)</h4>
          <button
            onClick={() => setViewerOpen(true)}
            className="ml-auto px-2.5 py-1.5 rounded-lg border text-[10px] font-black bg-blue-600 text-white border-blue-700 hover:bg-blue-700 transition-all"
            title="Buka halaman verifikasi dinamis"
          >
            Buka Halaman
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest border-b border-gray-100">
                <th className="p-2">Attribute</th>
                <th className="p-2">Raw Value (DB)</th>
                <th className="p-2">Source Unit</th>
                <th className="p-2">Normalized (UI)</th>
                <th className="p-2">Target Unit</th>
                <th className="p-2 text-right">Verification</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(metricMetadata || {}).slice(0, 5).map(key => {
                const meta = METRIC_REGISTRY[key];
                const rawVal = reportData && reportData[0] ? reportData[0][key] : 'N/A';
                const normVal = processedData && processedData[0] ? processedData[0][key] : 'N/A';
                const targetUnit = resolveTargetUnit(key);
                
                return (
                  <tr key={key} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
                    <td className="p-2 font-black text-gray-700">{key}</td>
                    <td className="p-2 font-mono text-gray-500">{rawVal}</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-gray-100 rounded font-bold text-[9px]">{meta?.source || 'RAW'}</span></td>
                    <td className="p-2 font-mono text-blue-600 font-black">{typeof normVal === 'number' ? normVal.toFixed(2) : normVal}</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-black text-[9px]">{targetUnit}</span></td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-1 text-emerald-600 font-black uppercase text-[8px]">
                        <CheckCircle size={10} /> Auto-Validated
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {viewerOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewerOpen(false)} />
          <div className="absolute inset-0 md:inset-6 bg-white rounded-none md:rounded-xl shadow-2xl border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Fingerprint size={16} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-black text-gray-800">Verifikasi Transformasi</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Audit sampel dinamis</div>
              </div>
              <button onClick={() => setViewerOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-end gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Attribute</label>
                  <select
                    value={selectedAttr}
                    onChange={(e) => { setSelectedAttr(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    {attributes.map(a => (<option key={a} value={a}>{a}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Page Size</label>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    {[10, 20, 50, 100].map(n => (<option key={n} value={n}>{n}</option>))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Cari</label>
                  <input
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                    placeholder="Ketik kata kunci..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="overflow-x-auto border border-gray-100 rounded-lg">
                <table className="min-w-full text-left text-[11px]">
                  <thead className="bg-gray-50 text-gray-500 font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-3 py-2">Waktu</th>
                      <th className="px-3 py-2">Raw Value</th>
                      <th className="px-3 py-2">Source Unit</th>
                      <th className="px-3 py-2">Normalized</th>
                      <th className="px-3 py-2">Target Unit</th>
                      <th className="px-3 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedRows.length > 0 ? pagedRows.map((r, idx) => {
                      const meta = METRIC_REGISTRY[selectedAttr];
                      const targetUnit = resolveTargetUnit(selectedAttr);
                      const ok = r.normVal !== undefined && r.normVal !== null && r.normVal !== '';
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-gray-500">{r.time || 'N/A'}</td>
                          <td className="px-3 py-2 font-mono text-gray-600">{String(r.rawVal ?? 'N/A')}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded font-bold text-[9px]">{meta?.source || 'RAW'}</span>
                          </td>
                          <td className="px-3 py-2 font-mono text-blue-700 font-bold">
                            {typeof r.normVal === 'number' ? r.normVal.toFixed(2) : String(r.normVal ?? 'N/A')}
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-black text-[9px]">{targetUnit || '-'}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {ok ? 'OK' : 'MISSING'}
                            </span>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-400 italic">Tidak ada data yang cocok.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-gray-500 font-bold">
                  Total: {dynamicRows.length} • Halaman {pageClamped}/{totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pageClamped <= 1}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black border ${pageClamped <= 1 ? 'text-gray-400 bg-gray-50 border-gray-100 cursor-not-allowed' : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50'}`}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={pageClamped >= totalPages}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black border ${pageClamped >= totalPages ? 'text-gray-400 bg-gray-50 border-gray-100 cursor-not-allowed' : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetadataAudit;
