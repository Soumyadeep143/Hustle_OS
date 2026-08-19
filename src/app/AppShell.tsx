import { Outlet } from 'react-router-dom';
import { BottomNav } from '../components/nav/BottomNav';
import { CaptureFab } from '../components/CaptureFab';
import { CaptureSheet } from '../components/sheets/CaptureSheet';
import { WorkspaceSheet } from '../components/sheets/WorkspaceSheet';
import { Toast } from '../components/ui';
import { VoiceOverlay } from '../screens/Voice';

export function AppShell() {
  return (
    <div className="min-h-dvh" style={{ background: 'var(--color-bg)' }}>
      <div className="mx-auto min-h-dvh max-w-[480px] pb-[116px]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Outlet />
      </div>
      <BottomNav />
      <CaptureFab />
      <CaptureSheet />
      <WorkspaceSheet />
      <Toast />
      <VoiceOverlay />
    </div>
  );
}
