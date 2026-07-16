import React, { useState, useEffect } from 'react';
import { getAttendanceSummary } from '../../api/principalApi';
import Loader from '../../components/Loader';

export default function AttendanceOverview() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await getAttendanceSummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load attendance summary.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={styles.container}>
      <div style={styles.header}>
        <h2>Attendance Overview</h2>
        <p style={styles.sub}>School-wide daily attendance monitoring by class.</p>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      <div style={styles.card}>
        {loading ? (
          <Loader message="Loading attendance data..." />
        ) : summary.length === 0 ? (
          <p style={styles.noData}>No attendance data available.</p>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Class</th>
                  <th style={styles.th}>Class Teacher</th>
                  <th style={styles.th}>Total Students</th>
                  <th style={styles.th}>Present (Total Logs)</th>
                  <th style={styles.th}>Absent (Total Logs)</th>
                  <th style={styles.th}>Attendance Percentage</th>
                </tr>
              </thead>
              <tbody>
                {summary.map(cls => (
                  <tr key={cls.classId} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 'bold', color: 'var(--primary)' }}>{cls.className}</td>
                    <td style={styles.td}>{cls.teacherName}</td>
                    <td style={styles.td}>{cls.totalStudents}</td>
                    <td style={{ ...styles.td, color: 'var(--success)' }}>{cls.present}</td>
                    <td style={{ ...styles.td, color: 'var(--danger)' }}>{cls.absent}</td>
                    <td style={styles.td}>
                      <div style={styles.progressBarContainer}>
                        <div 
                          style={{
                            ...styles.progressBar, 
                            width: `${cls.percentage}%`,
                            background: cls.percentage >= 75 ? 'var(--success)' : 'var(--danger)'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.8rem', marginLeft: '8px' }}>{cls.percentage}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  header: { marginBottom: '10px' },
  sub: { color: 'var(--text-secondary)' },
  errorAlert: { padding: '10px', background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#fca5a5', borderRadius: '4px' },
  card: { background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glow)' },
  noData: { color: 'var(--text-muted)', textAlign: 'center', padding: '20px' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { color: 'var(--text-secondary)', padding: '12px 14px', fontWeight: '600', borderBottom: '2px solid var(--glass-border)' },
  td: { padding: '14px', borderBottom: '1px solid var(--glass-border)' },
  tr: { transition: 'var(--transition-fast)', '&:hover': { background: 'var(--bg-card-hover)' } },
  progressBarContainer: { width: '100px', height: '6px', background: 'var(--glass-border)', borderRadius: '3px', display: 'inline-block', overflow: 'hidden' },
  progressBar: { height: '100%', transition: 'width 0.3s ease' }
};
