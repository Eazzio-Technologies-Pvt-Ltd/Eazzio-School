import React from 'react';

export default function EmptyState({ icon = '📂', title = 'No Records Found', description = 'Try adjusting your search criteria or register a new record.' }) {
  return (
    <div style={styles.card}>
      <span style={styles.icon}>{icon}</span>
      <h4 style={styles.title}>{title}</h4>
      <p style={styles.desc}>{description}</p>
    </div>
  );
}

const styles = {
  card: {
    background: 'var(--glass-bg)',
    border: '1px dashed var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '40px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    margin: '20px 0',
  },
  icon: {
    fontSize: '2.5rem',
    marginBottom: '8px',
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  desc: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    maxWidth: '320px',
  },
};
