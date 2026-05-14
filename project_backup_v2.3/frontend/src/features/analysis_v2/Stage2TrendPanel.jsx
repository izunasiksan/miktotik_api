import React, { useMemo, useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Card = ({ label, value, unit, color = 'text-gray-700' }) => (
  <div className="border border-gray-200 rounded-lg p-4 bg-white">
    <div className="text-xs text-gray-500">{label}</div>
    <div className={`text-lg font-semibold ${color}`}>{value}{unit ? ` ${unit}` : ''}</div>
  </div>
);

const safeAvg = (arr) => {
  const xs = arr.filter((v) => Number.isFinite(v));
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
};

const safeMax = (arr) => {
  const xs = arr.filter((v) => Number.isFinite(v));
  if (xs.length === 0) return 0;
  return Math.max(...xs);
};

const pct = (from, to) => {
  const base = Number.isFinite(from) && Math.abs(from) > 1e-9 ? from : 0;
  if (!Number.isFinite(to)) return 0;
  if (base === 0) return to > 0 ? 100 : 0;
  return ((to - base) / Math.abs(base)) * 100;
};

const formatNum = (n, digits = 2) => {
  if (!Number.isFinite(n)) return '-';
  return n.toFixed(digits);
};

const useTrendStats = (normalization) => {
  const rows = useMemo(() => {
    const data = (normalization && Array.isArray(normalization.data)) ? normalization.data : [];
    return data.filter((d) => !d.isGap);
  }, [normalization]);
  const totals = useMemo(() => rows.map((d) => Number(d.total || 0)), [rows]);
  const cpus = useMemo(() => rows.map((d) => Number(d.cpu_percent_standard || 0)).filter((v) => v >= 0), [rows]);
  const mems = useMemo(() => rows.map((d) => Number(d.mem_usage || 0)).filter((v) => v >= 0), [rows]);
  const clients = useMemo(() => rows.map((d) => Number(d.clients_active || 0)).filter((v) => v >= 0), [rows]);
  const firstTotal = totals.find((v) => Number.isFinite(v));
  const lastTotal = [...totals].reverse().find((v) => Number.isFinite(v));
  const change = pct(firstTotal, lastTotal);
  const avgTotal = safeAvg(totals);
  const maxTotal = safeMax(totals);
  const avgCPU = safeAvg(cpus);
  const avgMem = safeAvg(mems);
  const avgClients = safeAvg(clients);
  const maxClients = safeMax(clients);
  const unit = rows.length > 0 && rows[0].unit ? rows[0].unit : 'Mbps';
  return { rows, totals, cpus, mems, clients, change, avgTotal, maxTotal, avgCPU, avgMem, avgClients, maxClients, unit };
};

const sumTotals = (rows) => {
  if (!Array.isArray(rows)) return 0;
  const nums = rows.map((r) => {
    const rx = Number(r?.download_mbps || 0);
    const tx = Number(r?.upload_mbps || 0);
    return (Number.isFinite(rx) ? rx : 0) + (Number.isFinite(tx) ? tx : 0);
  });
  return nums.reduce((a, b) => a + b, 0);
};

const Stage2TrendPanel = ({ normalization, isLoading = false, isError = false, period = 'custom', granularity = 'auto', perEntitySeries = null }) => {
  const [justUpdated, setJustUpdated] = useState(false);
  const { rows, change, avgTotal, maxTotal, avgCPU, avgMem, avgClients, maxClients, unit } = useTrendStats(normalization);
  useEffect(() => {
    if (isError) toast.error('Gagal memuat tren trafik');
  }, [isError]);
  useEffect(() => {
    if (!isLoading && rows.length > 0) {
      const start = setTimeout(() => setJustUpdated(true), 0);
      const t = setTimeout(() => setJustUpdated(false), 600);
      return () => { clearTimeout(start); clearTimeout(t); };
    }
  }, [isLoading, rows.length, period, granularity]);

  const trendColor = change > 0 ? 'text-emerald-700' : change < 0 ? 'text-rose-700' : 'text-gray-700';

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 transition-all ${justUpdated ? 'ring-1 ring-emerald-200 animate-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <Activity size={16} />
          </div>
          <h2 className="text-lg font-bold text-gray-800">Stage 2 — Trend</h2>
        </div>
        <span className="text-xs text-gray-500">{rows.length} slot</span>
      </div>
      {isLoading && (
        <div className="mb-3 text-xs text-gray-500">Memuat tren trafik…</div>
      )}
      {isError && (
        <div className="mb-3 text-xs text-rose-600">Gagal memuat dataset tren</div>
      )}
      {!isLoading && !isError && rows.length === 0 && (
        <div className="mt-3 border border-dashed border-gray-200 rounded-lg p-6 bg-gray-50 text-center">
          <div className="text-sm font-semibold text-gray-700">Data tidak tersedia</div>
          <div className="mt-1 text-xs text-gray-500">
            Tidak ada titik data untuk filter saat ini.
            <div className="mt-2">Coba:</div>
            <ul className="mt-1 space-y-1 list-disc list-inside text-left inline-block">
              <li>Pilih Quick Range (mis. Last 7 days) di Stage 1.</li>
              <li>Sesuaikan granularity agar sesuai dengan period.</li>
              <li>Pastikan perangkat/entitas sudah dipilih.</li>
              <li>Tekan Reload Data untuk memuat ulang.</li>
            </ul>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        <Card label="Total Trend" value={`${formatNum(change)}%`} color={trendColor} />
        <Card label="Rata-rata Total" value={formatNum(avgTotal)} unit={unit} />
        <Card label="Puncak Total" value={formatNum(maxTotal)} unit={unit} />
        <Card label="CPU Rata-rata" value={formatNum(avgCPU)} unit="%" />
        <Card label="Mem Rata-rata" value={formatNum(avgMem)} unit="%" />
        <Card label="Rata-rata Pengguna" value={formatNum(avgClients, 0)} />
        <Card label="Puncak Pengguna" value={formatNum(maxClients, 0)} />
      </div>
      <div className="mt-3 text-xs text-gray-500">period: {period} • granularity: {granularity} • unit: {unit}</div>
      {Array.isArray(perEntitySeries) && perEntitySeries.length > 0 && (
        <div className="mt-6">
          <div className="text-sm font-semibold text-gray-800 mb-2">Per-Entity (ringkas)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {perEntitySeries
              .map((e) => {
                const total = sumTotals(e.series || []);
                return { key: e.key, label: e.label || e.key, total };
              })
              .sort((a, b) => b.total - a.total)
              .slice(0, 9)
              .map((e) => (
                <div key={e.key} className="border border-gray-200 rounded-lg p-3 bg-white">
                  <div className="text-xs text-gray-500">{e.key}</div>
                  <div className="text-sm font-semibold text-gray-800">{e.label}</div>
                  <div className="text-xs text-gray-600">Total: {formatNum(e.total)} {unit}</div>
                </div>
              ))}
          </div>
          <div className="mt-2 text-[11px] text-gray-500">Menampilkan hingga 9 entitas teratas. Mode ringkas tanpa grafik.</div>
        </div>
      )}
    </div>
  );
};

export default Stage2TrendPanel;
