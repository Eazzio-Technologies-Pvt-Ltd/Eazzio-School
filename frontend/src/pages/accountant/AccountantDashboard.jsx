import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import StatCard from '../../components/StatCard';
import Loader from '../../components/Loader';

export default function AccountantDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    totalCollections: 0,
    pendingFees: 0,
    activeInvoices: 0,
    recentPayments: []
  });
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/accountant/dashboard-summary');
      if (response.data) {
        setData(response.data.data || response.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load administrative financials. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <Loader message="Compiling financial summary metrics..." />;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.headerRow}>
        <div>
          <h2>📊 Financial Overview</h2>
          <p style={styles.sub}>Administrative control board, cashflows, and payment history.</p>
        </div>
        <button onClick={loadData} className="btn-secondary" style={styles.refreshBtn}>
          🔄 Refresh Data
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px 20px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--danger)',
          color: 'var(--danger)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.9rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div style={styles.metricsGrid}>
        <StatCard
          label="Total Collections"
          value={`₹${data.totalCollections?.toLocaleString() || '0'}`}
          icon="💰"
          trend="Successful payments settled"
          trendColor="var(--success)"
        />
        <StatCard
          label="Pending Fees"
          value={`₹${data.pendingFees?.toLocaleString() || '0'}`}
          icon="💳"
          trend="Outstanding balances due"
          trendColor="var(--warning)"
        />
        <StatCard
          label="Active Invoices"
          value={data.activeInvoices || 0}
          icon="📄"
          trend="Total fee templates issued"
          trendColor="var(--info)"
        />
      </div>

      {/* Main Layout Grid */}
      <div style={styles.mainLayoutGrid}>
        {/* Left Column: Recent Payments */}
        <div style={styles.leftCol}>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>🕒 Recent Payments Log</h3>
              <p style={styles.panelDesc}>Live database records of the last 5 transactions.</p>
            </div>
            
            <div style={styles.tableContainer}>
              {data.recentPayments?.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0, padding: '20px', textAlign: 'center' }}>
                  No recent payment logs available.
                </p>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Student</th>
                      <th style={styles.th}>Amount</th>
                      <th style={styles.th}>Method</th>
                      <th style={styles.th}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPayments?.map((payment) => (
                      <tr key={payment.id} style={styles.tr}>
                        <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: '600' }}>
                          {payment.studentName}
                        </td>
                        <td style={{ ...styles.td, color: 'var(--success)', fontWeight: '600' }}>
                          ₹{payment.amount.toLocaleString()}
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-secondary)'
                          }}>
                            {payment.method}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {new Date(payment.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions */}
        <div style={styles.rightCol}>
          <div style={styles.panel}>
            <h3 style={styles.sectionTitle}>⚡ Quick Actions</h3>
            <p style={styles.panelDesc}>Access administrative financial modules instantly.</p>
            <div style={styles.quickActionsGrid}>
              <button
                onClick={() => navigate('/accountant/students')}
                style={styles.actionCard}
              >
                <span style={styles.actionIcon}>🎒</span>
                <span style={styles.actionLabel}>Add / Manage Students</span>
              </button>
              <button
                onClick={() => navigate('/accountant/fees')}
                style={styles.actionCard}
              >
                <span style={styles.actionIcon}>💳</span>
                <span style={styles.actionLabel}>Create Invoices & Pay</span>
              </button>
              <button
                onClick={() => navigate('/accountant/classes')}
                style={{ ...styles.actionCard, gridColumn: 'span 2' }}
              >
                <span style={styles.actionIcon}>🏫</span>
                <span style={styles.actionLabel}>Manage Classes & Courses</span>
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
    flexWrap: 'wrap',
    gap: '16px',
  },
  refreshBtn: {
    padding: '10px 18px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-sm)',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  sub: {
    color: 'var(--text-secondary)',
    margin: '4px 0 0 0',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '16px',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '12px',
  },
  panelTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0
  },
  panelDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    margin: 0
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '4px',
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
    padding: '12px 14px',
    fontWeight: '600',
    fontSize: '0.82rem',
  },
  td: {
    padding: '14px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--glass-border)',
    fontSize: '0.82rem',
  },
  tr: {
    transition: 'var(--transition-fast)',
    hover: {
      backgroundColor: 'rgba(255, 255, 255, 0.02)'
    }
  },
  badge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.72rem',
    fontWeight: '700',
  },
  quickActionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  actionCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  actionIcon: {
    fontSize: '1.5rem',
  },
  actionLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  }
};
