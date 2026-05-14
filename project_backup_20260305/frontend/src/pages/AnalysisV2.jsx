import React from 'react';
import Modal from '../components/Modal.jsx';
import { Zap, Activity, Users, Download, ShieldCheck, BarChart2, Settings } from 'lucide-react';
import { useAnalysisV2Controller } from '../analytics_v2/controllers/useAnalysisV2Controller.js';
import Stage0NormalizationPanel from '../analytics_v2/components/Stage0NormalizationPanel.jsx';
import Stage1ScopeFilterPanel from '../analytics_v2/components/Stage1ScopeFilterPanel.jsx';
import Stage2TrendPanel from '../analytics_v2/components/Stage2TrendPanel.jsx';
import Stage2TopListsPanel from '../analytics_v2/components/Stage2TopListsPanel.jsx';

const items = [
  { id: 'scope', label: '1. Scope & Filter', icon: ShieldCheck, color: 'text-emerald-600' },
  { id: 'trend', label: '2. Trend', icon: Activity, color: 'text-sky-600' },
  { id: 'korelasi', label: '3. Korelasi', icon: Settings, color: 'text-amber-600' },
  { id: 'kebiasaan', label: '4. Kebiasaan', icon: Users, color: 'text-purple-600' },
  { id: 'anomali', label: '5. Validasi Anomali', icon: BarChart2, color: 'text-rose-600' },
  { id: 'kapasitas', label: '6. Prediksi Kapasitas', icon: Download, color: 'text-fuchsia-600' },
  { id: 'insight', label: '7. Insight', icon: Zap, color: 'text-blue-600' },
];

const AnalysisV2 = () => {
  const {
    boards,
    selectedBoardId,
    setSelectedBoardId,
    isAggLoading,
    isAggError,
    reloadAll,
    normalization,
    timeDensity,
    perEntitySeries,
    startTime,
    endTime,
    setStartTime,
    setEndTime,
    granularity,
    setGranularity,
    agg,
    setAgg,
    timeLock,
    setTimeLock,
    validateFilterParams,
    period,
    setPeriod,
    limit,
    setLimit,
    entityType,
    setEntityType,
    entityName,
    setEntityName,
    entityNames,
    setEntityNames,
    combine,
    setCombine,
    ifacePrimaryOnly,
    setIfacePrimaryOnly,
    ifaceActiveOnly,
    setIfaceActiveOnly,
  } = useAnalysisV2Controller();

  const [activeTab, setActiveTab] = React.useState('scope');
  const [showNormModal, setShowNormModal] = React.useState(false);
  const meta = normalization?.meta || {};
  const sample = normalization?.data?.[0] || null;
  const sourceLabel = meta.mode === 'server' ? 'Backend' : (meta.mode === 'frontend' ? 'Frontend' : '-');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Analisis Data V2</h1>
          <p className="text-gray-600">Pipeline analitik versi baru yang terisolasi dari V1.</p>
          <div className="mt-2 flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              sourceLabel === 'Backend' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              Data Source: {sourceLabel}
            </span>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <label className="text-sm text-gray-600">Pilih Perangkat</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            value={selectedBoardId || ''}
            onChange={(e) => setSelectedBoardId(e.target.value || null)}
          >
            {boards.map((b) => (
              <option key={b.board_id || b.id} value={b.board_id || b.id}>
                {b.board_name || b.name || b.board_id || b.id}
              </option>
            ))}
          </select>
          {isAggLoading && <span className="text-xs text-gray-500">Memuat dataset…</span>}
          {isAggError && <span className="text-xs text-rose-600">Gagal memuat dataset</span>}
        </div>

        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap gap-2">
            {items.map((it) => {
              const Icon = it.icon || BarChart2;
              const active = activeTab === it.id;
              return (
                <button
                  key={it.id}
                  onClick={() => setActiveTab(it.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm border-b-2 ${
                    active ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                  title={it.label}
                >
                  <Icon size={16} className={active ? 'text-blue-600' : 'text-gray-400'} />
                  <span>{it.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {activeTab === 'scope' && (
          <div className="mt-6">
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setShowNormModal(true)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                Lihat Normalisasi
              </button>
            </div>
            <Stage1ScopeFilterPanel
              boardId={selectedBoardId ?? (boards[0]?.board_id || boards[0]?.id || null)}
              startTime={startTime}
              endTime={endTime}
              setStartTime={setStartTime}
              setEndTime={setEndTime}
              isLoading={isAggLoading}
              onReload={reloadAll}
              timeDensity={timeDensity}
              granularity={granularity}
              setGranularity={setGranularity}
              agg={agg}
              setAgg={setAgg}
              timeLock={timeLock}
              setTimeLock={setTimeLock}
              validateFilterParams={validateFilterParams}
              period={period}
              setPeriod={setPeriod}
              limit={limit}
              setLimit={setLimit}
              entityType={entityType}
              setEntityType={setEntityType}
              entityName={entityName}
              setEntityName={setEntityName}
              entityNames={entityNames}
              setEntityNames={setEntityNames}
              combine={combine}
              setCombine={setCombine}
              ifacePrimaryOnly={ifacePrimaryOnly}
              setIfacePrimaryOnly={setIfacePrimaryOnly}
              ifaceActiveOnly={ifaceActiveOnly}
              setIfaceActiveOnly={setIfaceActiveOnly}
            />
          </div>
        )}

        {activeTab === 'normalisasi' && (
          <div className="mt-6">
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setShowNormModal(true)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                Lihat Normalisasi
              </button>
            </div>
            <Stage0NormalizationPanel meta={meta} sample={sample} dataCount={normalization?.data?.length || 0} />
          </div>
        )}

        {activeTab === 'trend' && (
          <div className="mt-6 space-y-10">
            <div className="flex justify-end">
              <button
                onClick={() => setShowNormModal(true)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                Lihat Normalisasi
              </button>
            </div>
            <Stage2TrendPanel normalization={normalization} isLoading={isAggLoading} isError={isAggError} period={period} granularity={granularity} perEntitySeries={perEntitySeries} />
            <Stage2TopListsPanel boardId={selectedBoardId ?? (boards[0]?.board_id || boards[0]?.id || null)} startTime={startTime} endTime={endTime} />
          </div>
        )}

        {['korelasi','kebiasaan','anomali','kapasitas','insight'].includes(activeTab) && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setShowNormModal(true)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                Lihat Normalisasi
              </button>
            </div>
            <div className="text-sm font-semibold text-gray-800 mb-1">Tahap ini belum tersedia</div>
            <div className="text-xs text-gray-500">Fitur {activeTab} akan hadir pada rilis berikutnya.</div>
          </div>
        )}
      </div>
      <Modal
        isOpen={showNormModal}
        onClose={() => setShowNormModal(false)}
        title="Stage 0 — Normalisasi"
        size="xl"
      >
        <Stage0NormalizationPanel meta={meta} sample={sample} dataCount={normalization?.data?.length || 0} />
      </Modal>
    </div>
  );
};

export default AnalysisV2;
