import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import Loader from '../../components/Loader';

export default function AccountantFeeStructure() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPlan = searchParams.get('plan') || 'monthly';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classes, setClasses] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [filterClass, setFilterClass] = useState('all');
  
  // Create Form State
  const [formState, setFormState] = useState({
    classId: '',
    feeType: '',
    amount: '',
    dueDate: '',
    planType: 'MONTHLY'
  });

  // Edit Modal State
  const [editingStructure, setEditingStructure] = useState(null);
  const [editFormState, setEditFormState] = useState({
    classId: '',
    feeType: '',
    amount: '',
    dueDate: '',
    planType: 'MONTHLY'
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

      // Fetch classes for dropdown selection
      const classesResponse = await api.get('/accountant/classes');
      if (classesResponse.data) {
        setClasses(Array.isArray(classesResponse.data) ? classesResponse.data : (classesResponse.data.data || []));
      }

      // Fetch fee structures
      const feeResponse = await api.get('/accountant/fee-structures');
      if (feeResponse.data) {
        setFeeStructures(Array.isArray(feeResponse.data) ? feeResponse.data : (feeResponse.data.data || []));
      }
    } catch (err) {
      console.error('Error fetching fee structures:', err);
      setError('Failed to load fee structures. Please check your connection.');
    } finally {
      if (showBlocker) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lock body scroll when edit modal is active
  useEffect(() => {
    if (editingStructure) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [editingStructure]);

  const handleAddStructure = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setProcessing(true);
      setProcessingMessage('Creating fee structure configuration...');
      
      const payload = {
        classId: formState.classId || null,
        feeType: formState.feeType,
        amount: formState.amount,
        dueDate: formState.dueDate || null,
        planType: formState.planType || 'MONTHLY'
      };

      const response = await api.post('/accountant/fee-structures', payload);
      if (response.data) {
        showToast('Fee structure added successfully!');
        setFormState({ classId: '', feeType: '', amount: '', dueDate: '', planType: 'MONTHLY' });
        setProcessingMessage('Refreshing configurations...');
        await loadData(false);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to create fee structure.');
    } finally {
      setProcessing(false);
    }
  };

  const startEditing = (structure) => {
    setEditingStructure(structure);
    setEditFormState({
      classId: structure.classId ? structure.classId.toString() : '',
      feeType: structure.feeType || '',
      amount: structure.amount || '',
      dueDate: structure.dueDate ? new Date(structure.dueDate).toISOString().split('T')[0] : '',
      planType: structure.planType || 'MONTHLY'
    });
  };

  const handleEditStructure = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setProcessing(true);
      setProcessingMessage('Updating fee structure details...');

      const payload = {
        classId: editFormState.classId || null,
        feeType: editFormState.feeType,
        amount: editFormState.amount,
        dueDate: editFormState.dueDate || null,
        planType: editFormState.planType || 'MONTHLY'
      };

      const response = await api.put(`/accountant/fee-structures/${editingStructure.id}`, payload);
      if (response.data) {
        setEditingStructure(null);
        showToast('Fee structure updated successfully!');
        setProcessingMessage('Refreshing configurations...');
        await loadData(false);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update fee structure.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteStructure = async (id, typeName) => {
    if (!window.confirm(`Are you sure you want to delete the fee structure "${typeName}"?`)) {
      return;
    }

    try {
      setError('');
      setProcessing(true);
      setProcessingMessage(`Deleting fee structure ${typeName}...`);
      const response = await api.delete(`/accountant/fee-structures/${id}`);
      if (response.data) {
        showToast(`Fee structure deleted successfully!`);
        setProcessingMessage('Refreshing configurations...');
        await loadData(false);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to delete fee structure.');
    } finally {
      setProcessing(false);
    }
  };

  const filteredStructures = feeStructures.filter((item) => {
    const itemPlan = (item.planType || 'MONTHLY').toLowerCase();
    const targetPlan = currentPlan === 'add' ? 'monthly' : currentPlan.toLowerCase();
    
    if (currentPlan !== 'add' && itemPlan !== targetPlan) return false;

    if (filterClass === 'all') return true;
    if (filterClass === 'school-wide') return item.classId === null;
    return item.classId === parseInt(filterClass);
  });

  const plans = [
    { id: 'add', label: '➕ Add Fee Plan' },
    { id: 'monthly', label: '📅 Monthly' },
    { id: 'quarterly', label: '📆 Quarterly' },
    { id: 'half-yearly', label: '🗓️ Half-Yearly' },
    { id: 'yearly', label: '🏆 Yearly' }
  ];

  if (loading) return <Loader message="Loading course fee structures..." />;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.headerRow}>
        <div>
          <h2>📋 Course Fee Structures</h2>
          <p style={styles.sub}>Configure standardized academic fees, registration packages, and due dates for classes.</p>
        </div>
      </div>

      <div style={styles.tabContainer}>
        {plans.map(p => {
          const active = currentPlan === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setSearchParams({ plan: p.id })}
              style={{
                ...styles.tabBtn,
                ...(active ? styles.tabBtnActive : {})
              }}
            >
              {p.label}
            </button>
          );
        })}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Add Structure Form */}
        {currentPlan === 'add' && (
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>➕ Create New Fee Structure Plan</h3>
            </div>
            <form onSubmit={handleAddStructure} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Class / Course (Optional - Leave blank for School-Wide)</label>
                  <select
                    style={styles.input}
                    value={formState.classId}
                    onChange={(e) => setFormState({ ...formState, classId: e.target.value })}
                  >
                    <option value="">🏫 All Classes (School-Wide)</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.className} - {cls.section} ({cls.academicYear})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Plan Cycle / Frequency *</label>
                  <select
                    style={styles.input}
                    required
                    value={formState.planType}
                    onChange={(e) => setFormState({ ...formState, planType: e.target.value })}
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
                  <label style={styles.label}>Fee Type / Description *</label>
                  <input
                    type="text"
                    required
                    style={styles.input}
                    placeholder="e.g. Tuition Fee, Exam Fee, Admission Package"
                    value={formState.feeType}
                    onChange={(e) => setFormState({ ...formState, feeType: e.target.value })}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    style={styles.input}
                    placeholder="e.g. 1500"
                    value={formState.amount}
                    onChange={(e) => setFormState({ ...formState, amount: e.target.value })}
                    onWheel={(e) => e.target.blur()}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Due Date (Optional)</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={formState.dueDate}
                    onChange={(e) => setFormState({ ...formState, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="submit" style={styles.submitBtn}>
                  Configure Fee Structure
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Existing structures list */}
        {currentPlan !== 'add' && (
          <div style={styles.panel}>
            <div style={{ ...styles.panelHeader, flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ ...styles.panelTitle, textTransform: 'capitalize' }}>📋 {currentPlan} Fee Models</h3>
                  <span style={styles.recordCounter}>{filteredStructures.length} Structures mapped</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      setFormState(prev => ({ ...prev, planType: currentPlan.toUpperCase() }));
                      setSearchParams({ plan: 'add' });
                    }}
                    style={styles.inlineAddBtn}
                  >
                    ➕ Create {currentPlan} plan
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ ...styles.label, margin: 0 }}>Filter Class:</label>
                    <select
                      style={{ ...styles.input, padding: '6px 12px', fontSize: '0.8rem' }}
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                    >
                      <option value="all">Show All</option>
                      <option value="school-wide">School-Wide Only</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.className} - {cls.section}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

          <div style={styles.tableContainer}>
            {filteredStructures.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0, padding: '20px', textAlign: 'center' }}>
                No configured fee structures found. Setup one using the form above.
              </p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Class / Target</th>
                    <th style={styles.th}>Fee Description</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Default Due Date</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStructures.map((item) => (
                    <tr key={item.id} style={styles.tr}>
                      <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: '600' }}>
                        {item.class ? `${item.class.className} - ${item.class.section}` : '🏫 School-Wide'}
                      </td>
                      <td style={styles.td}>{item.feeType}</td>
                      <td style={{ ...styles.td, color: '#a78bfa', fontWeight: '600' }}>
                        ₹{Number(item.amount).toLocaleString('en-IN')}
                      </td>
                      <td style={styles.td}>
                        {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'None'}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button
                            style={{
                              ...styles.actionBtn,
                              color: '#a78bfa',
                              border: '1px solid rgba(139, 92, 246, 0.3)',
                              backgroundColor: 'rgba(139, 92, 246, 0.05)'
                            }}
                            onClick={() => startEditing(item)}
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
                            onClick={() => handleDeleteStructure(item.id, item.feeType)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Edit Modal */}
      {editingStructure && createPortal(
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="animate-scale-up">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>✏️ Edit Fee Structure</h3>
              <button style={styles.closeBtn} onClick={() => setEditingStructure(null)}>✕</button>
            </div>

            <form onSubmit={handleEditStructure} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Class / Course (Optional)</label>
                <select
                  style={styles.input}
                  value={editFormState.classId}
                  onChange={(e) => setEditFormState({ ...editFormState, classId: e.target.value })}
                >
                  <option value="">🏫 All Classes (School-Wide)</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.className} - {cls.section} ({cls.academicYear})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Fee Type / Description *</label>
                <input
                  type="text"
                  required
                  style={styles.input}
                  value={editFormState.feeType}
                  onChange={(e) => setEditFormState({ ...editFormState, feeType: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  style={styles.input}
                  value={editFormState.amount}
                  onChange={(e) => setEditFormState({ ...editFormState, amount: e.target.value })}
                  onWheel={(e) => e.target.blur()}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Due Date (Optional)</label>
                <input
                  type="date"
                  style={styles.input}
                  value={editFormState.dueDate}
                  onChange={(e) => setEditFormState({ ...editFormState, dueDate: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Plan Cycle / Frequency *</label>
                <select
                  style={styles.input}
                  required
                  value={editFormState.planType}
                  onChange={(e) => setEditFormState({ ...editFormState, planType: e.target.value })}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="HALF_YEARLY">Half-Yearly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              <div style={styles.formActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setEditingStructure(null)}>
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

      {/* Full-screen Blocker overlay portal */}
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

      {/* Toast Portal */}
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
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
          zIndex: 999999,
          animation: 'slide-in 0.3s ease-out'
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
  },
  tabContainer: {
    display: 'flex',
    gap: '12px',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '4px',
    marginBottom: '8px',
    overflowX: 'auto',
  },
  tabBtn: {
    padding: '10px 20px',
    borderRadius: '8px 8px 0 0',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    color: 'var(--primary)',
    borderBottom: '3px solid var(--primary)',
  },
  inlineAddBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(139, 92, 246, 0.4)',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    color: 'var(--primary)',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.8rem',
    transition: 'all 0.2s',
  }
};
