import { useState } from 'react';
import { triggerAggregation } from '../../../services/api.js';
import toast from 'react-hot-toast';

/**
 * Hook khusus untuk mengelola state UI dan interaksi user (Filter, Limit, Refresh)
 */
export const useAnalysisUI = () => {
  const [tableLimits, setTableLimits] = useState({
    findings: 10,
    anomalies: 10
  });

  const [filters, setFilters] = useState({
    riskLevel: 'ALL',
    severity: 'ALL',
    search: ''
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [aggMethod, setAggMethod] = useState('AVG');

  const handleLimitChange = (table, limit) => {
    setTableLimits(prev => ({ ...prev, [table]: limit }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleAddMapping = (mapping, setNormalizationConfig) => {
    setNormalizationConfig(prev => ({
      ...prev,
      customMappings: [...(prev.customMappings || []), { ...mapping, id: Date.now(), active: true }]
    }));
    toast.success("Pemetaan metrik ditambahkan");
  };

  const handleRemoveMapping = (id, setNormalizationConfig) => {
    setNormalizationConfig(prev => ({
      ...prev,
      customMappings: (prev.customMappings || []).filter(m => m.id !== id)
    }));
    toast.info("Pemetaan metrik dihapus");
  };

  const handleUpdateMapping = (id, updates, setNormalizationConfig) => {
    setNormalizationConfig(prev => ({
      ...prev,
      customMappings: (prev.customMappings || []).map(m => m.id === id ? { ...m, ...updates } : m)
    }));
  };

  const handleTriggerAggregation = async () => {
    try {
      setIsRefreshing(true);
      const today = new Date().toISOString().split('T')[0];
      await triggerAggregation(today);
      toast.success("Agregasi data berhasil dipicu untuk hari ini");
    } catch (error) {
      toast.error("Gagal memicu agregasi data");
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    tableLimits,
    filters,
    isRefreshing,
    handleLimitChange,
    handleFilterChange,
    handleTriggerAggregation,
    aggMethod,
    setAggMethod,
    handleAddMapping,
    handleRemoveMapping,
    handleUpdateMapping,
  };
};
