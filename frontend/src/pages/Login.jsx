import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Shield, Briefcase, Calculator, BookOpen, GraduationCap, ArrowLeft } from 'lucide-react';
import logo from '../assets/full_logo_cropped.png';
import schoolBg from '../assets/school_background.jpg';

export default function Login() {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') || 'admin';
  const [role, setRole] = useState(defaultRole);
  const [showBanner, setShowBanner] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const { login, changePassword } = useContext(AuthContext);
  const navigate = useNavigate();

  // If role changes via URL, update state
  useEffect(() => {
    const urlRole = searchParams.get('role');
    if (urlRole) {
      setRole(urlRole);
    }
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password, role);
      if (res && res.requirePasswordChange) {
        setRequirePasswordChange(true);
        setTempToken(res.tempToken);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await changePassword(tempToken, newPassword);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'admin', label: 'Admin', icon: <Shield size={18} /> },
    { id: 'principal', label: 'Principal', icon: <Briefcase size={18} /> },
    { id: 'accountant', label: 'Accountant', icon: <Calculator size={18} /> },
    { id: 'teacher', label: 'Teacher', icon: <BookOpen size={18} /> },
    { id: 'student', label: 'Student', icon: <GraduationCap size={18} /> },
  ];

  return (
    <div style={{...styles.container, backgroundImage: `url(${schoolBg})`}}>
      <div style={styles.overlay}></div>
      
      {showBanner && (
        <div style={styles.securityBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
            <span>🔒</span>
            <span>Your data is safe and secure with us — Encrypted by AES 256-bit Encryption</span>
          </div>
          <button onClick={() => setShowBanner(false)} style={styles.bannerCloseBtn}>✕</button>
        </div>
      )}

      <div style={styles.navBar}>
        <Link to="/" style={styles.navLink}>
          <ArrowLeft size={16} style={{marginRight: '6px'}} /> Back to Home
        </Link>
      </div>

      <div style={styles.content}>
        <div style={styles.card} className="animate-fade-in">
          {/* Left Column: Logo and Roles */}
          <div style={styles.leftColumn}>
            <div style={styles.header}>
              <div style={styles.logoRing}>
                <img src={logo} alt="Eazzio Logo" style={{ width: '180px', height: 'auto', objectFit: 'contain' }} />
              </div>
            </div>

            <div style={styles.roleSelector}>
              {roles.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  style={role === r.id ? styles.roleBtnActive : styles.roleBtn}
                >
                  {r.icon}
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Login Form */}
          <div style={styles.rightColumn}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={styles.title}>{requirePasswordChange ? 'Set New Password' : 'Welcome Back'}</h2>
              <p style={styles.subtitle}>{requirePasswordChange ? 'Please set a private password to secure your account' : `Sign in to your ${role} account`}</p>
            </div>

            {error && (
              <div id="login-error" style={styles.errorAlert}>
                <span>⚠️</span> {error}
              </div>
            )}


            {requirePasswordChange ? (
              <form onSubmit={handlePasswordChange} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label htmlFor="new-password">New Password</label>
                  <input
                    id="new-password"
                    type="password"
                    placeholder="Enter new private password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label htmlFor="confirm-password">Confirm Password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={styles.submitBtn}
                >
                  {loading ? 'Saving...' : 'Set New Password & Login'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label htmlFor="login-email">Email Address / ID</label>
                  <input
                    id="login-email"
                    type="text"
                    placeholder={`Enter your ${role} email or ID`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  style={styles.submitBtn}
                >
                  {loading ? 'Authenticating...' : `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    fontFamily: "'Inter', sans-serif",
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    zIndex: 0,
  },
  securityBanner: {
    width: '100%',
    backgroundColor: '#0f172a',
    color: 'white',
    padding: '8px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
    zIndex: 10,
    position: 'relative',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  bannerCloseBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0 8px',
    transition: 'color 0.2s'
  },
  navBar: {
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  navLink: {
    color: 'white',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '8px 16px',
    borderRadius: '20px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '10px 20px 40px',
    position: 'relative',
    zIndex: 1,
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '30px 40px',
    width: '100%',
    maxWidth: '850px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    alignItems: 'center',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #e2e8f0',
    paddingRight: '40px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '24px',
  },
  logoRing: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '8px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: '4px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#64748b',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  errorAlert: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#ef4444',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    marginBottom: '20px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  roleSelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  roleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#64748b',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  roleBtnActive: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #22c55e',
    background: 'rgba(34, 197, 94, 0.05)',
    color: '#22c55e',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.15)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#475569',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#0f172a',
    fontSize: '0.9rem',
    transition: 'border-color 0.2s',
    outline: 'none',
  },
  submitBtn: {
    padding: '12px',
    fontSize: '1rem',
    borderRadius: '8px',
    width: '100%',
    marginTop: '8px',
    backgroundColor: '#1e3a8a',
    border: 'none',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(30, 58, 138, 0.3)',
    transition: 'opacity 0.2s',
  },
};
