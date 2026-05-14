import { describe, test, expect, beforeEach } from 'vitest';
import { useContextLockStore, useAnalysisStore } from './analysisStore';

describe('AnalysisStore & ContextLock Unit Test', () => {
  beforeEach(() => {
    useContextLockStore.getState().resetFilters();
    useAnalysisStore.getState().resetAnalysis();
  });

  test('ContextLock: Harusnya mengunci filter saat isLocked true', () => {
    const store = useContextLockStore.getState();
    
    // 1. Set initial value
    store.setSelectedBoardId(1);
    expect(useContextLockStore.getState().selectedBoardId).toBe(1);

    // 2. Lock store
    store.setLocked(true);
    expect(useContextLockStore.getState().isLocked).toBe(true);

    // 3. Try to change value while locked
    useContextLockStore.getState().setSelectedBoardId(2);
    
    // 4. Value should NOT change
    expect(useContextLockStore.getState().selectedBoardId).toBe(1);
  });

  test('ContextLock: Harusnya bisa mengubah filter saat isLocked false', () => {
    const store = useContextLockStore.getState();
    
    store.setSelectedBoardId(1);
    store.setLocked(false);
    
    store.setSelectedBoardId(2);
    expect(useContextLockStore.getState().selectedBoardId).toBe(2);
  });

  test('AnalysisStore: Harusnya menyimpan hasil analisis dengan benar', () => {
    const mockData = { stage2: { trends: [] }, stage6: { health_score: 85 } };
    useAnalysisStore.getState().setAnalysisData(mockData);
    
    expect(useAnalysisStore.getState().analysisData).toEqual(mockData);
  });

  test('AnalysisStore: Harusnya mereset data dengan benar', () => {
    useAnalysisStore.getState().setAnalysisData({ some: 'data' });
    useAnalysisStore.getState().resetAnalysis();
    
    expect(useAnalysisStore.getState().analysisData).toBe(null);
    expect(useAnalysisStore.getState().taskStatus).toBe('IDLE');
  });
});
