import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createSubscriptionOrder, registerSchool } from '../api/authApi';
import logo from '../assets/logo.png';

export default function RegisterSchool() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    schoolName: '',
    principalName: '',
    email: '',
    phone: '',
    address: '',
    studentCount: 100, // Default 100
    password: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load Razorpay Script dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const calculateTotal = () => {
    const count = parseInt(form.studentCount) || 0;
    return count * 10 * 12; // ₹10 per student per month * 12 months (Annual)
  };

  const handlePaymentAndRegistration = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Create order on backend
      const order = await createSubscriptionOrder(form.studentCount);

      // 2. Setup Razorpay Checkout options
      const options = {
        key: 'rzp_live_T30ux1vLXgkLFL', // Pass Razorpay Key directly here for frontend
        amount: order.amount,
        currency: 'INR',
        name: 'EduSphere',
        description: 'School Annual Subscription',
        order_id: order.id,
        handler: async function (response) {
          try {
            // 3. On successful payment, send signature to backend to verify and register
            setLoading(true);
            const registrationPayload = {
              ...form,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            };

            await registerSchool(registrationPayload);
            
            // Success! Redirect to login
            alert('School registered successfully! You can now log in.');
            navigate('/login');
          } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Registration failed after payment.');
            setLoading(false);
          }
        },
        prefill: {
          name: form.principalName,
          email: form.email,
          contact: form.phone
        },
        theme: {
          color: '#8b5cf6'
        }
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response) {
        setError(`Payment Failed: ${response.error.description}`);
        setLoading(false);
      });
      rzp1.open();

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to initiate payment gateway.');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.navBar}>
        <div style={styles.logo} onClick={() => navigate('/')}>
          <img src={logo} alt="Eazzio Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
        </div>
        <Link to="/login" style={styles.navLink}>Existing User? Login</Link>
      </div>

      <div style={styles.content}>
        <div style={styles.formCard}>
          <h2 style={styles.title}>Register Your School</h2>
          <p style={styles.subtitle}>Fill in the details below to start your digital transformation.</p>

          {error && <div style={styles.errorAlert}>{error}</div>}

          <form onSubmit={handlePaymentAndRegistration} style={styles.form}>
            <div style={styles.grid}>
              <div style={styles.formGroup}>
                <label>School Name</label>
                <input type="text" name="schoolName" required value={form.schoolName} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Principal Name</label>
                <input type="text" name="principalName" required value={form.principalName} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Email Address</label>
                <input type="email" name="email" required value={form.email} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Phone Number</label>
                <input type="text" name="phone" required value={form.phone} onChange={handleChange} style={styles.input} />
              </div>
              <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                <label>Address</label>
                <input type="text" name="address" required value={form.address} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Password (for Principal Login)</label>
                <input type="password" name="password" required value={form.password} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Number of Students</label>
                <input type="number" name="studentCount" min="1" required value={form.studentCount} onChange={handleChange} style={styles.input} />
              </div>
            </div>

            <div style={styles.pricingBox}>
              <div style={styles.pricingRow}>
                <span>Subscription Rate:</span>
                <span>₹10 / student / month (Billed Annually)</span>
              </div>
              <div style={styles.pricingRowTotal}>
                <span>Total Annual Amount:</span>
                <span style={styles.totalValue}>₹{calculateTotal().toLocaleString()}</span>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={styles.submitBtn}>
              {loading ? 'Processing...' : `Pay ₹${calculateTotal().toLocaleString()} & Register`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)', fontFamily: "'Inter', sans-serif" },
  navBar: { padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', borderBottom: '1px solid var(--glass-border)' },
  logo: { fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', cursor: 'pointer' },
  navLink: { color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' },
  content: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' },
  formCard: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '700px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)' },
  title: { fontSize: '2rem', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)', textAlign: 'center' },
  subtitle: { color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '30px' },
  errorAlert: { background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#fca5a5', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  input: { padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '1rem' },
  pricingBox: { background: 'rgba(139, 92, 246, 0.05)', border: '1px solid var(--primary)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  pricingRow: { display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.95rem' },
  pricingRowTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '700', paddingTop: '10px', borderTop: '1px solid var(--glass-border)' },
  totalValue: { fontSize: '1.8rem', color: 'var(--primary)', fontWeight: '800' },
  submitBtn: { padding: '16px', fontSize: '1.1rem', borderRadius: '8px', width: '100%', marginTop: '10px' }
};
