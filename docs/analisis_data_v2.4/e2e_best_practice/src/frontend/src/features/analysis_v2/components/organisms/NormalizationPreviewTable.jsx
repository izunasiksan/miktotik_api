import React, { useState } from 'react';
import { useAnalysisStore } from '../../../../store/analysisStore';
import { Table, Eye, EyeOff, FileSpreadsheet, AlertCircle, Database, LayoutList, ExternalLink } from 'lucide-react';
import SourceDataModal from '../molecules/SourceDataModal';

/**
 * Organism: NormalizationPreviewTable
 * UPDATE 2.4.1: Menampilkan data mentah hasil normalisasi Stage 0 dalam bentuk tabel.
 * Menampilkan juga rowCounts dari 6 tabel sumber (Stage 0) sebagai tombol interaktif.
 */
const NormalizationPreviewTable = () => {
  const { normalizationData } = useAnalysisStore();
  const [showTable, setShowTable] = useState(false);
  const [showRowCounts, setShowRowCounts] = useState(true);
  const [activeTab, setActiveTab] = useState('traffic'); // 'traffic', 'resource', or 'users'
  
  // Modal State
  const [selectedTable, setSelectedTable] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openTableDetail = (tableName) => {
    setSelectedTable(tableName);
    setIsModalOpen(true);
  };

  if (!normalizationData) return null;

  // UPDATED 2.4.1: Mapping data structure from backend response
  const trafficData = normalizationData.traffic || [];
  const resourceData = normalizationData.resource || [];
  const usersData = normalizationData.users || [];
  
  // Select data based on active tab & Limit to last 100 rows for performance
  const rawData = activeTab === 'traffic' 
    ? trafficData 
    : (activeTab === 'resource' ? resourceData : usersData);
  
  const data = rawData.slice(-100); // Only show last 100 rows
    
  const meta = activeTab === 'traffic' 
    ? (normalizationData.metadata?.traffic || {}) 
    : (activeTab === 'resource' 
        ? (normalizationData.metadata?.resource || {}) 
        : (normalizationData.metadata?.users || {}));

  const rowCounts = normalizationData.row_counts || normalizationData.metadata?.row_counts || [];
  
  // V2.4.1: Use tab-specific accuracy if available, fallback to global
  const accuracyPct = typeof meta.accuracy_pct === 'number' 
    ? meta.accuracy_pct 
    : (typeof normalizationData.accuracy_pct === 'number' ? normalizationData.accuracy_pct : 0);
     
  const usageUnit = normalizationData.usage_unit || 'Mbps';

  return (
    <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* SECTION: Source Tables Row Count (Stage 0) */}
      {rowCounts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 rounded-lg">
                <Database className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Source Data Volume (Stage 0)</h4>
                <p className="text-[10px] text-slate-400 font-medium italic">Click table card to view details</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowRowCounts(!showRowCounts)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              title={showRowCounts ? "Hide Source Stats" : "Show Source Stats"}
            >
              {showRowCounts ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {showRowCounts && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in zoom-in-95 duration-300">
              {rowCounts.map((item) => (
                <button 
                  key={item.table_name} 
                  onClick={() => openTableDetail(item.table_name)}
                  className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-between shadow-sm hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-50 active:scale-95 transition-all group text-left w-full"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-emerald-50 transition-colors">
                      <LayoutList className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight truncate max-w-[120px]" title={item.table_name}>
                        {item.table_name.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-2.5 h-2.5" />
                        VIEW DETAIL
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-800 tabular-nums">
                      {item.row_count.toLocaleString('id-ID')}
                    </span>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Rows Found</p>
                    {item.table_total_estimate > 0 && (
                      <div className="flex items-center justify-end gap-1 mt-0.5" title="Estimated total rows in table (PostgreSQL stats)">
                        <span className="text-[7px] font-bold text-slate-300 uppercase tracking-tighter">
                          ~{item.table_total_estimate.toLocaleString('id-ID')} SYSTEM TOTAL
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Source Data Modal */}
      <SourceDataModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tableName={selectedTable}
      />

      {/* SECTION: Normalized Data Preview */}
      {(trafficData.length > 0 || resourceData.length > 0 || usersData.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 rounded-lg">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Normalized Data Preview</h4>
                  <p className="text-[10px] text-slate-400 font-medium italic">Showing last {data.length} {activeTab} data points</p>
                </div>
              </div>

              {/* Data Type Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('traffic')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    activeTab === 'traffic' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  TRAFFIC (Mbps)
                </button>
                <button
                  onClick={() => setActiveTab('resource')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    activeTab === 'resource' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  RESOURCE (CPU/RAM)
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    activeTab === 'users' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  USERS (HSP/PPPOE)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* V2.4.1 Summary Pills */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200/50">
                <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Accuracy</span>
                  <span className={`text-[10px] font-black ${accuracyPct >= 80 ? 'text-emerald-600' : accuracyPct >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {accuracyPct.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Gaps</span>
                  <span className="text-[10px] font-black text-slate-600">{meta.gap_count || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Valid</span>
                  <span className="text-[10px] font-black text-emerald-600">{meta.valid_count || 0}</span>
                </div>
              </div>
            
              <button
                onClick={() => setShowTable(!showTable)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                showTable 
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'
              }`}
            >
              {showTable ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  HIDE DATA TABLE
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  PREVIEW DATA TABLE
                </>
              )}
            </button>
          </div>
        </div>

          {showTable && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in zoom-in-95 duration-300">
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">#</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Timestamp</th>
                      {activeTab === 'traffic' ? (
                        <>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Download</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Upload</th>
                        </>
                      ) : activeTab === 'resource' ? (
                        <>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">CPU Usage</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Free RAM</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Hotspot</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">PPPoE</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Active Users</th>
                        </>
                      )}
                      <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Method/Source</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.map((row, idx) => {
                      const rowAccuracy = Number(row.accuracy_pct ?? 0);
                      // V2.4.2 UI Improvements: Calculate real index considering limit
                      const realIndex = (rawData.length > 100 ? rawData.length - 100 : 0) + idx + 1;
                      
                      return (
                        <tr key={idx} className={`hover:bg-slate-50 transition-colors ${row.is_gap ? 'bg-amber-50/30' : ''}`}>
                          <td className="px-4 py-2.5 text-[10px] font-bold text-slate-400 tabular-nums">
                            {realIndex}
                          </td>
                          <td 
                            className="px-4 py-2.5 text-xs font-mono text-slate-600 whitespace-nowrap cursor-help"
                            title={`Raw: ${row.raw_timestamp || 'No raw source'}`}
                          >
                            {new Date(row.display_date || row.timestamp).toLocaleString('id-ID', {
                              dateStyle: 'short',
                              timeStyle: 'medium'
                            })}
                          </td>
                          {activeTab === 'traffic' ? (
                            <>
                              <td className="px-4 py-2.5 text-xs font-bold text-slate-700 whitespace-nowrap">
                                {(row.rx ?? 0).toFixed(2)} <span className="text-[10px] font-normal text-slate-400">{row.unit || usageUnit}</span>
                               </td>
                               <td className="px-4 py-2.5 text-xs font-bold text-slate-700 whitespace-nowrap">
                                 {(row.tx ?? 0).toFixed(2)} <span className="text-[10px] font-normal text-slate-400">{row.unit || usageUnit}</span>
                               </td>
                             </>
                           ) : activeTab === 'resource' ? (
                            <>
                              <td className="px-4 py-2.5 text-xs font-bold text-slate-700 whitespace-nowrap">
                                 {(row.cpu_usage_pct ?? 0).toFixed(1)} <span className="text-[10px] font-normal text-slate-400">%</span>
                               </td>
                               <td className="px-4 py-2.5 text-xs font-bold text-slate-700 whitespace-nowrap">
                                {row.free_memory_mb !== undefined && row.free_memory_mb !== null
                                  ? Number(row.free_memory_mb).toFixed(1)
                                  : ((row.free_memory ?? 0) / (1024 * 1024)).toFixed(1)} <span className="text-[10px] font-normal text-slate-400">MB</span>
                              </td>
                             </>
                           ) : (
                            <>
                              <td className="px-4 py-2.5 text-xs font-bold text-slate-700 whitespace-nowrap">
                                 {(row.hotspot_users ?? 0).toLocaleString('id-ID')} <span className="text-[10px] font-normal text-slate-400">Users</span>
                               </td>
                               <td className="px-4 py-2.5 text-xs font-bold text-slate-700 whitespace-nowrap">
                                 {(row.pppoe_users ?? 0).toLocaleString('id-ID')} <span className="text-[10px] font-normal text-slate-400">Users</span>
                               </td>
                               <td className="px-4 py-2.5 text-xs font-bold text-indigo-700 whitespace-nowrap">
                                 {(row.active_users ?? 0).toLocaleString('id-ID')} <span className="text-[10px] font-normal text-indigo-400">Active</span>
                               </td>
                             </>
                           )}
                           <td className="px-4 py-2.5 whitespace-nowrap">
                             <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                               row.is_gap 
                                 ? (row.imputation_strategy === 'linear_interpolation' 
                                     ? 'bg-blue-50 text-blue-600' 
                                     : 'bg-amber-50 text-amber-600')
                                 : 'text-emerald-600'
                             }`}>
                               {row.is_gap ? (row.imputation_strategy || 'IMPUTED').replace(/_/g, ' ') : 'RAW DATA'}
                             </span>
                           </td>
                           <td className="px-4 py-2.5 whitespace-nowrap">
                            {row.is_gap ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-tighter border border-amber-200">
                                <AlertCircle className="w-2.5 h-2.5" />
                                GAP FILLED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-tighter border border-emerald-200">
                                <AlertCircle className="w-2.5 h-2.5" />
                                VALID
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    rowAccuracy >= 100 ? 'bg-emerald-500' : rowAccuracy >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${rowAccuracy}%` }}
                                />
                              </div>
                              <span className={`text-[10px] font-mono font-bold ${
                                rowAccuracy >= 100 ? 'text-emerald-600' : rowAccuracy >= 50 ? 'text-amber-600' : 'text-rose-600'
                              }`}>
                                {rowAccuracy.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Valid: {meta.valid_count ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Gaps: {meta.gap_count ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Dropped: {meta.dropped_count ?? 0}</span>
                  </div>
                </div>
                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                  Stage 0 Accuracy: {accuracyPct}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NormalizationPreviewTable;
