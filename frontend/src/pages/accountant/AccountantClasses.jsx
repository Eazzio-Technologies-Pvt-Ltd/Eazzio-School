import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Loader from '../../components/Loader';
import { createPortal } from 'react-dom';

export default function AccountantClasses() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classes, setClasses] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [classFormData, setClassFormData] = useState({
    className: '',
    section: '',
    academicYear: '',
    fees: '',
    planType: 'MONTHLY',
    feeType: 'Tuition Fee',
    oneTimeFee: ''
  });
  const [editingClass, setEditingClass] = useState(null);
  const [editClassFormData, setEditClassFormData] = useState({
    className: '',
    section: '',
    academicYear: '',
    fees: '',
    planType: 'MONTHLY',
    feeType: 'Tuition Fee',
    oneTimeFee: ''
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

  const loadData = async (showBlocker = true) => {
    try {
      if (showBlocker) setLoading(true);
      setError('');
      // Fetch classes
      const classesResponse = await api.get('/accountant/classes');
      if (classesResponse.data && classesResponse.data.success) {
        setClasses(classesResponse.data.data || classesResponse.data);
      } else if (Array.isArray(classesResponse.data)) {
        setClasses(classesResponse.data);
      }
    } catch (err) {
      console.error('Error fetching classes data:', err);
      setError('Failed to load classes. Please try again.');
    } finally {
      if (showBlocker) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (editingClass) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [editingClass]);

  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setProcessing(true);
      setProcessingMessage('Creating new class or course...');
      const response = await api.post('/accountant/classes', classFormData);
      if (response.data) {
        showToast('Course added successfully!');
        setClassFormData({ className: '', section: '', academicYear: '', fees: '', planType: 'MONTHLY', feeType: 'Tuition Fee', oneTimeFee: '' });
        
        setProcessingMessage('Refreshing class directory...');
        await loadData(false);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to add class/course.');
    } finally {
      setProcessing(false);
    }
  };

  const startEditingClass = (cls) => {
    setEditingClass(cls);
    const mainFee = cls.feesList?.find(f => f.planType !== 'ONE_TIME');
    const oneTimeFee = cls.feesList?.find(f => f.planType === 'ONE_TIME');
    setEditClassFormData({
      className: cls.className || '',
      section: cls.section || '',
      academicYear: cls.academicYear || '',
      fees: mainFee ? mainFee.amount.toString() : '',
      planType: mainFee ? mainFee.planType : 'MONTHLY',
      feeType: mainFee ? mainFee.feeType : 'Tuition Fee',
      oneTimeFee: oneTimeFee ? oneTimeFee.amount.toString() : ''
    });
  };

  const handleEditClass = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setProcessing(true);
      setProcessingMessage('Updating class/course details...');
      const response = await api.put(`/accountant/classes/${editingClass.id}`, editClassFormData);
      if (response.data) {
        setEditingClass(null);
        showToast('Class details updated successfully!');
        setProcessingMessage('Refreshing class directory...');
        await loadData(false);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update class details.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteClass = async (classId, className) => {
    if (!window.confirm(`Are you sure you want to delete ${className}? This will disconnect all students in this class.`)) {
      return;
    }

    try {
      setError('');
      setProcessing(true);
      setProcessingMessage(`Deleting class ${className}...`);
      const response = await api.delete(`/accountant/classes/${classId}`);
      if (response.data) {
        showToast(`Class ${className} deleted successfully!`);
        setProcessingMessage('Refreshing class directory...');
        await loadData(false);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to delete class.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Loader message="Loading courses..." />;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.headerRow}>
        <div>
          <h2>🏫 Courses</h2>
          <p style={styles.sub}>Manage administrative school grades, batches, and sessions.</p>
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
        {/* Add Course Form Panel */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h3 style={styles.panelTitle}>🏫 Add New Course</h3>
          </div>
          <form onSubmit={handleAddClass} style={styles.form}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Course Name *</label>
                <input
                  type="text"
                  required
                  style={styles.input}
                  placeholder="e.g. 6, Fitter, Mechanical"
                  value={classFormData.className}
                  onChange={(e) => setClassFormData({ ...classFormData, className: e.target.value })}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Section / Batch *</label>
                <input
                  type="text"
                  required
                  style={styles.input}
                  placeholder="e.g. A, Batch 1 (use 'N/A' if not applicable)"
                  value={classFormData.section}
                  onChange={(e) => setClassFormData({ ...classFormData, section: e.target.value })}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Academic Session / Year *</label>
                <input
                  type="text"
                  required
                  style={styles.input}
                  placeholder="e.g. 2026-27"
                  value={classFormData.academicYear}
                  onChange={(e) => setClassFormData({ ...classFormData, academicYear: e.target.value })}
                />
              </div>
            </div>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Course Fees (₹, Optional)</label>
                <input
                  type="number"
                  style={styles.input}
                  placeholder="e.g. 2500"
                  value={classFormData.fees}
                  onChange={(e) => setClassFormData({ ...classFormData, fees: e.target.value })}
                  onWheel={(e) => e.target.blur()}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Fee Type</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="e.g. Tuition Fee"
                  value={classFormData.feeType}
                  onChange={(e) => setClassFormData({ ...classFormData, feeType: e.target.value })}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Plan Cycle</label>
                <select
                  style={styles.input}
                  value={classFormData.planType}
                  onChange={(e) => setClassFormData({ ...classFormData, planType: e.target.value })}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="HALF_YEARLY">Half-Yearly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
            </div>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>One-Time Admission Fee (₹, Optional)</label>
                <input
                  type="number"
                  style={styles.input}
                  placeholder="e.g. 5000"
                  value={classFormData.oneTimeFee}
                  onChange={(e) => setClassFormData({ ...classFormData, oneTimeFee: e.target.value })}
                  onWheel={(e) => e.target.blur()}
                />
              </div>
              <div style={styles.formGroup} />
              <div style={styles.formGroup} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="submit" style={styles.submitBtn}>
                Create Course
              </button>
            </div>
          </form>
        </div>

        {/* Courses list */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h3 style={styles.panelTitle}>📚 Existing Courses</h3>
            <span style={styles.recordCounter}>{classes.length} Courses found</span>
          </div>
          <div style={styles.tableContainer}>
            {classes.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0, padding: '20px', textAlign: 'center' }}>
                No courses found. Add one above.
              </p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Course Name</th>
                    <th style={styles.th}>Section/Batch</th>
                    <th style={styles.th}>Academic Year</th>
                    <th style={styles.th}>Course Fees</th>
                    <th style={styles.th}>Student Count</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls) => {
                    const count = cls._count?.students || 0;
                    return (
                      <tr key={cls.id} style={styles.tr}>
                        <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: '600' }}>
                          {cls.className}
                        </td>
                        <td style={styles.td}>{cls.section}</td>
                        <td style={styles.td}>{cls.academicYear}</td>
                        <td style={styles.td}>
                          {cls.feesList && cls.feesList.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {cls.feesList.map(fee => (
                                <span key={fee.id} style={{ fontSize: '0.85rem' }}>
                                  ₹{fee.amount.toLocaleString()}{' '}
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                    ({fee.feeType}: {fee.planType.toLowerCase().replace('_', ' ')})
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No Fees</span>
                          )}
                        </td>
                        <td style={styles.td}>{count} Students</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button
                              style={{
                                ...styles.actionBtn,
                                color: '#a78bfa',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                backgroundColor: 'rgba(139, 92, 246, 0.05)'
                              }}
                              onClick={() => startEditingClass(cls)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              style={{
                                ...styles.actionBtn,
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                backgroundColor: 'rgba(239, 68, 68, 0.05)'
                              }}
                              onClick={() => handleDeleteClass(cls.id, `${cls.className} (${cls.section})`)}
                            >
                              🗑️ Delete
                            </button>
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

      {editingClass && createPortal(
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="animate-scale-up">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>✏️ Edit Course</h3>
              <button style={styles.closeBtn} onClick={() => setEditingClass(null)}>✕</button>
            </div>

            <form onSubmit={handleEditClass} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Course Name *</label>
                <input
                  type="text"
                  required
                  style={styles.input}
                  value={editClassFormData.className}
                  onChange={(e) => setEditClassFormData({ ...editClassFormData, className: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Section / Batch *</label>
                <input
                  type="text"
                  required
                  style={styles.input}
                  value={editClassFormData.section}
                  onChange={(e) => setEditClassFormData({ ...editClassFormData, section: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Academic Session / Year *</label>
                <input
                  type="text"
                  required
                  style={styles.input}
                  value={editClassFormData.academicYear}
                  onChange={(e) => setEditClassFormData({ ...editClassFormData, academicYear: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Course Fees (₹, Optional)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={editClassFormData.fees}
                  onChange={(e) => setEditClassFormData({ ...editClassFormData, fees: e.target.value })}
                  onWheel={(e) => e.target.blur()}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Fee Type</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="e.g. Tuition Fee"
                  value={editClassFormData.feeType}
                  onChange={(e) => setEditClassFormData({ ...editClassFormData, feeType: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Plan Cycle</label>
                <select
                  style={styles.input}
                  value={editClassFormData.planType}
                  onChange={(e) => setEditClassFormData({ ...editClassFormData, planType: e.target.value })}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="HALF_YEARLY">Half-Yearly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>One-Time Admission Fee (₹, Optional)</label>
                <input
                  type="number"
                  style={styles.input}
                  placeholder="e.g. 5000"
                  value={editClassFormData.oneTimeFee}
                  onChange={(e) => setEditClassFormData({ ...editClassFormData, oneTimeFee: e.target.value })}
                  onWheel={(e) => e.target.blur()}
                />
              </div>

              <div style={styles.formActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setEditingClass(null)}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
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
  actionBtn: {
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
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
    maxWidth: '500px',
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
  }
};
