import React from 'react';

export default function ChartCard({ title, value = 0, subtitle, color = 'var(--primary)' }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div style={styles.card} className="animate-fade-in">
      <h3 style={styles.title}>{title}</h3>
      <div style={styles.content}>
        <div style={styles.chartContainer}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="var(--glass-border)"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
            />
          </svg>
          <div style={styles.labelOverlay}>
            <span style={styles.labelText}>{value}%</span>
          </div>
        </div>
        {subtitle && (
          <p style={styles.subtitle}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    flex: 1,
    minWidth: '280px',
  },
  title: {
    fontSize: '1rem',
    fontWeight: '700',
    marginBottom: '16px',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '8px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  chartContainer: {
    position: 'relative',
    display: 'inline-flex',
  },
  labelOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelText: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    textAlign: 'center',
  },
};
