import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary } from '../../api/studentApi';
import StatCard from '../../components/StatCard';
import ChartCard from '../../components/ChartCard';
import Loader from '../../components/Loader';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const payload = await getDashboardSummary();
      setData(payload);
    } catch (err) {
      console.error(err);
      setError('Failed to load student dashboard parameters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) return <Loader message="Loading student workspace..." />;
  if (error) return <div className="error-feedback" style={styles.error}>{error}</div>;

  const { profile, fees, attendance, notices, todayRoutine } = data || {};

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.headerRow}>
        <div>
          <h2>Student Portal</h2>
          <p style={styles.sub}>Welcome back, <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{profile?.name}</span>. Review your schedules, attendance, and dues.</p>
        </div>
      </div>

      {/* Analytics Cards */}
      <div style={styles.metricsGrid}>
        <StatCard
          label="Attendance Rate"
          value={`${attendance?.percentage || 100}%`}
          icon="📈"
          trend={attendance?.percentage >= 75 ? 'Good standing' : 'Attendance Warning'}
          trendColor={attendance?.percentage >= 75 ? 'var(--success)' : 'var(--danger)'}
        />
        <StatCard
          label="Present Days"
          value={`${attendance?.presentCount || 0} Days`}
          icon="✅"
          trend="Attended class rolls"
          trendColor="var(--success)"
        />
        <StatCard
          label="Absent / Late"
          value={`${(attendance?.absent || 0) + (attendance?.late || 0)} Days`}
          icon="❌"
          trend="Missed class rolls"
          trendColor="var(--danger)"
        />
        <StatCard
          label="Pending Fees"
          value={`$${fees?.feeStatus === 'PENDING' ? fees?.totalFees?.toLocaleString() : '0'}`}
          icon="💰"
          trend={`Billing Status: ${fees?.feeStatus || 'PENDING'}`}
          trendColor={fees?.feeStatus === 'PAID' ? 'var(--success)' : 'var(--warning)'}
        />
      </div>

      {/* Main Grid */}
      <div style={styles.contentGrid}>
        {/* Left Col: Attendance Gauge & Logs */}
        <div style={styles.leftCol}>
          <div style={styles.chartPanel}>
            <ChartCard
              title="Attendance Goal Progress"
              value={attendance?.percentage || 100}
              subtitle="Tip: Institutional rules mandate maintaining roll attendance levels above 75% for exam authorization."
              color={attendance?.percentage >= 75 ? 'var(--success)' : 'var(--danger)'}
            />
          </div>

          {/* Recent Attendance Logs Table */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>🕒 Recent Attendance Logs</h3>
              <button onClick={() => navigate('/student/attendance')} style={styles.viewLink}>
                View All Logs ➔
              </button>
            </div>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance?.logs?.length === 0 ? (
                    <tr>
                      <td colSpan="2" style={styles.noRecords}>
                        No attendance entries have been logged yet for your profile.
                      </td>
                    </tr>
                  ) : (
                    attendance?.logs?.slice(0, 4).map((log, idx) => (
                      <tr key={idx} style={styles.tr}>
                        <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: '600' }}>
                          {new Date(log.date).toLocaleDateString()}
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            color: log.status === 'PRESENT' ? 'var(--success)' : 'var(--danger)',
                            background: log.status === 'PRESENT' ? 'var(--success-glow)' : 'var(--danger-glow)'
                          }}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Notices & Fees */}
        <div style={styles.rightCol}>
          {/* Notices Bulletin */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>📢 Campus Announcements</h3>
              <button onClick={() => navigate('/student/notices')} style={styles.viewLink}>
                Notice Board ➔
              </button>
            </div>

            <div style={styles.noticesList}>
              {notices?.length === 0 ? (
                <p style={styles.noRecords}>No recent announcements.</p>
              ) : (
                notices?.slice(0, 3).map((note) => (
                  <div key={note.id} style={styles.noticeCard}>
                    <div style={styles.noticeHeader}>
                      <span style={styles.noticeTitle}>{note.title}</span>
                      <span style={styles.noticeDate}>{new Date(note.date).toLocaleDateString()}</span>
                    </div>
                    <p style={styles.noticeDesc}>{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Today's Routine */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>📆 Today's Routine</h3>
            </div>
            
            <div style={styles.routineList}>
              {!todayRoutine || todayRoutine.length === 0 ? (
                <p style={styles.noRecords}>No classes scheduled for today.</p>
              ) : (
                todayRoutine.map((r, idx) => (
                  <div key={idx} style={styles.routineCard}>
                    <div style={styles.periodBadge}>{r.period}</div>
                    <div style={styles.routineInfo}>
                      <div style={styles.subjectText}>{r.subject}</div>
                      <div style={styles.teacherText}>{r.teacher?.name}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dues Summary Panel */}
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>💳 Billing & Accounts Summary</h3>
            <p style={styles.panelDesc}>Access payment forms and current term statements.</p>
            <div style={styles.feeDetails}>
              <div style={styles.feeDetailRow}>
                <span>Tuition Billing Term:</span>
                <span>Fall Semester 2026</span>
              </div>
              <div style={styles.feeDetailRow}>
                <span>Billing Status:</span>
                <span style={{
                  fontWeight: '700',
                  color: fees?.feeStatus === 'PAID' ? 'var(--success)' : 'var(--warning)'
                }}>
                  {fees?.feeStatus || 'PENDING'}
                </span>
              </div>
              <div style={styles.feeDetailRow}>
                <span>Total Amount:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
                  ${fees?.totalFees?.toLocaleString() || '0'}
                </span>
              </div>
              <button
                onClick={() => navigate('/student/fees')}
                className="btn-primary"
                style={styles.actionBtn}
              >
                Access Fee Ledger
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sub: {
    color: 'var(--text-secondary)',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '24px',
    alignItems: 'start',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  chartPanel: {
    display: 'flex',
    flexDirection: 'column',
  },
  panel: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '12px',
  },
  panelTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  panelDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginBottom: '16px',
  },
  viewLink: {
    background: 'transparent',
    color: 'var(--primary)',
    border: 'none',
    fontWeight: '600',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  noticesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  noticeCard: {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '14px',
  },
  noticeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  noticeTitle: {
    fontWeight: '600',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
  },
  noticeDate: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  noticeDesc: {
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  feeDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '10px',
  },
  feeDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
  },
  actionBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '0.9rem',
    marginTop: '12px',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '2px solid var(--glass-border)',
  },
  th: {
    color: 'var(--text-secondary)',
    padding: '10px 12px',
    fontWeight: '600',
    fontSize: '0.82rem',
  },
  td: {
    padding: '12px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--glass-border)',
    fontSize: '0.82rem',
  },
  tr: {
    transition: 'var(--transition-fast)',
    '&:hover': {
      background: 'var(--bg-card-hover)',
    },
  },
  badge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.72rem',
    fontWeight: '700',
  },
  noRecords: {
    padding: '20px',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  error: {
    padding: '16px',
    background: 'var(--danger-glow)',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    borderRadius: 'var(--radius-sm)',
  },
  routineList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  routineCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(139, 92, 246, 0.05)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px'
  },
  periodBadge: {
    background: 'var(--primary)',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: 'bold'
  },
  routineInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  subjectText: {
    fontWeight: 'bold',
    fontSize: '0.9rem',
    color: 'var(--text-primary)'
  },
  teacherText: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)'
  }
};
