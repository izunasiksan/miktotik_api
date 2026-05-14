import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ScopeFilterStage from './ScopeFilterStage';

const mockUseQuery = vi.fn();

const mockUseContextLockStore = vi.fn();
const mockUseAnalysisStore = vi.fn();

vi.mock('../../../../store/analysisStore', () => ({
  useContextLockStore: () => mockUseContextLockStore(),
  useAnalysisStore: () => mockUseAnalysisStore(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args) => mockUseQuery(...args),
}));

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

describe('ScopeFilterStage SSOT Source ComboBox', () => {
  beforeEach(() => {
    cleanup();
    mockUseQuery.mockReset();
    mockUseContextLockStore.mockReturnValue({
      selectedBoardId: 'board-1',
      setSelectedBoardId: vi.fn(),
      selectedInterfaceName: '',
      setSelectedInterfaceName: vi.fn(),
      timeRange: { start: '2024-01-01T00:00:00', end: '2024-01-02T00:00:00' },
      setTimeRange: vi.fn(),
      granularity: 'day',
      setGranularity: vi.fn(),
      isLocked: false,
      setLocked: vi.fn(),
      resetFilters: vi.fn(),
    });

    mockUseAnalysisStore.mockReturnValue({
      setNormalizationStatus: vi.fn(),
      setTaskStatus: vi.fn(),
      setCurrentTaskId: vi.fn(),
      setScopedMetadata: vi.fn(),
      resetAnalysis: vi.fn(),
      taskStatus: 'IDLE',
      setError: vi.fn(),
      setAnalysisData: vi.fn(),
      setProgress: vi.fn(),
      setCurrentStage: vi.fn(),
    });

    mockUseQuery.mockImplementation((options) => {
      const key = options.queryKey || [];
      if (key[0] === 'boards') {
        return { data: [{ boardId: 'board-1', boardName: 'Router 1', ipAddress: '1.1.1.1' }] };
      }
      if (key[0] === 'analysis-interfaces') {
        return { data: [], isLoading: false };
      }
      if (key[0] === 'latestData') {
        return {
          data: { latestDataTime: '2024-01-02T00:00:00Z' },
          isLoading: false,
          refetch: vi.fn(),
          error: null,
        };
      }
      if (key[0] === 'ssot-data') {
        return {
          data: [
            {
              downloadMbps: 10,
              uploadMbps: 5,
              logTime: '2024-01-02T00:00:00Z',
            },
          ],
          isLoading: false,
          error: null,
        };
      }
      return { data: [], isLoading: false, error: null };
    });
  });

  test('menampilkan opsi SSOT dan ringkasan saat sumber dipilih', () => {
    render(<ScopeFilterStage />);

    const selects = screen.getAllByRole('combobox');
    const ssotSelect = selects[2];
    fireEvent.change(ssotSelect, { target: { value: 'speed' } });

    expect(screen.getByText(/Speed/i)).toBeInTheDocument();
  });
});
