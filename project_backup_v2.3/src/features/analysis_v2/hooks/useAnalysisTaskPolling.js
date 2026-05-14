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
    // Jika ada taskId dan status adalah PENDING atau STARTED, mulai polling
    if (currentTaskId && (taskStatus === 'PENDING' || taskStatus === 'STARTED')) {
      setLocked(true); // Kunci filter saat task berjalan (Context Lock)
      
      stopPolling();
      
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const data = await getTaskStatus(currentTaskId);
          
          if (data.status === 'SUCCESS') {
            setTaskStatus('SUCCESS');
            setAnalysisData(data.result);
            setLocked(false);
            stopPolling();
            toast.success('Analisis selesai!');
          } else if (data.status === 'FAILURE') {
            setTaskStatus('FAILURE');
            setError(data.error || 'Task failed');
            setLocked(false);
            stopPolling();
            toast.error(`Analisis gagal: ${data.error || 'Unknown error'}`);
          } else {
            // Masih PENDING atau STARTED
            setTaskStatus(data.status);
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
  }, [currentTaskId, taskStatus, setTaskStatus, setAnalysisData, setError, setLocked]);

  return {
    isProcessing: taskStatus === 'PENDING' || taskStatus === 'STARTED',
    stopPolling
  };
};
