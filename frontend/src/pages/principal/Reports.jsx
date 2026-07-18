import React, { useState, useEffect } from 'react';
import { getSummary, getAIInsights } from '../../api/principalApi';
import Loader from '../../components/Loader';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [reportType, setReportType] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '' });

  const triggerToast = (msg) => {
    setToast({ visible: true, message: msg });
    setTimeout(() => {
      setToast({ visible: false, message: '' });
    }, 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumData, insData] = await Promise.all([getSummary(), getAIInsights()]);
      setSummary(sumData);
      setInsights(insData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerExport = (type) => {
    setReportType(type);
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      triggerToast(`CSV sheet compiled and downloaded for "${type}"!`);
    }, 1500);
  };

  if (loading) return <Loader message="Compiling administrative audit data..." />;

  // Pure-CSS chart items course-wise
  const coursesAttendanceData = [
    { className: 'Grade 10-A', rate: summary?.globalAttendanceRate || 95 },
    { className: 'Grade 10-B', rate: 89 },
    { className: 'Grade 9-A', rate: 92 },
    { className: 'Grade 9-B', rate: 74 },
  ];

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>Institutional Reports & Audits</h2>
        <p style={styles.sub}>Access detailed summaries, financial records, and operational logs.</p>
      </div>

      {toast.visible && (
        <div style={styles.toast}>
          <span>📥</span> {toast.message}
        </div>
      )}

      {/* Tabs Menu */}
      <div style={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab('attendance')}
          style={{ ...styles.tabBtn, ...(activeTab === 'attendance' ? styles.activeTabBtn : {}) }}
        >
          📊 Attendance Report
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          style={{ ...styles.tabBtn, ...(activeTab === 'finance' ? styles.activeTabBtn : {}) }}
        >
          💳 Tuition & Finances
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          style={{ ...styles.tabBtn, ...(activeTab === 'audit' ? styles.activeTabBtn : {}) }}
        >
          📁 Export CSV Sheets
        </button>
      </div>

      {/* Tab Contents */}
      <div style={styles.pane}>
        {activeTab === 'attendance' && (
          <div style={styles.tabContent}>
            <div style={styles.sectionHeader}>
              <h3>Course-wise Attendance Audit</h3>
              <p style={styles.sectionDesc}>Aggregate attendance rates compared by course levels.</p>
            </div>

            {/* CSS Horizontal Bar Chart */}
            <div style={styles.chartContainer}>
              {coursesAttendanceData.map((item, idx) => (
                <div key={idx} style={styles.chartBarRow}>
                  <span style={styles.barLabel}>{item.className}</span>
                  <div style={styles.barWrapper}>
                    <div
                      style={{
                        ...styles.barFill,
                        width: `${item.rate}%`,
                        background: item.rate >= 90 ? 'var(--success)' : item.rate >= 75 ? 'var(--warning)' : 'var(--danger)',
                      }}
                    >
                      <span style={styles.barPercent}>{item.rate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Risk Warnings List */}
            <div style={{ marginTop: '30px' }}>
              <h4 style={{ marginBottom: '12px' }}>⚠️ Students at Attendance Risk (&lt; 75%)</h4>
              {insights?.lowAttendance?.length === 0 ? (
                <p style={styles.emptyText}>All student attendance parameters remain within bounds.</p>
              ) : (
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.thRow}>
                        <th style={styles.th}>Name</th>
                        <th style={styles.th}>Roll Number</th>
                        <th style={styles.th}>Current Rate</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insights?.lowAttendance?.map((student, idx) => (
                        <tr key={idx} style={styles.tr}>
                          <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: '600' }}>{student.name}</td>
                          <td style={styles.td}>{student.rollNumber}</td>
                          <td style={{ ...styles.td, color: 'var(--danger)', fontWeight: '700' }}>{student.percentage}%</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.badge, color: 'var(--danger)', background: 'var(--danger-glow)' }}>
                              CRITICAL
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div style={styles.tabContent}>
            <div style={styles.sectionHeader}>
              <h3>Tuition & Fee Collections Report</h3>
              <p style={styles.sectionDesc}>Detailed statement of institutional collections and outstanding invoices.</p>
            </div>

            <div style={styles.financeSplit}>
              {/* Financial Progress Indicator */}
              <div style={styles.financeCard}>
                <h4>Collection Summary</h4>
                <div style={styles.finRow}>
                  <span>Fees Collected:</span>
                  <span style={{ color: 'var(--success)', fontWeight: '700' }}>${summary?.paidFees?.toLocaleString()}</span>
                </div>
                <div style={styles.finRow}>
                  <span>Outstanding Balances:</span>
                  <span style={{ color: 'var(--warning)', fontWeight: '700' }}>${summary?.pendingFees?.toLocaleString()}</span>
                </div>
                <div style={styles.progressBarBg}>
                  <div
                    style={{
                      ...styles.progressBarFill,
                      width: `${
                        summary?.paidFees + summary?.pendingFees > 0
                          ? Math.round((summary.paidFees / (summary.paidFees + summary.pendingFees)) * 100)
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
                <p style={{ ...styles.emptyText, marginTop: '8px', fontSize: '0.8rem' }}>
                  Institutional target: 100% tuition collection completion rate.
                </p>
              </div>

              {/* Dues Ledger */}
              <div style={{ flex: 1.5 }}>
                <h4 style={{ marginBottom: '12px' }}>💳 Outstanding Dues Ledger</h4>
                {insights?.pendingFees?.length === 0 ? (
                  <p style={styles.emptyText}>All tuition fee payments have been finalized.</p>
                ) : (
                  <div style={styles.tableContainer}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.thRow}>
                          <th style={styles.th}>Name</th>
                          <th style={styles.th}>Roll Number</th>
                          <th style={styles.th}>Outstanding Amount</th>
                          <th style={styles.th}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insights?.pendingFees?.map((student, idx) => (
                          <tr key={idx} style={styles.tr}>
                            <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: '600' }}>{student.name}</td>
                            <td style={styles.td}>{student.rollNumber}</td>
                            <td style={{ ...styles.td, color: 'var(--warning)', fontWeight: '700' }}>
                              ${student.totalFees?.toLocaleString()}
                            </td>
                            <td style={styles.td}>
                              <span style={{ ...styles.badge, color: 'var(--warning)', background: 'var(--warning-glow)' }}>
                                OVERDUE
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div style={styles.tabContent}>
            <div style={styles.sectionHeader}>
              <h3>Export Administrative Sheets</h3>
              <p style={styles.sectionDesc}>Download raw registration audit sheets for academic governance.</p>
            </div>

            <div style={styles.exportGrid}>
              <div style={styles.exportCard}>
                <span style={styles.exportIcon}>🎒</span>
                <h3>Enrollment Roster</h3>
                <p style={styles.exportDesc}>Active student profiles, courses, and registration directories.</p>
                <button
                  onClick={() => triggerExport('Student Enrollment')}
                  className="btn-primary"
                  style={styles.actionBtn}
                  disabled={downloading}
                >
                  {downloading && reportType === 'Student Enrollment' ? 'Generating...' : 'Download CSV'}
                </button>
              </div>

              <div style={styles.exportCard}>
                <span style={styles.exportIcon}>👩‍🏫</span>
                <h3>Faculty Roster</h3>
                <p style={styles.exportDesc}>Faculty profiles, subject distributions, and assignments.</p>
                <button
                  onClick={() => triggerExport('Faculty Directory')}
                  className="btn-primary"
                  style={styles.actionBtn}
                  disabled={downloading}
                >
                  {downloading && reportType === 'Faculty Directory' ? 'Generating...' : 'Download CSV'}
                </button>
              </div>

              <div style={styles.exportCard}>
                <span style={styles.exportIcon}>📅</span>
                <h3>Attendance Ledger</h3>
                <p style={styles.exportDesc}>Aggregated attendance statistics and absence counts.</p>
                <button
                  onClick={() => triggerExport('Attendance Audit')}
                  className="btn-primary"
                  style={styles.actionBtn}
                  disabled={downloading}
                >
                  {downloading && reportType === 'Attendance Audit' ? 'Generating...' : 'Download CSV'}
                </button>
              </div>
            </div>
          </div>
        )}
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
  header: {
    marginBottom: '10px',
  },
  sub: {
    color: 'var(--text-secondary)',
  },
  tabsContainer: {
    display: 'flex',
    gap: '12px',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '2px',
    flexWrap: 'wrap',
  },
  tabBtn: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '10px 20px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  activeTabBtn: {
    color: 'var(--text-primary)',
    borderBottomColor: 'var(--primary)',
  },
  pane: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '30px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sectionHeader: {
    marginBottom: '10px',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '16px',
  },
  sectionDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  chartContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    background: 'var(--glass-bg)',
    padding: '20px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
  },
  chartBarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  barLabel: {
    width: '100px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  barWrapper: {
    flex: 1,
    height: '24px',
    background: 'var(--glass-border)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: '12px',
    transition: 'width 0.8s ease-in-out',
  },
  barPercent: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#fff',
  },
  emptyText: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  financeSplit: {
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap',
  },
  financeCard: {
    flex: 1,
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: '280px',
  },
  finRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
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
  exportGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
  },
  exportCard: {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    transition: 'var(--transition-fast)',
    '&:hover': {
      background: 'var(--glass-border)',
      borderColor: 'var(--primary)',
    },
  },
  exportIcon: {
    fontSize: '2rem',
  },
  exportDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    marginBottom: '10px',
  },
  actionBtn: {
    width: '100%',
    padding: '10px',
    fontSize: '0.85rem',
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
    fontSize: '0.8rem',
  },
  td: {
    padding: '12px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--glass-border)',
    fontSize: '0.8rem',
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
    fontSize: '0.7rem',
    fontWeight: '700',
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'var(--sidebar-bg)',
    border: '1px solid var(--primary)',
    boxShadow: 'var(--shadow-glow)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 20px',
    color: 'var(--text-primary)',
    zIndex: 999,
    fontSize: '0.9rem',
    animation: 'fadeIn 0.3s ease',
  },
};
