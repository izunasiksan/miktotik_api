import { useEffect, useRef } from 'react';
import { useAnalysisStore, useContextLockStore } from '../../../store/analysisStore';
import { getTaskStatus } from '../../../services/api';
import toast from 'react-hot-toast';

/**
 * useAnalysisTaskPolling (01_INTEGRATION_MAP.md & 03_API_COMMUNICATION.md)
 * Hook untuk menangani polling status task async Celery dari backend.
 */
export const useAnalysisTaskPolling = () => {
  const { 
    currentTaskId, 
    taskStatus, 
    setTaskStatus, 
    setAnalysisData, 
    setProgress,
    setCurrentStage,
    setError
  } = useAnalysisStore();
  
  const { setLocked } = useContextLockStore();
  const pollingIntervalRef = useRef(null);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    // Jika ada taskId dan status adalah PENDING, STARTED, atau PROGRESS, mulai polling
    const processingStates = ['PENDING', 'STARTED', 'PROGRESS'];
    if (currentTaskId && processingStates.includes(taskStatus)) {
      setLocked(true); // Kunci filter saat task berjalan (Context Lock)
      
      stopPolling();
      
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const data = await getTaskStatus(currentTaskId);
          
          // Update progress if available (V2.4 backend update might be needed)
          if (data.progress !== undefined) setProgress(data.progress);
          if (data.currentStage !== undefined) setCurrentStage(data.currentStage);
          
          if (data.state === 'SUCCESS') {
            setTaskStatus('SUCCESS');
            setAnalysisData(data.result);
            setProgress(100);
            setCurrentStage('Completed');
            setLocked(false);
            stopPolling();
            toast.success('Analisis selesai!');
          } else if (data.state === 'FAILURE' || data.state === 'REVOKED') {
            setTaskStatus('FAILURE');
            setError(data.error || 'Task failed');
            setLocked(false);
            stopPolling();
            toast.error(`Analisis gagal: ${data.error || 'Unknown error'}`);
          } else {
            // Masih PENDING, STARTED, atau PROGRESS
            setTaskStatus(data.state);
          }
        } catch (err) {
          console.error('Polling error:', err);
          // Jangan stop polling segera jika hanya network error (retry logic di axios akan menangani)
          // Namun jika error fatal, stop.
          if (err.response && err.response.status >= 400 && err.response.status < 500) {
            setTaskStatus('FAILURE');
            setError('Error saat mengambil status task');
            setLocked(false);
            stopPolling();
          }
        }
      }, 2000); // Polling setiap 2 detik (sesuai 03_API_COMMUNICATION.md)
    }

    return () => stopPolling();
  }, [currentTaskId, taskStatus, setTaskStatus, setAnalysisData, setError, setLocked, setProgress, setCurrentStage]);

  return {
    isProcessing: ['PENDING', 'STARTED', 'PROGRESS'].includes(taskStatus),
    stopPolling
  };
};
