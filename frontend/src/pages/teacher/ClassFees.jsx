import React, { useState, useEffect } from 'react';
import { getClassFees } from '../../api/teacherApi';
import Loader from '../../components/Loader';

export default function ClassFees() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const data = await getClassFees();
        setStudents(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load class fees. Ensure you are assigned to a class.');
      } finally {
        setLoading(false);
      }
    };
    fetchFees();
  }, []);

  if (loading) return <Loader message="Loading class fees..." />;

  const totalExpected = students.reduce((sum, s) => sum + s.totalFees, 0);
  const totalPaid = students.reduce((sum, s) => sum + s.paid, 0);
  const totalPending = students.reduce((sum, s) => sum + s.pending, 0);

  return (
    <div className="animate-fade-in" style={styles.container}>
      <div style={styles.header}>
        <h2>Class Fee Status</h2>
        <p style={styles.sub}>Track payment progress for your assigned students.</p>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      {!error && (
        <>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Total Class Due</span>
              <span style={{...styles.statValue, color: 'var(--primary)'}}>${totalExpected.toLocaleString()}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Total Paid</span>
              <span style={{...styles.statValue, color: 'var(--success)'}}>${totalPaid.toLocaleString()}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Total Pending</span>
              <span style={{...styles.statValue, color: 'var(--warning)'}}>${totalPending.toLocaleString()}</span>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.tableHeader}>
              <h3 style={styles.cardTitle}>Student Roster</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Roll No</th>
                    <th style={styles.th}>Total Billed</th>
                    <th style={styles.th}>Paid</th>
                    <th style={styles.th}>Pending</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr><td colSpan="6" style={styles.noData}>No students found in your class.</td></tr>
                  ) : (
                    students.map(s => (
                      <tr key={s.id} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: 'bold' }}>{s.name}</td>
                        <td style={styles.td}>{s.rollNumber || '-'}</td>
                        <td style={styles.td}>${s.totalFees.toLocaleString()}</td>
                        <td style={{ ...styles.td, color: 'var(--success)' }}>${s.paid.toLocaleString()}</td>
                        <td style={{ ...styles.td, color: 'var(--warning)' }}>${s.pending.toLocaleString()}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            color: s.status === 'PAID' ? 'var(--success)' : s.status === 'OVERDUE' ? 'var(--danger)' : 'var(--warning)',
                            background: s.status === 'PAID' ? 'var(--success-glow)' : s.status === 'OVERDUE' ? 'var(--danger-glow)' : 'var(--warning-glow)'
                          }}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px' },
  header: { marginBottom: '10px' },
  sub: { color: 'var(--text-secondary)' },
  errorAlert: { padding: '10px', background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#fca5a5', borderRadius: '4px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' },
  statCard: { background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '8px' },
  statLabel: { fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' },
  statValue: { fontSize: '1.8rem', fontWeight: '800' },
  card: { background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glow)' },
  tableHeader: { marginBottom: '20px' },
  cardTitle: { fontSize: '1.2rem', fontWeight: 'bold', margin: 0 },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { color: 'var(--text-secondary)', padding: '12px 14px', fontWeight: '600', borderBottom: '2px solid var(--glass-border)' },
  td: { padding: '14px', borderBottom: '1px solid var(--glass-border)' },
  tr: { transition: 'var(--transition-fast)', '&:hover': { background: 'var(--bg-card-hover)' } },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' },
  noData: { textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }
};
