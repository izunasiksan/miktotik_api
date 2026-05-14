import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, Search, Filter, Download, 
  ArrowUpDown, Loader2, AlertCircle, 
  ChevronLeft, ChevronRight, Table as TableIcon 
} from 'lucide-react';
import { getSourceTableDetail } from '../../../../services/api';
import { useContextLockStore } from '../../../../store/analysisStore';

/**
 * Component: SourceDataModal
 * Menampilkan data detail dari tabel sumber Mikrotik (Stage 0).
 * Fitur: Pencarian, Filter, Pagination, Responsive Table.
 */
const SourceDataModal = ({ isOpen, onClose, tableName }) => {
  const { selectedBoardId, timeRange } = useContextLockStore();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Local State for Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        boardId: selectedBoardId,
        startTime: timeRange.start,
        endTime: timeRange.end,
        tableName: tableName,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
      };
      
      const result = await getSourceTableDetail(payload);
      // V2.4.2: Support snake_case from backend
      setData(result.data || []);
      setTotalCount(result.total_count || result.totalCount || 0);
    } catch (err) {
      console.error('Failed to fetch source detail:', err);
      // Pydantic validation error seringkali berbentuk array of objects
      const errorData = err.response?.data?.detail;
      let errorMsg = 'Gagal memuat data dari server';
      
      if (typeof errorData === 'string') {
        errorMsg = errorData;
      } else if (Array.isArray(errorData)) {
        // Jika detail adalah array (validation errors), ambil pesan pertama
        errorMsg = errorData[0]?.msg || JSON.stringify(errorData);
      } else if (typeof errorData === 'object' && errorData !== null) {
        errorMsg = errorData.msg || JSON.stringify(errorData);
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [selectedBoardId, timeRange, tableName, pageSize, currentPage]);

  // Fetch Data dari Backend
   useEffect(() => {
     if (isOpen && tableName && selectedBoardId) {
       fetchData();
     }
   }, [isOpen, tableName, selectedBoardId, currentPage, fetchData]);
 
   // Handle ESC key
   useEffect(() => {
     const handleEsc = (e) => {
       if (e.key === 'Escape') onClose();
     };
     window.addEventListener('keydown', handleEsc);
     return () => window.removeEventListener('keydown', handleEsc);
   }, [onClose]);

  // Filter Data (Client Side Search)
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(query)
      )
    );
  }, [data, searchQuery]);

  // Extract Columns dari Data
  const columns = useMemo(() => {
    if (data.length === 0) return [];
    // Ambil semua key unik dari baris pertama sebagai header
    return Object.keys(data[0]).filter(k => k !== 'board_id');
  }, [data]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-indigo-50 rounded-2xl">
              <TableIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {tableName?.replace(/_/g, ' ')}
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                Source Data Explorer • {totalCount.toLocaleString()} Records Found
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600 active:scale-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Toolbar: Search & Filter */}
        <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <label htmlFor="modal-search-input" className="sr-only">Cari data di halaman ini</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              id="modal-search-input"
              name="modal-search-input"
              type="text"
              placeholder="Cari data di halaman ini..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
              <Filter className="w-3.5 h-3.5" />
              FILTER
            </button>
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
              <Download className="w-3.5 h-3.5" />
              EXPORT CSV
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Memuat Data Detail...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="p-4 bg-rose-50 rounded-full mb-4">
                <AlertCircle className="w-12 h-12 text-rose-500" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">Terjadi Kesalahan</h4>
              <p className="text-slate-500 max-w-md">{error}</p>
              <button 
                onClick={fetchData}
                className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                COBA LAGI
              </button>
            </div>
          ) : data.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                <Search className="w-12 h-12 text-slate-300" />
              </div>
              <h4 className="text-lg font-bold text-slate-400">Tidak Ada Data</h4>
              <p className="text-slate-400 text-sm">Tidak ditemukan data pada rentang waktu yang dipilih.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto custom-scrollbar p-1">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {columns.map((col) => (
                      <th key={col} className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] whitespace-nowrap">
                        <div className="flex items-center gap-2 group cursor-pointer">
                          {col.replace(/_/g, ' ')}
                          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                      {columns.map((col) => (
                        <td key={col} className="px-6 py-3.5 text-xs font-medium text-slate-600">
                          {col.includes('time') || col.includes('date') ? (
                            <span className="font-mono bg-slate-100 px-2 py-1 rounded-md text-[10px] text-slate-500">
                              {new Date(row[col]).toLocaleString('id-ID')}
                            </span>
                          ) : typeof row[col] === 'number' ? (
                            <span className="font-bold text-slate-800 tabular-nums">
                              {row[col].toLocaleString('id-ID')}
                            </span>
                          ) : (
                            String(row[col] ?? '-')
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer: Pagination */}
        {!loading && !error && data.length > 0 && (
          <div className="px-8 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Halaman {currentPage} dari {Math.ceil(totalCount / pageSize)}
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </div>
  );
};

export default SourceDataModal;
