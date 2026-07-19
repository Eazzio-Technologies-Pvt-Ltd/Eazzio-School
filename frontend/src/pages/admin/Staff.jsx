import React, { useState, useEffect } from 'react';
import { getPrincipals, createPrincipal, deletePrincipal, getAccountants, createAccountant, deleteAccountant } from '../../api/adminApi';
import Loader from '../../components/Loader';

export default function Staff() {
  const [activeTab, setActiveTab] = useState('principals'); // 'principals' or 'accountants'
  
  // Data State
  const [principalsList, setPrincipalsList] = useState([]);
  const [accountantsList, setAccountantsList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [toast, setToast] = useState({ visible: false, message: '' });

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

  useEffect(() => {
    loadData();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    setSubmitting(true);
    try {
      const payload = { name, email, password, phone };
      if (activeTab === 'principals') {
        await createPrincipal(payload);
        triggerToast(`Principal ₹${name} registered successfully!`);
      } else {
        await createAccountant(payload);
        triggerToast(`Accountant ₹${name} registered successfully!`);
      }
      setName(''); setEmail(''); setPassword(''); setPhone('');
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

  if (loading) return <Loader message="Loading management staff roster..." />;

  const activeList = activeTab === 'principals' ? principalsList : accountantsList;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>Management Staff Administration</h2>
        <p style={styles.sub}>Onboard and oversee Principals and Accountants.</p>
      </div>

      {toast.visible && (
        <div style={styles.toast}>
          <span>💼</span> {toast.message}
        </div>
      )}

      {/* Tabs Menu */}
      <div style={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab('principals')}
          style={{ ...styles.tabBtn, ...(activeTab === 'principals' ? styles.activeTabBtn : {}) }}
        >
          🎓 Principals
        </button>
        <button
          onClick={() => setActiveTab('accountants')}
          style={{ ...styles.tabBtn, ...(activeTab === 'accountants' ? styles.activeTabBtn : {}) }}
        >
          💰 Accountants
        </button>
      </div>

      <div style={styles.splitLayout}>
        {/* Left Column: Form */}
        <div style={styles.formCard}>
          <h3 style={styles.cardTitle}>Add New {activeTab === 'principals' ? 'Principal' : 'Accountant'}</h3>
          <p style={styles.cardDesc}>
            Provision a new {activeTab === 'principals' ? 'principal' : 'accountant'} account. They will use the email and password provided below to sign in.
          </p>

          <form onSubmit={handleRegister} style={styles.form}>
            {feedback.message && (
              <div style={{ ...styles.alert, background: feedback.type === 'error' ? 'var(--danger-glow)' : 'rgba(16, 185, 129, 0.1)', color: feedback.type === 'error' ? 'var(--danger)' : 'var(--success)' }}>
                {feedback.message}
              </div>
            )}
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name <span style={styles.req}>*</span></label>
              <input type="text" style={styles.input} value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Eleanor Vance" />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address <span style={styles.req}>*</span></label>
              <input type="email" style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="e.g. eleanor@school.edu" />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Temporary Password <span style={styles.req}>*</span></label>
              <input type="text" style={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="At least 6 characters" minLength={6} />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Phone Number</label>
              <input type="tel" style={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(Optional)" />
            </div>

            <button type="submit" style={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Provisioning...' : `Add ₹${activeTab === 'principals' ? 'Principal' : 'Accountant'}`}
            </button>
          </form>
        </div>

        {/* Right Column: Roster List */}
        <div style={styles.listCard}>
          <div style={styles.listHeader}>
            <h3>Active {activeTab === 'principals' ? 'Principals' : 'Accountants'}</h3>
            <span style={styles.badgeCount}>{activeList.length} Total</span>
          </div>

          <div style={styles.tableWrapper}>
            {activeList.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No {activeTab === 'principals' ? 'principals' : 'accountants'} have been onboarded yet.</p>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Contact Info</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.map((item) => (
                    <tr key={item.id} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: '600' }}>
                        <div style={styles.staffName}>{item.name}</div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.email}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{item.phone || 'No phone'}</div>
                      </td>
                      <td style={styles.td}>
                        <button onClick={() => handleDelete(item.id)} style={styles.actionBtn}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '30px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' },
  header: { marginBottom: '30px' },
  sub: { color: 'var(--text-secondary)', marginTop: '5px' },
  toast: { position: 'fixed', bottom: '30px', right: '30px', background: 'var(--surface-light)', color: 'var(--text-primary)', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 1000, fontWeight: '500', borderLeft: '4px solid var(--primary)' },
  tabsContainer: { display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid var(--border)' },
  tabBtn: { padding: '12px 24px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', transition: 'all 0.3s ease', position: 'relative' },
  activeTabBtn: { color: 'var(--primary)', borderBottom: '3px solid var(--primary)' },
  splitLayout: { display: 'flex', gap: '30px', alignItems: 'flex-start' },
  formCard: { flex: '1', background: 'var(--surface)', padding: '30px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' },
  listCard: { flex: '1.5', background: 'var(--surface)', padding: '30px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' },
  cardTitle: { marginBottom: '8px', fontSize: '1.25rem', color: 'var(--text-primary)' },
  cardDesc: { marginBottom: '25px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' },
  req: { color: 'var(--danger)' },
  input: { padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' },
  submitBtn: { padding: '14px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', marginTop: '10px', transition: 'opacity 0.2s' },
  alert: { padding: '12px', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '10px' },
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  badgeCount: { background: 'var(--primary-glow)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700' },
  tableWrapper: { overflowX: 'auto' },
  emptyState: { padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--background)', borderRadius: '12px', border: '1px dashed var(--border)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { borderBottom: '1px solid var(--border)' },
  th: { padding: '12px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.2s' },
  td: { padding: '16px 12px', verticalAlign: 'middle' },
  staffName: { color: 'var(--text-primary)' },
  actionBtn: { padding: '6px 12px', background: 'var(--danger-glow)', color: 'var(--danger)', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' },
};
