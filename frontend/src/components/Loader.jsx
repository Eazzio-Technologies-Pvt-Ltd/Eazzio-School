import React from 'react';

export default function Loader({ message = 'Loading workspace data...' }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.spinnerBox}>
        <div style={styles.spinner}></div>
        <p style={styles.message}>{message}</p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    width: '100%',
  },
  spinnerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(139, 92, 246, 0.1)',
    borderTop: '3px solid var(--primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  message: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    fontWeight: '500',
  },
};

// Add standard keyframe spin rule to document style programmatically or reuse standard spinners
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
