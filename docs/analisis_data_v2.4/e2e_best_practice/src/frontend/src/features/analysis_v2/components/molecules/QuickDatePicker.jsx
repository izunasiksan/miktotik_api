import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, RotateCcw, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useContextLockStore, useAnalysisStore } from '../../../../store/analysisStore';

/**
 * Molecule: QuickDatePicker
 * Komponen pemilihan tanggal cepat dengan cascading dropdown (Year -> Month -> Day).
 * Sesuai kriteria Stage 7: UI/UX & Functional Requirements.
 * UPDATE 2.4.1 Added 'side' prop for flexible dropdown positioning.
 */
const QuickDatePicker = ({ label, type = 'start', side = 'bottom' }) => {
  const { timeRange, setTimeRange, isLocked } = useContextLockStore();
  const { normalizationStatus } = useAnalysisStore();
  
  // V2.3: Quality Indicator based on Stage 0 Normalization
  const accuracy = normalizationStatus?.accuracyPct ?? null;
  const isLowQuality = accuracy !== null && accuracy < 85;
  
  // Internal State untuk Cascading Dropdown
  const [tempDate, setTempDate] = useState({
    year: '',
    month: '',
    day: ''
  });
  
  const [showPicker, setShowPicker] = useState(false);

  const wrapperRef = useRef(null);

  // Helper untuk menghitung jumlah hari di bulan
  const computeDaysInMonth = (yearStr, monthStr) => {
    if (!yearStr || !monthStr) return 0;
    const d = new Date(parseInt(yearStr), parseInt(monthStr), 0);
    return d.getDate();
  };

  // Generasi Range Tahun (2020 - Current Year + 1)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2020;
    const yrs = [];
    for (let i = currentYear; i >= startYear; i--) {
      yrs.push(i.toString());
    }
    return yrs;
  }, []);

  // Daftar Bulan
  const months = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  // Hitung jumlah hari dalam bulan/tahun terpilih
  const daysInMonth = useMemo(() => {
    if (!tempDate.year || !tempDate.month) return [];
    const count = computeDaysInMonth(tempDate.year, tempDate.month);
    const ds = [];
    for (let i = 1; i <= count; i++) {
      ds.push(i.toString().padStart(2, '0'));
    }
    return ds;
  }, [tempDate.year, tempDate.month]);

  // Toggle picker dan sinkronisasi awal dari store saat dibuka
  const togglePicker = () => {
    if (isLocked) return;
    setShowPicker(prev => {
      const next = !prev;
      if (!prev && next) {
        const currentDateStr = type === 'start' ? timeRange.start : timeRange.end;
        if (currentDateStr) {
          const d = new Date(currentDateStr);
          if (!isNaN(d.getTime())) {
            const y = d.getFullYear().toString();
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            const maxDay = computeDaysInMonth(y, m);
            const day = Math.min(d.getDate(), maxDay).toString().padStart(2, '0');
            setTempDate({ year: y, month: m, day });
          }
        }
      }
      return next;
    });
  };

  const handleApply = () => {
    if (!tempDate.year || !tempDate.month || !tempDate.day) return;
    
    const timeStr = type === 'start' ? '00:00:00' : '23:59:59';
    const isoString = `${tempDate.year}-${tempDate.month}-${tempDate.day}T${timeStr}Z`;
    
    setTimeRange({ [type]: isoString });
    setShowPicker(false);
  };

  const handleReset = () => {
    setTempDate({ year: '', month: '', day: '' });
    setTimeRange({ [type]: null });
    setShowPicker(false);
  };

  const isComplete = tempDate.year && tempDate.month && tempDate.day;

  const displayValue = useMemo(() => {
    const val = type === 'start' ? timeRange.start : timeRange.end;
    if (!val) return 'Pilih Tanggal';
    const d = new Date(val);
    if (isNaN(d.getTime())) return 'Format Salah';
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
  }, [type, timeRange.start, timeRange.end]);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, [showPicker]);

  const datePickerId = `datepicker-${type}`;

  return (
    <div className="relative" ref={wrapperRef}>
      <label 
        htmlFor={datePickerId}
        className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-0.5 cursor-pointer"
      >
        {label}
      </label>
      
      <button
        id={datePickerId}
        onClick={togglePicker}
        disabled={isLocked}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border rounded-xl transition-all duration-200
          ${isLocked ? 'opacity-50 cursor-not-allowed border-slate-100' : 'hover:bg-white hover:border-indigo-200 border-slate-200 active:scale-[0.98] shadow-sm'}
        `}
      >
        <div className="flex items-center gap-2.5">
          <Calendar className={`w-4 h-4 ${isLocked ? 'text-slate-300' : 'text-indigo-500'}`} />
          <span className={`text-sm font-bold ${!displayValue || displayValue === 'Pilih Tanggal' ? 'text-slate-400' : 'text-slate-700'}`}>
            {displayValue}
          </span>
          
          {/* V2.3: Accuracy Indicator Badge */}
          {!isLocked && accuracy !== null && (
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-black uppercase
              ${isLowQuality ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}
            `}>
              {isLowQuality ? <AlertCircle className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
              {accuracy}%
            </div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showPicker ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`} />
      </button>

      {/* Dropdown Panel */}
      {showPicker && !isLocked && (
        <div className={`
          absolute z-50 w-full min-w-[280px] bg-white rounded-2xl border border-slate-200 shadow-xl p-4 animate-in fade-in duration-200
          ${side === 'top' ? 'bottom-full mb-2 slide-in-from-bottom-2' : 'mt-2 slide-in-from-top-2'}
        `}>
          <div className="space-y-4">
            {/* Cascading Selects */}
            <div className="grid grid-cols-3 gap-2">
              {/* Year */}
              <div className="space-y-1">
                <label 
                  htmlFor={`${datePickerId}-year`}
                  className="text-[10px] font-bold text-slate-400 uppercase ml-1 cursor-pointer"
                >
                  Tahun
                </label>
                <select 
                  id={`${datePickerId}-year`}
                  name={`${datePickerId}-year`}
                  value={tempDate.year}
                  onChange={(e) => {
                    const newYear = e.target.value;
                    setTempDate(prev => {
                      const maxDay = computeDaysInMonth(newYear, prev.month);
                      let newDay = prev.day;
                      if (newDay && parseInt(newDay) > maxDay) {
                        newDay = maxDay.toString().padStart(2, '0');
                      }
                      return { ...prev, year: newYear, day: newDay };
                    });
                  }}
                  className="w-full text-sm border border-slate-200 rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-100 outline-none"
                >
                  <option value="">-</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Month */}
              <div className="space-y-1">
                <label 
                  htmlFor={`${datePickerId}-month`}
                  className="text-[10px] font-bold text-slate-400 uppercase ml-1 cursor-pointer"
                >
                  Bulan
                </label>
                <select 
                  id={`${datePickerId}-month`}
                  name={`${datePickerId}-month`}
                  value={tempDate.month}
                  onChange={(e) => {
                    const newMonth = e.target.value;
                    setTempDate(prev => {
                      const maxDay = computeDaysInMonth(prev.year, newMonth);
                      let newDay = prev.day;
                      if (newDay && parseInt(newDay) > maxDay) {
                        newDay = maxDay.toString().padStart(2, '0');
                      }
                      return { ...prev, month: newMonth, day: newDay };
                    });
                  }}
                  disabled={!tempDate.year}
                  className="w-full text-sm border border-slate-200 rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-slate-50"
                >
                  <option value="">-</option>
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              {/* Day */}
              <div className="space-y-1">
                <label 
                  htmlFor={`${datePickerId}-day`}
                  className="text-[10px] font-bold text-slate-400 uppercase ml-1 cursor-pointer"
                >
                  Tanggal
                </label>
                <select 
                  id={`${datePickerId}-day`}
                  name={`${datePickerId}-day`}
                  value={tempDate.day}
                  onChange={(e) => setTempDate(prev => ({ ...prev, day: e.target.value }))}
                  disabled={!tempDate.month}
                  className="w-full text-sm border border-slate-200 rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-slate-50"
                >
                  <option value="">-</option>
                  {daysInMonth.map(d => <option key={d} value={d}>{parseInt(d)}</option>)}
                </select>
              </div>
            </div>

            {/* Visual Indicator for Validity */}
            {!isComplete && tempDate.year && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 p-1.5 rounded-lg border border-amber-100">
                <AlertCircle className="w-3 h-3" />
                <span>Lengkapi pemilihan (Bulan & Tanggal)</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button 
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors p-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowPicker(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleApply}
                  disabled={!isComplete}
                  className={`
                    flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all
                    ${isComplete 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100' 
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                  `}
                >
                  <Check className="w-3.5 h-3.5" />
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickDatePicker;
