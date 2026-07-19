import React, { useState, useEffect } from 'react';
import { getProfile, updateProfile, changePassword } from '../../api/studentApi';
import Loader from '../../components/Loader';
import { User, Lock, Bell, Palette, Save, CheckCircle } from 'lucide-react';

export default function StudentSettings() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Profile Form State
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password Form State
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });
  const [savingPass, setSavingPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Preferences (Client-side mock)
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(true);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const res = await getProfile();
        setProfile(res);
        setPhone(res.phone || '');
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess('');
    try {
      const res = await updateProfile({ phone });
      setProfile(res);
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (passForm.newPass !== passForm.confirm) {
      return setPassError('New passwords do not match');
    }
    if (passForm.newPass.length < 6) {
      return setPassError('Password must be at least 6 characters');
    }

    setSavingPass(true);
    try {
      await changePassword(passForm.current, passForm.newPass);
      setPassSuccess('Password changed successfully!');
      setPassForm({ current: '', newPass: '', confirm: '' });
      setTimeout(() => setPassSuccess(''), 3000);
    } catch (err) {
      setPassError(err.response?.data?.error || 'Failed to change password. Please check your current password.');
    } finally {
      setSavingPass(false);
    }
  };

  if (loading) return <Loader message="Loading Settings..." />;
  if (!profile) return null;

  return (
    <div className="flex flex-col gap-8 animate-fade-in text-gray-800 max-w-4xl">
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Settings</h2>
        <p className="text-gray-500">Manage your profile, security, and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Profile & Contact Details */}
        <div className="md:col-span-2 flex flex-col gap-8">
          
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <div className="bg-gray-50 p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <User className="text-emerald-500" size={20} />
                Profile Information
              </h3>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="p-6 flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Full Name</label>
                  <input type="text" value={profile.name} disabled className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed" />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Student ID</label>
                  <input type="text" value={profile.studentId} disabled className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed font-mono" />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Course & Section</label>
                  <input type="text" value={profile.course ? `${profile.course.courseName} - ${profile.course.section}` : 'N/A'} disabled className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed" />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Roll Number</label>
                  <input type="text" value={profile.rollNumber || 'N/A'} disabled className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed" />
                </div>
              </div>

              <hr className="border-gray-100 my-2" />

              <div className="flex flex-col gap-1.5 max-w-sm">
                <label className="text-sm font-semibold text-gray-700">Phone Number</label>
                <input 
                  type="text" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter contact number"
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" 
                />
              </div>

              <div className="flex items-center gap-4 mt-2">
                <button 
                  type="submit" 
                  disabled={savingProfile || phone === (profile.phone || '')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Save size={18} />
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
                
                {profileSuccess && (
                  <span className="text-emerald-600 text-sm font-medium flex items-center gap-1 animate-fade-in">
                    <CheckCircle size={16} /> {profileSuccess}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <div className="bg-gray-50 p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Lock className="text-amber-500" size={20} />
                Change Password
              </h3>
            </div>
            
            <form onSubmit={handlePasswordChange} className="p-6 flex flex-col gap-5">
              
              {passError && <div className="p-3 bg-red-50 text-red-700 text-sm border border-red-200 rounded-lg">{passError}</div>}
              {passSuccess && <div className="p-3 bg-emerald-50 text-emerald-700 text-sm border border-emerald-200 rounded-lg">{passSuccess}</div>}

              <div className="flex flex-col gap-1.5 max-w-sm">
                <label className="text-sm font-semibold text-gray-700">Current Password</label>
                <input 
                  type="password" 
                  required
                  value={passForm.current}
                  onChange={(e) => setPassForm({...passForm, current: e.target.value})}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" 
                />
              </div>

              <div className="flex flex-col gap-1.5 max-w-sm">
                <label className="text-sm font-semibold text-gray-700">New Password</label>
                <input 
                  type="password" 
                  required
                  value={passForm.newPass}
                  onChange={(e) => setPassForm({...passForm, newPass: e.target.value})}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" 
                />
              </div>

              <div className="flex flex-col gap-1.5 max-w-sm">
                <label className="text-sm font-semibold text-gray-700">Confirm New Password</label>
                <input 
                  type="password" 
                  required
                  value={passForm.confirm}
                  onChange={(e) => setPassForm({...passForm, confirm: e.target.value})}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" 
                />
              </div>

              <div className="mt-2">
                <button 
                  type="submit" 
                  disabled={savingPass}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Lock size={18} />
                  {savingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Sidebar Preferences */}
        <div className="md:col-span-1 flex flex-col gap-6">
          
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Bell className="text-pink-500" size={20} />
              Notifications
            </h3>
            
            <div className="flex flex-col gap-4 mt-4">
              <label className="flex justify-between items-center cursor-pointer">
                <span className="text-sm font-medium text-gray-700">Email Alerts</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={emailNotif} onChange={() => setEmailNotif(!emailNotif)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${emailNotif ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${emailNotif ? 'transform translate-x-4' : ''}`}></div>
                </div>
              </label>

              <label className="flex justify-between items-center cursor-pointer">
                <span className="text-sm font-medium text-gray-700">SMS Alerts</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={smsNotif} onChange={() => setSmsNotif(!smsNotif)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${smsNotif ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${smsNotif ? 'transform translate-x-4' : ''}`}></div>
                </div>
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-4 italic">* These preferences are saved locally.</p>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Palette className="text-blue-500" size={20} />
              Appearance
            </h3>
            
            <div className="flex flex-col gap-3 mt-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <input 
                  type="radio" 
                  name="theme" 
                  value="light"
                  checked={theme === 'light'} 
                  onChange={() => setTheme('light')}
                  className="text-emerald-600 focus:ring-emerald-500 h-4 w-4" 
                />
                <span className="text-sm font-medium text-gray-800">Light Mode</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <input 
                  type="radio" 
                  name="theme" 
                  value="dark"
                  checked={theme === 'dark'} 
                  onChange={() => setTheme('dark')}
                  className="text-emerald-600 focus:ring-emerald-500 h-4 w-4" 
                />
                <span className="text-sm font-medium text-gray-800">Dark Mode</span>
              </label>
            </div>
             <p className="text-xs text-gray-400 mt-4 italic">* Theme is currently locked to Light for brand consistency.</p>
          </div>

        </div>

      </div>
    </div>
  );
}
