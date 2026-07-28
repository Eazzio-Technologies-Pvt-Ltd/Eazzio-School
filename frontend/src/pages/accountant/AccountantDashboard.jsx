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
  const [admissionFilterType, setAdmissionFilterType] = useState('TODAY'); // 'TODAY' or 'MONTH'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('ALL');
  const navigate = useNavigate();

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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

  const admittedStudentsFiltered = (data.studentsFeesList || []).filter(student => {
    if (!student.admissionDate) return false;
    const admDate = new Date(student.admissionDate);
    const today = new Date();
    
    if (admissionFilterType === 'TODAY') {
      return admDate.getDate() === today.getDate() &&
             admDate.getMonth() === today.getMonth() &&
             admDate.getFullYear() === today.getFullYear();
    } else {
      return admDate.getMonth() === selectedMonth &&
             admDate.getFullYear() === today.getFullYear();
    }
  });

  const todayPayments = (data.allPayments || []).filter(p => {
    if (!p.date) return false;
    const pDate = new Date(p.date);
    const today = new Date();
    return pDate.getDate() === today.getDate() &&
           pDate.getMonth() === today.getMonth() &&
           pDate.getFullYear() === today.getFullYear();
  });

  const todayCollectionsTotal = todayPayments.reduce((sum, p) => sum + p.amount, 0);

  // Calculate New Admissions (Admissions in the current month)
  const currentMonthAdmissions = (data.studentsFeesList || []).filter(student => {
    if (!student.admissionDate) return false;
    const admDate = new Date(student.admissionDate);
    const today = new Date();
    return admDate.getMonth() === today.getMonth() && admDate.getFullYear() === today.getFullYear();
  });

  const todayAdmissions = (data.studentsFeesList || []).filter(student => {
    if (!student.admissionDate) return false;
    const admDate = new Date(student.admissionDate);
    const today = new Date();
    return admDate.getDate() === today.getDate() &&
           admDate.getMonth() === today.getMonth() &&
           admDate.getFullYear() === today.getFullYear();
  });

  // Calculate collections by payment methods
  const upiCollections = (data.allPayments || [])
    .filter(p => p.method && p.method.toUpperCase() === 'UPI')
    .reduce((sum, p) => sum + p.amount, 0);

  const cashCollections = (data.allPayments || [])
    .filter(p => p.method && p.method.toUpperCase() === 'CASH')
    .reduce((sum, p) => sum + p.amount, 0);

  const cardCollections = (data.allPayments || [])
    .filter(p => p.method && p.method.toUpperCase() === 'CARD')
    .reduce((sum, p) => sum + p.amount, 0);

  const todayUPICollections = todayPayments
    .filter(p => p.method && p.method.toUpperCase() === 'UPI')
    .reduce((sum, p) => sum + p.amount, 0);

  const todayCashCollections = todayPayments
    .filter(p => p.method && p.method.toUpperCase() === 'CASH')
    .reduce((sum, p) => sum + p.amount, 0);

  const todayCardCollections = todayPayments
    .filter(p => p.method && p.method.toUpperCase() === 'CARD')
    .reduce((sum, p) => sum + p.amount, 0);

  const renderModal = () => {
    if (!activeModal) return null;

    let modalTitle = '';
    let filteredData = [];
    let tableHeaders = [];
    let tableBody = null;

    const query = modalSearchQuery.toLowerCase();

    if (activeModal === 'collections') {
      modalTitle = '💰 Collections Ledger (All Successful Payments)';
      let rawPayments = data.allPayments || [];
      if (selectedPaymentMethod !== 'ALL') {
        rawPayments = rawPayments.filter(p => p.method && p.method.toUpperCase() === selectedPaymentMethod.toUpperCase());
      }
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
    } else if (activeModal === 'dailyCollections') {
      modalTitle = "📅 Today's Collections Ledger";
      let rawPayments = todayPayments;
      if (selectedPaymentMethod !== 'ALL') {
        rawPayments = rawPayments.filter(p => p.method && p.method.toUpperCase() === selectedPaymentMethod.toUpperCase());
      }
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
    } else if (activeModal === 'admissions') {
      modalTitle = `🎓 Admitted Students Ledger (${admissionFilterType === 'TODAY' ? 'Today' : monthsList[selectedMonth]})`;
      filteredData = admittedStudentsFiltered.filter(s => 
        s.name.toLowerCase().includes(query) || 
        s.studentId.toLowerCase().includes(query) || 
        (s.rollNumber && s.rollNumber.toLowerCase().includes(query)) ||
        (s.className && s.className.toLowerCase().includes(query))
      );
      tableHeaders = ['Student Name', 'Student ID', 'Roll No', 'Class', 'Admission Date', 'Fee Cycle'];
      tableBody = filteredData.map((item) => (
        <tr key={item.id} style={styles.tr}>
          <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: '600' }}>
            {item.name}
          </td>
          <td style={styles.td}>{item.studentId}</td>
          <td style={styles.td}>{item.rollNumber || 'N/A'}</td>
          <td style={styles.td}>{item.className || 'N/A'}</td>
          <td style={styles.td}>{item.admissionDate ? new Date(item.admissionDate).toLocaleDateString() : 'N/A'}</td>
          <td style={styles.td}>
            <span style={{
              ...styles.badge,
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              color: 'var(--primary)',
              textTransform: 'capitalize'
            }}>
              {item.feeCycle.toLowerCase().replace('_', ' ')}
            </span>
          </td>
        </tr>
      ));
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
            { (activeModal === 'collections' || activeModal === 'dailyCollections') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>METHOD:</span>
                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
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
                  <option value="ALL" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-card)' }}>All Methods</option>
                  <option value="CASH" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-card)' }}>Cash</option>
                  <option value="UPI" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-card)' }}>UPI</option>
                  <option value="CARD" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-card)' }}>Card</option>
                </select>
              </div>
            )}

            { activeModal === 'admissions' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAdmissionFilterType('TODAY')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--glass-border)',
                    backgroundColor: admissionFilterType === 'TODAY' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  Today
                </button>
                
                <select
                  value={admissionFilterType === 'MONTH' ? selectedMonth : ''}
                  onChange={(e) => {
                    if (e.target.value !== '') {
                      setAdmissionFilterType('MONTH');
                      setSelectedMonth(parseInt(e.target.value));
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--glass-border)',
                    backgroundColor: admissionFilterType === 'MONTH' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'background 0.2s'
                  }}
                >
                  <option value="" disabled style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-card)' }}>Select Month</option>
                  {monthsList.map((mName, idx) => (
                    <option 
                      key={idx} 
                      value={idx} 
                      style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-card)' }}
                    >
                      {mName}
                    </option>
                  ))}
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
          label="New Admissions"
          value={currentMonthAdmissions.length}
          icon="🎓"
          trend={`Today: ${todayAdmissions.length} admissions`}
          trendColor="var(--success)"
          onClick={() => {
            setModalSearchQuery('');
            setModalFilterStatus('ALL');
            setAdmissionFilterType('MONTH');
            setSelectedMonth(new Date().getMonth());
            setActiveModal('admissions');
          }}
        />
        <StatCard
          label="UPI Collection"
          value={`₹${upiCollections.toLocaleString()}`}
          icon="📱"
          trend={`Today: ₹${todayUPICollections.toLocaleString()}`}
          trendColor="var(--success)"
          onClick={() => {
            setModalSearchQuery('');
            setModalFilterStatus('ALL');
            setSelectedPaymentMethod('UPI');
            setActiveModal('collections');
          }}
        />
        <StatCard
          label="Cash Collection"
          value={`₹${cashCollections.toLocaleString()}`}
          icon="💵"
          trend={`Today: ₹${todayCashCollections.toLocaleString()}`}
          trendColor="var(--success)"
          onClick={() => {
            setModalSearchQuery('');
            setModalFilterStatus('ALL');
            setSelectedPaymentMethod('CASH');
            setActiveModal('collections');
          }}
        />
        <StatCard
          label="Card Collection"
          value={`₹${cardCollections.toLocaleString()}`}
          icon="💳"
          trend={`Today: ₹${todayCardCollections.toLocaleString()}`}
          trendColor="var(--success)"
          onClick={() => {
            setModalSearchQuery('');
            setModalFilterStatus('ALL');
            setSelectedPaymentMethod('CARD');
            setActiveModal('collections');
          }}
        />
        <StatCard
          label="Daily Counter"
          value={`₹${todayCollectionsTotal?.toLocaleString() || '0'}`}
          icon="📅"
          trend="Today's total collections"
          trendColor="var(--info)"
          onClick={() => {
            setModalSearchQuery('');
            setModalFilterStatus('ALL');
            setSelectedPaymentMethod('ALL');
            setActiveModal('dailyCollections');
          }}
        />
      </div>

      {/* Main Layout Grid */}
      <div style={styles.mainLayoutGrid}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h3 style={styles.panelTitle}>🕒 Payments Log</h3>
            <p style={styles.panelDesc}>Live database records of recent transactions.</p>
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
    gridTemplateColumns: '1fr',
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
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    transition: 'var(--transition-fast)',
    flex: '1',
    minWidth: '240px',
  },
  cardLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  cardRight: {
    display: 'flex',
  },
  cardLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  cardValue: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    lineHeight: '1.2',
  },
  iconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid var(--border-glow)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: '1.4rem',
  },
};
