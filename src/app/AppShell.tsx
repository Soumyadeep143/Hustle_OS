import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from '../components/nav/BottomNav';
import { CaptureFab } from '../components/CaptureFab';
import { CaptureSheet } from '../components/sheets/CaptureSheet';
import { RecallCaptureSheet } from '../components/sheets/RecallCaptureSheet';
import { WorkspaceSheet } from '../components/sheets/WorkspaceSheet';
import { Toast } from '../components/ui';
import { VoiceOverlay } from '../screens/Voice';
import { useUi } from '../store/useUi';

export function AppShell() {
  const loadTasks = useUi((s) => s.loadTasks);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  return (
    <div className="min-h-dvh" style={{ background: 'var(--color-bg)' }}>
      <div className="mx-auto min-h-dvh max-w-[480px] pb-[116px]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Outlet />
      </div>
      <BottomNav />
      <CaptureFab />
      <CaptureSheet />
      <RecallCaptureSheet />
      <WorkspaceSheet />
      <Toast />
      <VoiceOverlay />
    </div>
  );
}
