import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.card} className="animate-fade-in">
        <span style={styles.icon}>🔍</span>
        <h1 style={styles.title}>404 - Not Found</h1>
        <p style={styles.subtitle}>
          The directory path or portal view you are trying to visit does not exist or has been shifted.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-primary"
          style={styles.actionBtn}
        >
          Return to Dashboard
        </button>
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
  },
  card: {
    background: 'var(--bg-card)',
    backdropFilter: 'blur(16px)',
    border: '1px solid var(--border-glow)',
    borderRadius: 'var(--radius-md)',
    padding: '40px 30px',
    textAlign: 'center',
    maxWidth: '440px',
    boxShadow: 'var(--shadow-glow)',
  },
  icon: {
    fontSize: '3.5rem',
    display: 'block',
    marginBottom: '16px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    background: 'var(--title-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '12px',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    marginBottom: '24px',
  },
  actionBtn: {
    padding: '12px 28px',
    fontSize: '0.95rem',
  },
};
