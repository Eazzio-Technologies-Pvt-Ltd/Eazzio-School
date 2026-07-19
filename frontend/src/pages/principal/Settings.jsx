import React, { useState, useEffect } from 'react';
import { getPrincipalSettings, updatePrincipalProfile, updatePrincipalPassword } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { 
  User, Lock, Bell, BookOpen, Monitor, Building, 
  CheckCircle2, AlertCircle, Save, ShieldCheck, FileText 
} from 'lucide-react';
import ReportsTab from './ReportsTab';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [principal, setPrincipal] = useState({ name: '', email: '', phone: '' });
  const [school, setSchool] = useState({});
  
  // Feedback
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await getPrincipalSettings();
      if (res.data) {
        setPrincipal({
          name: res.data.principal.name || '',
          email: res.data.principal.email || '',
          phone: res.data.principal.phone || ''
        });
        setSchool(res.data.school || {});
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Failed to load settings.' });
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
  };

  const renderContent = () => {
    if (loading) return <div className="p-8"><Loader message="Loading settings..." /></div>;
    
    switch (activeTab) {
      case 'profile':
        return <ProfileTab principal={principal} setPrincipal={setPrincipal} showFeedback={showFeedback} />;
      case 'password':
        return <PasswordTab showFeedback={showFeedback} />;
      case 'notifications':
        return <NotificationsTab showFeedback={showFeedback} />;
      case 'academic':
        return <AcademicTab showFeedback={showFeedback} />;
      case 'appearance':
        return <AppearanceTab showFeedback={showFeedback} />;
      case 'security':
        return <SecurityTab showFeedback={showFeedback} />;
      case 'reports':
        return <ReportsTab />;
      case 'institution':
        return <InstitutionTab school={school} />;
      default:
        return null;
    }
  };

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: <User size={18} /> },
    { id: 'password', label: 'Change Password', icon: <Lock size={18} /> },
    { id: 'security', label: 'Security (2FA)', icon: <ShieldCheck size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'academic', label: 'Academic Defaults', icon: <BookOpen size={18} /> },
    { id: 'appearance', label: 'Appearance', icon: <Monitor size={18} /> },
    { id: 'reports', label: 'Reports & Audits', icon: <FileText size={18} /> },
    { id: 'institution', label: 'Institution Info', icon: <Building size={18} /> },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-gray-800 pb-10">
      <div className="flex flex-col">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h2>
        <p className="text-gray-500 mt-1">Manage your personal profile, security, and preferences.</p>
      </div>

      {feedback.message && (
        <div className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${feedback.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
          {feedback.type === 'error' ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
          <p>{feedback.message}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col p-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-emerald-600' : 'text-gray-400'}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 w-full min-h-[400px]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// --- Tab Components ---

const ProfileTab = ({ principal, setPrincipal, showFeedback }) => {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updatePrincipalProfile(principal);
      setPrincipal(res.data);
      showFeedback('success', 'Profile updated successfully.');
    } catch (err) {
      showFeedback('error', err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-100 pb-4">Personal Profile</h3>
      <form onSubmit={handleSubmit} className="max-w-md flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
          <input
            type="text"
            value={principal.name}
            onChange={e => setPrincipal({...principal, name: e.target.value})}
            required
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
          <input
            type="email"
            value={principal.email}
            onChange={e => setPrincipal({...principal, email: e.target.value})}
            required
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
          <input
            type="text"
            value={principal.phone}
            onChange={e => setPrincipal({...principal, phone: e.target.value})}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-sm w-fit flex items-center gap-2"
        >
          <Save size={16} /> {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

const PasswordTab = ({ showFeedback }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return showFeedback('error', 'New passwords do not match.');
    }
    setSaving(true);
    try {
      await updatePrincipalPassword({ currentPassword, newPassword });
      showFeedback('success', 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showFeedback('error', err.response?.data?.error || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-100 pb-4">Change Password</h3>
      <form onSubmit={handleSubmit} className="max-w-md flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-sm w-fit flex items-center gap-2"
        >
          <Lock size={16} /> {saving ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
};

const NotificationsTab = ({ showFeedback }) => {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-100 pb-4 flex items-center">
        Notification Preferences
        <span className="ml-3 bg-gray-100 text-gray-500 text-xs font-bold uppercase px-2.5 py-0.5 rounded-md border border-gray-200">Coming Soon</span>
      </h3>
      <div className="max-w-md flex flex-col gap-6 opacity-60 pointer-events-none">
        
        <label className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800">Email Alerts</p>
            <p className="text-xs text-gray-500">Receive critical system alerts via email.</p>
          </div>
          <div className="relative">
            <input type="checkbox" className="sr-only" checked={emailAlerts} readOnly />
            <div className={`block w-10 h-6 rounded-full transition-colors ${emailAlerts ? 'bg-gray-400' : 'bg-gray-300'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${emailAlerts ? 'translate-x-4' : ''}`}></div>
          </div>
        </label>

        <label className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800">SMS Alerts</p>
            <p className="text-xs text-gray-500">Receive critical alerts via SMS (charges may apply).</p>
          </div>
          <div className="relative">
            <input type="checkbox" className="sr-only" checked={smsAlerts} readOnly />
            <div className={`block w-10 h-6 rounded-full transition-colors ${smsAlerts ? 'bg-gray-400' : 'bg-gray-300'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${smsAlerts ? 'translate-x-4' : ''}`}></div>
          </div>
        </label>

        <label className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800">Weekly Digest</p>
            <p className="text-xs text-gray-500">Receive a weekly summary of school activities.</p>
          </div>
          <div className="relative">
            <input type="checkbox" className="sr-only" checked={weeklyDigest} readOnly />
            <div className={`block w-10 h-6 rounded-full transition-colors ${weeklyDigest ? 'bg-gray-400' : 'bg-gray-300'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${weeklyDigest ? 'translate-x-4' : ''}`}></div>
          </div>
        </label>

        <button disabled className="mt-4 bg-gray-300 text-gray-500 font-medium py-2.5 px-6 rounded-lg shadow-sm w-fit flex items-center gap-2 cursor-not-allowed">
          <Save size={16} /> Save Preferences
        </button>
      </div>
    </div>
  );
};

const AcademicTab = ({ showFeedback }) => {
  const [session, setSession] = useState('2026-2027');
  const [scale, setScale] = useState('GPA');

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-100 pb-4 flex items-center">
        Academic Defaults
        <span className="ml-3 bg-gray-100 text-gray-500 text-xs font-bold uppercase px-2.5 py-0.5 rounded-md border border-gray-200">Coming Soon</span>
      </h3>
      <div className="max-w-md flex flex-col gap-5 opacity-60 pointer-events-none">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Academic Session</label>
          <select value={session} disabled className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm outline-none cursor-not-allowed">
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
            <option value="2027-2028">2027-2028</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Grading Scale</label>
          <select value={scale} disabled className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm outline-none cursor-not-allowed">
            <option value="GPA">4.0 GPA Scale</option>
            <option value="Percentage">Percentage (0-100%)</option>
            <option value="Letter">Letter Grades (A-F)</option>
          </select>
        </div>
        <button disabled className="mt-2 bg-gray-300 text-gray-500 font-medium py-2.5 px-6 rounded-lg shadow-sm w-fit flex items-center gap-2 cursor-not-allowed">
          <Save size={16} /> Save Changes
        </button>
      </div>
    </div>
  );
};

const AppearanceTab = ({ showFeedback }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    showFeedback('success', `Theme updated to ${newTheme} mode.`);
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-100 pb-4 flex items-center">
        Appearance
      </h3>
      <div className="max-w-md flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">UI Theme Preference</label>
          <div className="grid grid-cols-3 gap-3">
            <div 
              onClick={() => handleThemeChange('light')}
              className={`border rounded-lg p-3 text-center cursor-pointer transition-all ${theme === 'light' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="w-full h-12 bg-white border border-gray-200 rounded mb-2 shadow-sm"></div>
              <span className={`text-sm font-medium ${theme === 'light' ? 'text-emerald-700' : 'text-gray-700'}`}>Light</span>
            </div>
            <div 
              onClick={() => handleThemeChange('dark')}
              className={`border rounded-lg p-3 text-center cursor-pointer transition-all ${theme === 'dark' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="w-full h-12 bg-gray-800 rounded mb-2 shadow-sm border border-gray-700"></div>
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-emerald-700' : 'text-gray-700'}`}>Dark</span>
            </div>
            <div 
              onClick={() => handleThemeChange('system')}
              className={`border rounded-lg p-3 text-center cursor-pointer transition-all ${theme === 'system' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="w-full h-12 bg-gradient-to-r from-white to-gray-800 rounded mb-2 shadow-sm border border-gray-200"></div>
              <span className={`text-sm font-medium ${theme === 'system' ? 'text-emerald-700' : 'text-gray-700'}`}>System</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SecurityTab = ({ showFeedback }) => {
  const [tfa, setTfa] = useState(false);

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-100 pb-4 flex items-center">
        Security
        <span className="ml-3 bg-gray-100 text-gray-500 text-xs font-bold uppercase px-2.5 py-0.5 rounded-md border border-gray-200">Coming Soon</span>
      </h3>
      
      <div className="max-w-2xl flex flex-col gap-8 opacity-60 pointer-events-none">
        
        {/* 2FA */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900 flex items-center gap-2"><ShieldCheck size={18} className="text-gray-500"/> Two-Factor Authentication</h4>
            <p className="text-sm text-gray-500 mt-1">Add an extra layer of security to your account.</p>
          </div>
          <button 
            disabled
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-300 text-gray-500 cursor-not-allowed"
          >
            {tfa ? 'Disable 2FA' : 'Enable 2FA'}
          </button>
        </div>

        {/* Sessions */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Active Sessions</h4>
          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            <div className="p-4 flex justify-between items-center bg-gray-50">
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 text-sm">Windows • Chrome</span>
                <span className="text-xs text-gray-500 font-medium">Current Session (IP: 192.168.1.1)</span>
              </div>
            </div>
            <div className="p-4 flex justify-between items-center bg-gray-50">
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 text-sm">MacBook Pro • Safari</span>
                <span className="text-xs text-gray-500">Last active: 2 days ago</span>
              </div>
              <button disabled className="text-xs font-medium text-gray-400 cursor-not-allowed">Revoke</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InstitutionTab = ({ school }) => {
  return (
    <div className="p-6">
      <div className="flex justify-between items-end mb-6 border-b border-gray-100 pb-4">
        <h3 className="text-lg font-semibold text-gray-900">Institution Info</h3>
        <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full border border-amber-200">
          Managed by Admin
        </span>
      </div>
      
      <div className="max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">School Name</label>
          <input type="text" disabled value={school.schoolName || ''} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">School Code</label>
          <input type="text" disabled value={school.schoolCode || ''} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed font-mono" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Contact Email</label>
          <input type="text" disabled value={school.email || ''} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Phone Number</label>
          <input type="text" disabled value={school.phone || ''} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Address</label>
          <textarea disabled value={school.address || ''} rows={2} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed resize-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Subscription Plan</label>
          <input type="text" disabled value={(school.subscriptionStatus || 'N/A').toUpperCase()} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Capacity Usage</label>
          <input type="text" disabled value={`${school.studentCount || 0} / ${school.maxStudents || 0} Students`} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed" />
        </div>
      </div>
      
      <p className="text-xs text-gray-400 mt-6">
        Note: Institution-level configuration (name, address, quotas, and subscription details) can only be modified from the central Administrator workspace.
      </p>
    </div>
  );
};
