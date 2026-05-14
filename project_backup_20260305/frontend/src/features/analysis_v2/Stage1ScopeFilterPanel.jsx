import React from 'react';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import Modal from '../../components/Modal.jsx';
import Stage1Timeline from './Stage1Timeline.jsx';
import MultiEntityCombobox from '../../components/ui/MultiEntityCombobox.jsx';
import { listInterfacesV2, listPppoeUsersV2, listHotspotUsersV2 } from '../services/api_v2.js';

const toDateInput = (iso) => {
  try {
    if (!iso) return '';
    const d = new Date(iso);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
};

const Stage1ScopeFilterPanel = ({
  boardId,
  startTime,
  endTime,
  setStartTime,
  setEndTime,
  isLoading,
  onReload,
  timeDensity,
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
}) => {
  const [sDate, setSDate] = React.useState(toDateInput(startTime));
  const [eDate, setEDate] = React.useState(toDateInput(endTime));
  const [errors, setErrors] = React.useState([]);
  const [dirty, setDirty] = React.useState(false);
  const [newEntityText, setNewEntityText] = React.useState('');
  const [autoRefresh, setAutoRefresh] = React.useState(false);
  const [autoInterval, setAutoInterval] = React.useState(30);
  const [previewEntity, setPreviewEntity] = React.useState(null);
  const [showTutorial, setShowTutorial] = React.useState(false);
  const [suggestOpen, setSuggestOpen] = React.useState(false);
  const [suggestLoading, setSuggestLoading] = React.useState(false);
  const [suggestList, setSuggestList] = React.useState([]);
  const [highlightIdx, setHighlightIdx] = React.useState(-1);
  const [highContrast, setHighContrast] = React.useState(false);
  const [colorBlindMode, setColorBlindMode] = React.useState(false);
  const [undoStack, setUndoStack] = React.useState([]);
  const [redoStack, setRedoStack] = React.useState([]);
  const [showEntityModal, setShowEntityModal] = React.useState(false);
  const [selectedTable, setSelectedTable] = React.useState('');
  const [modalTable, setModalTable] = React.useState('');
  const [modalTableError, setModalTableError] = React.useState('');
  const [modalAvailable, setModalAvailable] = React.useState([]);
  const [modalSelected, setModalSelected] = React.useState([]);
  const [dragCtx, setDragCtx] = React.useState({ type: '', index: -1 });
  const [dragOverIndex, setDragOverIndex] = React.useState(-1);
  const showLegacyEntityControls = false;
  const [activeTab, setActiveTab] = React.useState('entity');
  const entityRef = React.useRef(null);
  const timelineRef = React.useRef(null);
  const timeRef = React.useRef(null);
  const applyRef = React.useRef(null);
  const tabItems = React.useMemo(() => ([
    { id: 'entity', label: 'Entity' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'time', label: 'Time Range' },
    { id: 'apply', label: 'Apply' },
  ]), []);
  const entityTableMap = React.useMemo(() => ({
    board: ['board_speed_stats', 'board_resource_stats'],
    interface: ['board_speed_stats'],
    pppoe: ['board_pppoe_usage'],
    hotspot: ['hotspot_usage_raw'],
    clients: ['board_client_stats'],
    cpu: ['board_resource_stats'],
    site_group: ['mikrotik_boards', 'board_speed_stats', 'board_resource_stats'],
  }), []);
  const currentTables = React.useMemo(() => entityTableMap[entityType] || [], [entityType, entityTableMap]);

  const allowedGran = React.useMemo(() => {
    if (period === 'daily') return ['auto', 'hour', 'day'];
    if (period === 'monthly') return ['auto', 'month'];
    if (period === 'yearly') return ['auto', 'year'];
    return ['auto', 'hour', 'day', 'month', 'year'];
  }, [period]);

  React.useEffect(() => {
    if (!allowedGran.includes(granularity)) {
      if (period === 'daily') setGranularity('day');
      else if (period === 'monthly') setGranularity('month');
      else if (period === 'yearly') setGranularity('year');
    }
  }, [allowedGran, granularity, period, setGranularity]);
  React.useEffect(() => {
    try {
      const key = `analysisv2:selectedTable:${entityType}`;
      const saved = window.localStorage.getItem(key);
      if (!selectedTable && saved) setSelectedTable(saved);
    } catch {
      /* noop */
    }
  }, [entityType, selectedTable]);
  React.useEffect(() => {
    try {
      if (!selectedTable) return;
      const key = `analysisv2:selectedTable:${entityType}`;
      window.localStorage.setItem(key, selectedTable);
    } catch {
      /* noop */
    }
  }, [entityType, selectedTable]);

  const comboItems = React.useMemo(() => {
    const arr = [];
    const seen = new Set();
    (suggestList || []).forEach((s) => {
      const id = s?.interface_name || s?.username || s?.name || s?.id || '';
      const name = s?.interface_name || s?.username || s?.name || id;
      if (!id || seen.has(id)) return;
      seen.add(id);
      arr.push({ id, name, metadata: s });
    });
    (Array.isArray(entityNames) ? entityNames : []).forEach((n) => {
      const id = n;
      if (!seen.has(id)) {
        seen.add(id);
        arr.push({ id, name: n, metadata: { name: n } });
      }
    });
    return arr;
  }, [suggestList, entityNames]);

  const comboValue = React.useMemo(() => {
    const map = new Map();
    (suggestList || []).forEach((s) => {
      const id = s?.interface_name || s?.username || s?.name || s?.id || '';
      const name = s?.interface_name || s?.username || s?.name || id;
      if (!id) return;
      map.set(id, { id, name, metadata: s });
    });
    return (Array.isArray(entityNames) ? entityNames : []).map((n) => map.get(n) || { id: n, name: n, metadata: { name: n } });
  }, [suggestList, entityNames]);

  const comboOnSearch = React.useCallback(async (q) => {
    if (!boardId) return [];
    if (entityType === 'interface') {
      const data = await listInterfacesV2(boardId, { q, limit: 100 });
      return (data || []).map((s) => {
        const id = s?.interface_name || s?.name || '';
        const name = s?.interface_name || s?.name || id;
        return { id, name, metadata: s };
      });
    }
    if (entityType === 'pppoe') {
      const data = await listPppoeUsersV2(boardId, { q, limit: 100 });
      return (data || []).map((s) => {
        const id = s?.username || s?.name || '';
        const name = s?.username || s?.name || id;
        return { id, name, metadata: s };
      });
    }
    if (entityType === 'hotspot') {
      const data = await listHotspotUsersV2(boardId, { q, limit: 100 });
      return (data || []).map((s) => {
        const id = s?.username || s?.name || '';
        const name = s?.username || s?.name || id;
        return { id, name, metadata: s };
      });
    }
    return [];
  }, [boardId, entityType]);

  const quickRange = (key) => {
    const now = new Date();
    const endISO = now.toISOString();
    const start = new Date(now);
    let gran = granularity;
    if (key === 'today') {
      start.setUTCHours(0, 0, 0, 0);
      gran = 'day';
    } else if (key === 'yesterday') {
      start.setUTCDate(start.getUTCDate() - 1);
      start.setUTCHours(0, 0, 0, 0);
      now.setUTCDate(now.getUTCDate() - 1);
      now.setUTCHours(23, 59, 59, 999);
      gran = 'day';
    } else if (key === 'last7') {
      start.setUTCDate(start.getUTCDate() - 6);
      start.setUTCHours(0, 0, 0, 0);
      gran = 'day';
    } else if (key === 'last30') {
      start.setUTCDate(start.getUTCDate() - 29);
      start.setUTCHours(0, 0, 0, 0);
      gran = 'day';
    } else if (key === 'thisMonth') {
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
      gran = 'day';
    } else if (key === 'lastMonth') {
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
      start.setUTCMonth(start.getUTCMonth() - 1);
      const endTmp = new Date(start);
      endTmp.setUTCMonth(endTmp.getUTCMonth() + 1, 0);
      endTmp.setUTCHours(23, 59, 59, 999);
      const sISO = start.toISOString();
      const eISO = endTmp.toISOString();
      const chk = validateFilterParams({ startTime: sISO, endTime: eISO, granularity: 'day', agg, period: 'custom', limit: Number(limit) });
      if (!chk.ok) {
        setErrors(chk.errors);
        return;
      }
      setErrors([]);
      setStartTime(sISO);
      setEndTime(eISO);
      setPeriod('custom');
      setGranularity('day');
      setSDate(toDateInput(sISO));
      setEDate(toDateInput(eISO));
      setTimeLock(true);
      setDirty(false);
      return;
    } else if (key === 'ytd') {
      start.setUTCMonth(0, 1);
      start.setUTCHours(0, 0, 0, 0);
      gran = 'month';
    }
    const sISO = start.toISOString();
    const eISO = key === 'yesterday' ? now.toISOString() : endISO;
    const chk = validateFilterParams({ startTime: sISO, endTime: eISO, granularity: gran, agg, period: 'custom', limit: Number(limit) });
    if (!chk.ok) {
      setErrors(chk.errors);
      return;
    }
    setErrors([]);
    setStartTime(sISO);
    setEndTime(eISO);
    setPeriod('custom');
    setGranularity(gran);
    setSDate(toDateInput(sISO));
    setEDate(toDateInput(eISO));
    setTimeLock(true);
    setDirty(false);
  };

  const applyFilters = () => {
    let sISO = startTime;
    let eISO = endTime;
    if (period && period !== 'custom') {
      const now = new Date();
      eISO = now.toISOString();
      const lim = Number(limit) || 1;
      const start = new Date(now);
      if (period === 'daily') {
        start.setUTCDate(start.getUTCDate() - (lim - 1));
        start.setUTCHours(0, 0, 0, 0);
        if (!['auto', 'hour', 'day'].includes(granularity)) setGranularity('day');
      } else if (period === 'monthly') {
        start.setUTCMonth(start.getUTCMonth() - (lim - 1), 1);
        start.setUTCHours(0, 0, 0, 0);
        if (!['auto', 'month'].includes(granularity)) setGranularity('month');
      } else if (period === 'yearly') {
        start.setUTCFullYear(start.getUTCFullYear() - (lim - 1), 0, 1);
        start.setUTCHours(0, 0, 0, 0);
        if (!['auto', 'year'].includes(granularity)) setGranularity('year');
      }
      sISO = start.toISOString();
      setSDate(toDateInput(sISO));
      setEDate(toDateInput(eISO));
    } else {
      sISO = sDate ? new Date(`${sDate}T00:00:00.000Z`).toISOString() : startTime;
      eISO = eDate ? new Date(`${eDate}T23:59:59.999Z`).toISOString() : endTime;
    }
    const check = validateFilterParams({
      startTime: sISO,
      endTime: eISO,
      granularity,
      agg,
      period,
      limit: Number(limit),
      entityType,
      entityNames,
      combine,
      ifacePrimaryOnly,
      ifaceActiveOnly,
    });
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors([]);
    setStartTime(sISO);
    setEndTime(eISO);
    setTimeLock(true);
    setDirty(false);
  };

  const shiftWindow = (dir) => {
    const s = new Date(startTime);
    const e = new Date(endTime);
    const spanMs = Math.max(e - s, 0);
    const delta = dir === 'prev' ? -spanMs : spanMs;
    const ns = new Date(s.getTime() + delta).toISOString();
    const ne = new Date(e.getTime() + delta).toISOString();
    const check = validateFilterParams({
      startTime: ns,
      endTime: ne,
      granularity,
      agg,
      period: 'custom',
      limit: Number(limit),
      entityType,
      entityNames,
      combine,
      ifacePrimaryOnly,
      ifaceActiveOnly,
    });
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors([]);
    setStartTime(ns);
    setEndTime(ne);
    setPeriod('custom');
    setSDate(toDateInput(ns));
    setEDate(toDateInput(ne));
    setTimeLock(true);
    setDirty(false);
  };

  React.useEffect(() => {
    if (!autoRefresh) return;
    const ms = Math.max(5, Number(autoInterval)) * 1000;
    const id = setInterval(() => {
      if (timeLock && typeof onReload === 'function') {
        onReload();
      }
    }, ms);
    return () => clearInterval(id);
  }, [autoRefresh, autoInterval, timeLock, onReload]);

  const resetFilters = () => {
    const now = new Date().toISOString();
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const s = d.toISOString();
    setStartTime(s);
    setEndTime(now);
    setGranularity('auto');
    setAgg('avg');
    setPeriod('custom');
    setLimit(30);
    if (setEntityName) setEntityName('');
    if (setEntityNames) setEntityNames([]);
    if (setCombine) setCombine('total');
    if (setIfacePrimaryOnly) setIfacePrimaryOnly(false);
    if (setIfaceActiveOnly) setIfaceActiveOnly(false);
    setSDate(toDateInput(s));
    setEDate(toDateInput(now));
    setTimeLock(false);
    setErrors([]);
    setDirty(false);
  };

  const flagDirty = () => setDirty(true);

  const applyQuickEntity = (key) => {
    if (key === 'speed') {
      setEntityType('interface');
      setCombine('total');
      setIfacePrimaryOnly(true);
      setIfaceActiveOnly(true);
      setEntityNames([]);
    } else if (key === 'usage') {
      setEntityType('interface');
      setCombine('per_entity');
      setIfacePrimaryOnly(false);
      setIfaceActiveOnly(true);
      setEntityNames([]);
    } else if (key === 'clients') {
      setEntityType('clients');
      if (setEntityName) setEntityName('');
      setEntityNames([]);
      setCombine('total');
      setIfacePrimaryOnly(false);
      setIfaceActiveOnly(false);
    } else if (key === 'pppoe') {
      setEntityType('pppoe');
      setCombine('per_entity');
      setEntityNames([]);
      setIfacePrimaryOnly(false);
      setIfaceActiveOnly(false);
    } else if (key === 'hotspot') {
      setEntityType('hotspot');
      setCombine('per_entity');
      setEntityNames([]);
      setIfacePrimaryOnly(false);
      setIfaceActiveOnly(false);
    } else if (key === 'cpu') {
      setEntityType('cpu');
      if (setEntityName) setEntityName('');
      setEntityNames([]);
      setCombine('total');
      setIfacePrimaryOnly(false);
      setIfaceActiveOnly(false);
    }
    flagDirty();
    setActiveTab('timeline');
  };

  React.useEffect(() => {
    let stop = false;
    const shouldFetch = entityType === 'interface' && (ifacePrimaryOnly || ifaceActiveOnly) && (!Array.isArray(entityNames) || entityNames.length === 0);
    if (!shouldFetch) return;
    if (!boardId) return;
    (async () => {
      try {
        const list = await listInterfacesV2(boardId, { active: !!ifaceActiveOnly, primary: !!ifacePrimaryOnly, limit: 30 });
        if (stop) return;
        const names = (list || []).map((it) => it.interface_name).filter(Boolean);
        if (names.length > 0) {
          setEntityNames(names);
          flagDirty();
          setActiveTab('timeline');
        }
      } catch (e) {
        console.warn(e);
      }
    })();
    return () => { stop = true; };
  }, [boardId, entityType, ifacePrimaryOnly, ifaceActiveOnly, entityNames, setEntityNames]);

  React.useEffect(() => {
    let cancelled = false;
    if (!boardId) { setSuggestList([]); setSuggestLoading(false); return; }
    if (!newEntityText || newEntityText.length < 1) { setSuggestList([]); setSuggestLoading(false); return; }
    const doFetch = async () => {
      try {
        setSuggestLoading(true);
        let items = [];
        if (entityType === 'interface') {
          items = await listInterfacesV2(boardId, { q: newEntityText, limit: 10 });
        } else if (entityType === 'pppoe') {
          items = await listPppoeUsersV2(boardId, { q: newEntityText, limit: 10 });
        } else if (entityType === 'hotspot') {
          items = await listHotspotUsersV2(boardId, { q: newEntityText, limit: 10 });
        } else {
          items = [];
        }
        if (!cancelled) {
          setSuggestList(items || []);
        }
      } catch {
        if (!cancelled) setSuggestList([]);
      } finally {
        if (!cancelled) setSuggestLoading(false);
      }
    };
    const t = setTimeout(doFetch, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [boardId, entityType, newEntityText]);

  return (
    <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-300 via-blue-500 to-indigo-400 animate-pulse rounded-t" />
      )}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Stage 1 — Scope & Filter</h2>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-xs text-gray-800" aria-label="Time Lock">
            <input type="checkbox" className="rounded border-gray-300" checked={timeLock} onChange={(e) => { setTimeLock(e.target.checked); flagDirty(); }} />
            Time Lock
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-gray-800" aria-label="High Contrast Mode">
            <input type="checkbox" className="rounded border-gray-300" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />
            High Contrast
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-gray-800" aria-label="Color Blind Mode">
            <input type="checkbox" className="rounded border-gray-300" checked={colorBlindMode} onChange={(e) => setColorBlindMode(e.target.checked)} />
            CB-friendly
          </label>
          <div>
            <label className="block text-xs text-gray-800 mb-1">Auto-refresh</label>
            <div className="flex items-center gap-2">
              <input aria-label="Auto Refresh" type="checkbox" className="rounded border-gray-300" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              <select aria-label="Auto Refresh Interval" className="border border-gray-300 rounded px-2 py-1 text-sm" value={autoInterval} onChange={(e) => setAutoInterval(e.target.value)}>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2">
        <span className="inline-flex items-center gap-2 px-2 py-1 rounded border border-emerald-200 bg-emerald-50 text-xs text-emerald-800">
          Tabel terpilih: <strong className="font-semibold">{selectedTable || '-'}</strong>
        </span>
      </div>
      <div className="mb-3">
        <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} busy={isLoading} ariaLabel="Stage 1 Tabs" />
      </div>
      <div className={`mt-3 min-h-[180px] ${activeTab==='entity'?'block opacity-100':'hidden opacity-0'} transition-opacity duration-200`} role="tabpanel" id="panel-entity" aria-labelledby="tab-entity">
        <div className="text-sm font-semibold text-gray-800 mb-2">Entity Filter</div>
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Quick Entity</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => applyQuickEntity('speed')} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">speed internet</button>
            <button onClick={() => applyQuickEntity('usage')} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">penggunaan internet (usage)</button>
            <button onClick={() => applyQuickEntity('clients')} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">jumlah pengguna (client)</button>
            <button onClick={() => applyQuickEntity('pppoe')} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">PPPOE</button>
            <button onClick={() => applyQuickEntity('hotspot')} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Hotspot</button>
            <button onClick={() => applyQuickEntity('cpu')} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">CPU</button>
          </div>
          <div className="mt-3">
            <div className="text-xs text-gray-600 mb-1">Nama Tabel (DB)</div>
            <div className="flex flex-wrap gap-1">
              {currentTables.map((t) => (
                <span key={t} className="inline-flex items-center px-2 py-0.5 rounded border border-gray-200 bg-gray-50 text-[11px] text-gray-700">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Entity</label>
            <select className="w-full border border-gray-300 rounded px-2 py-1 text-sm" value={entityType} onChange={(e) => { setEntityType(e.target.value); flagDirty(); }}>
              <option value="board">board</option>
              <option value="cpu">cpu</option>
              <option value="interface">interface</option>
              <option value="pppoe">pppoe</option>
              <option value="hotspot">hotspot</option>
              <option value="site_group">site_group</option>
              <option value="clients">clients</option>
            </select>
          </div>
          {entityType === 'board' ? (
            <div className="md:col-span-3">
              <label className="block text-xs text-gray-600 mb-1">Name Filter (opsional)</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                placeholder="mis. Board-1"
                value={entityName}
                onChange={(e) => { setEntityName(e.target.value); flagDirty(); }}
              />
            </div>
          ) : (
            <div className="md:col-span-4">
              <label className="block text-xs text-gray-600 mb-1">Pilih Entitas (multi)</label>
              <div className="mb-2">
                <MultiEntityCombobox
                  items={comboItems}
                  value={comboValue}
                  onSearch={comboOnSearch}
                  onChange={(arr) => {
                    const names = (arr || []).map((x) => x?.name).filter(Boolean);
                    setEntityNames(names);
                    flagDirty();
                  }}
                  maxSelected={200}
                  placeholder="Cari dan pilih multiple entitas"
                />
              </div>
              <label className="block text-xs text-gray-600 mb-1">Entity Names (chips)</label>
              <div className="w-full border border-gray-300 rounded px-2 py-1 text-sm flex flex-wrap items-center gap-1 min-h-[34px] relative">
                {Array.isArray(entityNames) && entityNames.map((n, idx) => (
                  <span
                    key={`${n}-${idx}`}
                    className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5 text-xs"
                    onMouseEnter={() => setPreviewEntity(n)}
                    onMouseLeave={() => setPreviewEntity(null)}
                  >
                    {n}
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => { setEntityNames(entityNames.filter((_, i) => i !== idx)); flagDirty(); }}
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="flex-1 min-w-[120px] outline-none"
                  role="combobox"
                  aria-expanded={suggestOpen && suggestList.length > 0}
                  aria-controls="entity-suggest-list"
                  aria-activedescendant={highlightIdx >= 0 ? `entity-opt-${highlightIdx}` : undefined}
                  placeholder="ketik untuk mencari… (Enter untuk tambah)"
                  value={newEntityText}
                  onChange={(e) => { setNewEntityText(e.target.value); setSuggestOpen(true); setHighlightIdx(-1); }}
                  onKeyDown={(e) => {
                    if ((e.key === 'ArrowDown' || e.key === 'Down') && suggestOpen && suggestList.length > 0) {
                      e.preventDefault();
                      setHighlightIdx((prev) => (prev + 1) % suggestList.length);
                      return;
                    }
                    if ((e.key === 'ArrowUp' || e.key === 'Up') && suggestOpen && suggestList.length > 0) {
                      e.preventDefault();
                      setHighlightIdx((prev) => (prev <= 0 ? suggestList.length - 1 : prev - 1));
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (suggestOpen && suggestList.length > 0 && highlightIdx >= 0) {
                        const sug = suggestList[highlightIdx];
                        const label = typeof sug === 'string' ? sug : (sug.interface_name || sug.username || sug.name || '');
                        if (label && (!Array.isArray(entityNames) || !entityNames.includes(label))) {
                          setEntityNames([...(entityNames || []), label]);
                          setNewEntityText('');
                          setSuggestOpen(false);
                          setHighlightIdx(-1);
                          flagDirty();
                        }
                      } else {
                        const val = (newEntityText || '').trim();
                        if (val && (!Array.isArray(entityNames) || !entityNames.includes(val))) {
                          setEntityNames([...(entityNames || []), val]);
                          setNewEntityText('');
                          flagDirty();
                        }
                      }
                      return;
                    }
                    if (e.key === 'Escape') {
                      setSuggestOpen(false);
                      setHighlightIdx(-1);
                      return;
                    }
                  }}
                />
                {suggestOpen && newEntityText && suggestList.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full md:w-96 border border-gray-200 rounded-lg bg-white shadow z-20">
                    <div id="entity-suggest-list" role="listbox" className="max-h-56 overflow-auto divide-y divide-gray-100">
                      {suggestList.map((sug, idx) => {
                        const label = typeof sug === 'string'
                          ? sug
                          : (sug.interface_name || sug.username || sug.name || '');
                        return (
                          <button
                            key={label}
                            id={`entity-opt-${idx}`}
                            role="option"
                            aria-selected={highlightIdx === idx}
                            type="button"
                            onClick={() => {
                              if (label && (!Array.isArray(entityNames) || !entityNames.includes(label))) {
                                setEntityNames([...(entityNames || []), label]);
                                setNewEntityText('');
                                flagDirty();
                              }
                              setSuggestOpen(false);
                              setHighlightIdx(-1);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm ${highlightIdx === idx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {suggestOpen && newEntityText && suggestLoading && (
                  <div className="absolute top-full left-0 mt-1 w-40 border border-gray-200 rounded bg-white shadow text-[11px] text-gray-500 px-2 py-1 z-20">
                    Mencari…
                  </div>
                )}
                {Array.isArray(entityNames) && entityNames.length > 0 && (
                  <button
                    type="button"
                    className="ml-2 px-2 py-0.5 border border-gray-300 rounded text-xs hover:bg-gray-50"
                    onClick={() => { setEntityNames([]); flagDirty(); }}
                  >
                    Clear
                  </button>
                )}
                {previewEntity && (
                  <div className="absolute top-full left-0 mt-1 w-full md:w-96 border border-gray-200 rounded-lg bg-white shadow p-3 z-10">
                    <div className="text-xs text-gray-500">Entity Preview</div>
                    <div className="text-sm font-semibold text-gray-800">{previewEntity}</div>
                    <div className="text-xs text-gray-600">Range: {toDateInput(startTime)} → {toDateInput(endTime)}</div>
                    <div className="text-[11px] text-gray-500 mt-1">Gunakan timeline atau tombol Prev/Next untuk memindahkan periode.</div>
                  </div>
                )}
              </div>
            </div>
          )}
          {entityType === 'interface' && (
            <div className="md:col-span-3">
              <label className="block text-xs text-gray-600 mb-1">Filter Interface</label>
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={!!ifacePrimaryOnly}
                    onChange={(e) => { setIfacePrimaryOnly(e.target.checked); flagDirty(); }}
                  />
                  Hanya Uplink (primary)
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={!!ifaceActiveOnly}
                    onChange={(e) => { setIfaceActiveOnly(e.target.checked); flagDirty(); }}
                  />
                  Hanya yang aktif
                </label>
              </div>
            </div>
          )}
          {entityType !== 'board' && (
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Combine</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                value={combine}
                onChange={(e) => { setCombine(e.target.value); flagDirty(); }}
              >
                <option value="total">total</option>
                <option value="per_entity">per_entity</option>
                <option value="both">both</option>
              </select>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={() => shiftWindow('prev')} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Prev</button>
        <button type="button" onClick={() => shiftWindow('next')} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Next</button>
        <button type="button" onClick={() => setShowTutorial((v) => !v)} className="ml-auto px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Tutorial</button>
        <button type="button" onClick={() => {
          setShowEntityModal(true);
          setModalSelected(Array.isArray(entityNames) ? [...entityNames] : []);
          setSelectedTable(selectedTable || '');
          setModalTable(selectedTable || (currentTables?.[0] || ''));
          setModalTableError('');
        }} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Tambah via Modal</button>
      </div>
      <div className={`mt-3 min-h-[180px] ${activeTab==='timeline'?'block opacity-100':'hidden opacity-0'} transition-opacity duration-200`} ref={timelineRef} role="tabpanel" id="panel-timeline" aria-labelledby="tab-timeline">
        <Stage1Timeline
          startTime={startTime}
          endTime={endTime}
          granularity={granularity}
          densities={timeDensity}
          highContrast={highContrast}
          cbFriendly={colorBlindMode}
          onSelectRange={(s, e) => {
            const check = validateFilterParams({
              startTime: s,
              endTime: e,
              granularity,
              agg,
              period: 'custom',
              limit: Number(limit),
              entityType,
              entityNames,
              combine,
              ifacePrimaryOnly,
              ifaceActiveOnly,
            });
            if (!check.ok) {
              setErrors(check.errors);
              return;
            }
            setErrors([]);
            setStartTime(s);
            setEndTime(e);
            setPeriod('custom');
            setSDate(toDateInput(s));
            setEDate(toDateInput(e));
            setTimeLock(true);
            setDirty(false);
          }}
        />
      </div>
      <div className={`grid grid-cols-1 md:grid-cols-8 gap-3 min-h-[180px] ${activeTab==='time'?'block opacity-100':'hidden opacity-0'} transition-opacity duration-200`} ref={entityRef} role="tabpanel" id="panel-time" aria-labelledby="tab-time">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Period</label>
          <select className="w-full border border-gray-300 rounded px-2 py-1 text-sm" value={period} onChange={(e) => { setPeriod(e.target.value); flagDirty(); }}>
            <option value="custom">custom</option>
            <option value="daily">daily</option>
            <option value="monthly">monthly</option>
            <option value="yearly">yearly</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Limit</label>
          <input type="number" min="1" className="w-full border border-gray-300 rounded px-2 py-1 text-sm" value={limit} onChange={(e) => { setLimit(e.target.value); flagDirty(); }} />
        </div>
        {showLegacyEntityControls && (
          <>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Entity</label>
              <select className="w-full border border-gray-300 rounded px-2 py-1 text-sm" value={entityType} onChange={(e) => { setEntityType(e.target.value); flagDirty(); }}>
                <option value="board">board</option>
                <option value="interface">interface</option>
                <option value="pppoe">pppoe</option>
                <option value="hotspot">hotspot</option>
                <option value="site_group">site_group</option>
                <option value="clients">clients</option>
              </select>
            </div>
            {entityType === 'board' ? (
              <div>
                <label className="block text-xs text-gray-600 mb-1">Name Filter (opsional)</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  placeholder="mis. Board-1"
                  value={entityName}
                  onChange={(e) => { setEntityName(e.target.value); flagDirty(); }}
                />
              </div>
            ) : (
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Entity Names (multi)</label>
                <div className="w-full border border-gray-300 rounded px-2 py-1 text-sm flex flex-wrap items-center gap-1 min-h-[34px] relative">
                  {Array.isArray(entityNames) && entityNames.map((n, idx) => (
                    <span
                      key={`${n}-${idx}`}
                      className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5 text-xs"
                      onMouseEnter={() => setPreviewEntity(n)}
                      onMouseLeave={() => setPreviewEntity(null)}
                    >
                      {n}
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => { setEntityNames(entityNames.filter((_, i) => i !== idx)); flagDirty(); }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    className="flex-1 min-w-[120px] outline-none"
                    placeholder="ketik lalu Enter (mis. ether1)"
                    value={newEntityText}
                    onChange={(e) => setNewEntityText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const val = (newEntityText || '').trim();
                        if (val && (!Array.isArray(entityNames) || !entityNames.includes(val))) {
                          setEntityNames([...(entityNames || []), val]);
                          setNewEntityText('');
                          flagDirty();
                        }
                      }
                    }}
                  />
                  {Array.isArray(entityNames) && entityNames.length > 0 && (
                    <button
                      type="button"
                      className="ml-2 px-2 py-0.5 border border-gray-300 rounded text-xs hover:bg-gray-50"
                      onClick={() => { setEntityNames([]); flagDirty(); }}
                    >
                      Clear
                    </button>
                  )}
                  {previewEntity && (
                    <div className="absolute top-full left-0 mt-1 w-full md:w-96 border border-gray-200 rounded-lg bg-white shadow p-3 z-10">
                      <div className="text-xs text-gray-500">Entity Preview</div>
                      <div className="text-sm font-semibold text-gray-800">{previewEntity}</div>
                      <div className="text-xs text-gray-600">Range: {toDateInput(startTime)} → {toDateInput(endTime)}</div>
                      <div className="text-[11px] text-gray-500 mt-1">Gunakan timeline atau tombol Prev/Next untuk memindahkan periode.</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        <div ref={timeRef}>
          <label className="block text-xs text-gray-600 mb-1">Start Date</label>
          <input type="date" className="w-full border border-gray-300 rounded px-2 py-1 text-sm" value={sDate} onChange={(e) => { setSDate(e.target.value); flagDirty(); }} />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">End Date</label>
          <input type="date" className="w-full border border-gray-300 rounded px-2 py-1 text-sm" value={eDate} onChange={(e) => { setEDate(e.target.value); flagDirty(); }} />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Granularity</label>
          <select className="w-full border border-gray-300 rounded px-2 py-1 text-sm" value={granularity} onChange={(e) => { setGranularity(e.target.value); flagDirty(); }}>
            {allowedGran.includes('auto') && <option value="auto">auto</option>}
            {allowedGran.includes('hour') && <option value="hour">hour</option>}
            {allowedGran.includes('day') && <option value="day">day</option>}
            {allowedGran.includes('month') && <option value="month">month</option>}
            {allowedGran.includes('year') && <option value="year">year</option>}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Agg Method</label>
          <select className="w-full border border-gray-300 rounded px-2 py-1 text-sm" value={agg} onChange={(e) => { setAgg(e.target.value); flagDirty(); }}>
            <option value="avg">AVG</option>
            <option value="max">MAX</option>
            <option value="sum">SUM</option>
            <option value="min">MIN</option>
          </select>
        </div>
        <div className="md:col-span-8">
          <div className="text-xs text-gray-600 mb-2">Quick Range</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => quickRange('today')} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 transition-colors active:scale-95">Today</button>
            <button onClick={() => quickRange('yesterday')} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 transition-colors active:scale-95">Yesterday</button>
            <button onClick={() => quickRange('last7')} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 transition-colors active:scale-95">Last 7 days</button>
            <button onClick={() => quickRange('last30')} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 transition-colors active:scale-95">Last 30 days</button>
            <button onClick={() => quickRange('thisMonth')} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 transition-colors active:scale-95">This Month</button>
            <button onClick={() => quickRange('lastMonth')} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 transition-colors active:scale-95">Last Month</button>
            <button onClick={() => quickRange('ytd')} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 transition-colors active:scale-95">Year to Date</button>
          </div>
        </div>
      </div>
      {showTutorial && (
        <div className="mt-4 border border-amber-200 bg-amber-50 rounded-lg p-4">
          <div className="text-sm font-semibold text-amber-800">Panduan Cepat Manajemen Waktu</div>
          <ul className="mt-1 text-xs text-amber-800 space-y-1 list-disc list-inside">
            <li>Pilih Period atau gunakan tanggal khusus.</li>
            <li>Gunakan tombol Prev/Next untuk berpindah periode.</li>
            <li>Klik slot pada Timeline untuk memilih sub-range.</li>
            <li>Aktifkan Auto-refresh untuk pembaruan real-time.</li>
            <li>Arahkan ke chip entity untuk melihat pratinjau.</li>
          </ul>
        </div>
      )}
      {showLegacyEntityControls && (entityType === 'interface') && (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={!!ifacePrimaryOnly}
              onChange={(e) => { setIfacePrimaryOnly(e.target.checked); flagDirty(); }}
            />
            Hanya Uplink (primary)
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={!!ifaceActiveOnly}
              onChange={(e) => { setIfaceActiveOnly(e.target.checked); flagDirty(); }}
            />
            Hanya yang aktif
          </label>
        </div>
      )}
      {showLegacyEntityControls && (entityType !== 'board') && (
        <div className="mt-3">
          <label className="block text-xs text-gray-600 mb-1">Combine</label>
          <select
            className="w-full md:w-60 border border-gray-300 rounded px-2 py-1 text-sm"
            value={combine}
            onChange={(e) => { setCombine(e.target.value); flagDirty(); }}
          >
            <option value="total">total</option>
            <option value="per_entity">per_entity</option>
            <option value="both">both</option>
          </select>
        </div>
      )}
      
      
      <div className={`mt-4 ${activeTab==='apply'?'flex':'hidden'} items-center gap-3 transition-opacity duration-200`} ref={applyRef} role="tabpanel" id="panel-apply" aria-labelledby="tab-apply">
        <button aria-label="Undo" onClick={() => {
          if (undoStack.length === 0) return;
          const prev = undoStack[undoStack.length - 1];
          setUndoStack(undoStack.slice(0, -1));
          setRedoStack([{ startTime, endTime, granularity, agg, period, limit, entityType, entityName, entityNames, combine, ifacePrimaryOnly, ifaceActiveOnly, timeLock }, ...redoStack]);
          setStartTime(prev.startTime); setEndTime(prev.endTime);
          setGranularity(prev.granularity); setAgg(prev.agg);
          setPeriod(prev.period); setLimit(prev.limit);
          setEntityType(prev.entityType); if (setEntityName) setEntityName(prev.entityName); setEntityNames(prev.entityNames);
          setCombine(prev.combine); setIfacePrimaryOnly(prev.ifacePrimaryOnly); setIfaceActiveOnly(prev.ifaceActiveOnly);
          setTimeLock(prev.timeLock);
        }} disabled={isLoading || undoStack.length === 0} className={`px-3 py-2 rounded-lg text-sm border ${undoStack.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`} title="Undo perubahan terakhir">Undo</button>
        <button aria-label="Redo" onClick={() => {
          if (redoStack.length === 0) return;
          const next = redoStack[0];
          setRedoStack(redoStack.slice(1));
          setUndoStack([...undoStack, { startTime, endTime, granularity, agg, period, limit, entityType, entityName, entityNames, combine, ifacePrimaryOnly, ifaceActiveOnly, timeLock }]);
          setStartTime(next.startTime); setEndTime(next.endTime);
          setGranularity(next.granularity); setAgg(next.agg);
          setPeriod(next.period); setLimit(next.limit);
          setEntityType(next.entityType); if (setEntityName) setEntityName(next.entityName); setEntityNames(next.entityNames);
          setCombine(next.combine); setIfacePrimaryOnly(next.ifacePrimaryOnly); setIfaceActiveOnly(next.ifaceActiveOnly);
          setTimeLock(next.timeLock);
        }} disabled={isLoading || redoStack.length === 0} className={`px-3 py-2 rounded-lg text-sm border ${redoStack.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`} title="Redo perubahan">Redo</button>
        <button onClick={() => {
          setUndoStack([...undoStack, { startTime, endTime, granularity, agg, period, limit, entityType, entityName, entityNames, combine, ifacePrimaryOnly, ifaceActiveOnly, timeLock }]);
          setRedoStack([]);
          applyFilters();
        }} disabled={isLoading} className={`px-4 py-2 rounded-lg text-sm transition-transform active:scale-95 ${isLoading ? 'bg-blue-300 text-white' : 'bg-blue-700 text-white hover:bg-blue-800'}`} title="Validasi dan terapkan perubahan">Validate & Apply</button>
        <button onClick={resetFilters} disabled={isLoading} className={`px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-transform active:scale-95 ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}>Reset</button>
        <button onClick={onReload} disabled={isLoading} className={`px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-transform active:scale-95 ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}>Reload Data</button>
        {errors.length > 0 && <span className="text-xs text-rose-600">{errors.join(' • ')}</span>}
        {errors.length === 0 && !dirty && (
          <span className={`text-xs ${timeLock ? 'text-emerald-700' : 'text-gray-700'}`} aria-live="polite">{timeLock ? 'Validated' : 'Unlocked'}</span>
        )}
        {isLoading && (
          <span className="inline-flex items-center gap-2 text-xs text-gray-500">
            <LoadingSpinner size="xs" /> Memuat data…
          </span>
        )}
      </div>

      {/* Modal Tambah Entity (Drag & Drop) */}
      <Modal isOpen={showEntityModal} onClose={() => setShowEntityModal(false)} title="Tambah Entity (Drag & Drop)" size="xl">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label htmlFor="modal-table" className="block text-xs text-gray-700 mb-1">Nama Tabel Database</label>
              <input
                id="modal-table"
                type="text"
                className={`w-full border rounded px-3 py-2 text-sm ${modalTableError ? 'border-rose-400 focus:border-rose-400' : 'border-gray-300 focus:border-gray-400'}`}
                placeholder={currentTables?.[0] || 'mis. board_speed_stats'}
                value={modalTable}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setModalTable(v);
                  if (!v) {
                    setModalTableError('Nama tabel wajib diisi');
                  } else if (!currentTables.includes(v)) {
                    setModalTableError('Tabel tidak valid untuk entity ini');
                  } else if (selectedTable && selectedTable === v) {
                    setModalTableError('Tabel sudah dipilih sebelumnya');
                  } else {
                    setModalTableError('');
                  }
                }}
                aria-invalid={!!modalTableError}
                aria-describedby="modal-table-help"
              />
              <div id="modal-table-help" className={`mt-1 text-[11px] ${modalTableError ? 'text-rose-600' : 'text-gray-500'}`}>
                {modalTableError ? modalTableError : `Tabel valid: ${currentTables.join(', ')}`}
              </div>
            </div>
            <div className="md:col-span-1">
              <div className="text-xs text-gray-700 mb-2">Tersedia</div>
              <div
                className="min-h-[220px] border border-gray-200 rounded-lg p-2 bg-gray-50"
                onDragOver={(e) => e.preventDefault()}
              >
                {modalAvailable.length === 0 && (
                  <div className="text-[11px] text-gray-500 p-2">Tidak ada data. Ketik pada input Entity Names untuk memuat saran, lalu buka modal.</div>
                )}
                <div className="grid grid-cols-1 gap-2">
                  {modalAvailable.map((name, idx) => (
                    <button
                      key={`${name}-${idx}`}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        setDragCtx({ type: 'available', index: idx });
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={() => {
                        if (!modalSelected.includes(name)) setModalSelected([...modalSelected, name]);
                      }}
                      className="flex items-center justify-between px-2 py-1 rounded bg-white border border-gray-200 text-sm text-gray-800 shadow-sm transition-transform hover:-translate-y-0.5"
                      title="Klik atau drag untuk menambahkan"
                    >
                      <span>{name}</span>
                      <span className="ml-2 text-[11px] text-gray-500">Tambah</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-700">Terpilih & Urutan</div>
                <div className="text-[11px] text-gray-500">Drag untuk mengurutkan. Drop dari panel kiri untuk menambah.</div>
              </div>
              <div
                className={`min-h-[220px] border ${dragOverIndex>=0?'border-blue-300':'border-gray-200'} rounded-lg p-2 bg-white`}
                onDragOver={(e) => { e.preventDefault(); }}
                onDragEnter={() => setDragOverIndex(modalSelected.length)}
                onDragLeave={() => setDragOverIndex(-1)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!dragCtx || dragCtx.index < 0) return;
                  if (dragCtx.type === 'available') {
                    const name = modalAvailable[dragCtx.index];
                    if (!modalSelected.includes(name)) {
                      setModalSelected([...modalSelected, name]);
                    }
                  }
                  setDragCtx({ type: '', index: -1 });
                  setDragOverIndex(-1);
                }}
              >
                {modalSelected.length === 0 && (
                  <div className="text-[11px] text-gray-500 p-2">Belum ada entity. Tarik dari panel kiri atau klik tombol + di bawah.</div>
                )}
                <div className="flex flex-wrap gap-2">
                  {modalSelected.map((name, idx) => (
                    <div
                      key={`${name}-sel-${idx}`}
                      draggable
                      onDragStart={(e) => {
                        setDragCtx({ type: 'selected', index: idx });
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverIndex(idx);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragCtx.type !== 'selected') return;
                        const from = dragCtx.index;
                        const to = idx;
                        if (from === to) return;
                        const arr = [...modalSelected];
                        const [moved] = arr.splice(from, 1);
                        arr.splice(to, 0, moved);
                        setModalSelected(arr);
                        setDragCtx({ type: '', index: -1 });
                        setDragOverIndex(-1);
                      }}
                      className={`inline-flex items-center gap-2 px-2 py-1 rounded border text-sm ${dragOverIndex===idx?'border-blue-400 bg-blue-50':'border-gray-200 bg-gray-50'} transition-colors`}
                      title="Drag untuk mengurutkan"
                    >
                      <span>{name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Pindah ke atas"
                          className="px-1 rounded border border-gray-300 text-[11px] hover:bg-gray-100"
                          onClick={() => {
                            if (idx === 0) return;
                            const arr = [...modalSelected];
                            const [m] = arr.splice(idx, 1);
                            arr.splice(idx - 1, 0, m);
                            setModalSelected(arr);
                          }}
                        >↑</button>
                        <button
                          type="button"
                          aria-label="Pindah ke bawah"
                          className="px-1 rounded border border-gray-300 text-[11px] hover:bg-gray-100"
                          onClick={() => {
                            if (idx === modalSelected.length - 1) return;
                            const arr = [...modalSelected];
                            const [m] = arr.splice(idx, 1);
                            arr.splice(idx + 1, 0, m);
                            setModalSelected(arr);
                          }}
                        >↓</button>
                      </div>
                      <button
                        type="button"
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => setModalSelected(modalSelected.filter((_, i) => i !== idx))}
                        aria-label="Hapus dari pilihan"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {modalSelected.length > 0 && (
                  <div className="mt-3 p-2 border-t border-gray-100">
                    <div className="text-xs text-gray-700 mb-1">Preview:</div>
                    <div className="text-[11px] text-gray-600">{modalSelected.join(', ')}</div>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  onClick={() => {
                    const pool = Array.isArray(entityNames) ? entityNames : [];
                    const extras = (suggestList || []).map(s => typeof s==='string'? s : (s.interface_name || s.username || s.name || '')).filter(Boolean);
                    const available = Array.from(new Set([...extras, ...pool].filter(Boolean)));
                    setModalAvailable(available);
                  }}
                  title="Muat ulang daftar tersedia dari saran dan entityNames"
                >
                  Muat Ulang Tersedia
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    onClick={() => setShowEntityModal(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={!!modalTableError || !modalTable || modalSelected.length === 0}
                    className={`px-4 py-1.5 text-sm rounded ${!!modalTableError || !modalTable || modalSelected.length === 0 ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'} transition-colors`}
                    onClick={() => {
                      if (!!modalTableError || !modalTable || modalSelected.length === 0) return;
                      setSelectedTable(modalTable);
                      setEntityNames(modalSelected);
                      flagDirty();
                      setShowEntityModal(false);
                    }}
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-800 mb-2">Scope</div>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>Domain: Frontend + Backend (Summary)</li>
            <li>Entitas: {entityType}</li>
            <li>Waktu: {period !== 'custom' ? `${period} • ${limit}` : `${toDateInput(startTime)} → ${toDateInput(endTime)}`}</li>
          </ul>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-800 mb-2">Filter</div>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>entity: {entityType}</li>
            {entityType === 'board' ? (
              <li>name: {entityName || '-'}</li>
            ) : (
              <li>names: {(entityNames && entityNames.length > 0) ? entityNames.join(', ') : '-'}</li>
            )}
            <li>period: {period}</li>
            <li>limit: {limit}</li>
            <li>granularity: {granularity}</li>
            <li>aggMethod: {agg}</li>
            <li>bucketSource: server</li>
          </ul>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-800 mb-2">Pre-Flight</div>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>Read-only: true</li>
            <li>Summary Only: true</li>
            <li>Deterministic: true</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Stage1ScopeFilterPanel;

