import React, { useState } from 'react';
import { Bell, Volume2, Lock, Smartphone } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';

interface SettingsState {
  notifications: boolean;
  emailAlerts: boolean;
  voiceOutput: boolean;
  darkMode: boolean;
  twoFactor: boolean;
  autoApply: boolean;
  dailySummary: boolean;
  apiKey: string;
}

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsState>({
    notifications: true,
    emailAlerts: true,
    voiceOutput: true,
    darkMode: true,
    twoFactor: false,
    autoApply: false,
    dailySummary: true,
    apiKey: '••••••••••••••••••••••••••••',
  });

  const [saved, setSaved] = useState(false);

  const handleToggle = (key: keyof SettingsState) => {
    setSettings((prev) => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
    }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const SettingRow: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    toggle?: keyof SettingsState;
  }> = ({ icon, title, description, toggle }) => (
    <Card variant="default" hover>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="text-blue-400 mt-1">{icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-sm text-slate-400">{description}</p>
          </div>
        </div>

        {toggle && (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings[toggle] as boolean}
              onChange={() => handleToggle(toggle)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
          </label>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      {/* Settings Sections */}

      {/* Notifications */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="text-blue-400" size={20} />
          <h2 className="text-lg font-bold text-white">Notifications</h2>
        </div>

        <div className="space-y-3">
          <SettingRow
            icon={<Bell size={20} />}
            title="Push Notifications"
            description="Receive job alerts and application updates"
            toggle="notifications"
          />
          <SettingRow
            icon={<Smartphone size={20} />}
            title="Email Alerts"
            description="Get important updates via email"
            toggle="emailAlerts"
          />
          <SettingRow
            icon={<Volume2 size={20} />}
            title="Voice Output"
            description="Enable audio responses from HustleOS"
            toggle="voiceOutput"
          />
          <SettingRow
            icon={<Bell size={20} />}
            title="Daily Summary"
            description="Receive a daily digest of your progress"
            toggle="dailySummary"
          />
        </div>
      </div>

      {/* Automation */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Automation</h2>

        <div className="space-y-3">
          <SettingRow
            icon={<Smartphone size={20} />}
            title="Auto-Apply"
            description="Automatically apply to matching jobs"
            toggle="autoApply"
          />
          <Card variant="default" hover>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Job Preferences</h3>
                  <p className="text-sm text-slate-400">Set your job search criteria</p>
                </div>
                <Button variant="secondary" size="sm">
                  Configure
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Privacy & Security */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Lock className="text-blue-400" size={20} />
          <h2 className="text-lg font-bold text-white">Privacy & Security</h2>
        </div>

        <div className="space-y-3">
          <SettingRow
            icon={<Lock size={20} />}
            title="Two-Factor Authentication"
            description="Add an extra layer of security to your account"
            toggle="twoFactor"
          />

          <Card variant="default" hover>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-white">API Key</h3>
                  <p className="text-sm text-slate-400 font-mono">{settings.apiKey}</p>
                </div>
                <Button variant="secondary" size="sm">
                  Regenerate
                </Button>
              </div>
            </div>
          </Card>

          <Card variant="default" hover>
            <div className="space-y-2">
              <h3 className="font-semibold text-white">Connected Accounts</h3>
              <div className="space-y-2">
                {['LinkedIn', 'GitHub', 'Gmail'].map((account) => (
                  <div key={account} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-b-0">
                    <span className="text-slate-300">{account}</span>
                    <Badge variant="success" size="sm">
                      Connected
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Profile */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Profile</h2>

        <div className="space-y-3">
          <Card variant="default">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Email</label>
                <input
                  type="email"
                  value="user@example.com"
                  className="input-field w-full"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Full Name</label>
                <input
                  type="text"
                  placeholder="Your Name"
                  className="input-field w-full"
                  defaultValue="Soumyadeep Saha"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Bio</label>
                <textarea
                  placeholder="Tell us about yourself"
                  className="input-field w-full min-h-24 resize-none"
                  defaultValue="AI/ML enthusiast passionate about job search automation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Location</label>
                <input
                  type="text"
                  placeholder="City, Country"
                  className="input-field w-full"
                  defaultValue="Bangalore, India"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          className="flex-1 sm:flex-none"
        >
          Save Changes
        </Button>
        {saved && (
          <Badge variant="success" className="animate-slideInFromLeft">
            ✓ Changes saved
          </Badge>
        )}
      </div>

      {/* Danger Zone */}
      <Card variant="dark" className="border-l-4 border-l-red-500">
        <div className="space-y-3">
          <h3 className="font-semibold text-red-400">Danger Zone</h3>
          <p className="text-sm text-slate-400">
            These actions cannot be undone. Please be careful.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="danger" size="md">
              Clear All Data
            </Button>
            <Button variant="danger" size="md">
              Delete Account
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
