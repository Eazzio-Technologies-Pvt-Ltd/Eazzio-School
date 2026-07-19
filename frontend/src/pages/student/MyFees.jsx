import React, { useState, useEffect } from 'react';
import { getFees, createOrder, verifyPayment, getReceipt, getProfile } from '../../api/studentApi';
import Loader from '../../components/Loader';
import { CreditCard, CheckCircle, Clock, AlertCircle, FileText, Printer, X } from 'lucide-react';

export default function MyFees() {
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // Dynamic Script Loading for Razorpay
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [feeData, profileData] = await Promise.all([
        getFees(),
        getProfile()
      ]);
      setData(feeData);
      setProfile(profileData);
    } catch (err) {
      console.error(err);
      setError('Failed to load fee information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePayNow = async (invoice) => {
    try {
      // 1. Create Order on Backend
      const orderRes = await createOrder(invoice.id);
      
      if (!orderRes.success) {
        alert(orderRes.error || 'Failed to initialize payment.');
        return;
      }
      
      const { orderId, amount, currency, razorpayKeyId } = orderRes.data;

      // 2. Open Razorpay Checkout
      const options = {
        key: razorpayKeyId,
        amount: amount,
        currency: currency,
        name: "Eazzio School",
        description: `Payment for ${invoice.feeType}`,
        order_id: orderId,
        handler: async function (response) {
          try {
            // 3. Verify Payment Server-Side
            const verifyRes = await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              invoiceId: invoice.id
            });
            
            if (verifyRes.success) {
              alert("Payment Successful!");
              loadData(); // Refresh UI
            } else {
              alert("Payment verification failed.");
            }
          } catch (err) {
            console.error("Verification Error:", err);
            alert("Error verifying payment.");
          }
        },
        prefill: {
          name: profile?.name || "",
          contact: profile?.phone || ""
        },
        theme: {
          color: "#10b981" // Emerald-500
        },
        modal: {
          ondismiss: function() {
            // Neutral toast/alert
            alert("Payment cancelled by user.");
          }
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        alert(`Payment Failed: ${response.error.description}`);
      });
      rzp.open();
      
    } catch (err) {
      console.error('Payment Error:', err);
      alert(err.response?.data?.error || 'Payment initiation failed.');
    }
  };

  const handleViewReceipt = async (paymentId) => {
    try {
      setReceiptLoading(true);
      const res = await getReceipt(paymentId);
      if (res.success) {
        setSelectedReceipt(res.data);
      } else {
        alert(res.error || "Failed to load receipt");
      }
    } catch (err) {
      console.error("Receipt error:", err);
      alert("Error loading receipt");
    } finally {
      setReceiptLoading(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  if (loading) return <Loader message="Loading Fee Records..." />;
  if (error) return <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">{error}</div>;
  if (!data) return null;

  const { summary, invoices, history } = data;

  return (
    <div className="flex flex-col gap-8 animate-fade-in text-gray-800 print-wrapper">
      
      {/* Hide this entire block when printing using a wrapper class OR standard print media queries */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-modal, #receipt-modal * { visibility: visible; }
          #receipt-modal { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; padding: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Fees</h2>
        <p className="text-gray-500 mb-6">Manage your fee invoices, track payments, and view receipts.</p>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow rounded-xl p-5 flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Fees</span>
            <span className="text-3xl font-bold text-gray-800">₹{summary.totalFees.toLocaleString()}</span>
          </div>
          <div className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow rounded-xl p-5 flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Paid Amount</span>
            <span className="text-3xl font-bold text-emerald-600">₹{summary.paidAmount.toLocaleString()}</span>
          </div>
          <div className="bg-white border border-emerald-500 shadow-sm hover:shadow-md transition-shadow rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-100 rounded-bl-full -z-10"></div>
            <span className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Pending Dues</span>
            <span className="text-3xl font-bold text-emerald-700">₹{summary.pendingAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* INVOICES LIST */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl mb-8">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="text-emerald-500" size={20} />
              Current Invoices
            </h3>
          </div>
          <div className="p-6 flex flex-col gap-4">
            {invoices.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No invoices found for this academic year.</p>
            ) : (
              invoices.map(invoice => {
                const paid = invoice.payments.reduce((acc, p) => acc + p.amount, 0);
                const pending = Math.max(0, invoice.amount - paid);
                const isPaid = pending === 0;

                return (
                  <div key={invoice.id} className={`p-4 border rounded-lg flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all duration-200 hover:shadow-md ${isPaid ? 'bg-gray-50 border-gray-200' : 'bg-white border-emerald-100 hover:border-emerald-300'}`}>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-lg">{invoice.feeType}</span>
                        {isPaid ? (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-bold rounded-full uppercase">PAID</span>
                        ) : invoice.status === 'OVERDUE' ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase">OVERDUE</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">PENDING</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock size={14} /> Due Date: {new Date(invoice.dueDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 justify-between md:justify-end w-full md:w-auto">
                      <div className="flex flex-col text-right">
                        <span className="text-xs text-gray-500 font-medium uppercase">Total</span>
                        <span className="font-bold text-gray-800">₹{invoice.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-xs text-emerald-600 font-medium uppercase">Paid</span>
                        <span className="font-bold text-emerald-600">₹{paid.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-xs text-amber-600 font-medium uppercase">Pending</span>
                        <span className="font-bold text-amber-600">₹{pending.toLocaleString()}</span>
                      </div>

                      {!isPaid && (
                        <button 
                          onClick={() => handlePayNow(invoice)}
                          className={`px-5 py-2 text-white font-medium rounded-lg text-sm transition-all shadow-sm ml-2 transform hover:-translate-y-0.5 ${
                            invoice.status === 'OVERDUE' 
                              ? 'bg-red-600 hover:bg-red-700 shadow-[0_0_10px_rgba(220,38,38,0.3)] animate-pulse' 
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          Pay Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PAYMENT HISTORY */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle className="text-emerald-500" size={20} />
              Payment History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-6 font-semibold text-gray-600 text-sm">Date</th>
                  <th className="py-3 px-6 font-semibold text-gray-600 text-sm">Fee Type</th>
                  <th className="py-3 px-6 font-semibold text-gray-600 text-sm">Amount</th>
                  <th className="py-3 px-6 font-semibold text-gray-600 text-sm">Method</th>
                  <th className="py-3 px-6 font-semibold text-gray-600 text-sm">Receipt No.</th>
                  <th className="py-3 px-6 font-semibold text-gray-600 text-sm text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-gray-500 italic text-sm">No payment history found.</td>
                  </tr>
                ) : (
                  history.map(payment => (
                    <tr key={payment.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 text-sm text-gray-800">{new Date(payment.date).toLocaleDateString()}</td>
                      <td className="py-4 px-6 text-sm font-medium text-gray-800">{payment.feeType}</td>
                      <td className="py-4 px-6 text-sm font-bold text-emerald-600">₹{payment.amount.toLocaleString()}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{payment.paymentMethod || 'Online'}</td>
                      <td className="py-4 px-6 text-sm text-gray-500 font-mono">{payment.receiptNumber || `RCPT-${payment.id}`}</td>
                      <td className="py-4 px-6 text-center">
                        <button 
                          onClick={() => handleViewReceipt(payment.id)}
                          className="inline-flex items-center justify-center p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition"
                          title="View Receipt"
                        >
                          <FileText size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm no-print p-4">
          <div id="receipt-modal" className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header - Hidden on Print */}
            <div className="flex justify-between items-center p-4 border-b bg-gray-50 no-print">
              <h3 className="font-bold text-gray-800">Fee Receipt</h3>
              <div className="flex items-center gap-2">
                <button onClick={printReceipt} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Print Receipt">
                  <Printer size={20} />
                </button>
                <button onClick={() => setSelectedReceipt(null)} className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-lg transition" title="Close">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="p-8 flex flex-col bg-white overflow-y-auto print:overflow-visible">
              
              {/* Institution Header */}
              <div className="text-center border-b-2 border-gray-800 pb-6 mb-6">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">{selectedReceipt.schoolName}</h1>
                <p className="text-gray-500 text-sm mt-1">Official Fee Receipt</p>
              </div>
              
              {/* Receipt Meta */}
              <div className="flex justify-between items-start mb-8 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Receipt No:</p>
                  <p className="font-mono font-bold text-gray-900">{selectedReceipt.receiptNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 mb-1">Date:</p>
                  <p className="font-bold text-gray-900">{new Date(selectedReceipt.date).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Student Details */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-8">
                <h4 className="font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">Student Details</h4>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <span className="text-gray-500">Name:</span>
                  <span className="font-bold text-gray-900 text-right">{selectedReceipt.studentName}</span>
                  
                  <span className="text-gray-500">Student ID:</span>
                  <span className="font-medium text-gray-800 text-right">{selectedReceipt.studentId}</span>
                  
                  <span className="text-gray-500">Course / Class:</span>
                  <span className="font-medium text-gray-800 text-right">{selectedReceipt.courseName}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="border border-gray-200 rounded-lg mb-8 overflow-hidden">
                <div className="bg-gray-800 text-white p-3 flex justify-between font-bold text-sm">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="p-4 flex justify-between border-b border-gray-100">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{selectedReceipt.feeType}</span>
                    <span className="text-xs text-gray-500 mt-1">Payment Method: {selectedReceipt.paymentMethod}</span>
                  </div>
                  <span className="font-bold text-gray-900">₹{selectedReceipt.amount.toLocaleString()}</span>
                </div>
                <div className="bg-gray-50 p-4 flex justify-between text-lg">
                  <span className="font-black text-gray-900 uppercase">Total Paid</span>
                  <span className="font-black text-gray-900">₹{selectedReceipt.amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-8 border-t border-gray-200 text-center flex flex-col gap-2">
                <p className="text-xs text-gray-500 italic">This is a computer-generated document. No signature is required.</p>
                <p className="text-sm font-bold text-gray-800">Thank you for your payment!</p>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
