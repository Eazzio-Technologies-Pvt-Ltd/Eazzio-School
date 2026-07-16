import React, { useState, useEffect } from 'react';
import { getFeeCollection, getFeeStructures, createFeeStructure, generateInvoices, getInvoices, payInvoice, getClasses } from '../../api/principalApi';
import Loader from '../../components/Loader';
import StatCard from '../../components/StatCard';

export default function FeesOverview() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data States
  const [collectionData, setCollectionData] = useState(null);
  const [structures, setStructures] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [classesList, setClassesList] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals & Forms
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  const [structureForm, setStructureForm] = useState({ feeType: '', amount: '', classId: '', dueDate: '' });
  const [invoiceForm, setInvoiceForm] = useState({ structureId: '', classId: '' });
  const [payForm, setPayForm] = useState({ amount: '', paymentMethod: 'CASH' });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [colRes, strRes, invRes, clsRes] = await Promise.all([
        getFeeCollection(),
        getFeeStructures(),
        getInvoices(),
        getClasses()
      ]);
      setCollectionData(colRes);
      setStructures(strRes);
      setInvoices(invRes);
      setClassesList(clsRes);
    } catch (err) {
      console.error(err);
      setError('Failed to load fee management data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStructure = async (e) => {
    e.preventDefault();
    try {
      await createFeeStructure(structureForm);
      setShowStructureModal(false);
      setStructureForm({ feeType: '', amount: '', classId: '', dueDate: '' });
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create structure');
    }
  };

  const handleGenerateInvoices = async (e) => {
    e.preventDefault();
    try {
      await generateInvoices(invoiceForm);
      setShowInvoiceModal(false);
      setInvoiceForm({ structureId: '', classId: '' });
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate invoices');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      await payInvoice(selectedInvoice.id, payForm);
      setShowPayModal(false);
      setSelectedInvoice(null);
      setPayForm({ amount: '', paymentMethod: 'CASH' });
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to record payment');
    }
  };

  if (loading) return <Loader message="Loading fee management..." />;

  return (
    <div className="animate-fade-in" style={styles.container}>
      <div style={styles.header}>
        <h2>Fee Management System</h2>
        <p style={styles.sub}>Configure structures, generate invoices, and track payments.</p>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      <div style={styles.tabs}>
        <button 
          style={activeTab === 'overview' ? styles.activeTab : styles.tab} 
          onClick={() => setActiveTab('overview')}
        >Overview</button>
        <button 
          style={activeTab === 'structures' ? styles.activeTab : styles.tab} 
          onClick={() => setActiveTab('structures')}
        >Fee Structures</button>
        <button 
          style={activeTab === 'invoices' ? styles.activeTab : styles.tab} 
          onClick={() => setActiveTab('invoices')}
        >Invoices & Payments</button>
      </div>

      {activeTab === 'overview' && (
        <div className="animate-fade-in">
          <div style={styles.statsGrid}>
            <StatCard title="Total Paid" value={`$${collectionData?.paid?.toLocaleString()}`} icon="💰" color="var(--success)" />
            <StatCard title="Total Pending (Due)" value={`$${collectionData?.dueAmount?.toLocaleString()}`} icon="⏳" color="var(--warning)" />
            <StatCard title="Total Expected" value={`$${((collectionData?.paid || 0) + (collectionData?.dueAmount || 0)).toLocaleString()}`} icon="📈" color="var(--primary)" />
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Student Collection Summary</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Roll No</th>
                  <th style={styles.th}>Class</th>
                  <th style={styles.th}>Total Billed</th>
                  <th style={styles.th}>Paid</th>
                  <th style={styles.th}>Pending</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {collectionData?.students?.map(student => (
                  <tr key={student.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 'bold' }}>{student.name}</td>
                    <td style={styles.td}>{student.rollNumber || '-'}</td>
                    <td style={styles.td}>{student.className}</td>
                    <td style={styles.td}>${student.totalFees}</td>
                    <td style={{ ...styles.td, color: 'var(--success)' }}>${student.paid}</td>
                    <td style={{ ...styles.td, color: 'var(--danger)' }}>${student.pending}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        color: student.status === 'PAID' ? 'var(--success)' : student.status === 'OVERDUE' ? 'var(--danger)' : 'var(--warning)',
                        background: student.status === 'PAID' ? 'var(--success-glow)' : student.status === 'OVERDUE' ? 'var(--danger-glow)' : 'var(--warning-glow)'
                      }}>
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'structures' && (
        <div className="animate-fade-in" style={styles.card}>
          <div style={styles.tableHeader}>
            <h3 style={styles.cardTitle}>Master Fee Structures</h3>
            <button className="btn-primary" onClick={() => setShowStructureModal(true)}>+ New Fee Structure</button>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fee Type</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Applicable Class</th>
                <th style={styles.th}>Default Due Date</th>
              </tr>
            </thead>
            <tbody>
              {structures.length === 0 ? (
                <tr><td colSpan="4" style={styles.noData}>No fee structures defined</td></tr>
              ) : (
                structures.map(st => (
                  <tr key={st.id} style={styles.tr}>
                    <td style={styles.td}>{st.feeType}</td>
                    <td style={styles.td}>${st.amount}</td>
                    <td style={styles.td}>{st.classId ? `${st.class.className}-${st.class.section}` : 'All Classes'}</td>
                    <td style={styles.td}>{st.dueDate ? new Date(st.dueDate).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="animate-fade-in" style={styles.card}>
          <div style={styles.tableHeader}>
            <h3 style={styles.cardTitle}>Student Invoices</h3>
            <button className="btn-secondary" onClick={() => setShowInvoiceModal(true)}>Generate Invoices</button>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Student Name</th>
                <th style={styles.th}>Class</th>
                <th style={styles.th}>Fee Type</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Due Date</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan="7" style={styles.noData}>No invoices found</td></tr>
              ) : (
                invoices.map(inv => {
                  const paid = inv.payments.filter(p => p.status === 'SUCCESS').reduce((acc, p) => acc + p.amount, 0);
                  const pending = Math.max(0, inv.amount - paid);
                  return (
                    <tr key={inv.id} style={styles.tr}>
                      <td style={styles.td}>{inv.student.name}</td>
                      <td style={styles.td}>{inv.student.class ? `${inv.student.class.className}-${inv.student.class.section}` : 'N/A'}</td>
                      <td style={styles.td}>{inv.feeType}</td>
                      <td style={styles.td}>${inv.amount}</td>
                      <td style={styles.td}>{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          color: inv.status === 'PAID' ? 'var(--success)' : inv.status === 'OVERDUE' ? 'var(--danger)' : 'var(--warning)',
                          background: inv.status === 'PAID' ? 'var(--success-glow)' : inv.status === 'OVERDUE' ? 'var(--danger-glow)' : 'var(--warning-glow)'
                        }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {inv.status !== 'PAID' && (
                          <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => {
                            setSelectedInvoice({ ...inv, pending });
                            setPayForm({ ...payForm, amount: pending });
                            setShowPayModal(true);
                          }}>
                            Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showStructureModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ marginBottom: '20px' }}>New Fee Structure</h3>
            <form onSubmit={handleCreateStructure} style={styles.form}>
              <div style={styles.formGroup}>
                <label>Fee Type Name</label>
                <input type="text" required placeholder="e.g. Tuition Fee" value={structureForm.feeType} onChange={e => setStructureForm({...structureForm, feeType: e.target.value})} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Amount ($)</label>
                <input type="number" required min="1" value={structureForm.amount} onChange={e => setStructureForm({...structureForm, amount: e.target.value})} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Target Class (Optional)</label>
                <select value={structureForm.classId} onChange={e => setStructureForm({...structureForm, classId: e.target.value})} style={styles.input}>
                  <option value="">All Classes (School-wide)</option>
                  {classesList.map(c => <option key={c.id} value={c.id}>{c.className} - {c.section}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label>Default Due Date (Optional)</label>
                <input type="date" value={structureForm.dueDate} onChange={e => setStructureForm({...structureForm, dueDate: e.target.value})} style={styles.input} />
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowStructureModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Structure</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInvoiceModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ marginBottom: '20px' }}>Generate Invoices</h3>
            <form onSubmit={handleGenerateInvoices} style={styles.form}>
              <div style={styles.formGroup}>
                <label>Select Fee Structure</label>
                <select required value={invoiceForm.structureId} onChange={e => setInvoiceForm({...invoiceForm, structureId: e.target.value})} style={styles.input}>
                  <option value="">-- Select Structure --</option>
                  {structures.map(s => <option key={s.id} value={s.id}>{s.feeType} (${s.amount})</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label>Target Class (Optional - overrides structure default)</label>
                <select value={invoiceForm.classId} onChange={e => setInvoiceForm({...invoiceForm, classId: e.target.value})} style={styles.input}>
                  <option value="">-- Use Structure Default --</option>
                  {classesList.map(c => <option key={c.id} value={c.id}>{c.className} - {c.section}</option>)}
                </select>
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowInvoiceModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Generate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPayModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ marginBottom: '20px' }}>Record Payment</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
              Invoice: {selectedInvoice?.feeType} for {selectedInvoice?.student?.name}
            </p>
            <form onSubmit={handleRecordPayment} style={styles.form}>
              <div style={styles.formGroup}>
                <label>Amount ($)</label>
                <input type="number" required min="1" max={selectedInvoice?.pending} value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Payment Method</label>
                <select required value={payForm.paymentMethod} onChange={e => setPayForm({...payForm, paymentMethod: e.target.value})} style={styles.input}>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="ONLINE">Online Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowPayModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px' },
  header: { marginBottom: '10px' },
  sub: { color: 'var(--text-secondary)' },
  tabs: { display: 'flex', gap: '10px', borderBottom: '1px solid var(--glass-border)' },
  tab: { padding: '10px 20px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem', fontWeight: '500' },
  activeTab: { padding: '10px 20px', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '1rem', fontWeight: '700', borderBottom: '2px solid var(--primary)' },
  errorAlert: { padding: '10px', background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#fca5a5', borderRadius: '4px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' },
  card: { background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glow)' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  cardTitle: { fontSize: '1.2rem', fontWeight: 'bold', margin: 0 },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { color: 'var(--text-secondary)', padding: '12px 14px', fontWeight: '600', borderBottom: '2px solid var(--glass-border)' },
  td: { padding: '14px', borderBottom: '1px solid var(--glass-border)' },
  tr: { transition: 'var(--transition-fast)', '&:hover': { background: 'var(--bg-card-hover)' } },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' },
  noData: { textAlign: 'center', padding: '20px', color: 'var(--text-muted)' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 6, 12, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  modal: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-glow)', borderRadius: 'var(--radius-md)', padding: '30px', maxWidth: '400px', width: '90%' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  input: { padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }
};
