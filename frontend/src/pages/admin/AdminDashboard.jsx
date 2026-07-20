import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSummary } from '../../api/adminApi';
import StatCard from '../../components/StatCard';
import ChartCard from '../../components/ChartCard';
import Loader from '../../components/Loader';

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const sumData = await getSummary();
      setSummary(sumData);
      setInsights(null);
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

      {/* Metric Cards Grid */}
      <div style={{ ...styles.metricsGrid, gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard
          label="Total Students"
          value={
            <>
              {summary?.presentToday || 0} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/ {summary?.studentCount || 0}</span>
            </>
          }
          icon="🎒"
          trend="Present / Total Enrolled"
        />
        <StatCard
          label="Total Teachers"
          value={
            <>
              {summary?.teacherCount || 0} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/ {summary?.teacherCount || 0}</span>
            </>
          }
          icon="👩‍🏫"
          trend="Present / Total Staff"
        />
        <StatCard
          label="Pending Fees"
          value={`₹${summary?.pendingFees?.toLocaleString() || '0'}`}
          icon="💳"
          trend="Outstanding accounts"
          trendColor="var(--warning)"
        />
        <StatCard
          label="Monthly Collection"
          value={`₹${summary?.monthlyFeeCollection?.toLocaleString() || '0'}`}
          icon="💰"
          trend="Fees processed this month"
          trendColor="var(--success)"
        />
      </div>

      {/* Main Layout Grid (Now just Quick Actions) */}
      <div>
        {/* Quick Actions Panel */}
        <div style={styles.panel}>
          <h3 style={styles.sectionTitle}>⚡ Quick Actions</h3>
          <p style={styles.panelDesc}>Access administrative panels instantly.</p>
          <div style={styles.quickActionsGrid}>
            {/* Add Student button removed as admin no longer has authority */}
            <button
              onClick={() => navigate('/admin/teachers?focus=form')}
              style={styles.actionCard}
            >
              <span style={styles.actionIcon}>👩‍🏫</span>
              <span style={styles.actionLabel}>Add Teacher</span>
            </button>
            <button
              onClick={() => navigate('/admin/courses')}
              style={styles.actionCard}
            >
              <span style={styles.actionIcon}>🏫</span>
              <span style={styles.actionLabel}>Manage Courses</span>
            </button>
            <button
              onClick={() => navigate('/admin/attendance')}
              style={styles.actionCard}
            >
              <span style={styles.actionIcon}>📅</span>
              <span style={styles.actionLabel}>View Attendance</span>
            </button>
            <button
              onClick={() => navigate('/admin/fees')}
              style={styles.actionCard}
            >
              <span style={styles.actionIcon}>💳</span>
              <span style={styles.actionLabel}>Manage Fees</span>
            </button>
            <button
              onClick={() => navigate('/admin/reports')}
              style={styles.actionCard}
            >
              <span style={styles.actionIcon}>📄</span>
              <span style={styles.actionLabel}>Reports</span>
            </button>
            <button
              onClick={() => navigate('/admin/settings')}
              style={{ ...styles.actionCard, gridColumn: 'span 2' }}
            >
              <span style={styles.actionIcon}>⚙️</span>
              <span style={styles.actionLabel}>System Settings</span>
            </button>
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
    gridTemplateColumns: 'repeat(3, 1fr)',
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
