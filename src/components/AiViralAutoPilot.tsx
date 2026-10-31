import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AutopilotSchedulerState, Scene } from '../types';
import { AutonomousShortsDashboard } from './AutonomousShortsDashboard';

interface AiViralAutoPilotProps {
  onLoadScriptToEditor: (scenes: Scene[], musicUrl?: string) => void;
  onJobStarted: (jobId: string) => void;
  onToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const AiViralAutoPilot: React.FC<AiViralAutoPilotProps> = ({ onJobStarted, onToast }) => {
  const [schedulerState, setSchedulerState] = useState<AutopilotSchedulerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lastNotifiedJobId = useRef<string | null>(null);
  const hasLoadedInitialState = useRef(false);

  const refreshSchedulerState = useCallback(async () => {
    try {
      const response = await fetch('/api/autopilot/scheduler');
      const data = await response.json();
      if (!response.ok || !data.state) {
        throw new Error(data.error || 'Nie udało się pobrać stanu automatyzacji.');
      }
      setSchedulerState(data.state);
      setLoadError(null);
    } catch (error) {
      setLoadError((error as Error).message || 'Nie udało się połączyć z automatem.');
    }
  }, []);

  useEffect(() => {
    void refreshSchedulerState();
    const timer = window.setInterval(() => void refreshSchedulerState(), 15_000);
    return () => window.clearInterval(timer);
  }, [refreshSchedulerState]);

  useEffect(() => {
    if (!schedulerState) return;
    const jobId = schedulerState?.lastRunJobId;
    if (!hasLoadedInitialState.current) {
      hasLoadedInitialState.current = true;
      lastNotifiedJobId.current = jobId || null;
      return;
    }
    if (jobId && jobId !== lastNotifiedJobId.current) {
      lastNotifiedJobId.current = jobId;
      onJobStarted(jobId);
    }
  }, [schedulerState?.lastRunJobId, onJobStarted]);

  const handleToggle = async () => {
    if (!schedulerState) return;
    setLoading(true);
    try {
      const response = await fetch('/api/autopilot/scheduler/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !schedulerState.enabled })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Nie udało się zmienić stanu automatu.');
      onToast?.('info', data.enabled ? 'Automat wznowiony' : 'Automat wstrzymany', data.enabled
        ? 'Zaplanowane cykle będą uruchamiać się automatycznie.'
        : 'Nowe cykle zostały wstrzymane; trwający render nie jest anulowany.');
      await refreshSchedulerState();
    } catch (error) {
      onToast?.('error', 'Nie udało się zmienić stanu automatu', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AutonomousShortsDashboard
      state={schedulerState}
      loading={loading}
      error={loadError}
      onToggle={() => void handleToggle()}
    />
  );
};
