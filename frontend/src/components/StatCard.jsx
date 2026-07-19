import React from 'react';

export default function StatCard({ label, value, icon, trend, trendColor = 'var(--success)', onClick }) {
  const isClickable = !!onClick;
  return (
    <div 
      style={{
        ...styles.card,
        cursor: isClickable ? 'pointer' : 'default',
        transform: isClickable ? 'scale(1)' : 'none',
        transition: 'transform 0.2s ease, background 0.2s ease'
      }} 
      className="animate-fade-in"
      onClick={onClick}
      onMouseEnter={(e) => {
        if (isClickable) {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (isClickable) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.background = 'var(--bg-card)';
        }
      }}
    >
      <div style={styles.left}>
        <span style={styles.label}>{label}</span>
        <span style={styles.value}>{value}</span>
        {trend && (
          <span style={{ ...styles.trend, color: trendColor }}>
            {trend}
          </span>
        )}
      </div>
      <div style={styles.right}>
        <div style={styles.iconCircle}>
          <span style={styles.icon}>{icon}</span>
        </div>
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    transition: 'var(--transition-fast)',
    flex: 1,
    minWidth: '240px',
  },
  left: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  value: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  trend: {
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  right: {
    display: 'flex',
  },
  iconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid var(--border-glow)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: '1.4rem',
  },
};
