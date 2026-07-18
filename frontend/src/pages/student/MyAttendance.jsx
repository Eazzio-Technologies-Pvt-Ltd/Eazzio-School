import React, { useState, useEffect } from 'react';
import { getAttendance } from '../../api/studentApi';
import Loader from '../../components/Loader';

export default function MyAttendance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const payload = await getAttendance();
        setData(payload);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, []);

  if (loading) return <Loader message="Loading attendance logs history..." />;

  const { stats, records = [] } = data || {};

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>My Attendance Ledger</h2>
        <p style={styles.sub}>Track all daily roll call entries registered by your course instructors.</p>
      </div>

      <div style={styles.summaryGrid}>
        {/* Percentage Card */}
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Attendance Rate</span>
          <span style={{
            ...styles.statValue,
            color: (stats?.percentage || 100) >= 75 ? 'var(--success)' : 'var(--danger)'
          }}>
            {stats?.percentage || 100}%
          </span>
          <p style={styles.statDesc}>
            {stats?.percentage >= 75 ? '🟢 In good standing' : '🔴 Attendance risk notice'}
          </p>
        </div>

        {/* Present/Absent Card */}
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Presence Logs</span>
          <div style={styles.presenceSummary}>
            <div style={styles.presCol}>
              <span style={styles.presNum}>{stats?.present || 0}</span>
              <span style={styles.presTxt}>Present</span>
            </div>
            <div style={styles.presDivider}></div>
            <div style={styles.presCol}>
              <span style={{ ...styles.presNum, color: 'var(--warning)' }}>{stats?.late || 0}</span>
              <span style={styles.presTxt}>Late</span>
            </div>
            <div style={styles.presDivider}></div>
            <div style={styles.presCol}>
              <span style={{ ...styles.presNum, color: 'var(--danger)' }}>{stats?.absent || 0}</span>
              <span style={styles.presTxt}>Absent</span>
            </div>
          </div>
        </div>
      </div>

      {/* History table */}
      <div style={styles.pane}>
        <h3 style={{ marginBottom: '20px' }}>📋 Attendance Record Logs</h3>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Roll Date</th>
                <th style={styles.th}>Instructor Record</th>
                <th style={styles.th}>Instructor Name</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan="3" style={styles.noRecords}>
                    No roll logs recorded for this student profile.
                  </td>
                </tr>
              ) : (
                records.map((row, idx) => (
                  <tr key={idx} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: '700', color: 'var(--text-primary)' }}>
                      {new Date(row.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        color: row.status === 'PRESENT' ? 'var(--success)' : row.status === 'LATE' ? 'var(--warning)' : 'var(--danger)',
                        background: row.status === 'PRESENT' ? 'var(--success-glow)' : row.status === 'LATE' ? 'rgba(245, 158, 11, 0.1)' : 'var(--danger-glow)'
                      }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={styles.td}>{row.teacher?.name || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '30px' },
  header: { marginBottom: '10px' },
  sub: { color: 'var(--text-secondary)' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' },
  statCard: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' },
  statLabel: { fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' },
  statValue: { fontSize: '2rem', fontWeight: '800' },
  statDesc: { fontSize: '0.8rem', color: 'var(--text-muted)' },
  presenceSummary: { display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '60px' },
  presCol: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  presNum: { fontSize: '1.6rem', fontWeight: '800', color: 'var(--success)' },
  presTxt: { fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' },
  presDivider: { width: '1px', height: '40px', background: 'var(--glass-border)' },
  pane: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '30px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { borderBottom: '2px solid var(--glass-border)' },
  th: { color: 'var(--text-secondary)', padding: '12px 16px', fontWeight: '600', fontSize: '0.85rem' },
  td: { padding: '16px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)', fontSize: '0.88rem' },
  tr: { transition: 'var(--transition-fast)', '&:hover': { background: 'var(--bg-card-hover)' } },
  badge: { padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' },
  noRecords: { padding: '24px', color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center' }
};
