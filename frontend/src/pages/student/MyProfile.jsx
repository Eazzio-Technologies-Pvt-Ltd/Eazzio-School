import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getProfile, changePassword } from '../../api/studentApi';
import Loader from '../../components/Loader';

export default function MyProfile() {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState('');
  const [pwdError, setPwdError] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdMessage('');
    setPwdError('');

    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError('Password must be at least 6 characters.');
      return;
    }

    setPwdLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPwdMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwdError(err.response?.data?.error || err.message || 'Failed to change password.');
    } finally {
      setPwdLoading(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getProfile();
        setProfile(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  if (loading) return <Loader message="Loading profile credentials..." />;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>Student Profile Specifications</h2>
        <p style={styles.sub}>Personal credentials, enrollment details, and course registrations.</p>
      </div>

      <div style={styles.pane}>
        <div style={styles.avatarLarge}>
          {user?.name ? user.name[0].toUpperCase() : 'S'}
        </div>

        <div style={styles.infoList}>
          <div style={styles.infoItem}>
            <span style={styles.label}>Full Student Name</span>
            <span style={styles.value}>{user?.name}</span>
          </div>

          <div style={styles.infoItem}>
            <span style={styles.label}>Email Address / Login ID</span>
            <span style={styles.value}>{user?.email || profile?.studentId}</span>
          </div>

          <div style={styles.infoItem}>
            <span style={styles.label}>Father's Name</span>
            <span style={styles.value}>{profile?.fatherName || 'N/A'}</span>
          </div>

          <div style={styles.infoItem}>
            <span style={styles.label}>Mother's Name</span>
            <span style={styles.value}>{profile?.motherName || 'N/A'}</span>
          </div>

          <div style={styles.infoItem}>
            <span style={styles.label}>Phone Number</span>
            <span style={styles.value}>{profile?.phone || 'N/A'}</span>
          </div>
          
          <div style={styles.infoItem}>
            <span style={styles.label}>Address</span>
            <span style={styles.value}>{profile?.address || 'N/A'}</span>
          </div>
          
          <div style={styles.infoItem}>
            <span style={styles.label}>Admission Date</span>
            <span style={styles.value}>{profile?.admissionDate ? new Date(profile.admissionDate).toLocaleDateString() : 'N/A'}</span>
          </div>

          <div style={styles.infoItem}>
            <span style={styles.label}>System Role Assignment</span>
            <span style={styles.value}>{user?.role}</span>
          </div>

          <div style={styles.infoItem}>
            <span style={styles.label}>Roll Number Identifier</span>
            <span style={{ ...styles.value, color: 'var(--primary)', fontWeight: '700' }}>
              {profile?.rollNumber || 'N/A'}
            </span>
          </div>

          <div style={styles.infoItem}>
            <span style={styles.label}>Assigned Course / Grade</span>
            <span style={{ ...styles.value, color: 'var(--primary)', fontWeight: '700' }}>
              {profile?.course ? `${profile.course.courseName}-${profile.course.section}` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div style={styles.pane}>
        <div style={{ ...styles.header, marginBottom: '20px', width: '100%' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>Security Settings</h3>
          <p style={styles.sub}>Change your account password.</p>
        </div>

        {pwdError && (
          <div style={{ ...styles.alert, background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>
            <span>⚠️</span> {pwdError}
          </div>
        )}

        {pwdMessage && (
          <div style={{ ...styles.alert, background: '#f0fdf4', color: '#22c55e', border: '1px solid #bbf7d0' }}>
            <span>✅</span> {pwdMessage}
          </div>
        )}

        <form onSubmit={handlePasswordChange} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Current Password</label>
            <input
              type="password"
              style={styles.input}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>New Password</label>
            <input
              type="password"
              style={styles.input}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Confirm New Password</label>
            <input
              type="password"
              style={styles.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={pwdLoading} style={styles.submitBtn}>
            {pwdLoading ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
    maxWidth: '600px',
  },
  header: {
    marginBottom: '10px',
  },
  sub: {
    color: 'var(--text-secondary)',
  },
  pane: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '40px 32px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '30px',
  },
  avatarLarge: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary), #a78bfa)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '2.5rem',
    fontWeight: '800',
    color: '#fff',
    boxShadow: '0 0 20px var(--primary-glow)',
  },
  infoList: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '12px',
  },
  label: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: '600',
  },
  value: {
    fontSize: '1.05rem',
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
  alert: {
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    marginBottom: '16px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    width: '100%',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inputLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
  },
  submitBtn: {
    padding: '12px',
    fontSize: '0.95rem',
    borderRadius: '8px',
    backgroundColor: 'var(--primary)',
    border: 'none',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'opacity 0.2s',
  },
};
