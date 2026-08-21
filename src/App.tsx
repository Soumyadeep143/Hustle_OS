import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './app/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './screens/Home';
import { Landing } from './screens/Landing';
import { Work } from './screens/Work';
import { AI } from './screens/AI';
import { Profile } from './screens/Profile';
import { Login } from './screens/Login';
import { Signup } from './screens/Signup';
import { RecallOverview } from './screens/recall/RecallOverview';
import { RecallDetail } from './screens/recall/RecallDetail';
import { TeamOverview } from './screens/team/TeamOverview';
import { ProjectDetail } from './screens/team/ProjectDetail';
import { FeatureDetail } from './screens/team/FeatureDetail';
import { useAuth } from './store/useAuth';
import './styles/globals.css';

function App() {
  const status = useAuth((s) => s.status);
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (status === 'checking') {
    return <div className="min-h-dvh" style={{ background: 'var(--color-bg)' }} />;
  }

  return (
    <HashRouter>
      <ErrorBoundary>
        <Routes>
          {status === 'guest' ? (
            <>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/signup" element={<Navigate to="/" replace />} />
              <Route element={<AppShell />}>
                <Route path="/" element={<Home />} />
                <Route path="/work" element={<Work />} />
                <Route path="/recall" element={<RecallOverview />} />
                <Route path="/recall/:id" element={<RecallDetail />} />
                <Route path="/team" element={<TeamOverview />} />
                <Route path="/team/projects/:id" element={<ProjectDetail />} />
                <Route path="/team/features/:id" element={<FeatureDetail />} />
                <Route path="/ai" element={<AI />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </>
          )}
        </Routes>
      </ErrorBoundary>
    </HashRouter>
  );
}

export default App;
