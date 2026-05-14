import { create } from 'zustand';

/**
 * ContextLockStore (02_ARCHITECTURE_STATE.md)
 * Mengelola board_id, time_range, dan granularity secara global.
 * Mencegah perubahan input saat analisis sedang berjalan.
 */
export const useContextLockStore = create((set) => ({
  selectedBoardId: null,
  selectedInterfaceName: null, // V2.4.1 Added interface filter
  timeRange: {
    start: null,
    end: null,
  },
  granularity: 'hour', // default
  isLocked: false,

  setSelectedBoardId: (id) => set((state) => ({
    selectedBoardId: state.isLocked ? state.selectedBoardId : id,
    selectedInterfaceName: state.isLocked ? state.selectedInterfaceName : null // Reset interface when board changes
  })),

  setSelectedInterfaceName: (name) => set((state) => ({
    selectedInterfaceName: state.isLocked ? state.selectedInterfaceName : name
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
  normalizationData: null,   // UPDATE 2.4.1 Menyimpan data traffic/resource untuk Preview Data
  normalizationUsers: null,  // V2.4.1 Added: Menyimpan data users (hotspot/pppoe) untuk Preview Data
  analysisData: null,        // { stage2: {...}, stage3: {...}, ... }
  scopedMetadata: null,      // { boardId, startTime, endTime, granularity } - Stage 1
  currentTaskId: null,
  taskStatus: 'IDLE',        // 'IDLE' | 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE'
  progress: 0,               // V2.4: Pipeline progress (0-100)
  currentStage: '',          // V2.4: Current pipeline stage (e.g., 'Stage 1: Scope & Filter')
  error: null,

  setNormalizationStatus: (status) => set({ normalizationStatus: status }),
  setNormalizationData: (data) => set({ normalizationData: data }), // UPDATE 2.4.1 Setter untuk Preview Data
  setNormalizationUsers: (data) => set({ normalizationUsers: data }), // V2.4.1 Added: Setter untuk Preview Data Users
  setAnalysisData: (data) => set({ analysisData: data }),
  setScopedMetadata: (meta) => set({ scopedMetadata: meta }),
  setCurrentTaskId: (id) => set({ currentTaskId: id }),
  setTaskStatus: (status) => set({ taskStatus: status }),
  setProgress: (p) => set({ progress: p }),
  setCurrentStage: (s) => set({ currentStage: s }),
  setError: (err) => set({ error: err }),

  resetAnalysis: () => set({
    normalizationStatus: null,
    normalizationData: null, // UPDATE 2.4.1 Reset data preview
    normalizationUsers: null, // V2.4.1 Reset data users preview
    analysisData: null,
    scopedMetadata: null,
    currentTaskId: null,
    taskStatus: 'IDLE',
    progress: 0,
    currentStage: '',
    error: null
  })
}));
