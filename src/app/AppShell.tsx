import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from '../components/nav/BottomNav';
import { SideNav } from '../components/nav/SideNav';
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

      {/* ── md+ layout: sidebar + scrollable content area ── */}
      <div className="md:flex md:min-h-dvh">

        {/* Sidebar — hidden on mobile, shown at md+ */}
        <SideNav />

        {/* Main scroll area */}
        <main className="flex-1 overflow-y-auto">
          {/*
            Mobile  : full-width, centered up to 480px, bottom-nav padded
            md+     : left-padded past sidebar (sidebar is w-[220px]),
                      content widens to a comfortable reading max-w
          */}
          <div
            className="
              mx-auto
              w-full
              max-w-[480px]
              px-0
              pb-[116px]
              pt-0
              md:max-w-[860px]
              md:px-8
              md:pb-10
              lg:max-w-[1040px]
              lg:px-12
            "
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom nav — only visible on mobile */}
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
