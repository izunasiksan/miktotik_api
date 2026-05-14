import { create } from 'zustand';

/**
 * ContextLockStore (02_ARCHITECTURE_STATE.md)
 * Mengelola board_id, time_range, dan granularity secara global.
 * Mencegah perubahan input saat analisis sedang berjalan.
 */
export const useContextLockStore = create((set) => ({
  selectedBoardId: null,
  timeRange: {
    start: null,
    end: null,
  },
  granularity: 'hour', // default
  isLocked: false,

  setSelectedBoardId: (id) => set((state) => ({
    selectedBoardId: state.isLocked ? state.selectedBoardId : id
  })),

  setTimeRange: (range) => set((state) => ({
    timeRange: state.isLocked ? state.timeRange : { ...state.timeRange, ...range }
  })),

  setGranularity: (val) => set((state) => ({
    granularity: state.isLocked ? state.granularity : val
  })),

  setLocked: (locked) => set({ isLocked: locked }),

  resetFilters: () => set(() => ({
    selectedBoardId: null,
    timeRange: { start: null, end: null },
    granularity: 'hour',
    isLocked: false,
    scopedMetadata: null
  }))
}));

/**
 * AnalysisStore (02_ARCHITECTURE_STATE.md)
 * Menyimpan hasil dataset dari Stage 1-7 untuk efisiensi re-render.
 * Juga melacak status normalisasi Stage 0.
 */
export const useAnalysisStore = create((set) => ({
  normalizationStatus: null, // { accuracyPct: 100, status: 'SUCCESS', ... }
  analysisData: null,        // { stage2: {...}, stage3: {...}, ... }
  scopedMetadata: null,      // { boardId, startTime, endTime, granularity } - Stage 1
  currentTaskId: null,
  taskStatus: 'IDLE',        // 'IDLE' | 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE'
  error: null,


  setNormalizationStatus: (status) => set({ normalizationStatus: status }),
  setAnalysisData: (data) => set({ analysisData: data }),
  setScopedMetadata: (meta) => set({ scopedMetadata: meta }),
  setCurrentTaskId: (id) => set({ currentTaskId: id }),
  setTaskStatus: (status) => set({ taskStatus: status }),
  setError: (err) => set({ error: err }),

  resetAnalysis: () => set({
    normalizationStatus: null,
    analysisData: null,
    scopedMetadata: null,
    currentTaskId: null,
    taskStatus: 'IDLE',
    error: null
  })
}));
