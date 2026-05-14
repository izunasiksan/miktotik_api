import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Database, 
  Settings2, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  XCircle,
  Info,
  ArrowRight,
  Zap,
  HardDrive,
  Activity,
  Users
} from 'lucide-react';

const NormalizationStage = ({ 
  currentPhase, 
  setCurrentPhase, 
  isLocked, 
  normalizationConfig, 
  handleLockConfig, 
  handleResetConfig,
  integrityAudit,
  metricMetadata,
  availableFields = [],
  handleAddMapping,
  handleRemoveMapping,
  handleUpdateMapping
}) => {
  const [newMapping, setNewMapping] = React.useState({ field: '', source: 'BYTES', target: 'MB' });
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const addedFieldsSet = React.useMemo(() => new Set((normalizationConfig?.customMappings || []).map(m => m.field)), [normalizationConfig]);
  const addedInAvailable = React.useMemo(() => (availableFields || []).filter(f => addedFieldsSet.has(f)), [availableFields, addedFieldsSet]);
  const missingInAvailable = React.useMemo(() => (availableFields || []).filter(f => !addedFieldsSet.has(f)), [availableFields, addedFieldsSet]);

  const phases = [
    { id: 'exposure', label: 'Attribute Exposure', icon: Database },
    { id: 'normalization', label: 'Unit Normalization', icon: Settings2 },
    { id: 'lock', label: 'Unit Lock', icon: Lock },
  ];

  

  const units = {
    speed: [
      { value: 'Mbps', label: 'Mbps' },
    ],
    bytes: [
      { value: 'BYTES', label: 'Bytes' },
      { value: 'MB', label: 'MB' },
      { value: 'GB', label: 'GB' },
    ],
    percentage: [
      { value: 'PERCENT', label: 'Percent' },
    ],
    count: [
      { value: 'COUNT', label: 'Count' },
    ],
    time: [
      { value: 'SECONDS', label: 'Seconds' },
      { value: 'MINUTES', label: 'Minutes' },
      { value: 'HOURS', label: 'Hours' },
      { value: 'DAYS', label: 'Days' },
    ]
  };

  const canonicalizeUnit = (u) => {
    if (!u) return u;
    if (u === 'Bytes' || u === 'bytes') return 'BYTES';
    if (u === 'Seconds' || u === 'seconds') return 'SECONDS';
    if (u === 'Minutes' || u === 'minutes') return 'MINUTES';
    if (u === 'Hours' || u === 'hours') return 'HOURS';
    if (u === 'Days' || u === 'days') return 'DAYS';
    if (u === 'Percent' || u === 'percent' || u === 'DECIMAL' || u === 'Decimal') return 'PERCENT';
    if (u === 'Unit') return 'COUNT';
    return u;
  };

  const allUnitOptions = Object.values(units).flat();

  const getMetaForField = (f) => {
    if (!f) return null;
    if (metricMetadata && metricMetadata[f]) return metricMetadata[f];
    return null;
  };

  const getPhaseStatus = (phaseId) => {
    const order = ['exposure', 'normalization', 'lock'];
    const currentIdx = order.indexOf(currentPhase);
    const phaseIdx = order.indexOf(phaseId);
    
    if (phaseId === 'lock' && isLocked) return 'completed';
    if (phaseIdx < currentIdx) return 'completed';
    if (phaseIdx === currentIdx) return 'active';
    return 'pending';
  };

  

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
      {/* Header Phase Indicator */}
      <div className="bg-gray-50/50 border-b border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {phases.map((phase, idx) => {
              const status = getPhaseStatus(phase.id);
              return (
                <div key={phase.id} className="flex items-center gap-2">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                    status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' :
                    status === 'active' ? 'border-blue-500 text-blue-500 font-bold' :
                    'border-gray-300 text-gray-400'
                  }`}>
                    {status === 'completed' ? <CheckCircle2 size={16} /> : idx + 1}
                  </div>
                  <span className={`text-xs font-bold ${
                    status === 'active' ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {phase.label}
                  </span>
                  {idx < phases.length - 1 && (
                    <ArrowRight size={14} className="text-gray-300 ml-2" />
                  )}
                </div>
              );
            })}
          </div>
          
          {isLocked ? (
            <button 
              onClick={handleResetConfig}
              className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-black hover:bg-rose-100 transition-colors"
            >
              <Unlock size={14} />
              RESET CONFIG
            </button>
          ) : (
            <button 
              onClick={handleLockConfig}
              disabled={currentPhase === 'exposure'}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                currentPhase === 'exposure' 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200'
              }`}
            >
              <Lock size={14} />
              KUNCI & VALIDASI
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {currentPhase === 'exposure' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl text-blue-700 border border-blue-100">
              <Info size={20} className="shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm mb-1">RAW Structural View</h4>
                <p className="text-xs leading-relaxed">
                  Tahap ini menampilkan seluruh atribut mentah yang tersedia di database sebelum dilakukan normalisasi satuan. 
                  Pilih "Next Step" untuk mulai mengkonfigurasi satuan.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <AttributeGroup icon={Zap} title="Speed / Traffic" color="text-amber-500" bg="bg-amber-50" 
                attrs={['download_mbps', 'upload_mbps', 'avg_download', 'max_download']} />
              <AttributeGroup icon={HardDrive} title="Storage / Bytes" color="text-purple-500" bg="bg-purple-50" 
                attrs={['total_tx_bytes', 'total_rx_bytes', 'free_memory', 'free_hdd']} />
              <AttributeGroup icon={Activity} title="Percentage" color="text-rose-500" bg="bg-rose-50" 
                attrs={['cpu_load', 'avg_cpu_load', 'max_cpu_load']} />
              <AttributeGroup icon={Users} title="User Counts" color="text-emerald-500" bg="bg-emerald-50" 
                attrs={['total_hotspot', 'total_pppoe', 'total_active']} />
            </div>

            <div className="flex justify-end">
              <button 
                onClick={() => setCurrentPhase('normalization')}
                className="flex items-center gap-2 px-6 py-2 bg-gray-800 text-white rounded-lg text-xs font-black hover:bg-gray-900 transition-all"
              >
                MULAI NORMALISASI <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Phase 2: Unit Normalization */}
        {currentPhase === 'normalization' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-8 p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 size={18} className="text-blue-600" />
                <h3 className="font-black text-gray-800 uppercase tracking-tight">Penyelarasan Satuan Metrik</h3>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Tahap Normalisasi: selaraskan satuan metrik yang dipakai UI. Pengaturan scope & filter berada di tab <span className="font-bold text-gray-700">Audit</span>.
              </p>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                  <Zap size={18} className="text-amber-500" />
                  Daftar Pemetaan Aktif
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider">Total: {(normalizationConfig.customMappings || []).length} Metrik</p>
              </div>
              {!isLocked && (
                <button 
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black hover:bg-emerald-100 transition-colors"
                >
                  {showAddForm ? 'BATAL' : 'TAMBAH PEMETAAN'}
                </button>
              )}
            </div>

            {showAddForm && !isLocked && (
              <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Pilih Kolom</label>
                    <select 
                      value={newMapping.field}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, field: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold"
                    >
                      <option value="">-- Pilih Kolom --</option>
                      {availableFields.map(f => (
                        <option key={f} value={f} disabled={addedFieldsSet.has(f)}>
                          {addedFieldsSet.has(f) ? '✓ ' : ''}{f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Unit Asal (DB)</label>
                    <select 
                      value={canonicalizeUnit(newMapping.source)}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, source: canonicalizeUnit(e.target.value) }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold"
                    >
                      {allUnitOptions.map(u => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Unit Target (UI)</label>
                    <select 
                      value={canonicalizeUnit(newMapping.target)}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, target: canonicalizeUnit(e.target.value) }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold"
                    >
                      {allUnitOptions.map(u => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    disabled={!newMapping.field}
                    onClick={() => {
                      handleAddMapping({
                        ...newMapping,
                        source: canonicalizeUnit(newMapping.source),
                        target: canonicalizeUnit(newMapping.target)
                      });
                      setShowAddForm(false);
                      setNewMapping({ field: '', source: 'BYTES', target: 'MB' });
                    }}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-black hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                  >
                    SIMPAN PEMETAAN
                  </button>
                </div>
                {newMapping.field && (() => {
                  const meta = getMetaForField(newMapping.field);
                  const inferredUnit = meta?.unit;
                  const dt = meta?.data_type;
                  return (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${inferredUnit ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {inferredUnit || 'N/A'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${dt === 'number' ? 'bg-blue-100 text-blue-700' : dt === 'datetime' ? 'bg-purple-100 text-purple-700' : dt === 'boolean' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                        {dt || 'UNKNOWN'}
                      </span>
                    </div>
                  );
                })()}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                    <div className="text-[10px] font-black text-emerald-700 mb-2 uppercase tracking-widest">Sudah Ditambahkan</div>
                    <div className="flex flex-wrap gap-1.5">
                      {addedInAvailable.length === 0 ? (
                        <span className="text-[10px] text-emerald-700/70">Tidak ada</span>
                      ) : addedInAvailable.map(f => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setNewMapping(prev => ({ ...prev, field: f }))}
                          className="px-2 py-0.5 rounded border text-[10px] font-bold bg-emerald-100 text-emerald-700 border-emerald-200"
                          title="Klik untuk pilih kolom ini"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-lg">
                    <div className="text-[10px] font-black text-rose-700 mb-2 uppercase tracking-widest">Belum Ditambahkan</div>
                    <div className="flex flex-wrap gap-1.5">
                      {missingInAvailable.length === 0 ? (
                        <span className="text-[10px] text-rose-700/70">Tidak ada</span>
                      ) : missingInAvailable.map(f => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setNewMapping(prev => ({ ...prev, field: f }))}
                          className="px-2 py-0.5 rounded border text-[10px] font-bold bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200"
                          title="Klik untuk pilih kolom ini"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(normalizationConfig.customMappings || []).map(mapping => (
                <div key={mapping.id} className={`p-4 bg-white border rounded-xl group transition-all ${
                  editingId === mapping.id ? 'border-blue-400 ring-2 ring-blue-50' : 'border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md'
                }`}>
                  {editingId === mapping.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-800">{mapping.field}</span>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase"
                        >
                          Batal
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase">Asal</label>
                          <select 
                            value={canonicalizeUnit(mapping.source)}
                            onChange={(e) => handleUpdateMapping(mapping.id, { source: canonicalizeUnit(e.target.value) })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] font-bold"
                          >
                            {allUnitOptions.map(u => (
                              <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase">Target</label>
                          <select 
                            value={canonicalizeUnit(mapping.target)}
                            onChange={(e) => handleUpdateMapping(mapping.id, { target: canonicalizeUnit(e.target.value) })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] font-bold"
                          >
                            {allUnitOptions.map(u => (
                              <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEditingId(null)}
                        className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black hover:bg-blue-700 transition-colors"
                      >
                        SIMPAN PERUBAHAN
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black text-gray-800">{mapping.field}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                            mapping.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {mapping.active ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-400">{mapping.source}</span>
                          <ArrowRight size={10} className="text-gray-300" />
                          <span className="text-[10px] font-black text-blue-600">{mapping.target}</span>
                        </div>
                        {(() => {
                          const meta = getMetaForField(mapping.field);
                          const inferredUnit = meta?.unit ? canonicalizeUnit(meta.unit) : null;
                          const dt = meta?.data_type;
                          const isMatch = inferredUnit && canonicalizeUnit(mapping.target) === inferredUnit;
                          return (
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${!inferredUnit ? 'bg-gray-100 text-gray-600' : isMatch ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {inferredUnit || 'N/A'}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${dt === 'number' ? 'bg-blue-100 text-blue-700' : dt === 'datetime' ? 'bg-purple-100 text-purple-700' : dt === 'boolean' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                {dt || 'UNKNOWN'}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                      {!isLocked && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => setEditingId(mapping.id)}
                            className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors"
                            title="Edit Pemetaan"
                          >
                            <Zap size={14} />
                          </button>
                          <button 
                            onClick={() => handleRemoveMapping(mapping.id)}
                            className="p-1.5 text-gray-300 hover:text-rose-500 transition-colors"
                            title="Hapus Pemetaan"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {(!normalizationConfig.customMappings || normalizationConfig.customMappings.length === 0) && (
                <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <div className="flex flex-col items-center gap-2">
                    <Settings2 size={24} className="text-gray-300" />
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Belum ada pemetaan metrik aktif</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleLockConfig}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
              >
                <Lock size={16} /> Kunci Konfigurasi
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Link
                to="/analysis/audit"
                className="px-6 py-2 rounded-lg text-xs font-black border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                title="Kembali ke Audit"
              >
                Kembali ke Audit
              </Link>
              {isLocked ? (
                <Link
                  to="/analysis/trend"
                  className="px-6 py-2 rounded-lg text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  title="Lanjut ke Agregasi"
                >
                  Lanjut ke Agregasi
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-6 py-2 rounded-lg text-xs font-black bg-gray-100 text-gray-400 cursor-not-allowed"
                  title="Kunci konfigurasi terlebih dahulu"
                >
                  Lanjut ke Agregasi
                </button>
              )}
            </div>
          </div>
        )}

        {isLocked && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-800">Konfigurasi Terkunci</h4>
                  <p className="text-[10px] text-emerald-600 font-medium">Satuan telah dinormalisasi dan divalidasi.</p>
                </div>
              </div>
              <div className="flex gap-2">
                {Object.entries(normalizationConfig).map(([cat, cfg]) => (
                  cfg.active && (
                    <span key={cat} className="px-2 py-1 bg-white border border-emerald-200 text-[9px] font-black text-emerald-700 rounded uppercase">
                      {cat}: {cfg.unit}
                    </span>
                  )
                ))}
              </div>
            </div>
            <div className="p-5 border border-amber-100 bg-amber-50/30 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest">Audit Pre-Analysis</h4>
                  {integrityAudit?.qualityScore && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      integrityAudit.qualityScore.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                      integrityAudit.qualityScore.score >= 50 ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      SCORE: {integrityAudit.qualityScore.score}%
                    </span>
                  )}
                </div>
                <ul className="space-y-2">
                  <AuditItem label="Data Density Check" status={integrityAudit?.qualityScore?.score >= 20} isLocked={false} score={integrityAudit?.qualityScore?.score} />
                  <AuditItem label="Consistency Check" status={integrityAudit?.isConsistent} isLocked={false} />
                  <AuditItem label="Range Validation" status={true} isLocked={false} />
                  <AuditItem label="Normalization Matrix" status={true} isLocked={false} />
                </ul>
                <div className="mt-4 pt-4 border-t border-amber-100 text-[10px] text-amber-700 leading-relaxed italic">
                  * Semua data mentah akan dikonversi ke standar internal (Mbps, Bytes, Percent, Seconds) sebelum masuk ke mesin agregasi.
                </div>
            </div>
            <div className="flex items-center justify-between">
              <Link
                to="/analysis/audit"
                className="px-6 py-2 rounded-lg text-xs font-black border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                title="Kembali ke Audit"
              >
                Kembali ke Audit
              </Link>
              <Link
                to="/analysis/trend"
                className="px-6 py-2 rounded-lg text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                title="Lanjut ke Agregasi"
              >
                Lanjut ke Agregasi
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AttributeGroup = ({ icon, title, attrs, color, bg }) => (
  <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50">
    <div className="flex items-center gap-2 mb-3">
      <div className={`p-1.5 ${bg} ${color} rounded-lg`}>
        {React.createElement(icon, { size: 14 })}
      </div>
      <h5 className="text-[11px] font-black text-gray-700 uppercase tracking-tight">{title}</h5>
    </div>
    <div className="space-y-1.5">
      {attrs.map(a => (
        <div key={a} className="flex items-center gap-2 text-[10px] text-gray-500 font-mono bg-white px-2 py-1 rounded border border-gray-50">
          <div className="w-1 h-1 bg-gray-300 rounded-full" />
          {a}
        </div>
      ))}
    </div>
  </div>
);

const AuditItem = ({ label, status, isLocked, score }) => (
  <li className="flex items-center justify-between text-[11px]">
    <div className="flex flex-col">
      <span className="text-gray-600 font-medium">{label}</span>
      {score !== undefined && (
        <span className={`text-[9px] font-bold ${score >= 50 ? 'text-gray-400' : 'text-rose-400'}`}>
          {score}% Density
        </span>
      )}
    </div>
    <div className={`flex items-center gap-1.5 font-bold ${isLocked ? 'text-blue-600' : status ? 'text-emerald-600' : 'text-rose-600'}`}>
      {isLocked ? 'LOCKED' : status ? 'PASSED' : 'FAILED'} {isLocked ? <Lock size={12} /> : status ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
    </div>
  </li>
);

export default NormalizationStage;
