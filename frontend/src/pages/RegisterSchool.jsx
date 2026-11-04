import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { createSubscriptionOrder, registerSchool } from '../api/authApi';
import logo from '../assets/full_logo_cropped.png';
import schoolBg from '../assets/school_background.jpg';

export default function RegisterSchool() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    schoolName: '',
    adminName: '',
    email: '',
    phone: '',
    address: '',
    studentCount: 10, // Default 10
    password: ''
  });
  
  const queryParams = new URLSearchParams(location.search);
  const initialPlan = queryParams.get('plan') || 'standard';

  const [planType, setPlanType] = useState(initialPlan);
  const [billingCycle, setBillingCycle] = useState('annual');
  const [showBanner, setShowBanner] = useState(true);
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
    const months = billingCycle === 'annual' ? 12 : 1;
    const rate = planType === 'premium' ? 15 : 10;
    return count * rate * months;
  };

  const handlePaymentAndRegistration = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Create order on backend
      const order = await createSubscriptionOrder(form.studentCount, billingCycle, planType);

      // 2. Setup Razorpay Checkout options
      const options = {
        key: 'rzp_live_T30ux1vLXgkLFL', // Pass Razorpay Key directly here for frontend
        amount: order.amount,
        currency: 'INR',
        name: 'EduSphere',
        description: 'Institution Annual Subscription',
        order_id: order.id,
        handler: async function (response) {
          try {
            // 3. On successful payment, send signature to backend to verify and register
            setLoading(true);
              const registrationPayload = {
                ...form,
                billingCycle,
                planType,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              };

            await registerSchool(registrationPayload);
            
            // Success! Redirect to login
            alert('Institution registered successfully! You can now log in.');
            navigate('/login');
          } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Registration failed after payment.');
            setLoading(false);
          }
        },
        prefill: {
          name: form.adminName,
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
    <div style={{...styles.container, backgroundImage: `url(${schoolBg})`}}>
      <div style={styles.overlay}></div>
      
      {showBanner && (
        <div style={styles.securityBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
            <span>🔒</span>
            <span>Your data is safe and secure with us — Encrypted by AES 256-bit Encryption</span>
          </div>
          <button onClick={() => setShowBanner(false)} style={styles.bannerCloseBtn}>✕</button>
        </div>
      )}

      <div style={styles.navBar}>
        <Link to="/" style={styles.navLink}>← Back to Home</Link>
        <Link to="/login" style={styles.navLink}>Existing User? Login →</Link>
      </div>

      <div style={styles.content}>
        <div style={styles.formCard}>
          <div style={styles.logoContainer}>
            <img src={logo} alt="Eazzio Logo" style={styles.logoImg} />
          </div>
          <h2 style={styles.title}>Register Your Institution</h2>
          <p style={styles.subtitle}>Fill in the details below to start your digital transformation.</p>

          {error && <div style={styles.errorAlert}>{error}</div>}

          <form onSubmit={handlePaymentAndRegistration} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
            {/* Left Column: Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                <label>Institution Name</label>
                <input type="text" name="schoolName" required value={form.schoolName} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Admin Name</label>
                <input type="text" name="adminName" required value={form.adminName} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Phone Number</label>
                <input type="text" name="phone" required value={form.phone} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Email Address</label>
                <input type="email" name="email" required value={form.email} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Login Password</label>
                <input type="password" name="password" required value={form.password} onChange={handleChange} style={styles.input} />
              </div>
              <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                <label>Address</label>
                <input type="text" name="address" required value={form.address} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Number of Students</label>
                <input type="number" name="studentCount" min="1" required value={form.studentCount} onChange={handleChange} style={styles.input} />
              </div>
            </div>
            
            {/* Right Column: Plan and Payment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={styles.billingToggle}>
                <button 
                  type="button" 
                  onClick={() => setPlanType('standard')}
                  style={planType === 'standard' ? styles.toggleBtnActive : styles.toggleBtn}
                >
                  Standard (₹10)
                </button>
                <button 
                  type="button" 
                  onClick={() => setPlanType('premium')}
                  style={planType === 'premium' ? styles.toggleBtnActivePremium : styles.toggleBtn}
                >
                  Premium (₹15)
                </button>
              </div>

              <div style={styles.billingToggle}>
                <button 
                  type="button" 
                  onClick={() => setBillingCycle('monthly')}
                  style={billingCycle === 'monthly' ? styles.toggleBtnActive : styles.toggleBtn}
                >
                  Monthly
                </button>
                <button 
                  type="button" 
                  onClick={() => setBillingCycle('annual')}
                  style={billingCycle === 'annual' ? styles.toggleBtnActive : styles.toggleBtn}
                >
                  Annually (-20%)
                </button>
              </div>
              </div>

            <div style={styles.pricingBox}>
              <div style={styles.pricingRow}>
                <span>Selected Plan:</span>
                <span style={{ fontWeight: '600', color: planType === 'premium' ? '#22c55e' : 'var(--primary)', textTransform: 'capitalize' }}>
                  {planType} Plan
                </span>
              </div>
              <div style={styles.pricingRow}>
                <span>Subscription Rate:</span>
                <span>₹{planType === 'premium' ? '15' : '10'} / student / month (Billed {billingCycle === 'annual' ? 'Annually' : 'Monthly'})</span>
              </div>
              <div style={styles.pricingRowTotal}>
                <span>Total {billingCycle === 'annual' ? 'Annual' : 'Monthly'} Amount:</span>
                <span style={styles.totalValue}>₹{calculateTotal().toLocaleString()}</span>
              </div>
            </div>

            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? 'Processing...' : `Pay ₹${calculateTotal().toLocaleString()} & Register`}
            </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', fontFamily: "'Inter', sans-serif", position: 'relative' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 0 },
  
  securityBanner: { width: '100%', backgroundColor: '#0f172a', color: 'white', padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', zIndex: 10, position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  bannerCloseBtn: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', padding: '0 8px', transition: 'color 0.2s' },

  navBar: { padding: '10px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 },
  navLink: { color: 'white', textDecoration: 'none', fontWeight: '600', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '20px', transition: 'all 0.2s' },
  
  content: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0px 20px 10px', position: 'relative', zIndex: 1 },
  
  formCard: { background: 'white', borderRadius: '20px', padding: '15px 30px', width: '100%', maxWidth: '900px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' },
  
  logoContainer: { display: 'flex', justifyContent: 'center', marginBottom: '0px' },
  logoImg: { height: '120px', width: 'auto', objectFit: 'contain' },

  title: { fontSize: '1.3rem', fontWeight: '800', marginBottom: '2px', color: '#0f172a', textAlign: 'center', letterSpacing: '-0.02em' },
  subtitle: { color: '#64748b', textAlign: 'center', marginBottom: '8px', fontSize: '0.75rem' },
  errorAlert: { background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '6px', borderRadius: '8px', marginBottom: '8px', textAlign: 'center', fontSize: '0.8rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '8px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', fontWeight: '600', color: '#475569' },
  input: { padding: '5px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '0.8rem', transition: 'border-color 0.2s' },
  pricingBox: { background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' },
  pricingRow: { display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '0.75rem' },
  pricingRowTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0f172a', fontSize: '0.9rem', fontWeight: '700', paddingTop: '4px', borderTop: '1px solid #e2e8f0' },
  totalValue: { fontSize: '1.15rem', color: '#22c55e', fontWeight: '800' },
  submitBtn: { padding: '10px', fontSize: '0.9rem', borderRadius: '8px', width: '100%', marginTop: '2px', backgroundColor: '#1e3a8a', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(30, 58, 138, 0.3)' },
  billingToggle: { display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px', border: '1px solid #e2e8f0', width: '100%' },
  toggleBtn: { flex: 1, padding: '6px', border: 'none', background: 'transparent', borderRadius: '6px', color: '#64748b', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  toggleBtnActive: { flex: 1, padding: '6px', border: 'none', background: 'white', borderRadius: '6px', color: '#0f172a', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', transition: 'all 0.2s' },
  toggleBtnActivePremium: { flex: 1, padding: '6px', border: 'none', background: '#22c55e', borderRadius: '6px', color: 'white', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(34, 197, 94, 0.3)', transition: 'all 0.2s' }
};
