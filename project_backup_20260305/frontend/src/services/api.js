import axios from 'axios';
import toast from 'react-hot-toast';

const baseURL = import.meta.env.DEV
  ? '/api/v1'
  : (import.meta.env.VITE_API_URL || '/api/v1');

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
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

// Response interceptor to handle 401
api.interceptors.response.use(
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
  }
);

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

export const registerUser = async ({ username, password, full_name, role = 'teknisi' }) => {
    const payload = { username, password, full_name, role };
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

export const getDailyReports = async (boardId, limit = 30, startDate = null, endDate = null, granularity = 'day') => {
  let url = `/reports/daily/${boardId}/?granularity=${granularity}`;
  if (startDate && endDate) {
    url += `&start_date=${startDate}&end_date=${endDate}`;
  } else {
    url += `&limit=${limit}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getMonthlyReports = async (boardId, limit = 12, startDate = null, endDate = null, granularity = 'month') => {
  let url = `/reports/monthly/${boardId}/?granularity=${granularity}`;
  if (startDate && endDate) {
    url += `&start_date=${startDate}&end_date=${endDate}`;
  } else {
    url += `&limit=${limit}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getInterfaceReports = async (boardId, limit = 100, startDate = null, endDate = null) => {
  let url = `/reports/interface/${boardId}/?`;
  if (startDate && endDate) {
    url += `start_date=${startDate}&end_date=${endDate}`;
  } else {
    url += `limit=${limit}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getPPPoEReports = async (boardId, limit = 100, startDate = null, endDate = null) => {
  let url = `/reports/pppoe/${boardId}/?`;
  if (startDate && endDate) {
    url += `start_date=${startDate}&end_date=${endDate}`;
  } else {
    url += `limit=${limit}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getHotspotReports = async (boardId, limit = 100, startDate = null, endDate = null) => {
  let url = `/reports/hotspot/${boardId}/?`;
  if (startDate && endDate) {
    url += `start_date=${startDate}&end_date=${endDate}`;
  } else {
    url += `limit=${limit}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getClientStats = async (boardId, limit = 200, startDate = null, endDate = null) => {
  let url = `/reports/clients/${boardId}/?`;
  if (startDate && endDate) {
    url += `start_date=${startDate}&end_date=${endDate}`;
  } else {
    url += `limit=${limit}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const exportReport = async (boardId, type, format, limit = 30, startDate = null, endDate = null) => {
  let url = `/reports/export/${boardId}/?type=${type}&format=${format}&limit=${limit}`;
  if (startDate && endDate) {
    url += `&start_date=${startDate}&end_date=${endDate}`;
  }

  // For file download, we need 'blob' response type
  const response = await api.get(url, { responseType: 'blob' });
  return response;
};

export const getAuditLogs = async (skip = 0, limit = 100, userId = null, action = null) => {
  let url = `/audit/?skip=${skip}&limit=${limit}`;
  if (userId) url += `&user_id=${userId}`;
  if (action) url += `&action=${action}`;
  
  const response = await api.get(url);
  return response.data;
};

export const triggerAggregation = async (targetDate) => {
    const response = await api.post(`/reports/trigger-aggregation/?target_date=${targetDate}`);
    return response.data;
};

// User Management APIs
export const getUsers = async (skip = 0, limit = 100) => {
    const response = await api.get(`/users/?skip=${skip}&limit=${limit}`);
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

export const getHeavyAnalysis = async (boardId, days = 30, startDate = null, endDate = null, granularity = 'day') => {
  let url = `/analysis/${boardId}/heavy/?granularity=${granularity}`;
  if (startDate && endDate) {
    url += `&start_date=${startDate}&end_date=${endDate}`;
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
  params.set('start_time', startTime);
  params.set('end_time', endTime);
  params.set('granularity', granularity);
  params.set('metric', metric);
  params.set('agg', agg);
  const response = await api.get(`/analysis/${boardId}/aggregate/?${params.toString()}`);
  return response.data;
};

export const getInterfaceAnalysis = async (boardId, days = 30, pivotAgg = 'sum', startDate = null, endDate = null, granularity = 'day') => {
  let url = `/analysis/${boardId}/interfaces/?pivot_agg=${pivotAgg}&granularity=${granularity}`;
  if (startDate && endDate) {
    url += `&start_date=${startDate}&end_date=${endDate}`;
  } else {
    url += `&days=${days}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getPPPoEAnalysis = async (boardId, days = 30, pivotAgg = 'sum', startDate = null, endDate = null, granularity = 'day') => {
  let url = `/analysis/${boardId}/pppoe/?pivot_agg=${pivotAgg}&granularity=${granularity}`;
  if (startDate && endDate) {
    url += `&start_date=${startDate}&end_date=${endDate}`;
  } else {
    url += `&days=${days}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getHotspotAnalysis = async (boardId, days = 30, pivotAgg = 'sum', startDate = null, endDate = null, granularity = 'day') => {
  let url = `/analysis/${boardId}/hotspot/?pivot_agg=${pivotAgg}&granularity=${granularity}`;
  if (startDate && endDate) {
    url += `&start_date=${startDate}&end_date=${endDate}`;
  } else {
    url += `&days=${days}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getClientsAnalysis = async (boardId, days = 30, pivotAgg = 'max', startDate = null, endDate = null, granularity = 'day') => {
  let url = `/analysis/${boardId}/clients/?pivot_agg=${pivotAgg}&granularity=${granularity}`;
  if (startDate && endDate) {
    url += `&start_date=${startDate}&end_date=${endDate}`;
  } else {
    url += `&days=${days}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getInterfacePivot = async (boardId, days = 30, pivotAgg = 'sum', startDate = null, endDate = null, granularity = 'day') => {
  let url = `/analysis/${boardId}/interfaces/pivot/?days=${days}&pivot_agg=${pivotAgg}&granularity=${granularity}`;
  if (startDate && endDate) url += `&start_date=${startDate}&end_date=${endDate}`;
  const response = await api.get(url);
  return response.data;
};

export const getPPPoEPivot = async (boardId, days = 30, pivotAgg = 'sum', startDate = null, endDate = null, granularity = 'day') => {
  let url = `/analysis/${boardId}/pppoe/pivot/?days=${days}&pivot_agg=${pivotAgg}&granularity=${granularity}`;
  if (startDate && endDate) url += `&start_date=${startDate}&end_date=${endDate}`;
  const response = await api.get(url);
  return response.data;
};

export const getHotspotPivot = async (boardId, days = 30, pivotAgg = 'sum', startDate = null, endDate = null, granularity = 'day') => {
  let url = `/analysis/${boardId}/hotspot/pivot/?days=${days}&pivot_agg=${pivotAgg}&granularity=${granularity}`;
  if (startDate && endDate) url += `&start_date=${startDate}&end_date=${endDate}`;
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
    const response = await api.post('/backups/', { board_id: boardId, file_name: fileName });
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
    if (type && type !== 'all') params.interface_type = type;
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
export const getBoardEvents = async (boardId, limit = 50) => {
    const response = await api.get(`/boards/${boardId}/events/?limit=${limit}`);
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
