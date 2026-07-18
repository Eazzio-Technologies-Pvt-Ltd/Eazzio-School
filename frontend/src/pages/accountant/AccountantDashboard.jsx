import React, { useState, useEffect } from 'react';
import StatCard from '../../components/StatCard';
import Loader from '../../components/Loader';
import api from '../../api/axios';

export default function AccountantDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    totalCollections: 0,
    pendingFees: 0,
    activeInvoices: 0,
    recentPayments: [],
    studentsFeesList: []
  });

  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    classId: '',
    fatherName: '',
    motherName: '',
    phone: '',
    address: '',
    admissionDate: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/accountant/dashboard-summary');
      if (response.data) {
        setData(response.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load administrative financials. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const response = await api.get('/accountant/classes');
      if (response.data) {
        setClasses(response.data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const response = await api.post('/accountant/students', formData);
      if (response.data && response.data.success) {
        setShowModal(false);
        setFormData({
          name: '',
          rollNumber: '',
          classId: '',
          fatherName: '',
          motherName: '',
          phone: '',
          address: '',
          admissionDate: ''
        });
        loadData(); // reload statistics and students
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to add student. Please try again.');
    }
  };

  useEffect(() => {
    loadData();
    loadClasses();
  }, []);

  if (loading) return <Loader message="Loading accountant workspace..." />;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.headerRow}>
        <div>
          <h2>Accountant Portal</h2>
          <p style={styles.sub}>Manage school finances, invoices, and transaction logs.</p>
        </div>
        <button style={styles.addBtn} onClick={() => setShowModal(true)}>
          ➕ Add New Student
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px 20px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--danger)',
          color: 'var(--danger)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.9rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Metrics Grid */}
      <div style={styles.metricsGrid}>
        <StatCard
          label="Total Collections"
          value={`₹${data.totalCollections.toLocaleString()}`}
          icon="💰"
          trend="This Academic Year"
          trendColor="var(--success)"
        />
        <StatCard
          label="Pending Dues"
          value={`₹${data.pendingFees.toLocaleString()}`}
          icon="⏳"
          trend="Outstanding Invoices"
          trendColor="var(--warning)"
        />
        <StatCard
          label="Active Invoices"
          value={data.activeInvoices.toString()}
          icon="📄"
          trend="Total Invoiced Students"
          trendColor="var(--primary)"
        />
      </div>

      {/* Main content area */}
      <div style={styles.panel}>
        <h3 style={styles.panelTitle}>🕒 Recent Payments Received</h3>
        <div style={styles.tableContainer}>
          {data.recentPayments.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
              No payments received yet.
            </p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Student Name</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Payment Method</th>
                  <th style={styles.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPayments.map((payment) => (
                  <tr key={payment.id} style={styles.tr}>
                    <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: '600' }}>
                      {payment.studentName}
                    </td>
                    <td style={styles.td}>₹{payment.amount.toLocaleString()}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        color: 'var(--success)',
                        background: 'var(--success-glow)'
                      }}>
                        {payment.method}
                      </span>
                    </td>
                    <td style={styles.td}>{new Date(payment.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Student Fees Status Panel */}
      <div style={styles.panel}>
        <h3 style={styles.panelTitle}>🎒 Student Fees Status</h3>
        <div style={styles.tableContainer}>
          {data.studentsFeesList.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
              No students enrolled in the system.
            </p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Student Name</th>
                  <th style={styles.th}>Roll No</th>
                  <th style={styles.th}>Class</th>
                  <th style={styles.th}>Total Fees</th>
                  <th style={styles.th}>Paid</th>
                  <th style={styles.th}>Pending</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.studentsFeesList.map((student) => {
                  const status = student.totalFees === 0 
                    ? 'NO FEES' 
                    : student.pending === 0 
                      ? 'PAID' 
                      : 'PENDING';
                  const statusColor = status === 'PAID' 
                    ? 'var(--success)' 
                    : status === 'PENDING' 
                      ? 'var(--warning)' 
                      : 'var(--text-secondary)';
                  const statusBg = status === 'PAID' 
                    ? 'var(--success-glow)' 
                    : status === 'PENDING' 
                      ? 'var(--warning-glow)' 
                      : 'rgba(255,255,255,0.05)';
                  
                  return (
                    <tr key={student.id} style={styles.tr}>
                      <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: '600' }}>
                        {student.name}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 'normal', marginTop: '2px' }}>
                          {student.studentId}
                        </span>
                      </td>
                      <td style={styles.td}>{student.rollNumber}</td>
                      <td style={styles.td}>{student.className}</td>
                      <td style={styles.td}>₹{student.totalFees.toLocaleString()}</td>
                      <td style={{ ...styles.td, color: 'var(--success)' }}>₹{student.paid.toLocaleString()}</td>
                      <td style={{ ...styles.td, color: student.pending > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                        ₹{student.pending.toLocaleString()}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          color: statusColor,
                          background: statusBg
                        }}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Student Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="animate-scale-up">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>➕ Add New Student</h3>
              <button style={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleAddStudent} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Name *</label>
                  <input
                    type="text"
                    required
                    style={styles.input}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter student name"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Roll Number</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    placeholder="e.g. 101"
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Class *</label>
                  <select
                    required
                    style={styles.input}
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  >
                    <option value="">Select a Class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.className} - {cls.section}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Admission Date</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={formData.admissionDate}
                    onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Father's Name</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    placeholder="Father's name"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Mother's Name</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.motherName}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    placeholder="Mother's name"
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    style={styles.input}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Contact number"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Address</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Residential address"
                  />
                </div>
              </div>

              <div style={styles.formActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  addBtn: {
    background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 18px',
    fontWeight: '600',
    fontSize: '0.85rem',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(110, 68, 255, 0.3)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
  },
  panel: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  panelTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '16px',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '12px',
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
    zIndex: 1000,
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
  }
};
