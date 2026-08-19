import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './app/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './screens/Home';
import { Work } from './screens/Work';
import { AI } from './screens/AI';
import { Profile } from './screens/Profile';
import { RecallOverview } from './screens/recall/RecallOverview';
import { ProspectDetail } from './screens/recall/ProspectDetail';
import { TeamOverview } from './screens/team/TeamOverview';
import { ProjectDetail } from './screens/team/ProjectDetail';
import { FeatureDetail } from './screens/team/FeatureDetail';
import './styles/globals.css';

function App() {
  return (
    <HashRouter>
      <ErrorBoundary>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/work" element={<Work />} />
            <Route path="/recall" element={<RecallOverview />} />
            <Route path="/recall/:id" element={<ProspectDetail />} />
            <Route path="/team" element={<TeamOverview />} />
            <Route path="/team/projects/:id" element={<ProjectDetail />} />
            <Route path="/team/features/:id" element={<FeatureDetail />} />
            <Route path="/ai" element={<AI />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </HashRouter>
  );
}

export default App;
