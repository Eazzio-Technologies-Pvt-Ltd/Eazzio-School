import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Loader from '../../components/Loader';
import AccountantFeeStructure from './AccountantFeeStructure';
import AccountantClasses from './AccountantClasses';

export default function AccountantSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('settings');
  const [settings, setSettings] = useState({
    feeDueDay: 10,
    collectFeeAnyDay: true,
    allowPartPayment: false,
    lateFineAmount: 150
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/accountant/settings');
      // Axios interceptor unwraps response.data to response.data.data
      if (response.data) {
        setSettings(response.data);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSettingField = async (field, value) => {
    const updatedSettings = { ...settings, [field]: value };
    setSettings(updatedSettings);
    try {
      setError('');
      setSuccessMsg('');
      const response = await api.put('/accountant/settings', updatedSettings);
      if (response.data) {
        setSettings(response.data);
        setSuccessMsg('Setting auto-saved successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error('Error auto-saving setting:', err);
      setError('Failed to auto-save setting. Please try again.');
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccessMsg('');
      const response = await api.put('/accountant/settings', settings);
      if (response.data) {
        setSettings(response.data);
        setSuccessMsg('Settings updated successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to update settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader message="Fetching fee settings..." />;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.headerRow}>
        <div>
          <h2>⚙️ Accountant Settings</h2>
          <p style={styles.sub}>Configure dynamic fee deadlines, monthly collect options, and manage academic courses.</p>
        </div>
      </div>

      {/* Tab system */}
      <div style={styles.tabContainer}>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            ...styles.tabButton,
            borderBottom: activeTab === 'settings' ? '3px solid var(--primary)' : 'none',
            color: activeTab === 'settings' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'settings' ? '700' : '500',
          }}
        >
          ⚙️ Fee Rules & Settings
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          style={{
            ...styles.tabButton,
            borderBottom: activeTab === 'courses' ? '3px solid var(--primary)' : 'none',
            color: activeTab === 'courses' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'courses' ? '700' : '500',
          }}
        >
          🏫 Manage Courses
        </button>
      </div>

      {activeTab === 'settings' ? (
        <>
          {error && (
            <div style={styles.errorAlert}>
              ⚠️ {error}
            </div>
          )}

          {successMsg && (
            <div style={styles.successAlert}>
              ✅ {successMsg}
            </div>
          )}

          <form onSubmit={handleSave} style={styles.panel}>
            <h3 style={styles.sectionTitle}>💰 Fee Management & Guidelines</h3>
            <p style={styles.panelDesc}>These rules dictate how invoices are settled, when fines are applied, and who can make partial payments.</p>
            
            <div style={styles.divider}></div>

            {/* Option 1: Fee Collection Date */}
            <div style={styles.settingGroup}>
              <div style={styles.settingText}>
                <label style={styles.label}>1. Fee Collection Due Date</label>
                <p style={styles.desc}>Define the day of the month by which students must pay their fees. Any payments recorded after this date will incur a late fee fine.</p>
              </div>
              <div style={styles.settingInputContainer}>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={settings.feeDueDay}
                  onChange={(e) => setSettings({ ...settings, feeDueDay: parseInt(e.target.value) || 1 })}
                  onBlur={() => updateSettingField('feeDueDay', settings.feeDueDay)}
                  style={styles.numberInput}
                />
                <span style={styles.suffix}>of every month</span>
              </div>
            </div>

            {/* Option 2: Collect Fee Any Date */}
            <div style={styles.settingGroup}>
              <div style={styles.settingText}>
                <label style={styles.label}>2. Collect Fee Any Date of Month</label>
                <p style={styles.desc}>If checked, fee collections can be recorded on any calendar date. If unchecked, payments are blocked after the due date has passed.</p>
              </div>
              <div style={styles.settingInputContainer}>
                <label style={styles.switchLabel}>
                  <input
                    type="checkbox"
                    checked={settings.collectFeeAnyDay}
                    onChange={(e) => updateSettingField('collectFeeAnyDay', e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                    {settings.collectFeeAnyDay ? 'Allowed on any date' : 'Restrict to due date'}
                  </span>
                </label>
              </div>
            </div>

            {/* Option 3: Allow Part Payment */}
            <div style={styles.settingGroup}>
              <div style={styles.settingText}>
                <label style={styles.label}>3. Allow Part Payment</label>
                <p style={styles.desc}>If checked, accountants can record partial / custom amount payments. If unchecked, invoices must be paid in full.</p>
              </div>
              <div style={styles.settingInputContainer}>
                <label style={styles.switchLabel}>
                  <input
                    type="checkbox"
                    checked={settings.allowPartPayment}
                    onChange={(e) => updateSettingField('allowPartPayment', e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                    {settings.allowPartPayment ? 'Allow partial installments' : 'Force full payments'}
                  </span>
                </label>
              </div>
            </div>

            {/* Option 4: Fine Adjustment */}
            <div style={styles.settingGroup}>
              <div style={styles.settingText}>
                <label style={styles.label}>4. Fine Adjustment</label>
                <p style={styles.desc}>Specify the fixed late fine amount (in ₹) that will be automatically added to any invoices paid after the due date.</p>
              </div>
              <div style={styles.settingInputContainer}>
                <span style={styles.suffix}>₹</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={settings.lateFineAmount}
                  onChange={(e) => setSettings({ ...settings, lateFineAmount: parseInt(e.target.value) || 0 })}
                  onBlur={() => updateSettingField('lateFineAmount', settings.lateFineAmount)}
                  style={styles.numberInput}
                />
              </div>
            </div>

            <div style={styles.formActions}>
              <button type="submit" disabled={saving} style={styles.submitBtn}>
                {saving ? 'Saving...' : '💾 Save Settings'}
              </button>
            </div>
          </form>
          
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--glass-border)', paddingTop: '24px' }}>
            <AccountantFeeStructure />
          </div>
        </>
      ) : (
        <AccountantClasses />
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  tabContainer: {
    display: 'flex',
    gap: '24px',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '0px',
    marginBottom: '8px',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    padding: '12px 16px',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sub: {
    color: 'var(--text-secondary)',
    margin: '4px 0 0 0',
  },
  errorAlert: {
    padding: '12px 20px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
  },
  successAlert: {
    padding: '12px 20px',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid var(--success)',
    color: 'var(--success)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
  },
  panel: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '30px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  panelDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    margin: '6px 0 0 0',
  },
  divider: {
    height: '1px',
    background: 'var(--glass-border)',
    margin: '24px 0',
  },
  settingGroup: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    gap: '30px',
    alignItems: 'center',
    paddingBottom: '24px',
    marginBottom: '24px',
    borderBottom: '1px dashed var(--glass-border)',
  },
  settingText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  desc: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: '1.4',
  },
  settingInputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  numberInput: {
    width: '80px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    fontWeight: '600',
    outline: 'none',
    textAlign: 'center',
  },
  suffix: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: 'var(--primary)',
  },
  switchLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '12px',
  },
  submitBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, var(--primary) 0%, #a78bfa 100%)',
    border: 'none',
    color: '#ffffff',
    borderRadius: 'var(--radius-sm)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
  },
};
