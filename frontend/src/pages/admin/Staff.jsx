import React, { useState, useEffect } from 'react';
import {
  getPrincipals, createPrincipal, deletePrincipal, updatePrincipal,
  getAccountants, createAccountant, deleteAccountant, updateAccountant
} from '../../api/adminApi';
import Loader from '../../components/Loader';

export default function Staff() {
  const [activeTab, setActiveTab] = useState('principals');

  // Data State
  const [principalsList, setPrincipalsList] = useState([]);
  const [accountantsList, setAccountantsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Form Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [toast, setToast] = useState({ visible: false, message: '' });

  // View / Edit Modal
  const [viewModal, setViewModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const triggerToast = (msg) => {
    setToast({ visible: true, message: msg });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [principalsRes, accountantsRes] = await Promise.all([getPrincipals(), getAccountants()]);
      setPrincipalsList(principalsRes.principals || []);
      setAccountantsList(accountantsRes.accountants || []);
    } catch (err) {
      console.error(err);
      triggerToast('Failed to load staff list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Reset add form when tab changes or modal closes
  const closeAddModal = () => {
    setShowAddModal(false);
    setName(''); setEmail(''); setPassword(''); setPhone('');
    setFeedback({ type: '', message: '' });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    setSubmitting(true);
    try {
      const payload = { name, email, password, phone };
      if (activeTab === 'principals') {
        await createPrincipal(payload);
        triggerToast(`Principal ${name} registered successfully!`);
      } else {
        await createAccountant(payload);
        triggerToast(`Accountant ${name} registered successfully!`);
      }
      closeAddModal();
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.details || err.response?.data?.error || 'Registration failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently remove this staff member?')) return;
    try {
      if (activeTab === 'principals') {
        await deletePrincipal(id);
      } else {
        await deleteAccountant(id);
      }
      triggerToast('Staff member removed successfully.');
      loadData();
    } catch (err) {
      triggerToast('Failed to remove staff member.');
    }
  };

  const openEditModal = (item) => {
    setEditModal(item);
    setEditForm({ name: item.name, email: item.email, phone: item.phone || '' });
  };

  const handleEditSave = async () => {
    setEditSubmitting(true);
    try {
      if (activeTab === 'principals') {
        await updatePrincipal(editModal.id, editForm);
      } else {
        await updateAccountant(editModal.id, editForm);
      }
      triggerToast('Staff member updated successfully!');
      setEditModal(null);
      loadData();
    } catch (err) {
      triggerToast(err.response?.data?.error || 'Failed to update.');
    } finally {
      setEditSubmitting(false);
    }
  };

  if (loading) return <Loader message="Loading management staff roster..." />;

  const activeList = activeTab === 'principals' ? principalsList : accountantsList;
  const roleLabel = activeTab === 'principals' ? 'Principal' : 'Accountant';

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Page Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Management Staff Administration</h2>
          <p style={styles.sub}>Onboard and oversee Principals and Accountants.</p>
        </div>
      </div>

      {/* Toast */}
      {toast.visible && (
        <div style={styles.toast}>
          <span>💼</span> {toast.message}
        </div>
      )}

      {/* ── ADD FORM MODAL ── */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={closeAddModal}>
          <div style={styles.addModalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>➕ Add New {roleLabel}</h3>
                <p style={styles.modalSubtitle}>Fill in the details to provision a new {roleLabel.toLowerCase()} account.</p>
              </div>
              <button style={styles.closeBtn} onClick={closeAddModal}>✕</button>
            </div>
            <div style={styles.addModalBody}>
              <form onSubmit={handleRegister} id="add-staff-form">
                {feedback.message && (
                  <div style={{
                    ...styles.alertBox,
                    background: feedback.type === 'error' ? 'var(--danger-glow)' : 'rgba(16,185,129,0.1)',
                    color: feedback.type === 'error' ? 'var(--danger)' : 'var(--success)',
                    marginBottom: '16px',
                  }}>
                    {feedback.message}
                  </div>
                )}
                <div style={styles.formGrid}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Full Name <span style={styles.req}>*</span></label>
                    <input style={styles.input} type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Eleanor Vance" />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Phone Number</label>
                    <input style={styles.input} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(Optional)" />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Email Address <span style={styles.req}>*</span></label>
                    <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="e.g. eleanor@school.edu" />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Temporary Password <span style={styles.req}>*</span></label>
                    <input style={styles.input} type="text" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="At least 6 characters" minLength={6} />
                  </div>
                </div>
              </form>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={closeAddModal}>Cancel</button>
              <button type="submit" form="add-staff-form" style={{ ...styles.addSubmitBtn, opacity: submitting ? 0.7 : 1 }} disabled={submitting}>
                {submitting ? 'Provisioning...' : `✅ Add ${roleLabel}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW MODAL ── */}
      {viewModal && (
        <div style={styles.modalOverlay} onClick={() => setViewModal(null)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>👤 Staff Details</h3>
              <button style={styles.closeBtn} onClick={() => setViewModal(null)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              {[
                { label: 'Full Name', value: viewModal.name },
                { label: 'Email', value: viewModal.email },
                { label: 'Phone', value: viewModal.phone || 'Not provided' },
                { label: 'Role', value: activeTab === 'principals' ? '🎓 Principal' : '💰 Accountant', highlight: true },
              ].map(({ label, value, highlight }) => (
                <div key={label} style={styles.detailRow}>
                  <span style={styles.detailLabel}>{label}</span>
                  <span style={{ ...styles.detailValue, ...(highlight ? { color: 'var(--primary)', fontWeight: '700' } : {}) }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => setViewModal(null)}>Close</button>
              <button style={styles.addSubmitBtn} onClick={() => { setViewModal(null); openEditModal(viewModal); }}>
                ✏️ Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editModal && (
        <div style={styles.modalOverlay} onClick={() => setEditModal(null)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>✏️ Edit Staff Member</h3>
              <button style={styles.closeBtn} onClick={() => setEditModal(null)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: '' },
                { label: 'Email Address', key: 'email', type: 'email', placeholder: '' },
                { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: '(Optional)' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} style={styles.inputGroup}>
                  <label style={styles.label}>{label}</label>
                  <input
                    style={styles.input}
                    type={type}
                    value={editForm[key]}
                    placeholder={placeholder}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => setEditModal(null)}>Cancel</button>
              <button
                style={{ ...styles.addSubmitBtn, opacity: editSubmitting ? 0.7 : 1 }}
                onClick={handleEditSave}
                disabled={editSubmitting}
              >
                {editSubmitting ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div style={styles.tabsContainer}>
        <button onClick={() => setActiveTab('principals')} style={{ ...styles.tabBtn, ...(activeTab === 'principals' ? styles.activeTabBtn : {}) }}>
          🎓 Principals
        </button>
        <button onClick={() => setActiveTab('accountants')} style={{ ...styles.tabBtn, ...(activeTab === 'accountants' ? styles.activeTabBtn : {}) }}>
          💰 Accountants
        </button>
      </div>

      {/* ── FULL WIDTH LIST CARD ── */}
      <div style={styles.listCard}>
        {/* List Card Header with Add Button */}
        <div style={styles.listHeader}>
          <div style={styles.listHeaderLeft}>
            <h3 style={styles.listTitle}>Active {activeTab === 'principals' ? 'Principals' : 'Accountants'}</h3>
            <span style={styles.badgeCount}>{activeList.length} Total</span>
          </div>
          <button style={styles.addButton} onClick={() => setShowAddModal(true)}>
            ＋ Add {roleLabel}
          </button>
        </div>

        {/* Table */}
        <div style={styles.tableWrapper}>
          {activeList.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>{activeTab === 'principals' ? '🎓' : '💰'}</div>
              <p style={{ margin: '8px 0 0', fontWeight: '500' }}>No {activeTab === 'principals' ? 'principals' : 'accountants'} onboarded yet.</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                Click "Add {roleLabel}" to get started.
              </p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Phone</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeList.map((item, idx) => (
                  <tr key={item.id} style={styles.tr}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...styles.td, color: 'var(--text-tertiary)', fontWeight: '600', width: '40px' }}>{idx + 1}</td>
                    <td style={{ ...styles.td, fontWeight: '700', color: 'var(--text-primary)' }}>{item.name}</td>
                    <td style={{ ...styles.td, color: 'var(--text-secondary)' }}>{item.email}</td>
                    <td style={{ ...styles.td, color: 'var(--text-tertiary)' }}>{item.phone || '—'}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <div style={styles.actionGroup}>
                        <button onClick={() => setViewModal(item)} style={styles.viewBtn}>👁 View</button>
                        <button onClick={() => openEditModal(item)} style={styles.editBtn}>✏️ Edit</button>
                        <button onClick={() => handleDelete(item.id)} style={styles.deleteBtn}>🗑 Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '30px', maxWidth: '1100px', margin: '0 auto', color: 'var(--text-primary)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' },
  title: { margin: 0, fontSize: '1.5rem' },
  sub: { color: 'var(--text-secondary)', marginTop: '6px', fontSize: '0.9rem' },

  toast: { position: 'fixed', bottom: '30px', right: '30px', background: '#ffffff', color: 'var(--text-primary)', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 3000, fontWeight: '500', borderLeft: '4px solid var(--primary)' },

  tabsContainer: { display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--glass-border)' },
  tabBtn: { padding: '12px 24px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', transition: 'all 0.3s ease' },
  activeTabBtn: { color: 'var(--primary)', borderBottom: '3px solid var(--primary)' },

  // Full width list card
  listCard: { background: '#ffffff', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden' },
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid var(--glass-border)' },
  listHeaderLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  listTitle: { margin: 0, fontSize: '1.1rem', fontWeight: '700' },
  badgeCount: { background: 'var(--primary-glow)', color: 'var(--primary)', padding: '3px 12px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700' },
  addButton: { padding: '10px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', transition: 'opacity 0.2s', letterSpacing: '0.3px' },

  tableWrapper: { overflowX: 'auto' },
  emptyState: { padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' },
  emptyIcon: { fontSize: '2.5rem', marginBottom: '12px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { background: '#f9fafb', borderBottom: '1px solid var(--glass-border)' },
  th: { padding: '13px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px' },
  tr: { borderBottom: '1px solid var(--glass-border)', transition: 'background 0.15s', cursor: 'default' },
  td: { padding: '16px', verticalAlign: 'middle', fontSize: '0.9rem' },

  actionGroup: { display: 'flex', gap: '6px', justifyContent: 'center' },
  viewBtn: { padding: '5px 12px', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' },
  editBtn: { padding: '5px 12px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' },
  deleteBtn: { padding: '5px 12px', background: 'var(--danger-glow)', color: 'var(--danger)', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' },

  // Modals — shared overlay
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },

  // Add modal — wider, fully opaque white
  addModalBox: { background: '#ffffff', borderRadius: '18px', border: '1px solid var(--glass-border)', width: '100%', maxWidth: '580px', boxShadow: '0 28px 72px rgba(0,0,0,0.25)' },
  addModalBody: { padding: '24px 28px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },

  // View / Edit modal — normal size, fully opaque white
  modalBox: { background: '#ffffff', borderRadius: '16px', border: '1px solid var(--glass-border)', width: '100%', maxWidth: '440px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  modalBody: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' },

  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', borderBottom: '1px solid var(--glass-border)' },
  modalTitle: { margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' },
  modalSubtitle: { margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' },
  closeBtn: { background: 'none', border: 'none', fontSize: '1.1rem', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0, marginTop: '2px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px', borderTop: '1px solid var(--glass-border)', background: '#f9fafb', borderRadius: '0 0 16px 16px' },
  cancelBtn: { padding: '9px 20px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' },
  addSubmitBtn: { padding: '9px 22px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' },

  // Form fields
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '7px' },
  label: { fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)' },
  req: { color: 'var(--danger)' },
  input: { padding: '11px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: '#f9fafb', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
  alertBox: { padding: '10px 14px', borderRadius: '8px', fontSize: '0.88rem' },

  // View modal detail rows
  detailRow: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 14px', background: '#f9fafb', borderRadius: '8px', border: '1px solid var(--glass-border)' },
  detailLabel: { fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.5px' },
  detailValue: { fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '500' },
};

