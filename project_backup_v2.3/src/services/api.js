import axios from 'axios';
import axiosRetry from 'axios-retry';
import toast from 'react-hot-toast';

const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api/v1' : '/api/v1');

const api = axios.create({
  baseURL,
  timeout: 15000, // Timeout 15 detik sesuai 03_API_COMMUNICATION.md
  headers: {
    'Content-Type': 'application/json',
  },
});

// Circuit Breaker & Retry Logic (03_API_COMMUNICATION.md)
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response && error.response.status >= 500);
  }
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors (03_API_COMMUNICATION.md)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;

    if (status === 401) {
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
    } else if (status === 403) {
      toast.error('Akses dilarang (403). Anda tidak memiliki izin.');
    } else if (status === 429) {
      toast.error('Terlalu banyak permintaan (429). Silakan tunggu sebentar.');
    } else if (status === 503) {
      // Circuit Breaker UI Feedback (03_API_COMMUNICATION.md)
      toast.error('Server sedang sibuk atau dalam pemeliharaan (Circuit Breaker)');
    } else if (status >= 500) {
      toast.error(`Kesalahan Server (${status}). Coba beberapa saat lagi.`);
    }

    return Promise.reject(error);
  }
);

// --- API V2 instance (untuk Normalization Preview & Analysis V2) ---
const resolveV2BaseURL = () => {
  const url = import.meta.env.VITE_API_URL;
  if (url) {
    // Ubah .../api/v1 → .../api/v2, jika tidak cocok, fallback ke .../api/v2
    if (url.endsWith('/api/v1') || url.endsWith('/api/v1/')) {
      return url.replace(/\/api\/v1\/?$/, '/api/v2');
    }
    if (url.includes('/api/v1/')) {
      return url.replace('/api/v1/', '/api/v2/');
    }
    return url.replace(/\/?$/, '/api/v2');
  }
  return '/api/v2';
};

const apiV2 = axios.create({
  baseURL: resolveV2BaseURL(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosRetry(apiV2, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response && error.response.status >= 500);
  }
});

apiV2.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiV2.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    if (status === 401) {
      toast.error('Akses ditolak pada API V2 (401).');
    } else if (status === 429) {
      toast.error('Terlalu banyak permintaan (API V2).');
    } else if (status === 503) {
      toast.error('API V2 sedang sibuk (Circuit Breaker).');
    }
    return Promise.reject(error);
  }
);

// --- V2.1 ANALYSIS PIPELINE ENDPOINTS ---
// (01_INTEGRATION_MAP.md & analysis_v2.py)

// Stage 0: Normalization Status (Menggunakan V2 Preview)
export const getNormalizationStatus = async (boardId, startTime, endTime) => {
  // Map ke POST /api/v2/normalization/preview
  // V2.3: Use startTime/endTime directly (ISO 8601) and camelCase payload
  const payload = {
    boardId: boardId,
    startTime: startTime,
    endTime: endTime,
    granularity: 'auto',
    fillGaps: true
  };
  
  const response = await apiV2.post(`/normalization/preview`, payload, {
    timeout: 60000
  });
  
  return response.data;
};

// Stage 0 (V2): Normalization Preview via Backend (api/v2/normalization/preview)
export const postNormalizationPreview = async (payload) => {
  // V2.3: Support camelCase for all fields as per Backend ConfigDict
  const response = await apiV2.post(`/normalization/preview`, payload);
  return response.data;
};

// Async Analysis Execution (Stage 1-7) - Menggunakan API V2
export const executeAnalysisAsync = async (payload) => {
  // payload: { boardId, startTime, endTime, granularity }
  // V2.3: Support camelCase for all fields as per Backend ConfigDict
  const { boardId, startTime, endTime, granularity } = payload;
  const response = await apiV2.post(
    `/analysis/${boardId}/pipeline-v21/async/`,
    null,
    {
      params: { startTime, endTime, granularity },
      timeout: 60000
    }
  );
  return response.data; // { task_id: '...' }
};

// Polling Task Status - Menggunakan API V2
export const getTaskStatus = async (taskId) => {
  const response = await apiV2.get(`/analysis/tasks/${taskId}/status/`);
  return response.data; // { status: 'SUCCESS'|'PENDING'|..., result: ... }
};

// --- AUTH & BOARDS ENDPOINTS ---
export const login = async (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    const response = await api.post('/auth/login/', params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    return response.data;
};

export const registerUser = async ({ username, password, fullName, role = 'teknisi' }) => {
    const payload = { username, password, fullName, role };
    const response = await api.post('/auth/register/', payload);
    return response.data;
};


export const getCurrentUser = async () => {
    const response = await api.get('/auth/me/');
    return response.data;
};

export const getDashboardSummary = async () => {
  const response = await api.get('/dashboard/summary/');
  return response.data;
};

export const getBoards = async (skip = 0, limit = 100) => {
  // Ensure skip and limit are numbers, even if called incorrectly (e.g. from an event handler)
  const s = typeof skip === 'number' ? skip : 0;
  const l = typeof limit === 'number' ? limit : 100;
  const response = await api.get(`/boards/?skip=${s}&limit=${l}`);
  return response.data;
};

export const createBoard = async (boardData) => {
  const response = await api.post('/boards/', boardData);
  return response.data;
};

export const updateBoard = async (boardId, boardData) => {
  const response = await api.put(`/boards/${boardId}/`, boardData);
  return response.data;
};

export const deleteBoard = async (boardId) => {
  const response = await api.delete(`/boards/${boardId}/`);
  return response.data;
};

export const getBoardStats = async (boardId) => {
    const response = await api.get(`/boards/${boardId}/stats/`);
    return response.data;
};

export const getDailyReports = async (boardId, limit = 30, startTime = null, endTime = null, granularity = 'day') => {
  let url = `/reports/daily/${boardId}/?granularity=${granularity}`;
  if (startTime && endTime) {
    url += `&startTime=${startTime}&endTime=${endTime}`;
  } else {
    url += `&limit=${limit}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getMonthlyReports = async (boardId, limit = 12, startTime = null, endTime = null, granularity = 'month') => {
  let url = `/reports/monthly/${boardId}/?granularity=${granularity}`;
  if (startTime && endTime) {
    url += `&startTime=${startTime}&endTime=${endTime}`;
  } else {
    url += `&limit=${limit}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getInterfaceReports = async (boardId, limit = 100, startTime = null, endTime = null) => {
  let url = `/reports/interface/${boardId}/?`;
  if (startTime && endTime) {
    url += `startTime=${startTime}&endTime=${endTime}`;
  } else {
    url += `limit=${limit}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getPPPoEReports = async (boardId, limit = 100, startTime = null, endTime = null) => {
  let url = `/reports/pppoe/${boardId}/?`;
  if (startTime && endTime) {
    url += `startTime=${startTime}&endTime=${endTime}`;
  } else {
    url += `limit=${limit}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getHotspotReports = async (boardId, limit = 100, startTime = null, endTime = null) => {
  let url = `/reports/hotspot/${boardId}/?`;
  if (startTime && endTime) {
    url += `startTime=${startTime}&endTime=${endTime}`;
  } else {
    url += `limit=${limit}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getClientStats = async (boardId, limit = 200, startTime = null, endTime = null) => {
  let url = `/reports/clients/${boardId}/?`;
  if (startTime && endTime) {
    url += `startTime=${startTime}&endTime=${endTime}`;
  } else {
    url += `limit=${limit}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const exportReport = async (boardId, type, format, limit = 30, startTime = null, endTime = null) => {
  let url = `/reports/export/${boardId}/?type=${type}&format=${format}&limit=${limit}`;
  if (startTime && endTime) {
    url += `&startTime=${startTime}&endTime=${endTime}`;
  }

  // For file download, we need 'blob' response type
  const response = await api.get(url, { responseType: 'blob' });
  return response;
};

export const getAuditLogs = async (skip = 0, limit = 100, userId = null, action = null, startTime = null, endTime = null) => {
  let url = `/audit/?skip=${skip}&limit=${limit}`;
  if (userId) url += `&userId=${userId}`;
  if (action) url += `&action=${action}`;
  if (startTime) url += `&startTime=${startTime}`;
  if (endTime) url += `&endTime=${endTime}`;
  
  const response = await api.get(url);
  return response.data;
};

export const triggerAggregation = async (startTime, endTime) => {
    let url = `/reports/trigger-aggregation/`;
    if (startTime && endTime) {
        url += `?startTime=${startTime}&endTime=${endTime}`;
    }
    const response = await api.post(url);
    return response.data;
};

// User Management APIs
export const getUsers = async (skip = 0, limit = 100, userId = null) => {
    let url = `/users/?skip=${skip}&limit=${limit}`;
    if (userId) url += `&userId=${userId}`;
    const response = await api.get(url);
    return response.data;
};

export const createUser = async (userData) => {
    const response = await api.post('/users/', userData);
    return response.data;
};

export const updateUser = async (userId, userData) => {
    const response = await api.put(`/users/${userId}/`, userData);
    return response.data;
};

export const deleteUser = async (userId) => {
    const response = await api.delete(`/users/${userId}/`);
    return response.data;
};

export const getHeavyAnalysis = async (boardId, days = 30, startTime = null, endTime = null, granularity = 'day') => {
  let url = `/analysis/${boardId}/heavy/?granularity=${granularity}`;
  if (startTime && endTime) {
    url += `&startTime=${startTime}&endTime=${endTime}`;
  } else {
    url += `&days=${days}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getAnalysisSummary = async (boardId) => {
  const response = await api.get(`/analysis/${boardId}/summary/`);
  return response.data;
};

export const getTimeAggregate = async (boardId, { startTime, endTime, granularity = 'auto', metric = 'download_mbps', agg = 'avg' }) => {
  const params = new URLSearchParams();
  params.set('startTime', startTime);
  params.set('endTime', endTime);
  params.set('granularity', granularity);
  params.set('metric', metric);
  params.set('agg', agg);
  const response = await api.get(`/analysis/${boardId}/aggregate/?${params.toString()}`);
  return response.data;
};

export const getInterfaceAnalysis = async (boardId, days = 30, pivotAgg = 'sum', startTime = null, endTime = null, granularity = 'day') => {
  let url = `/analysis/${boardId}/interfaces/?pivotAgg=${pivotAgg}&granularity=${granularity}`;
  if (startTime && endTime) {
    url += `&startTime=${startTime}&endTime=${endTime}`;
  } else {
    url += `&days=${days}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getPPPoEAnalysis = async (boardId, days = 30, pivotAgg = 'sum', startTime = null, endTime = null, granularity = 'day') => {
  let url = `/analysis/${boardId}/pppoe/?pivotAgg=${pivotAgg}&granularity=${granularity}`;
  if (startTime && endTime) {
    url += `&startTime=${startTime}&endTime=${endTime}`;
  } else {
    url += `&days=${days}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getHotspotAnalysis = async (boardId, days = 30, pivotAgg = 'sum', startTime = null, endTime = null, granularity = 'day') => {
  let url = `/analysis/${boardId}/hotspot/?pivotAgg=${pivotAgg}&granularity=${granularity}`;
  if (startTime && endTime) {
    url += `&startTime=${startTime}&endTime=${endTime}`;
  } else {
    url += `&days=${days}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getClientsAnalysis = async (boardId, days = 30, pivotAgg = 'max', startTime = null, endTime = null, granularity = 'day') => {
  let url = `/analysis/${boardId}/clients/?pivotAgg=${pivotAgg}&granularity=${granularity}`;
  if (startTime && endTime) {
    url += `&startTime=${startTime}&endTime=${endTime}`;
  } else {
    url += `&days=${days}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getInterfacePivot = async (boardId, days = 30, pivotAgg = 'sum', startTime = null, endTime = null, granularity = 'day') => {
  let url = `/analysis/${boardId}/interfaces/pivot/?days=${days}&pivotAgg=${pivotAgg}&granularity=${granularity}`;
  if (startTime && endTime) url += `&startTime=${startTime}&endTime=${endTime}`;
  const response = await api.get(url);
  return response.data;
};

export const getPPPoEPivot = async (boardId, days = 30, pivotAgg = 'sum', startTime = null, endTime = null, granularity = 'day') => {
  let url = `/analysis/${boardId}/pppoe/pivot/?days=${days}&pivotAgg=${pivotAgg}&granularity=${granularity}`;
  if (startTime && endTime) url += `&startTime=${startTime}&endTime=${endTime}`;
  const response = await api.get(url);
  return response.data;
};

export const getHotspotPivot = async (boardId, days = 30, pivotAgg = 'sum', startTime = null, endTime = null, granularity = 'day') => {
  let url = `/analysis/${boardId}/hotspot/pivot/?days=${days}&pivotAgg=${pivotAgg}&granularity=${granularity}`;
  if (startTime && endTime) url += `&startTime=${startTime}&endTime=${endTime}`;
  const response = await api.get(url);
  return response.data;
};

export const getInterfaceForecast = async (boardId, interfaceName, days = 30) => {
  const response = await api.get(`/analysis/${boardId}/forecast/interface/${interfaceName}?days=${days}`);
  return response.data;
};

// VPN Management APIs
export const getVPNProfiles = async (boardId) => {
    const response = await api.get(`/boards/${boardId}/vpn/`);
    return response.data;
};

export const createVPNProfile = async (boardId, vpnData) => {
    const response = await api.post(`/boards/${boardId}/vpn/`, vpnData);
    return response.data;
};

export const deleteVPNProfile = async (boardId, vpnId) => {
    const response = await api.delete(`/boards/${boardId}/vpn/${vpnId}/`);
    return response.data;
};

// Backup Management APIs
export const getBackups = async (boardId) => {
    const response = await api.get(`/backups/${boardId}/`);
    return response.data;
};

export const createBackup = async (boardId, fileName) => {
    const response = await api.post('/backups/', { boardId, fileName });
    return response.data;
};

export const restoreBackup = async (backupId) => {
    const response = await api.post(`/backups/${backupId}/restore/`);
    return response.data;
};

// Interface Management APIs (Phase 5)
export const getInterfaces = async (boardId, skip = 0, limit = 100, search = '', type = 'all') => {
    const params = { skip, limit };
    if (search) params.search = search;
    if (type && type !== 'all') params.interfaceType = type;
    const response = await api.get(`/boards/${boardId}/interfaces/`, { params });
    return response.data;
};

export const updateInterface = async (boardId, interfaceName, configData) => {
    const response = await api.put(`/boards/${boardId}/interfaces/${interfaceName}/`, configData);
    return response.data;
};

export const getInterfaceTraffic = async (boardId, interfaceName) => {
    const response = await api.get(`/boards/${boardId}/interfaces/${interfaceName}/monitor`);
    return response.data;
};

export const toggleInterface = async (boardId, interfaceName, action) => {
    const response = await api.post(`/boards/${boardId}/interfaces/${interfaceName}/toggle`, { action });
    return response.data;
};

// Router Event Logs (Phase 5)
export const getBoardEvents = async (boardId, limit = 50, startTime = null, endTime = null) => {
    let url = `/boards/${boardId}/events/?limit=${limit}`;
    if (startTime) url += `&startTime=${startTime}`;
    if (endTime) url += `&endTime=${endTime}`;
    const response = await api.get(url);
    return response.data;
};

// Client Monitoring APIs (Phase 6)
export const getPPPoEUsers = async (boardId) => {
    const response = await api.get(`/boards/${boardId}/pppoe/`);
    return response.data;
};

export const getHotspotUsers = async (boardId) => {
    const response = await api.get(`/boards/${boardId}/hotspot/`);
    return response.data;
};

export const kickPPPoEUser = async (boardId, username) => {
    const response = await api.delete(`/boards/${boardId}/pppoe/${username}/`);
    return response.data;
};

export const kickHotspotUser = async (boardId, username) => {
    const response = await api.delete(`/boards/${boardId}/hotspot/${username}/`);
    return response.data;
};

// Automation & ZTP APIs (Phase 7)
export const getAutomationJobs = async (skip = 0, limit = 50) => {
    const response = await api.get(`/automation/jobs/?skip=${skip}&limit=${limit}`);
    return response.data;
};

export const createAutomationJob = async (jobData) => {
    const response = await api.post('/automation/jobs/', jobData);
    return response.data;
};

export const getAutomationLogs = async (jobId) => {
    const response = await api.get(`/automation/logs/${jobId}/`);
    return response.data;
};

export const getZTPQueue = async (skip = 0, limit = 50) => {
    const response = await api.get(`/ztp/queue/?skip=${skip}&limit=${limit}`);
    return response.data;
};

export const approveZTPDevice = async (ztpId, configData) => {
    const response = await api.post(`/ztp/approve/${ztpId}/`, configData);
    return response.data;
};

export const pingBoard = async (boardId) => {
    const response = await api.post(`/boards/${boardId}/ping/`);
    return response.data;
};

export const rejectZTPDevice = async (ztpId) => {
    const response = await api.post(`/ztp/reject/${ztpId}/`);
    return response.data;
};

// Developer Console APIs (Phase 9)
export const getSystemLogs = async (lines = 100) => {
    const response = await api.get(`/developer/logs/?lines=${lines}`);
    return response.data;
};

export const executeRawSQL = async (query) => {
    const response = await api.post('/developer/sql/', { query });
    return response.data;
};

export default api;
