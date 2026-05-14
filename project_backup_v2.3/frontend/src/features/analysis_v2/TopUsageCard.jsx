import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { pickNum, bytesToUnit, avg, std } from '../analysis_utils.jsx';

/**
 * Top Usage Card with CSV export.
 */
const TopUsageCard = ({ reportRows, period, usageUnit, isLoading }) => {
  const exportCsv = () => {
    try {
      const rows = (Array.isArray(reportRows) ? reportRows : []).map((r, i) => {
        const dl = pickNum(r, ['download', 'dl', 'total_rx_bytes', 'rx_bytes', 'rx']);
        const ul = pickNum(r, ['upload', 'ul', 'total_tx_bytes', 'tx_bytes', 'tx']);
        const tot = dl + ul;
        const label = r.displayDate || r.date || r.report_date || r.day || r.month || `Row ${i + 1}`;
        return { label, dl, ul, tot, totalUnit: (Number(bytesToUnit(tot, usageUnit)) || 0).toFixed(2) + ' ' + usageUnit };
      });
      const header = ['Label', 'DownloadBytes', 'UploadBytes', 'TotalBytes', `Total${usageUnit}`].join(',');
      const csv = [header, ...rows.map(x => [x.label, x.dl, x.ul, x.tot, x.totalUnit].join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `top_usage_${period}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('CSV berhasil diunduh');
    } catch {
      toast.error('Gagal menyiapkan CSV');
    }
  };

  const topRows = React.useMemo(() => {
    const all = (Array.isArray(reportRows) ? reportRows : []).map((r, i) => {
      const dl = pickNum(r, ['download', 'dl', 'total_rx_bytes', 'rx_bytes', 'rx']);
      const ul = pickNum(r, ['upload', 'ul', 'total_tx_bytes', 'tx_bytes', 'tx']);
      const tot = dl + ul;
      const label = r.displayDate || r.date || r.report_date || r.day || r.month || `Row ${i + 1}`;
      return { label, tot };
    });
    const values = all.map(x => x.tot);
    const mu = avg(values);
    const sigma = std(values);
    return {
      rows: all.sort((a, b) => b.tot - a.tot).slice(0, 5),
      mu,
      sigma
    };
  }, [reportRows]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Top Usage • {period === 'daily' ? 'Harian' : 'Bulanan'}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="text-[10px] font-bold px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-600 transition-colors uppercase"
            title="Ekspor CSV"
          >
            Ekspor CSV
          </button>
          <span className="text-[10px] font-bold text-gray-400 uppercase">Top 5</span>
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-50 animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {topRows.rows.length ? topRows.rows.map((row, idx) => {
            const z = topRows.sigma > 0 ? (row.tot - topRows.mu) / topRows.sigma : 0;
            const anom = Math.abs(z) >= 2.5;
            return (
              <li key={idx} className="py-2.5 flex items-center justify-between animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                <span className="text-sm text-gray-700 flex items-center gap-2">
                  {row.label}
                  {anom && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 font-black uppercase">Anomali</span>}
                </span>
                <span className="text-sm font-black text-gray-900">{(Number(bytesToUnit(row.tot, usageUnit)) || 0).toFixed(2)} {usageUnit}</span>
              </li>
            );
          }) : (
            <li className="py-6 text-sm text-gray-400 text-center font-medium italic">Tidak ada data</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default TopUsageCard;
