import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
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
    recentPayments: [],
    allPayments: [],
    allInvoices: [],
    studentsFeesList: []
  });
  const [activeModal, setActiveModal] = useState(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalFilterStatus, setModalFilterStatus] = useState('ALL');
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

  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeModal]);

  const renderModal = () => {
    if (!activeModal) return null;

    let modalTitle = '';
    let filteredData = [];
    let tableHeaders = [];
    let tableBody = null;

    const query = modalSearchQuery.toLowerCase();

    if (activeModal === 'collections') {
      modalTitle = '💰 Collections Ledger (All Successful Payments)';
      const rawPayments = data.allPayments || [];
      filteredData = rawPayments.filter(p => 
        p.studentName.toLowerCase().includes(query) || 
        p.studentId.toLowerCase().includes(query) || 
        (p.rollNumber && p.rollNumber.toLowerCase().includes(query)) ||
        (p.receiptNumber && p.receiptNumber.toLowerCase().includes(query))
      );
      tableHeaders = ['Student (Roll No)', 'Student ID', 'Amount Paid', 'Method', 'Receipt No', 'Date'];
      tableBody = filteredData.map((item) => (
        <tr key={item.id} style={styles.tr}>
          <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: '600' }}>
            {item.studentName} {item.rollNumber !== 'N/A' && `(Roll No: ${item.rollNumber})`}
          </td>
          <td style={styles.td}>{item.studentId}</td>
          <td style={{ ...styles.td, color: 'var(--success)', fontWeight: 'bold' }}>
            ₹{item.amount.toLocaleString()}
          </td>
          <td style={styles.td}>
            <span style={{
              ...styles.badge,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)'
            }}>
              {item.method}
            </span>
          </td>
          <td style={styles.td}>{item.receiptNumber}</td>
          <td style={styles.td}>{new Date(item.date).toLocaleDateString()}</td>
        </tr>
      ));
    } else if (activeModal === 'pending') {
      modalTitle = '💳 Outstanding Balances & Student Fee Ledger';
      const rawStudents = data.studentsFeesList || [];
      let filteredStudents = rawStudents;
      if (modalFilterStatus === 'PENDING') {
        filteredStudents = rawStudents.filter(s => s.pending > 0);
      } else if (modalFilterStatus === 'PAID') {
        filteredStudents = rawStudents.filter(s => s.pending === 0);
      }
      filteredData = filteredStudents.filter(s => 
        s.name.toLowerCase().includes(query) || 
        s.studentId.toLowerCase().includes(query) || 
        (s.rollNumber && s.rollNumber.toLowerCase().includes(query)) ||
        (s.className && s.className.toLowerCase().includes(query))
      );
      tableHeaders = ['Student (Roll No)', 'Student ID', 'Class', 'Total Configured', 'Total Paid', 'Total Pending', 'Status'];
      tableBody = filteredData.map((item) => {
        const isPending = item.pending > 0;
        return (
          <tr key={item.id} style={styles.tr}>
            <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: '600' }}>
              {item.name} {item.rollNumber !== 'N/A' && `(Roll No: ${item.rollNumber})`}
            </td>
            <td style={styles.td}>{item.studentId}</td>
            <td style={styles.td}>{item.className}</td>
            <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: '600' }}>
              ₹{item.totalFees.toLocaleString()}
            </td>
            <td style={{ ...styles.td, color: 'var(--success)', fontWeight: '600' }}>
              ₹{item.paid.toLocaleString()}
            </td>
            <td style={{ ...styles.td, color: isPending ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 'bold' }}>
              ₹{item.pending.toLocaleString()}
            </td>
            <td style={styles.td}>
              <span style={{
                ...styles.badge,
                backgroundColor: isPending ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                color: isPending ? 'var(--danger)' : 'var(--success)',
                border: `1px solid ${isPending ? 'var(--danger)' : 'var(--success)'}`
              }}>
                {isPending ? 'PENDING' : 'PAID'}
              </span>
            </td>
          </tr>
        );
      });
    } else if (activeModal === 'invoices') {
      modalTitle = '📄 Active Invoices (All Dues Invoices)';
      const rawInvoices = data.allInvoices || [];
      let filteredInvoices = rawInvoices;
      if (modalFilterStatus === 'PENDING') {
        filteredInvoices = rawInvoices.filter(inv => inv.status !== 'PAID');
      } else if (modalFilterStatus === 'PAID') {
        filteredInvoices = rawInvoices.filter(inv => inv.status === 'PAID');
      }
      filteredData = filteredInvoices.filter(inv => 
        inv.studentName.toLowerCase().includes(query) || 
        inv.studentId.toLowerCase().includes(query) || 
        (inv.rollNumber && inv.rollNumber.toLowerCase().includes(query)) ||
        inv.invoiceNumber.toLowerCase().includes(query)
      );
      tableHeaders = ['Invoice Number', 'Student (Roll No)', 'Invoice Amount', 'Paid', 'Pending Balance', 'Due Date', 'Status'];
      tableBody = filteredData.map((item) => {
        let badgeBg = 'rgba(239, 68, 68, 0.1)';
        let badgeColor = 'var(--danger)';
        if (item.status === 'PAID') {
          badgeBg = 'rgba(16, 185, 129, 0.1)';
          badgeColor = 'var(--success)';
        } else if (item.status === 'PARTIAL') {
          badgeBg = 'rgba(245, 158, 11, 0.1)';
          badgeColor = 'var(--warning)';
        }
        return (
          <tr key={item.id} style={styles.tr}>
            <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: '600' }}>
              {item.invoiceNumber}
            </td>
            <td style={styles.td}>
              {item.studentName} {item.rollNumber !== 'N/A' && `(Roll No: ${item.rollNumber})`}
            </td>
            <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: '600' }}>
              ₹{item.amount.toLocaleString()}
            </td>
            <td style={{ ...styles.td, color: 'var(--success)', fontWeight: '600' }}>
              ₹{item.paid.toLocaleString()}
            </td>
            <td style={{ ...styles.td, color: item.pending > 0 ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 'bold' }}>
              ₹{item.pending.toLocaleString()}
            </td>
            <td style={styles.td}>{new Date(item.dueDate).toLocaleDateString()}</td>
            <td style={styles.td}>
              <span style={{
                ...styles.badge,
                backgroundColor: badgeBg,
                color: badgeColor,
                border: `1px solid ${badgeColor}`
              }}>
                {item.status}
              </span>
            </td>
          </tr>
        );
      });
    }

    return createPortal(
      <div style={styles.modalOverlay} onClick={() => setActiveModal(null)}>
        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>{modalTitle}</h3>
            <button style={styles.modalCloseBtn} onClick={() => setActiveModal(null)}>✕</button>
          </div>

          <div style={styles.searchBarContainer}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <span style={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search by student name, roll number, ID..."
                style={styles.modalSearchInput}
                value={modalSearchQuery}
                onChange={(e) => setModalSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            { (activeModal === 'pending' || activeModal === 'invoices') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>FILTER:</span>
                <select
                  value={modalFilterStatus}
                  onChange={(e) => setModalFilterStatus(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    padding: '6px 12px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">All Records</option>
                  <option value="PAID">Paid (Completed)</option>
                  <option value="PENDING">Pending (Outstanding)</option>
                </select>
              </div>
            )}
          </div>

          <div style={styles.modalTableContainer}>
            {filteredData.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '40px', textAlign: 'center', margin: 0 }}>
                No records found.
              </p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    {tableHeaders.map((h, idx) => (
                      <th key={idx} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableBody}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

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
          onClick={() => {
            setModalSearchQuery('');
            setModalFilterStatus('ALL');
            setActiveModal('collections');
          }}
        />
        <StatCard
          label="Pending Fees"
          value={`₹${data.pendingFees?.toLocaleString() || '0'}`}
          icon="💳"
          trend="Outstanding balances due"
          trendColor="var(--warning)"
          onClick={() => {
            setModalSearchQuery('');
            setModalFilterStatus('PENDING');
            setActiveModal('pending');
          }}
        />
        <StatCard
          label="Active Invoices"
          value={data.activeInvoices || 0}
          icon="📄"
          trend="Total fee templates issued"
          trendColor="var(--info)"
          onClick={() => {
            setModalSearchQuery('');
            setModalFilterStatus('ALL');
            setActiveModal('invoices');
          }}
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
      {renderModal()}
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
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modalContent: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--glass-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '1.2rem',
    cursor: 'pointer',
    padding: '4px',
    transition: 'color 0.2s',
  },
  searchBarContainer: {
    padding: '16px 24px',
    borderBottom: '1px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(255, 255, 255, 0.01)',
  },
  searchIcon: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
  },
  modalSearchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
  },
  modalTableContainer: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  },
};
