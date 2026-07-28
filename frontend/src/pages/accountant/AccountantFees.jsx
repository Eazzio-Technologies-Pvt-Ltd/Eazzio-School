import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axios';
import Loader from '../../components/Loader';

const calculateFeeBreakdown = (selectedCourse) => {
  if (!selectedCourse || !selectedCourse.feesList || selectedCourse.feesList.length === 0) return null;
  
  const tuitionFee = selectedCourse.feesList.find(f => f.feeType === 'Tuition Fee') || selectedCourse.feesList[0];
  const baseAmount = tuitionFee.amount;
  const baseCycle = tuitionFee.planType || 'MONTHLY';

  if (baseAmount <= 0) return null;

  let yearlyAmount = 0;
  if (baseCycle === 'MONTHLY') {
    yearlyAmount = baseAmount * 12;
  } else if (baseCycle === 'QUARTERLY') {
    yearlyAmount = baseAmount * 4;
  } else if (baseCycle === 'HALF_YEARLY') {
    yearlyAmount = baseAmount * 2;
  } else if (baseCycle === 'YEARLY' || baseCycle === 'ONE_TIME') {
    yearlyAmount = baseAmount;
  }

  const otherFees = selectedCourse.feesList.filter(f => f.id !== tuitionFee.id);
  const otherTotal = otherFees.reduce((sum, f) => sum + f.amount, 0);

  return {
    tuition: {
      monthly: baseCycle === 'ONE_TIME' ? baseAmount : Math.round(yearlyAmount / 12),
      quarterly: baseCycle === 'ONE_TIME' ? baseAmount : Math.round(yearlyAmount / 4),
      halfYearly: baseCycle === 'ONE_TIME' ? baseAmount : Math.round(yearlyAmount / 2),
      yearly: baseCycle === 'ONE_TIME' ? baseAmount : yearlyAmount,
      oneTime: baseAmount
    },
    otherTotal,
    otherFees
  };
};

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

  const [settings, setSettings] = useState({
    feeDueDay: 10,
    collectFeeAnyDay: true,
    allowPartPayment: false,
    lateFineAmount: 150
  });

  const isInvoiceOverdue = (inv) => {
    if (!inv || inv.status === 'PAID') return false;
    const now = new Date();
    const dueDate = new Date(inv.dueDate);
    
    // If it's a previous month/year, it's overdue
    if (now.getFullYear() > dueDate.getFullYear()) return true;
    if (now.getFullYear() === dueDate.getFullYear() && now.getMonth() > dueDate.getMonth()) return true;
    
    // If it's the current month, check if the current day of month is past the due day
    if (now.getFullYear() === dueDate.getFullYear() && now.getMonth() === dueDate.getMonth()) {
      return now.getDate() > settings.feeDueDay;
    }
    
    return false;
  };

  // Record Payment States
  const [recordingPaymentForInvoice, setRecordingPaymentForInvoice] = useState(null);
  const [viewingFeeBookForStudent, setViewingFeeBookForStudent] = useState(null);
  const [payingFeeForInvoice, setPayingFeeForInvoice] = useState(null);
  const [viewingPaidDetailsInvoice, setViewingPaidDetailsInvoice] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    paymentMethod: 'CASH',
    receiptNumber: ''
  });

  const [processing, setProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [invoicesSearchQuery, setInvoicesSearchQuery] = useState('');
  const [phoneSearchQuery, setPhoneSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState('');

  const handleSelectStudent = (selStudent) => {
    if (!selStudent) return;
    
    let amount = '';
    let feeType = invoiceFormData.feeType || 'Tuition Fee';

    if (selStudent.academicYear) {
      setSelectedSessionFilter(selStudent.academicYear);
    }
    const targetClassId = selStudent.classId || selStudent.courseId;
    if (targetClassId) {
      setSelectedCourseFilter(targetClassId.toString());
    }
    const selCourse = classes.find(c => c.id.toString() === (targetClassId || '').toString());
    if (selCourse && selCourse.feesList && selCourse.feesList.length > 0) {
      const tuitionFee = selCourse.feesList.find(f => f.feeType === 'Tuition Fee') || selCourse.feesList[0];
      if (tuitionFee) {
        feeType = tuitionFee.feeType;
        const feeBreakdown = calculateFeeBreakdown(selCourse);
        if (feeBreakdown) {
          const cycle = (selStudent.feeCycle || 'MONTHLY').toUpperCase();
          if (cycle === 'QUARTERLY') {
            amount = feeBreakdown.tuition.quarterly.toString();
          } else if (cycle === 'HALF_YEARLY') {
            amount = feeBreakdown.tuition.halfYearly.toString();
          } else if (cycle === 'YEARLY') {
            amount = feeBreakdown.tuition.yearly.toString();
          } else if (cycle === 'ONE_TIME') {
            amount = feeBreakdown.tuition.oneTime.toString();
          } else {
            amount = feeBreakdown.tuition.monthly.toString();
          }
        } else {
          amount = tuitionFee.amount.toString();
        }
      }
    }

    setInvoiceFormData(prev => ({
      ...prev,
      studentId: selStudent.id.toString(),
      amount,
      feeType
    }));
  };

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

      // Fetch settings
      try {
        const settingsResponse = await api.get('/accountant/settings');
        if (settingsResponse.data) {
          setSettings(settingsResponse.data);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
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
    if (recordingPaymentForInvoice || viewingFeeBookForStudent || payingFeeForInvoice) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [recordingPaymentForInvoice, viewingFeeBookForStudent, payingFeeForInvoice]);

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

  const sessionsList = Array.from(new Set(classes.map(c => c.academicYear).filter(Boolean)));
  const filteredStudents = studentsList.filter(s => {
    const matchCourse = !selectedCourseFilter || s.courseId?.toString() === selectedCourseFilter.toString();
    const matchSession = !selectedSessionFilter || s.academicYear === selectedSessionFilter;
    return matchCourse && matchSession;
  });
  const filteredInvoices = invoices.filter(inv => {
    const studentName = inv.student?.name || '';
    const studentId = inv.student?.studentId || '';
    const feeType = inv.feeType || '';
    const phone = inv.student?.phone || '';
    
    const textQuery = invoicesSearchQuery.toLowerCase();
    const phoneQuery = phoneSearchQuery.trim();

    const matchesText = !textQuery || 
      studentName.toLowerCase().includes(textQuery) || 
      studentId.toLowerCase().includes(textQuery) || 
      feeType.toLowerCase().includes(textQuery);

    const matchesPhone = !phoneQuery || 
      phone.includes(phoneQuery);

    return matchesText && matchesPhone;
  });
  const getCourseOrClassInfo = (student) => {
    if (!student) return { label: 'Class / Course', value: 'N/A' };
    
    // 1. Try to find student in the global studentsList first
    const matched = studentsList.find(s => s.id === student.id || s.studentId === student.studentId);
    
    // 2. Resolve target student object to read from
    const targetStudent = matched || student;
    
    // 3. Check course relation
    if (targetStudent.course) {
      const name = (targetStudent.course.courseName || '').trim();
      const isNumeric = !isNaN(name);
      const isSchoolClass = isNumeric && parseInt(name, 10) >= 1 && parseInt(name, 10) <= 12;
      const containsClassWord = /class|grade|std|std\.|standard/i.test(name);
      const isClass = isSchoolClass || containsClassWord || name.toLowerCase().startsWith('class') || isNumeric;
      
      const displayVal = `${name}${targetStudent.course.section ? ` - ${targetStudent.course.section}` : ''}`;
      return {
        label: isClass ? 'Class' : 'Course',
        value: displayVal
      };
    }
    
    // 4. Check string courseName / className properties
    const rawCourseName = targetStudent.courseName || targetStudent.className || '';
    if (rawCourseName && rawCourseName !== 'N/A') {
      const name = rawCourseName.trim();
      // Remove any trailing section if it was already formatted like "Btech - A"
      const cleanName = name.split('-')[0].trim();
      const isNumeric = !isNaN(cleanName);
      const isSchoolClass = isNumeric && parseInt(cleanName, 10) >= 1 && parseInt(cleanName, 10) <= 12;
      const containsClassWord = /class|grade|std|std\.|standard/i.test(cleanName);
      const isClass = isSchoolClass || containsClassWord || cleanName.toLowerCase().startsWith('class') || isNumeric;
      
      return {
        label: isClass ? 'Class' : 'Course',
        value: name
      };
    }
    
    return { label: 'Class / Course', value: 'N/A' };
  };
  if (loading) return <Loader message="Loading invoices & financial ledger..." />;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.headerRow}>
        <div>
          <h2>💳 Student Fee & Payments</h2>
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
        {/* Invoices Directory */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={styles.panelTitle}>🗂️ Student Fee</h3>
              <span style={styles.recordCounter}>{filteredInvoices.length} Invoices found</span>
            </div>
            
            {/* Search Inputs (Student & Phone) */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ width: '220px' }}>
                <input
                  type="text"
                  placeholder="Search student..."
                  value={invoicesSearchQuery}
                  onChange={(e) => setInvoicesSearchQuery(e.target.value)}
                  style={styles.headerSearchInput}
                />
              </div>
              <div style={{ width: '180px' }}>
                <input
                  type="text"
                  placeholder="Search phone number..."
                  value={phoneSearchQuery}
                  onChange={(e) => setPhoneSearchQuery(e.target.value)}
                  style={styles.headerSearchInput}
                />
              </div>
            </div>
          </div>
          <div style={styles.tableContainer}>
            {loadingInvoices ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0, padding: '20px', textAlign: 'center' }}>
                Loading invoices...
              </p>
            ) : invoices.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0, padding: '20px', textAlign: 'center' }}>
                No invoices recorded.
              </p>
            ) : filteredInvoices.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0, padding: '20px', textAlign: 'center' }}>
                No matching invoices found.
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
                  {filteredInvoices.map((inv) => {
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
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              style={{
                                ...styles.detailsLink,
                                borderColor: 'var(--primary)',
                                color: 'var(--primary)',
                                background: 'rgba(139, 92, 246, 0.1)',
                              }}
                              onClick={() => {
                                setViewingFeeBookForStudent(inv.student);
                              }}
                            >
                              📖 Fee Book
                            </button>
                            {inv.status !== 'PAID' ? (
                              <button
                                disabled={!(settings.collectFeeAnyDay || new Date().getDate() <= settings.feeDueDay)}
                                style={{
                                  ...styles.detailsLink,
                                  borderColor: (settings.collectFeeAnyDay || new Date().getDate() <= settings.feeDueDay) ? 'var(--success)' : 'var(--text-muted)',
                                  color: (settings.collectFeeAnyDay || new Date().getDate() <= settings.feeDueDay) ? 'var(--success)' : 'var(--text-muted)',
                                  background: (settings.collectFeeAnyDay || new Date().getDate() <= settings.feeDueDay) ? 'rgba(5, 150, 105, 0.1)' : 'rgba(128, 128, 128, 0.05)',
                                  cursor: (settings.collectFeeAnyDay || new Date().getDate() <= settings.feeDueDay) ? 'pointer' : 'not-allowed',
                                  opacity: (settings.collectFeeAnyDay || new Date().getDate() <= settings.feeDueDay) ? 1 : 0.6
                                }}
                                title={!(settings.collectFeeAnyDay || new Date().getDate() <= settings.feeDueDay) ? "Fee collection is disabled past the monthly due date" : ""}
                                onClick={() => {
                                  const isOverdue = isInvoiceOverdue(inv);
                                  const lateFine = isOverdue ? (settings.lateFineAmount ?? 150) : 0;
                                  const prevInvoices = invoices.filter(other => other.studentId === inv.studentId && other.id !== inv.id && other.status !== 'PAID');
                                  const prevDues = prevInvoices.reduce((sum, other) => {
                                    const paid = other.payments ? other.payments.reduce((s, p) => s + p.amount, 0) : 0;
                                    return sum + Math.max(0, other.amount - paid);
                                  }, 0);
                                  const currentPending = Math.max(0, inv.amount - paidAmount);

                                  setPayingFeeForInvoice(inv);
                                  setPaymentFormData({
                                    amount: (currentPending + lateFine + prevDues).toString(),
                                    paymentMethod: 'CASH',
                                    receiptNumber: ''
                                  });
                                }}
                              >
                                💵 Pay Fee
                              </button>
                            ) : (
                              <button
                                style={{
                                  ...styles.detailsLink,
                                  borderColor: 'var(--success)',
                                  color: 'var(--success)',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  setViewingPaidDetailsInvoice(inv);
                                }}
                              >
                                ✓ Paid
                              </button>
                            )}
                          </div>
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
                Student: <strong style={{ color: 'var(--text-primary)' }}>{recordingPaymentForInvoice.student?.name} {recordingPaymentForInvoice.student?.rollNumber ? `(Roll No: ${recordingPaymentForInvoice.student.rollNumber})` : ''}</strong>
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
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
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

      {/* Student Fee Book Modal */}
      {viewingFeeBookForStudent && createPortal(
        <div style={styles.modalOverlay}>
          <div style={{
            ...styles.modalContent,
            maxWidth: '900px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
          }} className="animate-scale-up">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📖 Student Fee Book
              </h3>
              <button style={styles.closeBtn} onClick={() => setViewingFeeBookForStudent(null)}>✕</button>
            </div>

            {/* Student Profile Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              background: 'rgba(139, 92, 246, 0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              {/* Photo Box */}
              <div style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, #a78bfa 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(139, 92, 246, 0.3)',
                color: '#fff',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>
                {viewingFeeBookForStudent.name ? viewingFeeBookForStudent.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'ST'}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                  {viewingFeeBookForStudent.name}
                </h4>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {(() => {
                    const info = getCourseOrClassInfo(viewingFeeBookForStudent);
                    return (
                      <span>{info.label}: <strong style={{ color: 'var(--text-primary)' }}>{info.value}</strong></span>
                    );
                  })()}
                  <span>Roll No: <strong style={{ color: 'var(--text-primary)' }}>{viewingFeeBookForStudent.rollNumber && viewingFeeBookForStudent.rollNumber !== 'N/A' ? viewingFeeBookForStudent.rollNumber : 'N/A'}</strong></span>
                  <span>ID: <strong style={{ color: 'var(--text-primary)' }}>{viewingFeeBookForStudent.studentId}</strong></span>
                </div>
              </div>
            </div>

            {/* 12-Month Table */}
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Month</th>
                    <th style={styles.th}>Fee Type</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Late Fine</th>
                    <th style={styles.th}>Method</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const academicMonths = [
                      { name: 'April', index: 3 },
                      { name: 'May', index: 4 },
                      { name: 'June', index: 5 },
                      { name: 'July', index: 6 },
                      { name: 'August', index: 7 },
                      { name: 'September', index: 8 },
                      { name: 'October', index: 9 },
                      { name: 'November', index: 10 },
                      { name: 'December', index: 11 },
                      { name: 'January', index: 0 },
                      { name: 'February', index: 1 },
                      { name: 'March', index: 2 }
                    ];

                    const rows = [];
                    academicMonths.forEach(m => {
                      const studentInvoices = invoices.filter(inv => inv.studentId === viewingFeeBookForStudent.id);
                      const monthInvoices = studentInvoices.filter(inv => {
                        const date = new Date(inv.dueDate);
                        return date.getMonth() === m.index;
                      });

                      if (monthInvoices.length > 0) {
                        monthInvoices.forEach((inv, idx) => {
                          const paidAmount = inv.payments ? inv.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
                          const isOverdue = isInvoiceOverdue(inv);
                          const lateFine = isOverdue ? (settings.lateFineAmount ?? 150) : 0;
                          const methods = inv.payments && inv.payments.length > 0 
                            ? Array.from(new Set(inv.payments.map(p => p.paymentMethod))).map(method => {
                                if (method === 'BANK_TRANSFER') return 'Card/Bank';
                                return method;
                              }).join(', ') 
                            : '-';

                          rows.push(
                            <tr key={`${inv.id}-${idx}`} style={styles.tr}>
                              <td style={{ ...styles.td, fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                {idx === 0 ? m.name : ''}
                              </td>
                              <td style={styles.td}>{inv.feeType}</td>
                              <td style={styles.td}>₹{inv.amount.toLocaleString()}</td>
                              <td style={{ ...styles.td, color: lateFine > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                {lateFine > 0 ? `₹${lateFine}` : '₹0'}
                              </td>
                              <td style={styles.td}>{methods}</td>
                              <td style={{ ...styles.td, textAlign: 'center', fontSize: '1.2rem' }}>
                                {inv.status === 'PAID' ? '✅' : '❌'}
                              </td>
                            </tr>
                          );
                        });
                      } else {
                        rows.push(
                          <tr key={m.name} style={styles.tr}>
                            <td style={{ ...styles.td, fontWeight: 'bold', color: 'var(--text-primary)' }}>{m.name}</td>
                            <td style={{ ...styles.td, color: 'var(--text-muted)' }}>-</td>
                            <td style={{ ...styles.td, color: 'var(--text-muted)' }}>-</td>
                            <td style={{ ...styles.td, color: 'var(--text-muted)' }}>-</td>
                            <td style={{ ...styles.td, color: 'var(--text-muted)' }}>-</td>
                            <td style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>-</td>
                          </tr>
                        );
                      }
                    });
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button style={styles.cancelBtn} onClick={() => setViewingFeeBookForStudent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Pay Fee Modal */}
      {payingFeeForInvoice && createPortal(
        <div style={styles.modalOverlay}>
          <div style={{
            ...styles.modalContent,
            maxWidth: '500px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
          }} className="animate-scale-up">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💵 Pay Student Fee
              </h3>
              <button style={styles.closeBtn} onClick={() => setPayingFeeForInvoice(null)}>✕</button>
            </div>

            <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(139, 92, 246, 0.03)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Student: <strong style={{ color: 'var(--text-primary)' }}>{payingFeeForInvoice.student?.name} {payingFeeForInvoice.student?.rollNumber ? `(Roll No: ${payingFeeForInvoice.student.rollNumber})` : ''}</strong>
              </p>
              {(() => {
                const info = getCourseOrClassInfo(payingFeeForInvoice.student);
                return (
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {info.label}: <strong style={{ color: 'var(--text-primary)' }}>{info.value}</strong>
                  </p>
                );
              })()}
              <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Fee Cycle: <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{(payingFeeForInvoice.student?.feeCycle || 'MONTHLY').toLowerCase().replace('_', ' ')}</strong>
              </p>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Current Month: <strong style={{ color: 'var(--text-primary)' }}>{new Date(payingFeeForInvoice.dueDate).toLocaleString('default', { month: 'long' })}</strong>
              </p>
            </div>

            {/* Calculations Breakdown */}
            {(() => {
              const paidAmount = payingFeeForInvoice.payments ? payingFeeForInvoice.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
              const pendingAmount = Math.max(0, payingFeeForInvoice.amount - paidAmount);
              const isOverdue = isInvoiceOverdue(payingFeeForInvoice);
              const lateFine = isOverdue ? (settings.lateFineAmount ?? 150) : 0;

              const prevInvoices = invoices.filter(other => other.studentId === payingFeeForInvoice.studentId && other.id !== payingFeeForInvoice.id && other.status !== 'PAID');
              const prevDues = prevInvoices.reduce((sum, other) => {
                const paid = other.payments ? other.payments.reduce((s, p) => s + p.amount, 0) : 0;
                return sum + Math.max(0, other.amount - paid);
              }, 0);

              const totalToPay = pendingAmount + lateFine + prevDues;

              return (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    setError('');
                    setProcessing(true);
                    setProcessingMessage('Recording fee payment...');
                    const response = await api.post('/accountant/payments', {
                      feeInvoiceId: payingFeeForInvoice.id,
                      amount: Number(paymentFormData.amount),
                      paymentMethod: paymentFormData.paymentMethod,
                      receiptNumber: paymentFormData.receiptNumber
                    });

                    if (response.data) {
                      showToast('Payment recorded successfully!');
                      setPayingFeeForInvoice(null);
                      setPaymentFormData({ amount: '', paymentMethod: 'CASH', receiptNumber: '' });
                      await loadInvoices();
                    }
                  } catch (err) {
                    console.error(err);
                    setError(err.response?.data?.error || 'Failed to record payment.');
                  } finally {
                    setProcessing(false);
                  }
                }} style={styles.form}>

                  {/* Detailed breakdown list */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '14px',
                    background: 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Total Fee Amount ({new Date(payingFeeForInvoice.dueDate).toLocaleString('default', { month: 'long' })}):</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>₹{payingFeeForInvoice.amount.toLocaleString()}</span>
                    </div>
                    {paidAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--success)' }}>
                        <span>Partially Paid Amount:</span>
                        <span style={{ fontWeight: '600' }}>- ₹{paidAmount.toLocaleString()}</span>
                      </div>
                    )}
                    {paidAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Remaining Fee Amount:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>₹{pendingAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Late Fine:</span>
                      <span style={{ color: lateFine > 0 ? 'var(--danger)' : 'var(--text-primary)', fontWeight: '600' }}>₹{lateFine.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Previous Month Dues:</span>
                      <span style={{ color: prevDues > 0 ? 'var(--warning)' : 'var(--text-primary)', fontWeight: '600' }}>₹{prevDues.toLocaleString()}</span>
                    </div>
                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Total Amount:</strong>
                      <strong style={{ color: 'var(--success)' }}>₹{totalToPay.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Payment Method *</label>
                    <select
                      style={styles.input}
                      value={paymentFormData.paymentMethod}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>

                  {settings.allowPartPayment ? (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Amount to Pay (₹) *</label>
                      <input
                        type="number"
                        min="1"
                        max={totalToPay}
                        style={styles.input}
                        required
                        value={paymentFormData.amount}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Enter a custom partial payment amount (maximum outstanding is ₹{totalToPay.toLocaleString()}).
                      </span>
                    </div>
                  ) : (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Amount to Pay (₹) (Fixed)</label>
                      <input
                        type="text"
                        style={{ ...styles.input, background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}
                        disabled
                        value={`₹${totalToPay.toLocaleString()}`}
                      />
                    </div>
                  )}

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
                    <button type="button" style={styles.cancelBtn} onClick={() => setPayingFeeForInvoice(null)}>
                      Cancel Fee
                    </button>
                    <button type="submit" style={styles.submitBtn}>
                      Pay Fee
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* Paid Invoice Details Modal */}
      {viewingPaidDetailsInvoice && createPortal(
        <div style={styles.modalOverlay}>
          <div style={{
            ...styles.modalContent,
            maxWidth: '500px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
          }} className="animate-scale-up">
            
            {/* PAID stamp background watermark */}
            <div style={{
              position: 'absolute',
              top: '55%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-15deg)',
              fontSize: '4.5rem',
              fontWeight: '900',
              color: 'rgba(16, 185, 129, 0.15)',
              border: '6px double rgba(16, 185, 129, 0.25)',
              padding: '8px 24px',
              borderRadius: '12px',
              textTransform: 'uppercase',
              pointerEvents: 'none',
              letterSpacing: '0.1em',
              zIndex: 1,
              userSelect: 'none',
              fontFamily: '"Impact", "Arial Black", sans-serif'
            }}>
              PAID
            </div>

            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2 }}>
                📄 Paid Fee Details
              </h3>
              <button style={{ ...styles.closeBtn, zIndex: 3 }} onClick={() => setViewingPaidDetailsInvoice(null)}>✕</button>
            </div>

            <div style={{ zIndex: 2, position: 'relative' }}>
              <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(139, 92, 246, 0.03)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Student: <strong style={{ color: 'var(--text-primary)' }}>{viewingPaidDetailsInvoice.student?.name} {viewingPaidDetailsInvoice.student?.rollNumber ? `(Roll No: ${viewingPaidDetailsInvoice.student.rollNumber})` : ''}</strong>
                </p>
                {(() => {
                  const info = getCourseOrClassInfo(viewingPaidDetailsInvoice.student);
                  return (
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {info.label}: <strong style={{ color: 'var(--text-primary)' }}>{info.value}</strong>
                    </p>
                  );
                })()}
                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Fee Cycle: <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{(viewingPaidDetailsInvoice.student?.feeCycle || 'MONTHLY').toLowerCase().replace('_', ' ')}</strong>
                </p>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Current Month: <strong style={{ color: 'var(--text-primary)' }}>{new Date(viewingPaidDetailsInvoice.dueDate).toLocaleString('default', { month: 'long' })}</strong>
                </p>
              </div>

              {/* Calculations Breakdown */}
              {(() => {
                const paidAmount = viewingPaidDetailsInvoice.payments ? viewingPaidDetailsInvoice.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
                const isOverdue = isInvoiceOverdue(viewingPaidDetailsInvoice);
                const lateFine = paidAmount > viewingPaidDetailsInvoice.amount ? (paidAmount - viewingPaidDetailsInvoice.amount) : 0;
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      padding: '14px',
                      background: 'rgba(0, 0, 0, 0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      marginBottom: '20px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Total Fee Amount ({new Date(viewingPaidDetailsInvoice.dueDate).toLocaleString('default', { month: 'long' })}):</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>₹{viewingPaidDetailsInvoice.amount.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--success)' }}>
                        <span>Paid Amount:</span>
                        <span style={{ fontWeight: '600' }}>- ₹{paidAmount.toLocaleString()}</span>
                      </div>
                      {lateFine > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Late Fine (Included):</span>
                          <span style={{ color: 'var(--danger)', fontWeight: '600' }}>₹{lateFine.toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Remaining Fee Amount:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>₹0</span>
                      </div>
                      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Total Amount:</strong>
                        <strong style={{ color: 'var(--success)' }}>₹0</strong>
                      </div>
                    </div>


                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                      <button type="button" style={{ ...styles.submitBtn, background: 'var(--success)' }} onClick={() => setViewingPaidDetailsInvoice(null)}>
                        Close Details
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
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
  },
  headerSearchInput: {
    padding: '8px 12px 8px 30px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-primary)',
    fontSize: '0.82rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(156, 163, 175, 0.7)' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: '8px center',
    backgroundSize: '16px 16px',
    transition: 'border-color 0.2s',
  },
  searchDropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    left: 0,
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
    zIndex: 100,
    marginTop: '4px',
    maxHeight: '250px',
    overflowY: 'auto',
  },
  searchDropdownItem: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--glass-border)',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  }
};
