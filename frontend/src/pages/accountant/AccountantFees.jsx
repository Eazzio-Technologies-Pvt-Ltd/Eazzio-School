import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axios';
import Loader from '../../components/Loader';

export default function AccountantFees() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classes, setClasses] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Invoice Form State
  const [invoiceFormData, setInvoiceFormData] = useState({
    targetType: 'student',
    studentId: '',
    classId: '',
    feeType: '',
    amount: '',
    dueDate: ''
  });

  // Record Payment States
  const [recordingPaymentForInvoice, setRecordingPaymentForInvoice] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    paymentMethod: 'CASH',
    receiptNumber: ''
  });

  const [processing, setProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch summary to get student list (for student dropdown selection)
      const summaryResponse = await api.get('/accountant/dashboard-summary');
      if (summaryResponse.data && summaryResponse.data.data) {
        setStudentsList(summaryResponse.data.data.studentsFeesList || []);
      } else if (summaryResponse.data && summaryResponse.data.studentsFeesList) {
        setStudentsList(summaryResponse.data.studentsFeesList);
      }

      // Fetch classes
      const classesResponse = await api.get('/accountant/classes');
      if (classesResponse.data && classesResponse.data.success) {
        setClasses(classesResponse.data.data || classesResponse.data);
      } else if (Array.isArray(classesResponse.data)) {
        setClasses(classesResponse.data);
      }

      // Fetch invoices
      await loadInvoices();

    } catch (err) {
      console.error('Error fetching initial fees data:', err);
      setError('Failed to load classes or student rosters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const response = await api.get('/accountant/invoices');
      if (response.data) {
        setInvoices(Array.isArray(response.data) ? response.data : (response.data.data || []));
      }
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (recordingPaymentForInvoice) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [recordingPaymentForInvoice]);

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setProcessing(true);
      setProcessingMessage('Generating fee invoices...');
      const payload = {
        feeType: invoiceFormData.feeType,
        amount: invoiceFormData.amount,
        dueDate: invoiceFormData.dueDate
      };

      if (invoiceFormData.targetType === 'student') {
        if (!invoiceFormData.studentId) {
          setError('Please select a student');
          setProcessing(false);
          return;
        }
        payload.studentId = invoiceFormData.studentId;
      } else {
        if (!invoiceFormData.classId) {
          setError('Please select a class/course');
          setProcessing(false);
          return;
        }
        payload.classId = invoiceFormData.classId;
      }

      const response = await api.post('/accountant/invoices', payload);
      if (response.data) {
        showToast(response.data.message || 'Fee invoice(s) created successfully!');
        setInvoiceFormData({
          targetType: 'student',
          studentId: '',
          classId: '',
          feeType: '',
          amount: '',
          dueDate: ''
        });
        
        setProcessingMessage('Refreshing financial ledgers...');
        await loadInvoices();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to create invoice.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setProcessing(true);
      setProcessingMessage('Recording fee payment...');
      const response = await api.post('/accountant/payments', {
        feeInvoiceId: recordingPaymentForInvoice.id,
        amount: paymentFormData.amount,
        paymentMethod: paymentFormData.paymentMethod,
        receiptNumber: paymentFormData.receiptNumber
      });

      if (response.data) {
        showToast('Payment recorded successfully!');
        setRecordingPaymentForInvoice(null);
        setPaymentFormData({ amount: '', paymentMethod: 'CASH', receiptNumber: '' });
        
        setProcessingMessage('Refreshing transaction history...');
        await loadInvoices();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to record payment.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Loader message="Loading invoices & financial ledger..." />;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.headerRow}>
        <div>
          <h2>💳 Fee Invoices & Payments</h2>
          <p style={styles.sub}>Generate dues notices and record incoming school tuition collections.</p>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Create Invoice Card */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h3 style={styles.panelTitle}>💳 Create Fee Invoice</h3>
          </div>
          <form onSubmit={handleCreateInvoice} style={styles.form}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Apply Invoice To *</label>
                <select
                  style={styles.input}
                  value={invoiceFormData.targetType}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, targetType: e.target.value, studentId: '', classId: '' })}
                >
                  <option value="student">Specific Student</option>
                  <option value="class">Entire Class / Course</option>
                </select>
              </div>

              {invoiceFormData.targetType === 'student' ? (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Select Student *</label>
                  <select
                    required
                    style={styles.input}
                    value={invoiceFormData.studentId}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, studentId: e.target.value })}
                  >
                    <option value="">-- Choose Student --</option>
                    {studentsList.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.studentId})</option>
                    ))}
                  </select>
                  {(() => {
                    const selStudent = studentsList.find(s => s.id.toString() === invoiceFormData.studentId.toString());
                    if (selStudent) {
                      return (
                        <div style={{
                          marginTop: '8px',
                          fontSize: '0.8rem',
                          color: 'var(--primary)',
                          background: 'rgba(139, 92, 246, 0.1)',
                          border: '1px dashed rgba(139, 92, 246, 0.3)',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>ℹ️ Preferred Fee Payment Cycle:</span>
                          <strong style={{ textTransform: 'capitalize' }}>
                            {(selStudent.feeCycle || 'MONTHLY').toLowerCase().replace('_', ' ')}
                          </strong>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Select Class / Course *</label>
                  <select
                    required
                    style={styles.input}
                    value={invoiceFormData.classId}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, classId: e.target.value })}
                  >
                    <option value="">-- Choose Class / Course --</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.className} - {cls.section} ({cls.academicYear})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Fee Type / Description *</label>
                <input
                  type="text"
                  required
                  style={styles.input}
                  placeholder="e.g. Admission Fee, Tuition Fee, Course Fee"
                  value={invoiceFormData.feeType}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, feeType: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  style={styles.input}
                  placeholder="e.g. 5000"
                  value={invoiceFormData.amount}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, amount: e.target.value })}
                  onWheel={(e) => e.target.blur()}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Due Date *</label>
                <input
                  type="date"
                  required
                  style={styles.input}
                  value={invoiceFormData.dueDate}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" style={styles.submitBtn}>
                Generate Invoice(s)
              </button>
            </div>
          </form>
        </div>

        {/* Invoices Directory */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h3 style={styles.panelTitle}>🗂️ Fee Invoices Log</h3>
            <span style={styles.recordCounter}>{invoices.length} Invoices found</span>
          </div>
          <div style={styles.tableContainer}>
            {loadingInvoices ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0, padding: '20px', textAlign: 'center' }}>
                Loading invoices...
              </p>
            ) : invoices.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0, padding: '20px', textAlign: 'center' }}>
                No invoices recorded. Generate one above.
              </p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Student Name</th>
                    <th style={styles.th}>Fee Type</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Due Date</th>
                    <th style={styles.th}>Paid</th>
                    <th style={styles.th}>Pending</th>
                    <th style={styles.th}>Status</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const paidAmount = inv.payments ? inv.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
                    const pendingAmount = Math.max(0, inv.amount - paidAmount);
                    return (
                      <tr key={inv.id} style={styles.tr}>
                        <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: '600' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span>{inv.student?.name}</span>
                            {inv.student?.feeCycle && (
                              <span style={{
                                fontSize: '0.65rem',
                                color: 'var(--primary)',
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontWeight: 'bold',
                                textTransform: 'capitalize'
                              }}>
                                {inv.student.feeCycle.toLowerCase().replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 'normal' }}>
                            {inv.student?.studentId}
                          </span>
                        </td>
                        <td style={styles.td}>{inv.feeType}</td>
                        <td style={styles.td}>₹{inv.amount.toLocaleString()}</td>
                        <td style={styles.td}>{new Date(inv.dueDate).toLocaleDateString()}</td>
                        <td style={{ ...styles.td, color: 'var(--success)' }}>₹{paidAmount.toLocaleString()}</td>
                        <td style={{ ...styles.td, color: pendingAmount > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                          ₹{pendingAmount.toLocaleString()}
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            color: inv.status === 'PAID' ? 'var(--success)' : 'var(--warning)',
                            background: inv.status === 'PAID' ? 'var(--success-glow)' : 'var(--warning-glow)'
                          }}>
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          {inv.status !== 'PAID' ? (
                            <button
                              style={{
                                ...styles.detailsLink,
                                borderColor: 'var(--success)',
                                color: 'var(--success)',
                                background: 'rgba(5, 150, 105, 0.1)',
                              }}
                              onClick={() => {
                                setRecordingPaymentForInvoice(inv);
                                setPaymentFormData({
                                  amount: pendingAmount.toString(),
                                  paymentMethod: 'CASH',
                                  receiptNumber: ''
                                });
                              }}
                            >
                              💵 Pay
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Settled</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Record Fee Payment Modal */}
      {recordingPaymentForInvoice && createPortal(
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="animate-scale-up">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>💵 Record Fee Payment</h3>
              <button style={styles.closeBtn} onClick={() => setRecordingPaymentForInvoice(null)}>✕</button>
            </div>

            <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Student: <strong style={{ color: 'var(--text-primary)' }}>{recordingPaymentForInvoice.student?.name}</strong>
              </p>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Fee Type: <strong style={{ color: 'var(--text-primary)' }}>{recordingPaymentForInvoice.feeType}</strong>
              </p>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Invoice Amount: <strong style={{ color: 'var(--text-primary)' }}>₹{recordingPaymentForInvoice.amount.toLocaleString()}</strong>
              </p>
            </div>

            <form onSubmit={handleRecordPayment} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Payment Method *</label>
                <select
                  style={styles.input}
                  value={paymentFormData.paymentMethod}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NetBanking</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Amount Paid (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  style={styles.input}
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  onWheel={(e) => e.target.blur()}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Receipt Number / Transaction ID</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="Optional reference number"
                  value={paymentFormData.receiptNumber}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, receiptNumber: e.target.value })}
                />
              </div>

              <div style={styles.formActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setRecordingPaymentForInvoice(null)}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {processing && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100000,
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '3px solid rgba(139, 92, 246, 0.1)',
            borderTop: '3px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}></div>
          <p style={{
            color: '#fff',
            fontSize: '1rem',
            fontWeight: '600',
            margin: 0,
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}>{processingMessage}</p>
        </div>,
        document.body
      )}

      {toast.show && createPortal(
        <div style={{
          position: 'fixed',
          top: '32px',
          right: '32px',
          backgroundColor: '#111827',
          border: `1px solid ${toast.type === 'success' ? '#10b981' : '#f87171'}`,
          borderRadius: '8px',
          padding: '16px 24px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          zIndex: 999999,
        }}>
          <span style={{ fontSize: '1.25rem' }}>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{toast.message}</span>
        </div>,
        document.body
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '10px'
  },
  sub: {
    color: 'var(--text-secondary)',
    margin: '4px 0 0 0',
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
    margin: 0
  },
  recordCounter: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--text-muted)'
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
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '28px',
    width: '90%',
    maxWidth: '650px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
    maxHeight: '90vh',
    overflowY: 'auto',
    margin: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '12px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '1.2rem',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formRow: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  formGroup: {
    flex: '1',
    minWidth: '220px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  input: {
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '15px',
    borderTop: '1px solid var(--glass-border)',
    paddingTop: '16px',
  },
  cancelBtn: {
    padding: '10px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  submitBtn: {
    padding: '10px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--primary)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
    boxShadow: '0 4px 15px rgba(110, 68, 255, 0.3)',
  },
  detailsLink: {
    background: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text-primary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 12px',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  }
};
