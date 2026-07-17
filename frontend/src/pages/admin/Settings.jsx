import React, { useState } from 'react';

export default function Settings() {
  const [schoolName, setSchoolName] = useState('EduSphere Academy');
  const [term, setTerm] = useState('First Semester - 2026');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback('');
    setTimeout(() => {
      setSaving(false);
      setFeedback('Settings saved successfully!');
    }, 1000);
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>System & School Settings</h2>
        <p style={styles.sub}>Configure regional parameters and portal branding variables.</p>
      </div>

      <div style={styles.pane}>
        {feedback && (
          <div style={styles.successFeedback}>
            ✅ {feedback}
          </div>
        )}

        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="school-name">School Institution Name</label>
            <input
              id="school-name"
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="school-term">Active Academic Session / Term</label>
            <input
              id="school-term"
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="school-system">System Mode</label>
            <select id="school-system" defaultValue="development">
              <option value="development">Prototype Demo Mode</option>
              <option value="production">Production Secure Mode</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={styles.saveBtn}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
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
    padding: '32px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
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
  saveBtn: {
    alignSelf: 'flex-start',
    padding: '12px 28px',
    fontSize: '0.95rem',
    marginTop: '10px',
  },
  successFeedback: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid var(--success)',
    color: '#a7f3d0',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    marginBottom: '20px',
  },
};
