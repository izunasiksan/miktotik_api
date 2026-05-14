import React from 'react';
import { 
  FileText, Activity, Users, Download, Wifi, Network
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useReports } from '../hooks/useReports.js';
import LoadingSpinner from '../components/atoms/LoadingSpinner.jsx';
import Modal from '../components/molecules/Modal.jsx';

// Sub-components
import ReportControls from './Reports/ReportControls.jsx';
import TrafficOverview from './Reports/TrafficOverview.jsx';
import ResourceUsage from './Reports/ResourceUsage.jsx';
import SummaryTab from './Reports/SummaryTab.jsx';
import DetailTab from './Reports/DetailTab.jsx';

const Reports = () => {
  const {
    selectedBoard, setSelectedBoard,
    period, setPeriod,
    activeTab, setActiveTab,
    startTime, setStartTime,
    endTime, setEndTime,
    usageUnit, setUsageUnit,
    nameFilter, setNameFilter,
    isCompact, setIsCompact,
    clientLimit, setClientLimit,
    clientsTableMode, setClientsTableMode,
    clientsPivotAgg,
    clientsChartStacked, setClientsChartStacked,
    interfacesTableMode, setInterfacesTableMode,
    pppoeTableMode, setPppoeTableMode,
    hotspotTableMode, setHotspotTableMode,
    interfacesPivotAgg,
    pppoePivotAgg,
    hotspotPivotAgg,
    isExporting,
    isPivotDialogOpen, setIsPivotDialogOpen,
    pivotTarget,
    pivotTempAgg, setPivotTempAgg,
    trafficSort, handleTrafficSort,
    openPivotDialog, applyPivotAgg,
    boards, isBoardsLoading, isBoardsError,
    reportData, filteredReportData, isReportsLoading,
    interfacesSummary, pppoeSummary, hotspotSummary,
    nameOptions
  } = useReports();

  const chartHeight = isCompact ? 'h-56' : 'h-64';
  const cardPadding = isCompact ? 'p-3' : 'p-4';
  const gridGap = isCompact ? 'gap-4' : 'gap-6';

  const handleExport = async (format) => {
    toast.success(`Exporting to ${format.toUpperCase()}...`);
    // Real export logic could be added here
  };

  const tabs = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'traffic', label: 'Traffic Overview', icon: Activity },
    { id: 'resource', label: 'Resource Usage', icon: Download },
    { id: 'interfaces', label: 'Interfaces', icon: Network },
    { id: 'clients', label: 'Client Counts', icon: Users },
    { id: 'pppoe', label: 'PPPoE Usage', icon: Users },
    { id: 'hotspot', label: 'Hotspot Usage', icon: Wifi },
  ];

  const renderTabContent = () => {
    if (isReportsLoading) {
      return (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      );
    }

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'summary' && (
          <SummaryTab 
            reportData={reportData}
            period={period}
            usageUnit={usageUnit}
            setUsageUnit={setUsageUnit}
            chartHeight={chartHeight}
            cardPadding={cardPadding}
            gridGap={gridGap}
            interfacesSummary={interfacesSummary}
            pppoeSummary={pppoeSummary}
            hotspotSummary={hotspotSummary}
          />
        )}

        {activeTab === 'traffic' && (
          <TrafficOverview 
            reportData={reportData}
            filteredReportData={filteredReportData}
            chartHeight={chartHeight}
            cardPadding={cardPadding}
            trafficSort={trafficSort}
            handleTrafficSort={handleTrafficSort}
          />
        )}

        {activeTab === 'resource' && (
          <ResourceUsage 
            reportData={reportData}
            chartHeight={chartHeight}
            cardPadding={cardPadding}
          />
        )}

        {['interfaces', 'clients', 'pppoe', 'hotspot'].includes(activeTab) && (
          <DetailTab 
            reportData={reportData}
            filteredReportData={filteredReportData}
            activeTab={activeTab}
            nameFilter={nameFilter}
            setNameFilter={setNameFilter}
            nameOptions={nameOptions}
            tableMode={
              activeTab === 'interfaces' ? interfacesTableMode :
              activeTab === 'pppoe' ? pppoeTableMode :
              activeTab === 'hotspot' ? hotspotTableMode : clientsTableMode
            }
            setTableMode={
              activeTab === 'interfaces' ? setInterfacesTableMode :
              activeTab === 'pppoe' ? setPppoeTableMode :
              activeTab === 'hotspot' ? setHotspotTableMode : setClientsTableMode
            }
            pivotAgg={
              activeTab === 'interfaces' ? interfacesPivotAgg :
              activeTab === 'pppoe' ? pppoePivotAgg :
              activeTab === 'hotspot' ? hotspotPivotAgg : clientsPivotAgg
            }
            openPivotDialog={openPivotDialog}
            chartStacked={clientsChartStacked}
            setChartStacked={setClientsChartStacked}
            chartHeight={chartHeight}
            cardPadding={cardPadding}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-600" />
            System Reports
          </h1>
          <p className="text-gray-500 text-sm mt-1">
             <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 mr-2">
               Historical / Polled
             </span>
            Historical performance data and aggregated statistics
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${isExporting ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white`}
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          
          <button
            onClick={() => setIsCompact(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded ${isCompact ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
            title="Toggle Compact Mode"
          >
            {isCompact ? 'Compact: ON' : 'Compact: OFF'}
          </button>
        </div>
      </div>

      <ReportControls 
        selectedBoard={selectedBoard} setSelectedBoard={setSelectedBoard}
        period={period} setPeriod={setPeriod}
        activeTab={activeTab}
        startTime={startTime} setStartTime={setStartTime}
        endTime={endTime} setEndTime={setEndTime}
        isCompact={isCompact} setIsCompact={setIsCompact}
        isExporting={isExporting} handleExport={handleExport}
        clientLimit={clientLimit} setClientLimit={setClientLimit}
        boards={boards} isBoardsLoading={isBoardsLoading} isBoardsError={isBoardsError}
        cardPadding={cardPadding}
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className={`mr-2 h-5 w-5 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Section */}
      {renderTabContent()}

      {/* Pivot Dialog Modal */}
      <Modal 
        isOpen={isPivotDialogOpen} 
        onClose={() => setIsPivotDialogOpen(false)}
        title={`Aggregation: ${pivotTarget.toUpperCase()}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Select aggregation function for {pivotTarget} pivot view:</p>
          <div className="grid grid-cols-3 gap-2">
            {['sum', 'avg', 'max'].map(agg => (
              <button
                key={agg}
                onClick={() => setPivotTempAgg(agg)}
                className={`px-4 py-2 rounded border transition-all ${pivotTempAgg === agg ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                {agg.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setIsPivotDialogOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={applyPivotAgg} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Apply</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Reports;
