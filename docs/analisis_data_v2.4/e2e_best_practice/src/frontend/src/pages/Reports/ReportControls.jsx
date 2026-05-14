import React from 'react';
import { Download } from 'lucide-react';

const ReportControls = ({
  selectedBoard, setSelectedBoard,
  period, setPeriod,
  activeTab,
  startTime, setStartTime,
  endTime, setEndTime,
  clientLimit, setClientLimit,
  boards, isBoardsLoading, isBoardsError,
  cardPadding
}) => {
  return (
    <div className={`bg-white ${cardPadding} rounded-lg shadow mb-6`}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label htmlFor="device-select" className="block text-sm font-medium text-gray-700 mb-1">Select Device</label>
          <select
            id="device-select"
            name="device-select"
            value={selectedBoard}
            onChange={(e) => setSelectedBoard(e.target.value)}
            disabled={isBoardsLoading || isBoardsError || boards.length === 0}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          >
            {isBoardsLoading && <option>Loading devices...</option>}
            {isBoardsError && <option>Error loading devices</option>}
            {!isBoardsLoading && !isBoardsError && boards.length === 0 && <option value="">No devices found</option>}
            {!isBoardsLoading && !isBoardsError && boards.length > 0 && (
              <option value="all">All Devices • {boards.length}</option>
            )}
            {boards.map((board) => (
              <option key={board.boardId} value={board.boardId}>
                {board.boardName || board.name} ({board.ipAddress || board.host})
              </option>
            ))}
          </select>
        </div>

        {(activeTab === 'summary' || activeTab === 'resource') && (
           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Period</label>
              <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <button
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${period === 'daily' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => setPeriod('daily')}
                >
                  Daily
                </button>
                <button
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${period === 'monthly' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => setPeriod('monthly')}
                >
                  Monthly
                </button>
              </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div>
            <label htmlFor="client-limit-select" className="block text-sm font-medium text-gray-700 mb-1">Data Limit</label>
            <select
              id="client-limit-select"
              name="client-limit-select"
              value={clientLimit}
              onChange={(e) => setClientLimit(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>All</option>
              <option value={30}>Last 30</option>
              <option value={60}>Last 60</option>
              <option value={90}>Last 90</option>
              <option value={200}>Last 200</option>
            </select>
          </div>
        )}
        
        <div className="col-span-2">
          <label htmlFor="start-time-input" className="block text-sm font-medium text-gray-700 mb-1">Date Range (ISO 8601)</label>
          <div className="flex items-center gap-2">
            <input
              id="start-time-input"
              name="start-time-input"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400">-</span>
            <label htmlFor="end-time-input" className="sr-only">End Time</label>
            <input
              id="end-time-input"
              name="end-time-input"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => { setStartTime(''); setEndTime(''); }}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium whitespace-nowrap"
            >
              All Period
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportControls;
