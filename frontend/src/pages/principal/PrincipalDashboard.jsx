import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSummary, getAIInsights } from '../../api/principalApi';
import StatCard from '../../components/StatCard';
import ChartCard from '../../components/ChartCard';
import Loader from '../../components/Loader';

export default function PrincipalDashboard() {
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [sumData, insData] = await Promise.all([getSummary(), getAIInsights()]);
      setSummary(sumData);
      setInsights(insData);
    } catch (err) {
      console.error(err);
      setError('Failed to load administrative analytics. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <Loader message="Compiling administrative summary metrics..." />;
  if (error) return <div className="error-feedback" style={styles.error}>{error}</div>;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.headerRow}>
        <div>
          <h2>Operational Overview</h2>
          <p style={styles.sub}>Administrative control board and predictive AI school insights.</p>
        </div>
        <button onClick={loadData} className="btn-secondary" style={styles.refreshBtn}>
          🔄 Refresh Data
        </button>
      </div>

      {/* 6 Metric Cards Grid */}
      <div style={styles.metricsGrid}>
        <StatCard
          label="Total Students"
          value={summary?.studentCount || 0}
          icon="🎒"
          trend="Enrolled active learners"
        />
        <StatCard
          label="Total Teachers"
          value={summary?.teacherCount || 0}
          icon="👩‍🏫"
          trend="Staff faculty size"
        />
        <StatCard
          label="Present Today"
          value={summary?.presentToday || 0}
          icon="✅"
          trend="Present at last roll"
          trendColor="var(--success)"
        />
        <StatCard
          label="Absent Today"
          value={summary?.absentToday || 0}
          icon="❌"
          trend="Absent at last roll"
          trendColor="var(--danger)"
        />
        <StatCard
          label="Pending Fees"
          value={`$${summary?.pendingFees?.toLocaleString() || '0'}`}
          icon="💳"
          trend="Outstanding accounts"
          trendColor="var(--warning)"
        />
        <StatCard
          label="Monthly Collection"
          value={`$${summary?.monthlyFeeCollection?.toLocaleString() || '0'}`}
          icon="💰"
          trend="Fees processed this month"
          trendColor="var(--success)"
        />
      </div>

      {/* Main Layout Grid */}
      <div style={styles.mainLayoutGrid}>
        {/* Left Column: AI & Activities */}
        <div style={styles.leftCol}>
          {/* AI Insights Card */}
          <div style={styles.panel} className="card-ai">
            <div style={styles.panelHeader}>
              <span style={styles.aiIcon}>🤖</span>
              <div>
                <h3>AI-Assisted Operational Insights</h3>
                <p style={styles.panelDesc}>Real-time alerts flagged by predictive rule engines.</p>
              </div>
            </div>

            <div style={styles.insightsList}>
              <div style={styles.insightSection}>
                <h4 style={styles.insightHeader}>📈 Attendance Pattern Trends</h4>
                <p style={styles.insightBody}>{insights?.absentTrend}</p>
              </div>

              <div style={styles.insightSection}>
                <h4 style={styles.insightHeader}>⚠️ Critical Low Attendance (Below 75%)</h4>
                {insights?.lowAttendance?.length === 0 ? (
                  <p style={styles.emptyText}>All students have attendance rates above 75%.</p>
                ) : (
                  <ul style={styles.alertList}>
                    {insights?.lowAttendance?.map((student, idx) => (
                      <li key={idx} style={styles.alertItem}>
                        <span>{student.name} ({student.rollNumber})</span>
                        <span style={{ color: 'var(--danger)', fontWeight: '700' }}>{student.percentage}% attendance</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={styles.insightSection}>
                <h4 style={styles.insightHeader}>💳 Outstanding Balances (Pending Fees)</h4>
                {insights?.pendingFees?.length === 0 ? (
                  <p style={styles.emptyText}>All tuition payments have been processed successfully.</p>
                ) : (
                  <ul style={styles.alertList}>
                    {insights?.pendingFees?.slice(0, 3).map((student, idx) => (
                      <li key={idx} style={styles.alertItem}>
                        <span>{student.name} ({student.rollNumber})</span>
                        <span style={{ color: 'var(--warning)', fontWeight: '700' }}>${student.totalFees.toLocaleString()} due</span>
                      </li>
                    ))}
                    {insights?.pendingFees?.length > 3 && (
                      <li style={{ ...styles.emptyText, textAlign: 'right', marginTop: '6px' }}>
                        + {insights.pendingFees.length - 3} more outstanding accounts
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activities Section */}
          <div style={styles.panel}>
            <h3 style={styles.sectionTitle}>📅 Recent Activities Log</h3>
            <p style={styles.panelDesc}>Live database records and log triggers.</p>
            <div style={styles.activityFeed}>
              {summary?.recentActivities?.length === 0 ? (
                <p style={styles.emptyText}>No recent activity logs available.</p>
              ) : (
                summary?.recentActivities?.map((activity) => (
                  <div key={activity.id} style={styles.activityItem}>
                    <div style={styles.activityDot}></div>
                    <div style={styles.activityContent}>
                      <span style={styles.activityText}>{activity.text}</span>
                      <span style={styles.activityTime}>
                        {new Date(activity.time).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Charts */}
        <div style={styles.rightCol}>
          {/* Quick Actions Panel */}
          <div style={styles.panel}>
            <h3 style={styles.sectionTitle}>⚡ Quick Actions</h3>
            <p style={styles.panelDesc}>Access administrative panels instantly.</p>
            <div style={styles.quickActionsGrid}>
              <button
                onClick={() => navigate('/principal/students?focus=form')}
                style={styles.actionCard}
              >
                <span style={styles.actionIcon}>🎒</span>
                <span style={styles.actionLabel}>Add Student</span>
              </button>
              <button
                onClick={() => navigate('/principal/teachers?focus=form')}
                style={styles.actionCard}
              >
                <span style={styles.actionIcon}>👩‍🏫</span>
                <span style={styles.actionLabel}>Add Teacher</span>
              </button>
              <button
                onClick={() => navigate('/principal/attendance')}
                style={styles.actionCard}
              >
                <span style={styles.actionIcon}>📅</span>
                <span style={styles.actionLabel}>View Attendance</span>
              </button>
              <button
                onClick={() => navigate('/principal/fees')}
                style={styles.actionCard}
              >
                <span style={styles.actionIcon}>💳</span>
                <span style={styles.actionLabel}>View Fees</span>
              </button>
              <button
                onClick={() => navigate('/principal/reports')}
                style={{ ...styles.actionCard, gridColumn: 'span 2' }}
              >
                <span style={styles.actionIcon}>📄</span>
                <span style={styles.actionLabel}>Generate Reports</span>
              </button>
            </div>
          </div>

          {/* Attendance Overview Target */}
          <div style={styles.panel}>
            <ChartCard
              title="School Attendance Rate Goal"
              value={summary?.globalAttendanceRate || 100}
              subtitle="Institutional Goal: Maintain average student attendance rates above 90% each term."
              color="var(--success)"
            />
          </div>

          {/* Fee Collection Overview Card */}
          <div style={styles.panel}>
            <h3 style={styles.sectionTitle}>💰 Institutional Fees Breakdown</h3>
            <p style={styles.panelDesc}>Current collection balances.</p>
            <div style={styles.feeBreakdown}>
              <div style={styles.breakdownRow}>
                <span>Collected Fees:</span>
                <span style={{ color: 'var(--success)', fontWeight: '700' }}>
                  ${summary?.paidFees?.toLocaleString() || '0'}
                </span>
              </div>
              <div style={styles.breakdownRow}>
                <span>Outstanding Dues:</span>
                <span style={{ color: 'var(--warning)', fontWeight: '700' }}>
                  ${summary?.pendingFees?.toLocaleString() || '0'}
                </span>
              </div>
              <div style={styles.progressBarBg}>
                <div
                  style={{
                    ...styles.progressBarFill,
                    width: `${
                      summary?.paidFees + summary?.pendingFees > 0
                        ? Math.round(
                            (summary.paidFees / (summary.paidFees + summary.pendingFees)) * 100
                          )
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
              <p style={{ ...styles.emptyText, marginTop: '8px', fontSize: '0.8rem' }}>
                Payment completion rate:{' '}
                {summary?.paidFees + summary?.pendingFees > 0
                  ? Math.round(
                      (summary.paidFees / (summary.paidFees + summary.pendingFees)) * 100
                    )
                  : 100}
                %
              </p>
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
    flexWrap: 'wrap',
    gap: '16px',
  },
  refreshBtn: {
    padding: '10px 18px',
    fontSize: '0.85rem',
  },
  sub: {
    color: 'var(--text-secondary)',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
  },
  mainLayoutGrid: {
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
  panel: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  panelHeader: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '16px',
  },
  aiIcon: {
    fontSize: '2.5rem',
    textShadow: '0 0 15px var(--primary-glow)',
  },
  panelDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '4px',
  },
  insightsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  insightSection: {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '16px',
  },
  insightHeader: {
    fontSize: '0.85rem',
    fontWeight: '700',
    marginBottom: '6px',
    color: 'var(--text-primary)',
  },
  insightBody: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  emptyText: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    listStyleType: 'none',
    paddingLeft: 0,
    marginTop: '6px',
  },
  alertItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    borderBottom: '1px dotted var(--glass-border)',
    paddingBottom: '4px',
  },
  activityFeed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginTop: '10px',
  },
  activityItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  activityDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--primary)',
    boxShadow: '0 0 8px var(--primary)',
    marginTop: '6px',
    flexShrink: 0,
  },
  activityContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  activityText: {
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
  },
  activityTime: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  quickActionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  actionCard: {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    '&:hover': {
      background: 'rgba(139, 92, 246, 0.08)',
      borderColor: 'var(--primary)',
      transform: 'translateY(-2px)',
    },
  },
  actionIcon: {
    fontSize: '1.5rem',
  },
  actionLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  feeBreakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '10px',
  },
  breakdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  },
  progressBarBg: {
    width: '100%',
    height: '8px',
    background: 'var(--glass-border)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '6px',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--success), #34d399)',
    borderRadius: '4px',
  },
  error: {
    padding: '16px',
    background: 'var(--danger-glow)',
    border: '1px solid var(--danger)',
    borderRadius: 'var(--radius-sm)',
    color: '#fca5a5',
  },
};
