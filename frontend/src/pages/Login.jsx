import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import logo from '../assets/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // AuthContext handles setting state and localStorage
      // Redirect to unified /dashboard route which routes correctly based on role
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>

      <div style={styles.card} className="animate-fade-in">
        <div style={styles.header}>
          <div style={styles.logoRing}>
            <img src={logo} alt="Eazzio Logo" style={{ width: '180px', height: 'auto', objectFit: 'contain' }} />
          </div>
        </div>

        {error && (
          <div id="login-error" style={styles.errorAlert}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="text"
              placeholder="Email or ID (e.g. principal@school.com or S12345)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              required
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={styles.submitBtn}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>



        <div style={styles.footer}>
          <p style={styles.footerText}>Secure Role-Based Access System</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
    position: 'relative',
  },
  cornerToggleBtn: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-primary)',
    padding: '10px 16px',
    borderRadius: '24px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    boxShadow: 'var(--shadow-glow)',
    transition: 'var(--transition-fast)',
  },
  card: {
    background: 'var(--bg-card)',
    backdropFilter: 'blur(16px)',
    border: '1px solid var(--border-glow)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px 32px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: 'var(--shadow-glow)',
    animation: 'pulseGlow 6s infinite alternate',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '32px',
  },
  logoRing: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    background: 'var(--title-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  errorAlert: {
    background: 'var(--danger-glow)',
    border: '1px solid var(--danger)',
    color: '#fca5a5',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    marginBottom: '20px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  submitBtn: {
    padding: '14px',
    fontSize: '1rem',
    marginTop: '10px',
  },
  demoSection: {
    marginTop: '24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '20px',
  },
  demoTitle: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginBottom: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'center',
  },
  badgeContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    flexWrap: 'wrap',
  },
  demoBadge: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-primary)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'var(--transition-fast)',
    whiteSpace: 'nowrap',
    '&:hover': {
      background: 'rgba(139, 92, 246, 0.1)',
      borderColor: 'var(--primary)',
    },
  },
  footer: {
    marginTop: '28px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
};
