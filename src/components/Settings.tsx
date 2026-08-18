import React, { useEffect, useState } from 'react';
import { Bell, Volume2, Lock, Smartphone, RefreshCw } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { api, getErrorMessage, type UserProfile } from '../services/api';

interface LocalSettingsState {
  notifications: boolean;
  emailAlerts: boolean;
  voiceOutput: boolean;
  twoFactor: boolean;
  autoApply: boolean;
  dailySummary: boolean;
}

const DEFAULT_LOCAL_SETTINGS: LocalSettingsState = {
  notifications: true,
  emailAlerts: true,
  voiceOutput: true,
  twoFactor: false,
  autoApply: false,
  dailySummary: true,
};

export const Settings: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [localSettings, setLocalSettings] = useState<LocalSettingsState>(DEFAULT_LOCAL_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.memory.get();
      setProfile(result.user_profile);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleToggle = (key: keyof LocalSettingsState) => {
    setLocalSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleProfileChange = (key: keyof UserProfile, value: string) => {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await api.memory.updateProfile(profile);
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const SettingRow: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    toggle: keyof LocalSettingsState;
  }> = ({ icon, title, description, toggle }) => (
    <Card variant="default" hover>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="text-fuchsia-400 mt-1">{icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-sm text-zinc-400">{description}</p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={localSettings[toggle]}
            onChange={() => handleToggle(toggle)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-fuchsia-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fuchsia-500" />
        </label>
      </div>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      {error && (
        <Card variant="dark" className="border-l-4 border-l-red-500">
          <div className="flex items-center justify-between gap-4">
            <p className="text-red-300 text-sm">{error}</p>
            <button
              onClick={loadProfile}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-200 transition-colors flex-shrink-0"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        </Card>
      )}

      {/* Notifications */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="text-fuchsia-400" size={20} />
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
        </div>
      </div>

      {/* Privacy & Security */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Lock className="text-fuchsia-400" size={20} />
          <h2 className="text-lg font-bold text-white">Privacy & Security</h2>
        </div>

        <div className="space-y-3">
          <SettingRow
            icon={<Lock size={20} />}
            title="Two-Factor Authentication"
            description="Add an extra layer of security to your account"
            toggle="twoFactor"
          />
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
                  value={profile?.email ?? ''}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Full Name</label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={profile?.name ?? ''}
                  onChange={(e) => handleProfileChange('name', e.target.value)}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Target Role</label>
                <input
                  type="text"
                  placeholder="Target Role"
                  value={profile?.target_role ?? ''}
                  onChange={(e) => handleProfileChange('target_role', e.target.value)}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Bio</label>
                <textarea
                  placeholder="Tell us about yourself"
                  value={profile?.bio ?? ''}
                  onChange={(e) => handleProfileChange('bio', e.target.value)}
                  className="input-field w-full min-h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Location</label>
                <input
                  type="text"
                  placeholder="City, Country"
                  value={profile?.target_location ?? ''}
                  onChange={(e) => handleProfileChange('target_location', e.target.value)}
                  className="input-field w-full"
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
          loading={isSaving}
          disabled={!profile}
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
          <p className="text-sm text-zinc-400">
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
