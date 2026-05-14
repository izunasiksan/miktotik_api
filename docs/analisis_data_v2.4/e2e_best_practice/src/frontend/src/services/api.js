// UPDATE 2.4 - E2E Best Practice Frontend Migration
import axios from 'axios';
import axiosRetry from 'axios-retry';
import toast from 'react-hot-toast';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle errors (03_API_COMMUNICATION.md)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response ? error.response.status : null;
    const url = originalRequest?.url || '';

    // Comprehensive Error Logging (Audit Point 5)
    console.error(`[API V1 ERROR] ${status} on ${url}`, {
      message: error.message,
      data: error.response?.data,
      stack: error.stack
    });

    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken && !url.includes('/auth/refresh/')) {
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Use axios directly for refresh to avoid interceptor recursion
          const response = await axios.post(`${baseURL}/auth/refresh/`, { refreshToken });
          const { access_token, refresh_token } = response.data;

          localStorage.setItem('token', access_token);
          if (refresh_token) localStorage.setItem('refresh_token', refresh_token);

          // Update both instances
          api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          if (typeof apiV2 !== 'undefined') {
            apiV2.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          }
          originalRequest.headers.Authorization = `Bearer ${access_token}`;

          processQueue(null, access_token);
          isRefreshing = false;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          
          // Refresh failed, logout
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          if (!window.location.pathname.includes('/login')) {
            toast.error('Sesi berakhir. Silakan login kembali.');
            setTimeout(() => { window.location.href = '/login'; }, 1200);
          }
          return Promise.reject(refreshError);
        }
      }

      // If no refresh token or it's the me request that failed
      const isMeRequest = url.includes('/auth/me/');
      if (isMeRequest) {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        toast.error('Sesi berakhir. Silakan login kembali.');
        setTimeout(() => { window.location.href = '/login'; }, 1200);
      }
    } else if (status === 403) {
      toast.error('Akses dilarang (403). Anda tidak memiliki izin.');
    } else if (status === 429) {
      toast.error('Terlalu banyak permintaan (429). Silakan tunggu sebentar.');
    } else if (status === 503) {
      // Circuit Breaker UI Feedback (03_API_COMMUNICATION.md)
      toast.error('Server sedang sibuk (Circuit Breaker). Silakan tunggu 30 detik sebelum mencoba lagi.', { duration: 8000 });
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
  // Jika VITE_API_URL tidak ada, gunakan proxy relative path
  return '/api/v2';
};

const apiV2 = axios.create({
  baseURL: resolveV2BaseURL(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Circuit Breaker & Retry Logic for API V2
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
  async (error) => {
    const originalRequest = error.config;
    const status = error.response ? error.response.status : null;
    const url = originalRequest?.url || '';
    
    // Comprehensive Error Logging (Audit Point 5)
    console.error(`[API V2 ERROR] ${status} on ${url}`, {
      message: error.message,
      data: error.response?.data,
      stack: error.stack
    });

    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiV2(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken && !url.includes('/auth/refresh/')) {
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Use baseURL (V1) for refresh as the endpoint is in V1 auth
          const response = await axios.post(`${baseURL}/auth/refresh/`, { refreshToken });
          const { access_token, refresh_token } = response.data;

          localStorage.setItem('token', access_token);
          if (refresh_token) localStorage.setItem('refresh_token', refresh_token);

          // Update both instances
          api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          apiV2.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          originalRequest.headers.Authorization = `Bearer ${access_token}`;

          processQueue(null, access_token);
          isRefreshing = false;
          return apiV2(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          if (!window.location.pathname.includes('/login')) {
            toast.error('Sesi API V2 berakhir. Silakan login kembali.');
            setTimeout(() => { window.location.href = '/login'; }, 1200);
          }
          return Promise.reject(refreshError);
        }
      }
    } else if (status === 403) {
      toast.error('Akses API V2 dilarang (403).');
    } else if (status === 429) {
      toast.error('Terlalu banyak permintaan ke API V2 (429).');
    } else if (status === 503) {
      toast.error('API V2 sedang sibuk (Circuit Breaker). Silakan tunggu 30 detik.', { duration: 8000 });
    } else if (status >= 500) {
      toast.error(`Kesalahan Server API V2 (${status}).`);
    }

    return Promise.reject(error);
  }
);

// --- V2.1 ANALYSIS PIPELINE ENDPOINTS ---
// (01_INTEGRATION_MAP.md & analysis_v2.py)

// Stage 0: Normalization Status (Menggunakan V2 Preview)
export const getNormalizationStatus = async (boardId, startTime, endTime, interfaceName = null) => {
  // Map ke POST /api/v2/normalization/preview
  // V2.3: Use startTime/endTime directly (ISO 8601) and camelCase payload
  const payload = {
    boardId: boardId,
    interfaceName: interfaceName, // V2.4.1 Added interfaceName support
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
  const body = {
    boardId: payload.boardId,
    interfaceName: payload.interfaceName,
    startTime: payload.startTime,
    endTime: payload.endTime,
    days: payload.days,
    granularity: payload.granularity,
    agg: payload.agg,
    bucketSource: payload.bucketSource,
    usageUnit: payload.usageUnit,
    fillGaps: payload.fillGaps
  };
  const response = await apiV2.post(`/normalization/preview`, body);
  return response.data;
};

// Stage 0 (V2): Get Source Table Detail (api/v2/normalization/source-detail)
export const getSourceTableDetail = async (payload) => {
  const body = {
    boardId: payload.boardId,
    tableName: payload.tableName,
    startTime: payload.startTime,
    endTime: payload.endTime,
    days: payload.days,
    limit: payload.limit,
    offset: payload.offset
  };
  const response = await apiV2.post(`/normalization/source-detail`, body);
  return response.data;
};

// Stage 0 (V2.4.1): Get Latest Data Time (api/v2/normalization/latest-data-time/{boardId})
export const getLatestDataTime = async (boardId) => {
  if (!boardId) {
    return null;
  }
  const response = await apiV2.get(`/normalization/latest-data-time/${boardId}`);
  return response.data;
};

// Async Analysis Execution (Stage 1-7) - Menggunakan API V2
export const executeAnalysisAsync = async (payload) => {
  // payload: { boardId, startTime, endTime, granularity, interfaceName }
  // V2.4.1: Support interfaceName and camelCase
  const { boardId, startTime, endTime, granularity, interfaceName } = payload;
  const response = await apiV2.post(
    `/analysis/${boardId}/pipeline-v21/async/`,
    null,
    {
      params: { 
        startTime, 
        endTime, 
        granularity,
        interfaceName: interfaceName || undefined // Pass only if not null
      },
      timeout: 60000
    }
  );
  return response.data; // { taskId: '...' }
};

// Sync Analysis Execution (Stage 1-7) tanpa Celery/polling
export const executeAnalysisSync = async (payload) => {
  const { boardId, startTime, endTime, granularity, interfaceName } = payload;
  const response = await apiV2.get(
    `/analysis/${boardId}/pipeline-v21/`,
    {
      params: {
        startTime,
        endTime,
        granularity,
        interfaceName: interfaceName || undefined
      },
      timeout: 600000
    }
  );
  return response.data;
};

// Polling Task Status - Menggunakan API V2
export const getTaskStatus = async (taskId) => {
  const response = await apiV2.get(`/analysis/tasks/${taskId}/status/`);
  return response.data; // { status: 'SUCCESS'|'PENDING'|..., result: ... }
};

// Master Data APIs (3NF V2.4)
export const getMasterSites = async () => {
    const response = await api.get('/boards/sites/');
    return response.data;
};

export const getMasterModels = async () => {
    const response = await api.get('/boards/models/');
    return response.data;
};

export const getMasterRoles = async () => {
    const response = await api.get('/users/roles/');
    return response.data;
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

export const registerUser = async ({ username, password, fullName, roleId = 2 }) => {
    const payload = { username, password, fullName, roleId };
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

export const getResourceReports = async (boardId, limit = 30, startTime = null, endTime = null) => {
  let url = `/reports/resource-stats/${boardId}/?`;
  if (startTime && endTime) {
    url += `startTime=${startTime}&endTime=${endTime}`;
  } else {
    url += `limit=${limit}`;
  }
  const response = await api.get(url);
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

export const getSpeedStats = async (boardId, limit = 30, startTime = null, endTime = null) => {
  let url = `/reports/speed-stats/${boardId}/?`;
  if (startTime && endTime) {
    url += `startTime=${startTime}&endTime=${endTime}`;
  } else {
    url += `limit=${limit}`;
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
    try {
        const response = await api.get(`/boards/${boardId}/interfaces/`, {
            params,
            timeout: 30000,
        });
        // V2.4.1 Fix: Ensure we return an object even if response.data is null/undefined
        return response.data || { data: [], total: 0, skip, limit };
    } catch (error) {
        const isTimeout = error?.code === 'ECONNABORTED' || String(error?.message || '').toLowerCase().includes('timeout');
        // Fallback for UI components expecting the standard interface structure
        return {
            data: [],
            total: 0,
            skip,
            limit,
            status: isTimeout ? 'TIMEOUT' : undefined,
            error: isTimeout ? 'Timeout while fetching interfaces from API.' : error.message,
        };
    }
};

export const getAnalysisInterfaces = async (boardId, { activeOnly = true, primaryOnly = false, q = '' } = {}) => {
  if (!boardId) return [];
  const params = {};
  if (activeOnly) params.active = true;
  if (primaryOnly) params.primary = true;
  if (q) params.q = q;
  const response = await apiV2.get(`/analysis/${boardId}/interfaces`, {
    params,
    timeout: 30000,
  });
  return response.data || [];
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
    const response = await api.post(`/boards/${boardId}/interfaces/${interfaceName}/toggle/`, { action });
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
    const response = await api.get(`/automation/ztp/queue/?skip=${skip}&limit=${limit}`);
    return response.data;
};

export const approveZTPDevice = async (ztpId, configData) => {
    const response = await api.post(`/automation/ztp/approve/${ztpId}/`, configData);
    return response.data;
};

export const rejectZTPDevice = async (ztpId) => {
    const response = await api.post(`/automation/ztp/reject/${ztpId}/`);
    return response.data;
};

export const registerZTPDevice = async (ztpData) => {
    const response = await api.post('/automation/ztp/register/', ztpData);
    return response.data;
};

export const pingBoard = async (boardId) => {
    const response = await api.post(`/boards/${boardId}/ping/`);
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
