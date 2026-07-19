import React, { useState, useEffect } from 'react';
import { getFees } from '../../api/studentApi';
import Loader from '../../components/Loader';

export default function MyFees() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const triggerToast = (msg) => {
    setToast({ visible: true, message: msg });
    setTimeout(() => {
      setToast({ visible: false, message: '' });
    }, 3000);
  };

  useEffect(() => {
    const loadFees = async () => {
      try {
        const payload = await getFees();
        setData(payload);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadFees();
  }, []);

  if (loading) return <Loader message="Loading financial ledger..." />;

  const { summary, invoices = [], history = [] } = data || {};
  const isPaid = summary?.feeStatus === 'PAID';
  const totalAmount = summary?.totalFees || 0;
  const paidAmount = summary?.paidAmount || 0;
  const pendingAmount = summary?.pendingAmount || 0;
  const dueDate = summary?.dueDate ? new Date(summary.dueDate).toLocaleDateString() : 'N/A';

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>My Tuition & Fees Statement</h2>
        <p style={styles.sub}>Review payment status, check invoices, and make online payments.</p>
      </div>

      {toast.visible && (
        <div style={styles.toast}>
          <span>💡</span> {toast.message}
        </div>
      )}

      {/* Online Pay Modal */}
      {showPayModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <span style={{ fontSize: '3rem' }}>💳</span>
            <h3 style={{ marginTop: '10px' }}>Secure Online Checkout</h3>
            <p style={{ margin: '14px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Online Payments are currently in sandbox mode. Secure gateway integration (Stripe/PayPal) will be available in the commercial version.
            </p>
            <div style={styles.formDemo}>
              <input type="text" placeholder="Cardholder Name" disabled style={styles.disabledInput} />
              <input type="text" placeholder="Card Number (•••• •••• •••• ••••)" disabled style={styles.disabledInput} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" placeholder="MM/YY" disabled style={styles.disabledInput} />
                <input type="text" placeholder="CVC" disabled style={styles.disabledInput} />
              </div>
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => setShowPayModal(false)} className="btn-secondary" style={styles.modalBtn}>
                Close
              </button>
              <button
                onClick={() => {
                  setShowPayModal(false);
                  triggerToast('Online Checkout is disabled in this commercial prototype.');
                }}
                className="btn-primary"
                style={styles.modalBtn}
              >
                Pay ₹${pendingAmount.toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={styles.summaryGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total Dues Balance</span>
          <span style={styles.statValue}>₹${totalAmount.toLocaleString()}</span>
          <p style={styles.statDesc}>Academic Term Fees</p>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total Paid Amount</span>
          <span style={{ ...styles.statValue, color: 'var(--success)' }}>₹${paidAmount.toLocaleString()}</span>
          <p style={styles.statDesc}>Cleared & settled balances</p>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total Pending Amount</span>
          <span style={{ ...styles.statValue, color: 'var(--warning)' }}>₹${pendingAmount.toLocaleString()}</span>
          <p style={styles.statDesc}>Due by: {dueDate}</p>
        </div>
      </div>

      <div style={styles.pane}>
        <div style={styles.topSection}>
          <div>
            <span style={styles.label}>Outstanding Status</span>
            <span style={{
              ...styles.statusBadge,
              color: isPaid ? 'var(--success)' : 'var(--warning)',
              background: isPaid ? 'var(--success-glow)' : 'var(--warning-glow)',
              borderColor: isPaid ? 'var(--success)' : 'var(--warning)'
            }}>
              {summary?.feeStatus || 'PENDING'}
            </span>
          </div>

          {!isPaid && (
            <button
              onClick={() => setShowPayModal(true)}
              className="btn-primary"
              style={styles.payBtn}
            >
              💳 Pay Online
            </button>
          )}
        </div>

        <div style={styles.divider}></div>

        <div style={styles.ledger}>
          <h3 style={styles.ledgerTitle}>Itemized Fee Invoices</h3>
          
          {invoices.length === 0 ? (
             <p style={{ color: 'var(--text-muted)' }}>No invoices found.</p>
          ) : (
            invoices.map(inv => (
              <div key={inv.id} style={styles.ledgerItem}>
                <div style={styles.itemLeft}>
                  <span style={styles.itemName}>{inv.feeType}</span>
                  <span style={styles.itemMeta}>Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                </div>
                <div style={styles.itemRight}>
                  <span style={styles.itemValue}>₹${inv.amount.toLocaleString()}</span>
                  <span style={{
                    ...styles.statusBadge,
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    marginLeft: '12px',
                    color: inv.status === 'PAID' ? 'var(--success)' : inv.status === 'OVERDUE' ? 'var(--danger)' : 'var(--warning)',
                    background: inv.status === 'PAID' ? 'var(--success-glow)' : inv.status === 'OVERDUE' ? 'var(--danger-glow)' : 'var(--warning-glow)',
                  }}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))
          )}

          {history.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Payment History</h4>
              {history.map(payment => (
                <div key={payment.id} style={{...styles.ledgerItem, background: 'rgba(16, 185, 129, 0.05)'}}>
                  <div style={styles.itemLeft}>
                    <span style={styles.itemName}>Payment Cleared ({payment.paymentMethod})</span>
                    <span style={styles.itemMeta}>Receipt {payment.receiptNumber || 'N/A'} • {new Date(payment.date).toLocaleDateString()} • {payment.feeType}</span>
                  </div>
                  <span style={{ ...styles.itemValue, color: 'var(--success)' }}>
                    -₹${payment.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '30px' },
  header: { marginBottom: '10px' },
  sub: { color: 'var(--text-secondary)' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' },
  statCard: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)', display: 'flex', flexDirection: 'column', gap: '6px' },
  statLabel: { fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' },
  statValue: { fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)' },
  statDesc: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  pane: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '30px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' },
  topSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' },
  label: { display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', marginBottom: '6px' },
  statusBadge: { display: 'inline-block', padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700', border: '1px solid transparent' },
  payBtn: { padding: '10px 24px', fontSize: '0.9rem' },
  divider: { height: '1px', background: 'var(--glass-border)', margin: '24px 0' },
  ledger: { display: 'flex', flexDirection: 'column', gap: '16px' },
  ledgerTitle: { fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' },
  ledgerItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '16px 20px', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' },
  itemLeft: { display: 'flex', flexDirection: 'column', gap: '4px' },
  itemRight: { display: 'flex', alignItems: 'center' },
  itemName: { fontSize: '0.92rem', fontWeight: '600', color: 'var(--text-primary)' },
  itemMeta: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  itemValue: { fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 6, 12, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  modal: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-glow)', borderRadius: 'var(--radius-md)', padding: '30px', maxWidth: '400px', width: '90%', textAlign: 'center' },
  formDemo: { display: 'flex', flexDirection: 'column', gap: '10px', margin: '16px 0' },
  disabledInput: { background: 'var(--input-bg)', borderColor: 'var(--glass-border)', cursor: 'not-allowed' },
  modalActions: { display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px' },
  modalBtn: { padding: '10px 20px', fontSize: '0.9rem' },
  toast: { position: 'fixed', top: '20px', right: '20px', background: 'var(--sidebar-bg)', border: '1px solid var(--primary)', boxShadow: 'var(--shadow-glow)', borderRadius: 'var(--radius-sm)', padding: '12px 20px', color: 'var(--text-primary)', zIndex: 999, fontSize: '0.9rem', animation: 'fadeIn 0.3s ease' }
};
