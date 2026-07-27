import React, { useState, useEffect } from 'react';
import { 
  getFeeCollection, getFeeStructures, createFeeStructure, 
  updateFeeStructure, deleteFeeStructure, generateInvoices, 
  getInvoices, payInvoice, getCourses, 
  getFeeCategories, createFeeCategory, deleteFeeCategory 
} from '../../api/adminApi';
import Loader from '../../components/Loader';
import StatCard from '../../components/StatCard';

export default function FeesOverview() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data States
  const [collectionData, setCollectionData] = useState(null);
  const [structures, setStructures] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals & Forms
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedStructure, setSelectedStructure] = useState(null);
  
  const initialStructureForm = { 
    feeType: '', amount: '', courseId: '', dueDate: '',
    feeNature: 'Recurring', applicableTo: 'Specific Class', studentId: '', 
    academicYear: '2026-2027', isMandatory: true, isActive: true, 
    planType: 'MONTHLY', autoGenerateInvoices: false 
  };

  const [structureForm, setStructureForm] = useState(initialStructureForm);
  const [invoiceForm, setInvoiceForm] = useState({ structureId: '', courseId: '' });
  const [payForm, setPayForm] = useState({ amount: '', paymentMethod: 'CASH' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [colRes, strRes, invRes, clsRes, catRes] = await Promise.all([
        getFeeCollection(),
        getFeeStructures(),
        getInvoices(),
        getCourses(),
        getFeeCategories()
      ]);
      setCollectionData(colRes);
      setStructures(strRes);
      setInvoices(invRes);
      setCoursesList(clsRes);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load fee management data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateStructure = async (e) => {
    e.preventDefault();
    try {
      if (selectedStructure) {
        await updateFeeStructure(selectedStructure.id, structureForm);
      } else {
        await createFeeStructure(structureForm);
      }
      setShowStructureModal(false);
      setStructureForm(initialStructureForm);
      setSelectedStructure(null);
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save structure');
    }
  };

  const handleDeleteStructure = async (id) => {
    if (!window.confirm("Are you sure you want to delete this fee structure?")) return;
    try {
      await deleteFeeStructure(id);
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete structure');
    }
  };

  const handleGenerateInvoices = async (e) => {
    e.preventDefault();
    try {
      await generateInvoices(invoiceForm);
      setShowInvoiceModal(false);
      setInvoiceForm({ structureId: '', courseId: '' });
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

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await createFeeCategory(categoryForm);
      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '' });
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await deleteFeeCategory(id);
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete category');
    }
  };

  if (loading) return <Loader message="Loading fee management..." />;

  const collectionRate = collectionData && collectionData.paid + collectionData.pending > 0 
    ? Math.round((collectionData.paid / (collectionData.paid + collectionData.pending)) * 100) 
    : 0;

  const defaultersCount = collectionData?.students?.filter(s => s.pending > 0 && s.status === 'OVERDUE').length || 0;

  return (
    <>
      <div className="animate-fade-in" style={styles.container}>
        <div style={styles.header}>
          <h2>Fee Management System</h2>
        <p style={styles.sub}>Configure structures, generate invoices, and track payments.</p>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      <div style={styles.tabs}>
        <button style={activeTab === 'overview' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('overview')}>Overview</button>
        <button style={activeTab === 'categories' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('categories')}>Categories</button>
        <button style={activeTab === 'structures' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('structures')}>Fee Structures</button>
        <button style={activeTab === 'invoices' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('invoices')}>Invoices & Payments</button>
      </div>

      {activeTab === 'overview' && (
        <div className="animate-fade-in">
          <div style={styles.statsGrid}>
            <StatCard label="Total Paid" value={`₹${collectionData?.paid?.toLocaleString()}`} icon="💰" color="var(--success)" />
            <StatCard label="Total Pending (Due)" value={`₹${collectionData?.pending?.toLocaleString()}`} icon="⏳" color="var(--warning)" />
            <StatCard label="Today's Collection" value={`₹${(collectionData?.todaysCollection || 0).toLocaleString()}`} icon="💵" color="var(--primary)" />
            <StatCard label="Collection Rate" value={`${collectionRate}%`} icon="📈" color="var(--primary)" />
            <StatCard label="Defaulters" value={defaultersCount} icon="🚨" color="var(--danger)" />
          </div>

          <div style={{display: 'flex', gap: '20px', marginBottom: '24px'}}>
            <div style={{...styles.card, flex: 2}}>
              <h3 style={styles.cardTitle}>Class-wise Breakdown</h3>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Class</th>
                    <th style={styles.th}>Collected</th>
                    <th style={styles.th}>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionData?.courseBreakdown?.length === 0 ? (
                    <tr><td colSpan="3" style={styles.noData}>No data available</td></tr>
                  ) : (
                    collectionData?.courseBreakdown?.map((cb, idx) => (
                      <tr key={idx} style={styles.tr}>
                        <td style={styles.td}>{cb.courseName}</td>
                        <td style={{ ...styles.td, color: 'var(--success)' }}>₹{cb.totalCollected}</td>
                        <td style={{ ...styles.td, color: 'var(--danger)' }}>₹{cb.totalPending}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div style={{...styles.card, flex: 1}}>
              <h3 style={styles.cardTitle}>Payment Modes</h3>
              <ul style={{listStyle: 'none', padding: 0, margin: '10px 0 0 0'}}>
                {Object.entries(collectionData?.paymentModeBreakdown || {}).map(([mode, amt]) => (
                  <li key={mode} style={{display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--glass-border)'}}>
                    <span>{mode}</span>
                    <span style={{fontWeight: 'bold', color: 'var(--success)'}}>₹{amt}</span>
                  </li>
                ))}
                {Object.keys(collectionData?.paymentModeBreakdown || {}).length === 0 && (
                  <li style={styles.noData}>No payments recorded yet</li>
                )}
              </ul>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Student Collection Summary</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Roll No</th>
                  <th style={styles.th}>Course</th>
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
                    <td style={styles.td}>{student.courseName}</td>
                    <td style={styles.td}>₹{student.totalFees}</td>
                    <td style={{ ...styles.td, color: 'var(--success)' }}>₹{student.paid}</td>
                    <td style={{ ...styles.td, color: 'var(--danger)' }}>₹{student.pending}</td>
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
                {(!collectionData?.students || collectionData.students.length === 0) && (
                   <tr><td colSpan="7" style={styles.noData}>No data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="animate-fade-in" style={styles.card}>
          <div style={styles.tableHeader}>
            <h3 style={styles.cardTitle}>Fee Categories</h3>
            <button className="btn-primary" onClick={() => setShowCategoryModal(true)}>+ New Category</button>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr><td colSpan="3" style={styles.noData}>No fee categories defined</td></tr>
              ) : (
                categories.map(cat => (
                  <tr key={cat.id} style={styles.tr}>
                    <td style={{...styles.td, fontWeight: 'bold'}}>{cat.name}</td>
                    <td style={styles.td}>{cat.description || '-'}</td>
                    <td style={styles.td}>
                      <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleDeleteCategory(cat.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'structures' && (
        <div className="animate-fade-in" style={styles.card}>
          <div style={styles.tableHeader}>
            <h3 style={styles.cardTitle}>Master Fee Structures</h3>
            <button className="btn-primary" onClick={() => {
              setStructureForm(initialStructureForm);
              setSelectedStructure(null);
              setShowStructureModal(true);
            }}>+ New Fee Structure</button>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fee Type</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Academic Year</th>
                <th style={styles.th}>Frequency</th>
                <th style={styles.th}>Target</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {structures.length === 0 ? (
                <tr><td colSpan="7" style={styles.noData}>No fee structures defined</td></tr>
              ) : (
                structures.map(st => (
                  <tr key={st.id} style={styles.tr}>
                    <td style={styles.td}>
                       <div style={{fontWeight: 'bold'}}>{st.feeType}</div>
                       <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{st.feeNature}</div>
                    </td>
                    <td style={{...styles.td, color: 'var(--success)', fontWeight: 'bold'}}>₹{st.amount}</td>
                    <td style={styles.td}>{st.academicYear}</td>
                    <td style={styles.td}>{st.planType}</td>
                    <td style={styles.td}>{st.courseId ? `${st.course.courseName}-${st.course.section}` : st.applicableTo}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        color: st.isActive ? 'var(--success)' : 'var(--danger)',
                        background: st.isActive ? 'var(--success-glow)' : 'var(--danger-glow)'
                      }}>
                        {st.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={styles.td}>
                       <div style={{display: 'flex', gap: '8px'}}>
                        <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={() => {
                          setSelectedStructure(st);
                          setStructureForm({
                            feeType: st.feeType, amount: st.amount, courseId: st.courseId || '', 
                            dueDate: st.dueDate ? st.dueDate.split('T')[0] : '', feeNature: st.feeNature, 
                            applicableTo: st.applicableTo, studentId: st.studentId || '', academicYear: st.academicYear, 
                            isMandatory: st.isMandatory, isActive: st.isActive, planType: st.planType, autoGenerateInvoices: false
                          });
                          setShowStructureModal(true);
                        }}>Edit</button>
                        <button className="btn-danger" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={() => handleDeleteStructure(st.id)}>
                          Delete
                        </button>
                       </div>
                    </td>
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
                <th style={styles.th}>Fee Type</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Due Date</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Payments</th>
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
                      <td style={styles.td}>
                        <div style={{fontWeight: 'bold'}}>{inv.student.name}</div>
                        <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                          {inv.student.course ? `${inv.student.course.courseName}-${inv.student.course.section}` : ''}
                        </div>
                      </td>
                      <td style={styles.td}>{inv.feeType}</td>
                      <td style={styles.td}>₹{inv.amount}</td>
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
                        {inv.payments.length > 0 ? (
                          <div style={{fontSize: '0.8rem'}}>
                            {inv.payments.map((p, i) => (
                              <div key={i} style={{marginBottom: '4px'}}>
                                <span style={{color: 'var(--success)'}}>+₹{p.amount}</span> ({p.paymentMethod}) <br/>
                                <span style={{color: 'var(--text-secondary)'}}>{p.receiptNumber} {p.collectedBy ? `by ${p.collectedBy}` : ''}</span>
                              </div>
                            ))}
                          </div>
                        ) : '-'}
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
      </div>

      {/* Modals */}
      {showCategoryModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ marginBottom: '20px' }}>New Fee Category</h3>
            <form onSubmit={handleCreateCategory} style={styles.form}>
              <div style={styles.formGroup}>
                <label>Category Name</label>
                <input type="text" required placeholder="e.g. Tuition Fee" value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Description</label>
                <input type="text" placeholder="Optional" value={categoryForm.description} onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} style={styles.input} />
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowCategoryModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStructureModal && (
        <div style={{...styles.modalOverlay, overflowY: 'auto', padding: '20px 0'}}>
          <div style={{...styles.modal, margin: 'auto'}}>
            <h3 style={{ marginBottom: '20px' }}>{selectedStructure ? 'Edit Fee Structure' : 'New Fee Structure'}</h3>
            <form onSubmit={handleCreateOrUpdateStructure} style={styles.form}>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                <div style={styles.formGroup}>
                  <label>Fee Type / Category</label>
                  <select required value={structureForm.feeType} onChange={e => setStructureForm({...structureForm, feeType: e.target.value})} style={styles.input}>
                    <option value="">-- Select Category --</option>
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    {/* Fallback for existing data not in categories */}
                    {structureForm.feeType && !categories.find(c => c.name === structureForm.feeType) && (
                      <option value={structureForm.feeType}>{structureForm.feeType}</option>
                    )}
                  </select>
                </div>
                
                <div style={styles.formGroup}>
                  <label>Amount (₹)</label>
                  <input type="number" required min="1" value={structureForm.amount} onChange={e => setStructureForm({...structureForm, amount: e.target.value})} style={styles.input} />
                </div>
                
                <div style={styles.formGroup}>
                  <label>Fee Nature</label>
                  <select value={structureForm.feeNature} onChange={e => setStructureForm({...structureForm, feeNature: e.target.value})} style={styles.input}>
                    <option value="Recurring">Recurring</option>
                    <option value="One-Time">One-Time</option>
                    <option value="Occasional">Occasional</option>
                  </select>
                </div>
                
                <div style={styles.formGroup}>
                  <label>Frequency (Plan Type)</label>
                  <select value={structureForm.planType} onChange={e => setStructureForm({...structureForm, planType: e.target.value})} style={styles.input}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half-Yearly</option>
                    <option value="ANNUAL">Annual</option>
                    <option value="ONE_TIME">One-time</option>
                  </select>
                </div>
                
                <div style={styles.formGroup}>
                  <label>Academic Year</label>
                  <input type="text" value={structureForm.academicYear} onChange={e => setStructureForm({...structureForm, academicYear: e.target.value})} style={styles.input} />
                </div>
                
                <div style={styles.formGroup}>
                  <label>Status</label>
                  <select value={structureForm.isActive ? 'true' : 'false'} onChange={e => setStructureForm({...structureForm, isActive: e.target.value === 'true'})} style={styles.input}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                
                <div style={styles.formGroup}>
                  <label>Applicable To</label>
                  <select value={structureForm.applicableTo} onChange={e => setStructureForm({...structureForm, applicableTo: e.target.value})} style={styles.input}>
                    <option value="All Students">All Students</option>
                    <option value="Specific Class">Specific Class</option>
                    <option value="Individual Student">Individual Student</option>
                  </select>
                </div>
                
                {structureForm.applicableTo === 'Specific Class' && (
                  <div style={styles.formGroup}>
                    <label>Target Course</label>
                    <select required value={structureForm.courseId} onChange={e => setStructureForm({...structureForm, courseId: e.target.value})} style={styles.input}>
                      <option value="">-- Select Course --</option>
                      {coursesList.map(c => <option key={c.id} value={c.id}>{c.courseName} - {c.section}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div style={styles.formGroup}>
                <label>Default Due Date (Optional)</label>
                <input type="date" value={structureForm.dueDate} onChange={e => setStructureForm({...structureForm, dueDate: e.target.value})} style={styles.input} />
              </div>
              
              {!selectedStructure && (structureForm.feeNature === 'One-Time' || structureForm.feeNature === 'Occasional') && (
                <div style={{...styles.formGroup, flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '10px', padding: '10px', background: 'var(--bg-card-hover)', borderRadius: '4px'}}>
                  <input type="checkbox" id="autoGen" checked={structureForm.autoGenerateInvoices} onChange={e => setStructureForm({...structureForm, autoGenerateInvoices: e.target.checked})} style={{width: '20px', height: '20px'}} />
                  <label htmlFor="autoGen" style={{cursor: 'pointer', margin: 0}}>Automatically generate invoices for applicable students now</label>
                </div>
              )}

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
                  {structures.map(s => <option key={s.id} value={s.id}>{s.feeType} (₹{s.amount})</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label>Target Course (Optional - overrides structure default)</label>
                <select value={invoiceForm.courseId} onChange={e => setInvoiceForm({...invoiceForm, courseId: e.target.value})} style={styles.input}>
                  <option value="">-- Use Structure Default --</option>
                  {coursesList.map(c => <option key={c.id} value={c.id}>{c.courseName} - {c.section}</option>)}
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
                <label>Amount (₹)</label>
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

    </>
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
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' },
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
  modal: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-glow)', borderRadius: 'var(--radius-md)', padding: '30px', maxWidth: '600px', width: '90%' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  input: { padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }
};
