import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSummary } from '../../api/teacherApi';
import StatCard from '../../components/StatCard';
import ChartCard from '../../components/ChartCard';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';

export default function TeacherDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getSummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch course summary details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) return <Loader message="Loading courseroom dashboard..." />;
  if (error) return <div className="error-feedback">{error}</div>;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.metricsGrid}>
        <StatCard
          label="Course Size"
          value={summary?.studentCount || 0}
          icon="🎒"
          trend="Registered in grade"
          trendColor="var(--text-secondary)"
        />
        <StatCard
          label="Courseroom Name"
          value={summary?.assignedCourse || 'N/A'}
          icon="🏫"
          trend="Assigned Grade level"
          trendColor="var(--primary)"
        />
        <StatCard
          label="Monthly Course Attendance"
          value={`${summary?.courseAttendanceRate || 100}%`}
          icon="📊"
          trend="Based on active logs"
          trendColor="var(--success)"
        />
      </div>

      <div style={styles.contentGrid}>
        {/* Recent Absentees Table Card */}
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>Recent Absent Alerts (Last 3 Days)</h3>
          {summary?.recentAbsentees?.length === 0 ? (
            <EmptyState
              icon="✅"
              title="Perfect Attendance!"
              description="No absences logged in your course over the last 3 days."
            />
          ) : (
            <div style={styles.listContainer}>
              <ul style={styles.absentList}>
                {summary?.recentAbsentees?.map((abs, idx) => (
                  <li key={idx} style={styles.absentItem}>
                    <div style={styles.studentInfo}>
                      <span style={styles.studentName}>{abs.name}</span>
                      <span style={styles.roll}>{abs.rollNumber}</span>
                    </div>
                    <span style={styles.dateText}>
                      Absent on {new Date(abs.date).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Quick Action Navigation panel */}
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>Courseroom Actions</h3>
          <div style={styles.actionsGrid}>
            <button onClick={() => navigate('/teacher/take-attendance')} className="btn-primary" style={styles.actionBtn}>
              📝 Take Attendance Now
            </button>
            <button onClick={() => navigate('/teacher/courses')} className="btn-secondary" style={styles.actionBtn}>
              🏫 View Roster Directory
            </button>
            <button onClick={() => navigate('/teacher/history')} className="btn-secondary" style={styles.actionBtn}>
              🕒 View Attendance History
            </button>
            <button onClick={() => navigate('/teacher/routine')} className="btn-secondary" style={styles.actionBtn}>
              📅 View Full Routine
            </button>
          </div>
        </div>

        {/* Today's Routine */}
        <div style={{ ...styles.panel, gridColumn: '1 / -1' }}>
          <h3 style={styles.panelTitle}>Today's Routine</h3>
          {!summary?.routine || summary.routine.length === 0 ? (
             <EmptyState icon="🏖️" title="Free Day!" description="No periods assigned for today." />
          ) : (
            <div style={styles.routineGrid}>
              {summary.routine.map((r, idx) => (
                <div key={idx} style={styles.routineCard}>
                  <div style={styles.periodBadge}>{r.period}</div>
                  <div style={styles.subjectText}>{r.subject}</div>
                  <div style={styles.courseText}>{r.course.className}-{r.course.section}</div>
                </div>
              ))}
            </div>
          )}
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
  metricsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '24px',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '24px',
    alignItems: 'start',
  },
  panel: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '30px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  panelTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '20px',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '10px',
    color: 'var(--text-primary)',
  },
  absentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    listStyleType: 'none',
    paddingLeft: 0,
  },
  absentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(239, 68, 68, 0.03)',
    border: '1px solid rgba(239, 68, 68, 0.1)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 16px',
  },
  studentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  studentName: {
    fontWeight: '600',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
  },
  roll: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  dateText: {
    fontSize: '0.85rem',
    color: 'var(--danger)',
    fontWeight: '600',
  },
  actionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  actionBtn: {
    padding: '14px',
    fontSize: '0.95rem',
    width: '100%',
    textAlign: 'center',
  },
  routineGrid: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    paddingBottom: '10px'
  },
  routineCard: {
    background: 'rgba(139, 92, 246, 0.05)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 'var(--radius-sm)',
    padding: '16px',
    minWidth: '150px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  periodBadge: {
    background: 'var(--primary)',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    alignSelf: 'flex-start'
  },
  subjectText: {
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    fontSize: '1.1rem'
  },
  courseText: {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem'
  }
};
