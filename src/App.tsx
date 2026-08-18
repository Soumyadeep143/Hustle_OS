import { useState } from 'react';
import {
  Navigation,
  VoiceCommandCenter,
  Dashboard,
  Applications,
  Settings,
} from './components';
import './styles/globals.css';

type Tab = 'voice' | 'dashboard' | 'applications' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('voice');

  const renderContent = () => {
    switch (activeTab) {
      case 'voice':
        return (
          <VoiceCommandCenter
            onCommand={() => {
              // Handle voice commands
            }}
          />
        );
      case 'dashboard':
        return <Dashboard />;
      case 'applications':
        return <Applications />;
      case 'settings':
        return <Settings />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 animate-fadeIn">
            <h1 className="text-4xl font-bold text-white mb-2 font-geist">
              {activeTab === 'voice'
                ? 'Voice Command Center'
                : activeTab === 'dashboard'
                ? 'Dashboard'
                : activeTab === 'applications'
                ? 'Applications'
                : 'Settings'}
            </h1>
            <p className="text-slate-400">
              {activeTab === 'voice'
                ? 'Control HustleOS with your voice'
                : activeTab === 'dashboard'
                ? 'Track your job search progress'
                : activeTab === 'applications'
                ? 'Manage your applications'
                : 'Customize your HustleOS experience'}
            </p>
          </div>

          {/* Content */}
          <div className="animate-slideInFromTop">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
