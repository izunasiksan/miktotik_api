import axios from 'axios';
import toast from 'react-hot-toast';
import { getBoards, getTimeAggregate } from '../../services/api.js';

// Cache ketersediaan endpoint aggregate-all untuk menghindari 404 berulang
let AGG_ALL_AVAILABLE = (() => {
  try {
    const raw = sessionStorage.getItem('V2_AGG_ALL_AVAILABLE');
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch { /* ignore */ }
  return null; // belum diketahui
})();

const baseURL = import.meta.env.DEV
  ? '/api/v2'
  : (import.meta.env.VITE_API_V2_URL || '/api/v2');

const apiV2 = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

apiV2.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

apiV2.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      const isMeRequest = url.includes('/auth/me/');
      if (isMeRequest) {
        localStorage.removeItem('token');
        toast.error('Sesi berakhir. Silakan login kembali.');
        setTimeout(() => { window.location.href = '/login'; }, 1200);
      } else {
        const key = 'AUTH_401_LAST_TOAST_AT';
        const now = Date.now();
        try {
          const last = Number(localStorage.getItem(key) || '0');
          if (!(Number.isFinite(last) && now - last < 5000)) {
            toast.error('Akses ditolak (401). Coba reload atau login ulang.');
            localStorage.setItem(key, String(now));
          }
        } catch {
          toast.error('Akses ditolak (401). Coba reload atau login ulang.');
        }
      }
    }
    return Promise.reject(error);
  },
);

export const getBoardsV2 = async () => {
  // Reuse V1 boards until V2 endpoint tersedia
  return getBoards();
};

export const getAggregateAll = async (boardId, { startTime, endTime, granularity = 'auto', agg = 'avg', entityType, entityNames, combine = 'total', ifacePrimaryOnly = false, ifaceActiveOnly = false }) => {
  const params = new URLSearchParams();
  params.set('start_time', startTime);
  params.set('end_time', endTime);
  params.set('granularity', granularity);
  params.set('agg', agg);
  if (entityType === 'interface' && Array.isArray(entityNames) && entityNames.length > 0) {
    for (const name of entityNames) {
      params.append('interface', name);
    }
    if (combine) params.set('combine', combine);
    params.set('fill_gap', 'zero');
    if (ifacePrimaryOnly) params.set('primary', 'true');
    if (ifaceActiveOnly) params.set('active', 'true');
  }
  // Jika sebelumnya diketahui tidak tersedia, langsung gunakan fallback V1
  if (AGG_ALL_AVAILABLE === false) {
    return fallbackTimeAggregate(boardId, { startTime, endTime, granularity, agg });
  }
  try {
    const response = await apiV2.get(`/analysis/${boardId}/aggregate-all/?${params.toString()}`);
    // Tandai tersedia untuk sesi ini
    AGG_ALL_AVAILABLE = true;
    try { sessionStorage.setItem('V2_AGG_ALL_AVAILABLE', 'true'); } catch { /* ignore */ }
    return response.data;
  } catch (err) {
    const status = err?.response?.status;
    if (status === 404 || status === 501) {
      // Tandai tidak tersedia agar request berikutnya tidak menimbulkan 404 lagi
      AGG_ALL_AVAILABLE = false;
      try { sessionStorage.setItem('V2_AGG_ALL_AVAILABLE', 'false'); } catch { /* ignore */ }
      return fallbackTimeAggregate(boardId, { startTime, endTime, granularity, agg });
    }
    throw err;
  }
};

/**
 * Stage 3: Heavy Analysis (Correlation, Habits, etc.)
 * Mengirimkan dataset hasil Stage 1 & 2 untuk diproses di Backend.
 */
export const getHeavyAnalysisV2 = async (boardId, { 
  startTime, 
  endTime, 
  granularity, 
  entityType, 
  entityNames,
  analysisTypes = ['correlation'] // default correlation
}) => {
  const params = new URLSearchParams();
  params.set('start_time', startTime);
  params.set('end_time', endTime);
  params.set('granularity', granularity);
  params.set('entity_type', entityType);
  
  if (Array.isArray(entityNames) && entityNames.length > 0) {
    entityNames.forEach(name => params.append('entity_names', name));
  }
  
  if (Array.isArray(analysisTypes)) {
    analysisTypes.forEach(type => params.append('types', type));
  }

  try {
    const response = await apiV2.get(`/analysis/${boardId}/heavy-analysis/?${params.toString()}`);
    return response.data;
  } catch (err) {
    console.error('[API_V2] Heavy Analysis Error:', err);
    throw err;
  }
};

export const getTimeDensityV2 = async (boardId, { startTime, endTime, granularity, entityType, entityNames }) => {
  const params = new URLSearchParams();
  params.set('start_time', startTime);
  params.set('end_time', endTime);
  params.set('granularity', granularity);
  if (entityType) params.set('entity_type', entityType);
  if (Array.isArray(entityNames) && entityNames.length > 0) {
    for (const name of entityNames) {
      params.append('entity_names', name);
    }
  }

  try {
    const response = await apiV2.get(`/analysis/${boardId}/time-density/?${params.toString()}`);
    return response.data;
  } catch (err) {
    console.warn('[API_V2] time-density error:', err);
    return [];
  }
};

const fallbackTimeAggregate = async (boardId, { startTime, endTime, granularity, agg }) => {
  // Fallback ke V1 time aggregate (summary-based, read-only)
  const [dl, ul, cpu, free] = await Promise.all([
    getTimeAggregate(boardId, { startTime, endTime, granularity, metric: 'download_mbps', agg }).catch(() => []),
    getTimeAggregate(boardId, { startTime, endTime, granularity, metric: 'upload_mbps', agg }).catch(() => []),
    getTimeAggregate(boardId, { startTime, endTime, granularity, metric: 'cpu_load', agg }).catch(() => []),
    getTimeAggregate(boardId, { startTime, endTime, granularity, metric: 'free_memory', agg }).catch(() => []),
  ]);
  const toMap = (arr, field) => {
    const m = new Map();
    if (!Array.isArray(arr)) return m;
    for (const it of arr) {
      const key = it?.period || it?.log_time || it?.log_date || it?.date || it?.timestamp || null;
      if (key) m.set(key, it[field]);
    }
    return m;
  };
  const mDl = toMap(dl, 'avg_value');
  const mUl = toMap(ul, 'avg_value');
  const mCpu = toMap(cpu, 'avg_value');
  const mFree = toMap(free, 'avg_value');
  const allKeys = Array.from(new Set([...mDl.keys(), ...mUl.keys(), ...mCpu.keys(), ...mFree.keys()])).sort();
  return allKeys.map(k => ({
    period: k,
    traffic: { download: mDl.get(k) || 0, upload: mUl.get(k) || 0 },
    resource: { cpu: mCpu.get(k) || 0, memory: mFree.get(k) || 0 },
  }));
};
