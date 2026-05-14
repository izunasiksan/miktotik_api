import React from 'react';
import { Database, Clock, Settings } from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color = 'text-gray-500' }) => (
  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center gap-3">
    <div className={`w-9 h-9 rounded-md bg-white border border-gray-200 flex items-center justify-center ${color}`}>
      {Icon ? <Icon size={18} /> : <Database size={18} />}
    </div>
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold text-gray-800">{value ?? '-'}</div>
    </div>
  </div>
);

const Stage0NormalizationPanel = ({ meta, sample, dataCount }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Stage 0 — Normalisasi</h2>
        <span className="text-sm text-gray-500">{dataCount || 0} bucket</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="validCount" value={meta?.validCount ?? 0} icon={Database} color="text-emerald-600" />
        <StatCard label="droppedCount" value={meta?.droppedCount ?? 0} icon={Database} color="text-rose-600" />
        <StatCard label="gapCount" value={meta?.gapCount ?? 0} icon={Database} color="text-amber-600" />
        <StatCard label="invalidFieldCount" value={meta?.invalidFieldCount ?? 0} icon={Database} color="text-sky-600" />
        <StatCard label="granularity" value={meta?.granularity || '-'} icon={Clock} color="text-indigo-600" />
        <StatCard label="mode" value={meta?.mode || '-'} icon={Settings} color="text-gray-600" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-800 mb-2">Contoh Bucket</div>
          <pre className="text-xs text-gray-600 overflow-auto bg-gray-50 rounded p-3">
            {sample ? JSON.stringify(sample, null, 2) : 'Tidak ada data.'}
          </pre>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-800 mb-2">Catatan</div>
          <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
            <li>Frontend tidak membuat atau menghapus bucket.</li>
            <li>isGap digunakan untuk menandai bucket kosong.</li>
            <li>MemUsage dihitung hanya jika total_memory tersedia.</li>
          </ul>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-800 mb-2">Sumber Data</div>
          <div className="text-xs text-gray-600">Aggregate-All (V2) dengan parameter terkunci.</div>
        </div>
      </div>
    </div>
  );
};

export default Stage0NormalizationPanel;

