import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Activity, Users, BarChart2, Download, Settings, ShieldCheck, FileText } from 'lucide-react';
import SearchableSelect from '../../../components/ui/SearchableSelect.jsx';

const navItems = [
  { id: 'normalization', label: '0. Normalisasi Data', icon: <Settings size={18} />, color: 'text-indigo-600' },
  { id: 'audit', label: '1. Scope & Filter', icon: <ShieldCheck size={18} />, color: 'text-emerald-600' },
  { id: 'trend', label: '2. Agregasi', icon: <Activity size={18} />, color: 'text-emerald-600' },
  { id: 'korelasi', label: '3. Korelasi', icon: <Settings size={18} />, color: 'text-sky-600' },
  { id: 'kebiasaan', label: '4. Identifikasi Pola', icon: <Users size={18} />, color: 'text-amber-600' },
  { id: 'anomali', label: '5. Validasi Anomali', icon: <BarChart2 size={18} />, color: 'text-rose-600' },
  { id: 'kapasitas', label: '6. Prediksi Kapasitas', icon: <Download size={18} />, color: 'text-purple-600' },
  { id: 'insight', label: '7. Insight & Keputusan', icon: <Zap size={18} />, color: 'text-blue-600' },
];

const AnalysisLayout = ({ 
  children, 
  activeTab, 
  boards, 
  selectedBoard, 
  setSelectedBoard, 
  isCompact, 
  setIsCompact,
  isBoardsLoading,
  isLocked,
  isTimeLocked
}) => {
  const navigate = useNavigate();
  const [showUnitMenu, setShowUnitMenu] = React.useState(false);
  const unitMenuRef = React.useRef(null);
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setShowUnitMenu(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  React.useEffect(() => {
    const onClick = (e) => {
      if (unitMenuRef.current && !unitMenuRef.current.contains(e.target)) setShowUnitMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
  return (
    <div className="min-h-screen bg-gray-50">
      {/* --- TOP NAV BAR --- */}
      <nav className="sticky top-0 z-10 w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            
            {/* Left: Brand */}
            <div className="flex items-center gap-4">
              {/* Removed Back Button */}
            </div>

            {/* Middle: Main Navigation (Desktop) */}
            <div className="hidden lg:flex items-center space-x-1">
              <div className="mr-4 flex items-center gap-2">
                <SearchableSelect
                  options={boards.map(b => ({ value: b.board_id, label: b.board_name || b.name }))}
                  value={selectedBoard}
                  onChange={setSelectedBoard}
                  placeholder="Pilih Router..."
                  className="w-56"
                />
              </div>

              {navItems.filter(item => item.id !== 'normalization').map((item) => {
                const isDisabled = !isLocked && item.id !== 'normalization';
                return (
                  <Link
                    key={item.id}
                    to={isDisabled ? '#' : `/analysis/${item.id}`}
                    onClick={(e) => {
                      if (isDisabled) {
                        e.preventDefault();
                        // Optional: toast or tooltip
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === item.id 
                      ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                      : isDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className={activeTab === item.id ? item.color : (isDisabled ? 'text-gray-200' : 'text-gray-400')}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Right: Global Actions */}
            <div className="flex items-center gap-3">
              
              {/* Global Lock Status Chips */}
              {isLocked && (
                <div className="hidden md:inline-block relative" ref={unitMenuRef}>
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={showUnitMenu}
                    onClick={() => setShowUnitMenu((v) => !v)}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border border-gray-200 bg-white text-gray-700 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    title="Status Normalisasi"
                  >
                    <span className="relative">
                      <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    </span>
                    <Settings size={10} className="text-blue-500" />
                    UNIT LOCKED
                  </button>
                  {showUnitMenu && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg animate-in fade-in zoom-in"
                    >
                      <div className="text-[11px] font-black text-gray-800 mb-1">Normalisasi Aktif</div>
                      <div className="text-[10px] text-gray-500 mb-3">Satuan metrik sudah terkunci.</div>
                      <div className="flex items-center gap-2">
                        <Link
                          to="/analysis/normalization"
                          className="px-3 py-1.5 rounded-md text-[10px] font-black bg-indigo-600 text-white hover:bg-indigo-700 transition"
                          role="menuitem"
                          onClick={() => setShowUnitMenu(false)}
                        >
                          Normalisasi
                        </Link>
                        <Link
                          to="/analysis/audit"
                          className="px-3 py-1.5 rounded-md text-[10px] font-black bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition"
                          role="menuitem"
                          onClick={() => setShowUnitMenu(false)}
                        >
                          Audit
                        </Link>
                        <Link
                          to="/analysis/trend"
                          className="px-3 py-1.5 rounded-md text-[10px] font-black bg-emerald-600 text-white hover:bg-emerald-700 transition"
                          role="menuitem"
                          onClick={() => setShowUnitMenu(false)}
                        >
                          Agregasi
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {isTimeLocked && (
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-700">
                  <Activity size={10} />
                  TIME LOCKED
                </span>
              )}
              <button
                onClick={() => setIsCompact(!isCompact)}
                className={`p-2 rounded-lg border transition-colors ${isCompact ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                title="Toggle Compact Mode"
              >
                <FileText size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation (Scrollable) */}
        <div className="lg:hidden flex items-center overflow-x-auto border-t border-gray-100 px-2 py-2 gap-2 no-scrollbar">
          <div className="flex-none bg-gray-100 rounded-full p-1 border border-gray-200 mr-2">
            <Link
              to="/analysis/normalization"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] sop-font-black rounded-full uppercase tracking-wider ${
                activeTab === 'normalization' ? 'bg-indigo-600 text-white' : 'text-gray-600'
              }`}
            >
              <Settings size={12} className={activeTab === 'normalization' ? 'text-white' : 'text-gray-400'} />
              <span>Normalisasi</span>
            </Link>
          </div>
          <div className="flex-none bg-gray-100 rounded-full p-1 border border-gray-200 mr-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
              activeTab === 'audit' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600'
            }`}>
              <ShieldCheck size={12} className={activeTab === 'audit' ? 'text-white' : 'text-gray-400'} />
              <span>Audit</span>
            </span>
          </div>
          <div className="flex-none pr-2 border-r border-gray-200">
            <SearchableSelect
              options={boards.map(b => ({ value: b.board_id, label: b.board_name || b.name }))}
              value={selectedBoard}
              onChange={setSelectedBoard}
              placeholder="Pilih..."
              className="w-32"
            />
          </div>
          {navItems.filter(item => item.id !== 'normalization').map((item) => {
            const isDisabled = !isLocked && item.id !== 'normalization';
            return (
              <Link
                key={item.id}
                to={isDisabled ? '#' : `/analysis/${item.id}`}
                onClick={(e) => {
                  if (isDisabled) e.preventDefault();
                }}
                className={`flex-none flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeTab === item.id ? 'bg-blue-600 text-white' : isDisabled ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* --- CONTENT AREA --- */}
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {isBoardsLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-24 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            <p className="text-gray-500 font-medium">Memuat daftar perangkat...</p>
          </div>
        ) : boards.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mb-6">
              <Settings className="text-blue-500" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Belum Ada Perangkat</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">Tambahkan perangkat MikroTik Anda di menu pengaturan untuk mulai melihat analisis data network.</p>
            <button 
              onClick={() => navigate('/settings')} 
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 active:scale-95"
            >
              Ke Pengaturan Perangkat
            </button>
          </div>
        ) : !selectedBoard ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center flex flex-col items-center justify-center min-h-[450px]">
            <div className="bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center mb-8 animate-bounce">
              <Zap className="text-blue-500" size={48} />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Analisis Data Historis Network</h2>
            <p className="text-gray-500 max-w-lg mx-auto text-lg leading-relaxed mb-8">
              Wawasan mendalam berdasarkan rekaman data (logs) yang tersimpan di database. 
              Silakan <span className="text-blue-600 font-bold underline">pilih router</span> untuk menganalisis tren, kapasitas, dan anomali dari data masa lalu.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                <ShieldCheck size={18} className="text-emerald-500" />
                <span className="text-sm font-medium text-gray-600">Audit Traffic</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                <BarChart2 size={18} className="text-rose-500" />
                <span className="text-sm font-medium text-gray-600">Deteksi Anomali</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                <Download size={18} className="text-purple-500" />
                <span className="text-sm font-medium text-gray-600">Prediksi Kapasitas</span>
              </div>
            </div>
          </div>
        ) : children}
      </main>
    </div>
  );
};

export default AnalysisLayout;
