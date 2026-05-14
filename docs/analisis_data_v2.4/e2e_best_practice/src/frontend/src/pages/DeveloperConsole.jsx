import React, { useState, useEffect, useRef } from 'react';
import useAuth from '../context/useAuth.js';
import api, { executeRawSQL } from '../services/api.js'; 
import { Link } from 'react-router-dom';
import { Terminal, Database, Server, Shield, Activity, Play, Code, Lock, FileText, PlayCircle, BarChart2, ArrowLeft } from 'lucide-react';

const DeveloperConsole = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('system');
  
  if (!user || (user.role !== 'admin' && user.role !== 'developer')) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-red-600">
        <Shield className="w-16 h-16 mb-4" />
        <h1 className="text-3xl font-bold">ACCESS DENIED</h1>
        <p className="text-gray-600 mt-2">This area is restricted to Super Users only.</p>
        <p className="text-xs text-gray-400 mt-8">Phase 9: Developer Console Protection</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-mono">
      <div className="border-b border-gray-700 bg-gray-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors" title="Back to Dashboard">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="h-6 w-px bg-gray-600 mx-2"></div>
          <Terminal className="w-6 h-6 text-green-500" />
          <h1 className="text-xl font-bold tracking-wider text-green-400">DEV_CONSOLE_v1.0</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>USER: {user.username}</span>
          <span className="bg-red-900 text-red-200 px-2 py-0.5 rounded text-xs uppercase">{user.role}</span>
        </div>
      </div>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 space-y-2 overflow-y-auto">
          <NavButton 
            active={activeTab === 'system'} 
            onClick={() => setActiveTab('system')} 
            icon={<Server className="w-4 h-4" />} 
            label="System Internals" 
          />
          <NavButton 
            active={activeTab === 'api'} 
            onClick={() => setActiveTab('api')} 
            icon={<Code className="w-4 h-4" />} 
            label="API Tester" 
          />
          <NavButton 
            active={activeTab === 'db'} 
            onClick={() => setActiveTab('db')} 
            icon={<Database className="w-4 h-4" />} 
            label="Database Viewer" 
          />
          <NavButton 
            active={activeTab === 'sql'} 
            onClick={() => setActiveTab('sql')} 
            icon={<PlayCircle className="w-4 h-4" />} 
            label="SQL Runner" 
          />
          <NavButton 
            active={activeTab === 'logs'} 
            onClick={() => setActiveTab('logs')} 
            icon={<FileText className="w-4 h-4" />} 
            label="Server Logs" 
          />
          <NavButton 
            active={activeTab === 'metrics'} 
            onClick={() => setActiveTab('metrics')} 
            icon={<BarChart2 className="w-4 h-4" />} 
            label="Prometheus Metrics" 
          />
          <NavButton 
            active={activeTab === 'env'} 
            onClick={() => setActiveTab('env')} 
            icon={<Lock className="w-4 h-4" />} 
            label="Environment Vars" 
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {activeTab === 'system' && <SystemInternals />}
          {activeTab === 'api' && <ApiTester />}
          {activeTab === 'db' && <DatabaseViewer />}
          {activeTab === 'sql' && <SQLRunner />}
          {activeTab === 'logs' && <ServerLogs />}
          {activeTab === 'metrics' && <MetricsViewer />}
          {activeTab === 'env' && <EnvViewer />}
        </div>
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm transition-colors ${
      active ? 'bg-gray-700 text-green-400 border-l-4 border-green-500' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
    }`}
  >
    {icon}
    {label}
  </button>
);

const SystemInternals = () => {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    const fetchStats = async () => {
       try {
         const res = await api.get('/dashboard/summary/');
         setStats(res.data);
       } catch (e) {
         console.error(e);
       }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-green-400 mb-6 border-b border-gray-700 pb-2">System Diagnostics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="API Status" value="ONLINE" status="good" />
        <MetricCard label="DB Connection" value="CONNECTED" status="good" />
        <MetricCard 
          label="Redis Cache" 
          value={stats?.redisStatus || "UNKNOWN"} 
          status={stats?.redisStatus === "ONLINE" ? "good" : "error"} 
        />
      </div>

      <div className="bg-gray-800 rounded p-4 border border-gray-700">
        <h3 className="text-lg font-bold text-gray-300 mb-4">Raw Dashboard Stats</h3>
        <pre className="bg-black p-4 rounded text-xs text-green-500 overflow-auto max-h-96">
          {stats ? JSON.stringify(stats, null, 2) : 'Loading...'}
        </pre>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, status }) => {
  const color = status === 'good' ? 'text-green-400' : status === 'warning' ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="bg-gray-800 p-4 rounded border border-gray-700">
      <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
};

const ApiTester = () => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('/boards');
  const [body, setBody] = useState('{}');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const execute = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const config = {
        method,
        url,
        data: method !== 'GET' ? JSON.parse(body) : undefined,
      };
      const res = await api(config);
      setResponse({
        status: res.status,
        headers: res.headers,
        data: res.data
      });
    } catch (err) {
      setResponse({
        status: err.response?.status || 'Error',
        data: err.response?.data || err.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-green-400 mb-6 border-b border-gray-700 pb-2">API Endpoint Tester</h2>
      
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-2">
          <label htmlFor="api-method-select" className="sr-only">HTTP Method</label>
          <select 
            id="api-method-select"
            name="api-method-select"
            value={method} 
            onChange={(e) => setMethod(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
        </div>
        <div className="col-span-8">
          <label htmlFor="api-url-input" className="sr-only">API Endpoint URL</label>
          <input 
            id="api-url-input"
            name="api-url-input"
            type="text" 
            value={url} 
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/endpoint"
            className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded focus:ring-2 focus:ring-green-500 outline-none font-mono"
          />
        </div>
        <div className="col-span-2">
          <button 
            onClick={execute}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded font-bold flex items-center justify-center gap-2"
          >
            {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            RUN
          </button>
        </div>
      </div>

      {method !== 'GET' && (
        <div>
          <label htmlFor="api-body-textarea" className="block text-gray-400 text-xs mb-1">Request Body (JSON)</label>
          <textarea 
            id="api-body-textarea"
            name="api-body-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded font-mono h-32 focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
      )}

      {response && (
        <div className="bg-gray-800 border border-gray-700 rounded overflow-hidden">
          <div className="bg-gray-700 px-4 py-2 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-300">RESPONSE</span>
            <span className={`text-xs font-bold px-2 py-1 rounded ${response.status >= 200 && response.status < 300 ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
              Status: {response.status}
            </span>
          </div>
          <pre className="p-4 overflow-auto max-h-96 text-xs text-green-400">
            {JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

const DatabaseViewer = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'pivot'

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await api.get('/developer/db/tables/');
        if (res.data.status === 'success') {
          setTables(res.data.tables);
        }
      } catch (err) {
        console.error("Failed to fetch tables:", err);
      }
    };
    fetchTables();
  }, []);

  const fetchTableData = async (tableName) => {
    setLoading(true);
    setError(null);
    setSelectedTable(tableName);
    try {
      const res = await api.get(`/developer/db/table/${tableName}/`);
      if (res.data.status === 'success') {
        setTableData(res.data);
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-700 pb-2">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-green-400">Raw Database Viewer</h2>
          {selectedTable && (
            <div className="flex bg-gray-900 p-1 rounded border border-gray-700">
              <button 
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs rounded transition-colors ${viewMode === 'table' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Table View
              </button>
              <button 
                onClick={() => setViewMode('pivot')}
                className={`px-3 py-1 text-xs rounded transition-colors ${viewMode === 'pivot' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Pivot (Vertical)
              </button>
            </div>
          )}
        </div>
        {selectedTable && (
          <button 
            onClick={() => {setSelectedTable(null); setTableData(null);}}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Tables
          </button>
        )}
      </div>

      {!selectedTable ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div 
              key={table} 
              onClick={() => fetchTableData(table)}
              className="bg-gray-800 p-4 rounded border border-gray-700 hover:border-green-500 cursor-pointer transition-colors group"
            >
              <Database className="w-8 h-8 text-gray-500 mb-2 group-hover:text-green-500" />
              <h3 className="font-bold text-gray-200 truncate" title={table}>{table}</h3>
              <p className="text-xs text-gray-500">View Raw Data</p>
            </div>
          ))}
          {tables.length === 0 && <p className="text-gray-500 italic col-span-4">Loading tables...</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-green-500" />
              Table: <span className="text-green-400">{selectedTable}</span>
            </h3>
            {tableData && (
              <span className="text-xs text-gray-400">Total Records: {tableData.total_count}</span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Activity className="w-8 h-8 text-green-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-900/50 border border-red-700 p-4 rounded text-red-200 font-mono text-sm">
              ERROR: {error}
            </div>
          ) : tableData && (
            <div className="space-y-6">
              {viewMode === 'table' ? (
                <div className="bg-gray-800 border border-gray-700 rounded overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-gray-900 text-green-400 border-b border-gray-700">
                        <tr>
                          {tableData.columns.map((col) => (
                            <th key={col} className="px-4 py-2 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700 text-gray-300">
                        {tableData.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-700">
                            {tableData.columns.map((col) => (
                              <td key={col} className="px-4 py-2 whitespace-nowrap max-w-xs truncate">
                                <ValueFormatter value={row[col]} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {tableData.rows.map((row, idx) => (
                    <div key={idx} className="bg-gray-800 border border-gray-700 rounded overflow-hidden">
                      <div className="bg-gray-900 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                        <span className="text-xs font-bold text-green-500">RECORD #{idx + 1}</span>
                      </div>
                      <div className="p-4 font-mono text-xs space-y-2">
                        {tableData.columns.map((col) => (
                          <div key={col} className="flex border-b border-gray-700/50 pb-1 last:border-0">
                            <span className="w-1/3 text-gray-500 truncate pr-2">{col}</span>
                            <span className="w-2/3 text-gray-300 break-all">
                              <ValueFormatter value={row[col]} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {tableData.rows.length === 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded p-8 text-center text-gray-500 italic">
                  Table is empty
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="bg-gray-800 p-4 rounded border border-gray-700 mt-6">
        <div className="flex items-center gap-2 text-yellow-500 mb-2">
            <Shield className="w-5 h-5" />
            <span className="font-bold">Security Notice</span>
        </div>
        <p className="text-sm text-gray-400">
            This view provides direct access to raw database tables. For data safety, write operations are restricted to the SQL Runner or standard application modules.
        </p>
      </div>
    </div>
  );
};

const ValueFormatter = ({ value }) => {
  if (value === null) return <span className="text-gray-600 italic">NULL</span>;
  if (typeof value === 'object') {
    return (
      <span 
        className="text-blue-400 cursor-help border-b border-dotted border-blue-900" 
        title={JSON.stringify(value, null, 2)}
      >
        [JSON]
      </span>
    );
  }
  if (typeof value === 'boolean') {
    return <span className={value ? 'text-green-400' : 'text-red-400'}>{value.toString().toUpperCase()}</span>;
  }
  return String(value);
};

const SQLRunner = () => {
  const [query, setQuery] = useState('SELECT * FROM mikrotik_boards LIMIT 10;');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await executeRawSQL(query);
      if (data.status === 'success') {
        setResult(data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-green-400 mb-6 border-b border-gray-700 pb-2">SQL Query Runner</h2>
      
      <div className="bg-yellow-900/30 border border-yellow-700 p-4 rounded mb-4">
        <p className="text-yellow-500 text-sm font-bold flex items-center gap-2">
            <Shield className="w-4 h-4" />
            WARNING: Direct database access. Use with extreme caution.
        </p>
      </div>

      <div>
        <textarea 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white p-4 rounded font-mono h-32 focus:ring-2 focus:ring-green-500 outline-none"
            placeholder="SELECT * FROM table_name;"
        />
        <div className="mt-2 flex justify-end">
            <button 
                onClick={execute}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-bold flex items-center gap-2"
            >
                {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                EXECUTE SQL
            </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 p-4 rounded text-red-200 font-mono text-sm">
            ERROR: {error}
        </div>
      )}

      {result && (
        <div className="bg-gray-800 border border-gray-700 rounded overflow-hidden">
            <div className="bg-gray-700 px-4 py-2 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-300">QUERY RESULT</span>
                <span className="text-xs text-gray-400">{result.affectedRows} rows affected</span>
            </div>
            
            {result.rows && result.rows.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-gray-900 text-green-400 border-b border-gray-700">
                            <tr>
                                {result.columns.map((col) => (
                                    <th key={col} className="px-4 py-2 whitespace-nowrap">{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700 text-gray-300">
                            {result.rows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-700">
                                    {result.columns.map((col) => (
                                        <td key={col} className="px-4 py-2 whitespace-nowrap max-w-xs truncate">
                                            {row[col] === null ? <span className="text-gray-600">NULL</span> : String(row[col])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-4 text-gray-500 text-sm text-center">No data returned</div>
            )}
        </div>
      )}
    </div>
  );
};

const ServerLogs = () => {
    const [logs, setLogs] = useState([]);
    const [status, setStatus] = useState('Disconnected');
    const wsRef = useRef(null);

    const connect = () => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // WebSocket URL construction
        const wsUrl = `${protocol}//${window.location.hostname}:8000/api/v1/developer/ws/logs`;
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            setStatus('Connected');
            setLogs(prev => [...prev, '--- Connection Established ---']);
        };

        socket.onmessage = (event) => {
            setLogs(prev => {
                const newLogs = [...prev, event.data];
                if (newLogs.length > 200) return newLogs.slice(-200); 
                return newLogs;
            });
        };

        socket.onclose = () => {
            setStatus('Disconnected');
            setLogs(prev => [...prev, '--- Connection Closed ---']);
        };

        socket.onerror = (error) => {
            console.error("WebSocket Error:", error);
            setStatus('Error');
        };

        wsRef.current = socket;
    };

    const disconnect = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    };

    useEffect(() => {
        const id = setTimeout(() => connect(), 0);
        return () => {
            clearTimeout(id);
            disconnect();
        };
    }, []);

    const logsEndRef = useRef(null);
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-green-400">Server Logs (Live Stream)</h2>
                <div className="flex items-center gap-4">
                    <span className={`text-xs px-2 py-1 rounded ${status === 'Connected' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                        {status}
                    </span>
                    <button 
                        onClick={status === 'Connected' ? disconnect : connect}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center gap-2"
                    >
                        {status === 'Connected' ? 'Pause' : 'Reconnect'}
                    </button>
                    <button 
                        onClick={() => setLogs([])}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-black rounded border border-gray-700 p-4 overflow-auto font-mono text-xs h-96">
                {logs.length > 0 ? (
                    logs.map((line, idx) => (
                        <div key={idx} className="text-gray-300 hover:bg-gray-900 whitespace-pre-wrap py-0.5 border-b border-gray-900/50 break-all">
                            <span className="text-gray-600 mr-2 select-none">{new Date().toLocaleTimeString()}</span>
                            {line}
                        </div>
                    ))
                ) : (
                    <div className="text-gray-500 italic">Waiting for logs...</div>
                )}
                <div ref={logsEndRef} />
            </div>
        </div>
    );
};

const MetricsViewer = () => {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-green-400 mb-6 border-b border-gray-700 pb-2">System Metrics</h2>
            
            <div className="bg-gray-800 p-6 rounded border border-gray-700 text-center">
                <BarChart2 className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Prometheus Metrics Exposed</h3>
                <p className="text-gray-400 mb-6">
                    Application metrics are available for scraping at the <code className="bg-gray-900 px-2 py-1 rounded text-green-400">/metrics</code> endpoint.
                </p>
                <div className="flex justify-center gap-4">
                    <a 
                        href="http://localhost:8000/metrics" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold flex items-center gap-2"
                    >
                        Open /metrics
                    </a>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <h4 className="font-bold text-gray-300 mb-2">Available Metrics</h4>
                    <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                        <li>http_requests_total</li>
                        <li>http_request_duration_seconds</li>
                        <li>process_cpu_seconds_total</li>
                        <li>process_resident_memory_bytes</li>
                        <li>fastapi_app_info</li>
                    </ul>
                </div>
                <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <h4 className="font-bold text-gray-300 mb-2">Integration Guide</h4>
                    <p className="text-sm text-gray-400">
                        Configure your Prometheus server to scrape <code className="text-green-400">localhost:8000</code>.
                        Visualizations can be built in Grafana using the "FastAPI" dashboard template.
                    </p>
                </div>
            </div>
        </div>
    );
};

const EnvViewer = () => {
  const envVars = import.meta.env;
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-green-400 mb-6 border-b border-gray-700 pb-2">Environment Variables</h2>
      
      <div className="bg-gray-800 rounded border border-gray-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-700 text-gray-300">
            <tr>
              <th className="px-4 py-2">Variable</th>
              <th className="px-4 py-2">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700 text-gray-400 font-mono">
            {Object.keys(envVars).map((key) => (
              <tr key={key}>
                <td className="px-4 py-2 text-green-500">{key}</td>
                <td className="px-4 py-2 truncate max-w-md">{String(envVars[key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeveloperConsole;
