import React, { useState, useEffect, useRef } from 'react';
import { getStudents, registerStudent, getCourses, deleteStudent, getStudentFullRecord } from '../../api/adminApi';
import Loader from '../../components/Loader';
import { jsPDF } from 'jspdf';

export default function Students() {
  const nameInputRef = useRef(null);

  // Form Fields
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [courseId, setCourseId] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');

  // Data List & Modal State
  const [studentsList, setStudentsList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Credentials Modal
  const [credentialsModal, setCredentialsModal] = useState({ visible: false, studentId: '', password: '', name: '' });
  
  // Fee History Modal
  const [selectedFeeStudent, setSelectedFeeStudent] = useState(null);

  // Download Modal
  const [downloadModal, setDownloadModal] = useState(null); // student object
  const [dlLoading, setDlLoading] = useState(false);
  const [dlOptions, setDlOptions] = useState({ profile: true, fees: true, attendance: true });

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [students, clsData] = await Promise.all([getStudents(), getCourses()]);
      setStudentsList(students);
      setCoursesList(clsData);
    } catch (err) {
      console.error(err);
      setError('Failed to load student records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to completely remove ${name} from the system? This action cannot be undone.`)) {
      try {
        await deleteStudent(id);
        setStudentsList(studentsList.filter(s => s.id !== id));
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete student.');
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!rollNumber || !courseId || !name) {
      setError('Name, Roll number, and Course are required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await registerStudent({
        name,
        rollNumber,
        courseId,
        fatherName,
        motherName,
        phone,
        address,
        admissionDate
      });

      // Show credentials modal
      setCredentialsModal({
        visible: true,
        studentId: response.studentId,
        password: response.password,
        name: response.name
      });

      // Clear form
      setName('');
      setRollNumber('');
      setCourseId('');
      setFatherName('');
      setMotherName('');
      setPhone('');
      setAddress('');
      setAdmissionDate('');
      
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter students dynamically on the client
  const filteredStudents = studentsList.filter(student => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.rollNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.studentId || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = !courseFilter || student.courseId?.toString() === courseFilter;
    return matchesSearch && matchesCourse;
  });

  // ── Download Helpers ────────────────────────────────────────────────────────

  const handleDownloadCSV = (student) => {
    const rows = [];
    if (dlOptions.profile) {
      rows.push(['=== PROFILE ===']);
      rows.push(['Name', student.name]);
      rows.push(['Student ID', student.studentId]);
      rows.push(['Roll Number', student.rollNumber || '-']);
      rows.push(['Course', student.course ? `${student.course.courseName} - ${student.course.section}` : '-']);
      rows.push(['Father Name', student.fatherName || '-']);
      rows.push(['Mother Name', student.motherName || '-']);
      rows.push(['Phone', student.phone || '-']);
      rows.push(['Address', student.address || '-']);
      rows.push(['Admission Date', student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '-']);
      rows.push([]);
    }
    if (dlOptions.fees && student.feeInvoices?.length) {
      rows.push(['=== FEE RECORDS ===']);
      rows.push(['Fee Type', 'Amount (Rs)', 'Due Date', 'Status', 'Paid On']);
      student.feeInvoices.forEach(inv => {
        const paidOn = inv.payments?.length ? new Date(inv.payments[0].date).toLocaleDateString() : '-';
        rows.push([inv.feeType, inv.amount, new Date(inv.dueDate).toLocaleDateString(), inv.status, paidOn]);
      });
      rows.push([]);
    }
    if (dlOptions.attendance && student.attendance?.length) {
      rows.push(['=== ATTENDANCE RECORDS ===']);
      rows.push(['Date', 'Status']);
      student.attendance.forEach(a => {
        rows.push([new Date(a.date).toLocaleDateString(), a.status]);
      });
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${student.name.replace(/ /g, '_')}_record.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = (student) => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;
    const lineH = 7;
    const col1 = 14;
    const col2 = 80;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105);
    doc.text('Student Complete Record', pageW / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, y, { align: 'center' });
    y += 12;

    const section = (title) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFillColor(5, 150, 105);
      doc.rect(col1, y - 4, pageW - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(title, col1 + 2, y + 1);
      doc.setTextColor(30, 30, 30);
      y += 10;
    };

    const row = (label, value) => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(label, col1, y);
      doc.setTextColor(20);
      doc.text(String(value), col2, y);
      y += lineH;
    };

    if (dlOptions.profile) {
      section('STUDENT PROFILE');
      row('Name:', student.name);
      row('Student ID:', student.studentId || '-');
      row('Roll Number:', student.rollNumber || '-');
      row('Course:', student.course ? `${student.course.courseName} - ${student.course.section}` : '-');
      row('Father Name:', student.fatherName || '-');
      row('Mother Name:', student.motherName || '-');
      row('Phone:', student.phone || '-');
      row('Address:', student.address || '-');
      row('Admission Date:', student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '-');
      y += 4;
    }

    if (dlOptions.fees) {
      section('FEE RECORDS');
      if (!student.feeInvoices?.length) {
        doc.setFontSize(9); doc.setTextColor(150);
        doc.text('No fee records found.', col1, y); y += lineH;
      } else {
        // Table header
        doc.setFontSize(8); doc.setTextColor(80);
        ['Fee Type', 'Amount', 'Due Date', 'Status'].forEach((h, i) => {
          doc.text(h, col1 + i * 42, y);
        });
        y += 5;
        doc.setDrawColor(200); doc.line(col1, y, pageW - 14, y); y += 3;
        student.feeInvoices.forEach(inv => {
          if (y > 275) { doc.addPage(); y = 20; }
          doc.setFontSize(8); doc.setTextColor(20);
          doc.text(inv.feeType, col1, y);
          doc.text(`Rs ${inv.amount}`, col1 + 42, y);
          doc.text(new Date(inv.dueDate).toLocaleDateString(), col1 + 84, y);
          const statusColor = inv.status === 'PAID' ? [5,150,105] : inv.status === 'OVERDUE' ? [220,38,38] : [217,119,6];
          doc.setTextColor(...statusColor);
          doc.text(inv.status, col1 + 126, y);
          doc.setTextColor(20);
          y += lineH;
        });
      }
      y += 4;
    }

    if (dlOptions.attendance) {
      section('ATTENDANCE RECORDS');
      if (!student.attendance?.length) {
        doc.setFontSize(9); doc.setTextColor(150);
        doc.text('No attendance records found.', col1, y); y += lineH;
      } else {
        const present = student.attendance.filter(a => a.status === 'PRESENT').length;
        const late = student.attendance.filter(a => a.status === 'LATE').length;
        const total = student.attendance.length;
        const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
        doc.setFontSize(9); doc.setTextColor(5, 150, 105);
        doc.text(`Attendance: ${pct}%  (Present: ${present}, Late: ${late}, Total Days: ${total})`, col1, y);
        y += 8;
        // Table header
        doc.setFontSize(8); doc.setTextColor(80);
        doc.text('Date', col1, y); doc.text('Status', col1 + 60, y);
        y += 5;
        doc.setDrawColor(200); doc.line(col1, y, col1 + 120, y); y += 3;
        student.attendance.forEach(a => {
          if (y > 275) { doc.addPage(); y = 20; }
          doc.setFontSize(8);
          doc.setTextColor(20); doc.text(new Date(a.date).toLocaleDateString(), col1, y);
          const sc = a.status === 'PRESENT' ? [5,150,105] : a.status === 'LATE' ? [217,119,6] : [220,38,38];
          doc.setTextColor(...sc); doc.text(a.status, col1 + 60, y);
          y += lineH;
        });
      }
    }

    doc.save(`${student.name.replace(/ /g, '_')}_record.pdf`);
  };

  const handleDownload = async (format) => {
    setDlLoading(true);
    try {
      const { student } = await getStudentFullRecord(downloadModal.id);
      if (format === 'csv') handleDownloadCSV(student);
      else handleDownloadPDF(student);
      setDownloadModal(null);
    } catch (err) {
      alert('Failed to fetch student record. Please try again.');
    } finally {
      setDlLoading(false);
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>Student Administration</h2>
        <p style={styles.sub}>Register and manage academic profiles and admission details.</p>
      </div>

      <div>
        {/* Directory Section: Filtered Table */}
        <div style={styles.tablePane}>
          <div style={styles.tablePaneHeader}>
            <h3 style={styles.paneTitle}>Student Directory</h3>
            <span style={styles.recordsCount}>{filteredStudents.length} Records found</span>
          </div>

          {/* Filtering Controls */}
          <div style={styles.filterGrid}>
            <input type="text" placeholder="🔍 Search name, roll, ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={styles.searchBar} />
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} style={styles.filterDropdown}>
              <option value="">All Courses</option>
              {coursesList.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.courseName} - {cls.section}</option>
              ))}
            </select>
          </div>

          {/* Records Table */}
          {loading ? (
            <Loader message="Loading directory..." />
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Student ID</th>
                    <th style={styles.th}>Name</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Roll</th>
                    <th style={styles.th}>Course</th>
                    <th style={styles.th}>Phone</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Admitted</th>
                    <th style={styles.th}>Fee Record</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={styles.noRecords}>No students found.</td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: 'bold' }}>{student.studentId}</td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{student.name}</div>
                          {student.fatherName && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Father: {student.fatherName}</div>}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>{student.rollNumber || '-'}</td>
                        <td style={styles.td}>
                          <span style={{ 
                            background: 'rgba(16, 185, 129, 0.1)', 
                            color: 'var(--success)', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '0.8rem', 
                            fontWeight: 'bold', 
                            border: '1px solid rgba(16, 185, 129, 0.2)' 
                          }}>
                            {student.course ? `${student.course.courseName}-${student.course.section}` : 'N/A'}
                          </span>
                        </td>
                        <td style={styles.td}>{student.phone ? `📞 ${student.phone}` : '-'}</td>
                        <td style={styles.td}>
                          {student.email ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              📧 {student.email}
                            </span>
                          ) : (
                            <span style={{
                              background: 'rgba(245, 158, 11, 0.1)',
                              color: 'var(--warning)',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              Not added
                            </span>
                          )}
                        </td>
                        <td style={styles.td}>{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '-'}</td>
                        <td style={{ ...styles.td, maxWidth: '250px' }}>
                          {(!student.feeInvoices || student.feeInvoices.length === 0) ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No fee records</span>
                          ) : (
                            <button 
                              className="btn-secondary" 
                              style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card-hover)', border: '1px solid var(--glass-border)' }}
                              onClick={(e) => { e.stopPropagation(); setSelectedFeeStudent(student); }}
                            >
                              <span>👁️</span> View Fees ({student.feeInvoices.length})
                            </button>
                          )}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDlOptions({ profile: true, fees: true, attendance: true }); setDownloadModal(student); }}
                            style={dlBtnStyle}
                          >
                            ⬇ Record
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Credentials Modal */}
      {credentialsModal.visible && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={{color: 'var(--success)', marginBottom: '10px'}}>Student Registered Successfully!</h3>
            <p>Please save these auto-generated credentials and share them with the student securely.</p>
            
            <div style={styles.credentialsBox}>
              <p><strong>Name:</strong> {credentialsModal.name}</p>
              <p><strong>Login ID:</strong> <span style={styles.highlight}>{credentialsModal.studentId}</span></p>
              <p><strong>Password:</strong> <span style={styles.highlight}>{credentialsModal.password}</span></p>
            </div>

            <button className="btn-primary" onClick={() => setCredentialsModal({visible: false, studentId: '', password: '', name: ''})}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── DOWNLOAD MODAL ── */}
      {downloadModal && (
        <div style={styles.modalOverlay} onClick={() => !dlLoading && setDownloadModal(null)}>
          <div style={dlModalStyle} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={dlHeaderStyle}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#111827' }}>📥 Download Record</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#6b7280' }}>{downloadModal.name} ({downloadModal.studentId})</p>
              </div>
              <button style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#9ca3af' }} onClick={() => setDownloadModal(null)}>✕</button>
            </div>

            {/* Checkboxes */}
            <div style={{ padding: '20px 24px' }}>
              <p style={{ margin: '0 0 14px', fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>Select sections to include:</p>
              {[
                { key: 'profile', label: '👤 Basic Profile Info', desc: 'Name, roll, course, parents, contact' },
                { key: 'fees', label: '💰 Fee Records', desc: 'All invoices with payment status' },
                { key: 'attendance', label: '📅 Attendance Logs', desc: 'Day-wise present / absent / late' },
              ].map(({ key, label, desc }) => (
                <label key={key} style={dlCheckRowStyle}>
                  <input
                    type="checkbox"
                    checked={dlOptions[key]}
                    onChange={() => setDlOptions(p => ({ ...p, [key]: !p[key] }))}
                    style={{ width: '16px', height: '16px', accentColor: '#059669', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#111827' }}>{label}</div>
                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Buttons */}
            <div style={dlFooterStyle}>
              <button style={dlCancelBtnStyle} onClick={() => setDownloadModal(null)} disabled={dlLoading}>Cancel</button>
              <button
                style={{ ...dlFormatBtnStyle, background: '#f0fdf4', color: '#059669', border: '1.5px solid #059669' }}
                onClick={() => handleDownload('csv')}
                disabled={dlLoading || !Object.values(dlOptions).some(Boolean)}
              >
                {dlLoading ? '...' : '📊 Download CSV'}
              </button>
              <button
                style={{ ...dlFormatBtnStyle, background: '#059669', color: '#fff' }}
                onClick={() => handleDownload('pdf')}
                disabled={dlLoading || !Object.values(dlOptions).some(Boolean)}
              >
                {dlLoading ? 'Generating...' : '📄 Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fee History Modal */}
      {selectedFeeStudent && (
        <div style={styles.modalOverlay} onClick={() => setSelectedFeeStudent(null)}>
          <div style={{ ...styles.modalCard, width: '550px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '15px', marginBottom: '15px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem' }}>Fee History</h2>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{selectedFeeStudent.name} ({selectedFeeStudent.studentId})</div>
              </div>
              <button 
                onClick={() => setSelectedFeeStudent(null)} 
                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                &times;
              </button>
            </div>
            
            {(!selectedFeeStudent.feeInvoices || selectedFeeStudent.feeInvoices.length === 0) ? (
              <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                No fee records found for this student.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedFeeStudent.feeInvoices.map(invoice => (
                  <div key={invoice.id} style={{ 
                    padding: '16px', 
                    background: 'var(--input-bg)', 
                    borderRadius: '8px', 
                    borderLeft: `4px solid ${invoice.status === 'PAID' ? 'var(--success)' : invoice.status === 'OVERDUE' ? 'var(--danger)' : 'var(--warning)'}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{invoice.feeType}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Due Date: {new Date(invoice.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--text-primary)' }}>₹{invoice.amount.toLocaleString()}</div>
                        <div style={{ 
                          fontSize: '0.85rem', 
                          fontWeight: 'bold',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          display: 'inline-block',
                          marginTop: '4px',
                          background: invoice.status === 'PAID' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: invoice.status === 'PAID' ? 'var(--success)' : invoice.status === 'OVERDUE' ? 'var(--danger)' : 'var(--warning)' 
                        }}>
                          {invoice.status}
                        </div>
                      </div>
                    </div>
                    
                    {/* Payments related to this invoice */}
                    {invoice.payments && invoice.payments.length > 0 && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Payments:</div>
                        {invoice.payments.map(payment => (
                          <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 0' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{new Date(payment.date).toLocaleDateString()} via {payment.paymentMethod}</span>
                            <span style={{ color: 'var(--success)', fontWeight: '600' }}>+ ₹{payment.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '30px' },
  header: { marginBottom: '10px' },
  sub: { color: 'var(--text-secondary)' },
  mainLayoutGrid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' },
  pane: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' },
  paneTitle: { fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  select: { padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', width: '100%' },
  textarea: { padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', width: '100%', resize: 'vertical' },
  submitBtn: { padding: '12px', fontSize: '0.9rem', marginTop: '10px' },
  errorAlert: { padding: '10px', background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#fca5a5', borderRadius: '4px', marginBottom: '10px' },
  tablePane: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)', overflow: 'hidden' },
  tablePaneHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  recordsCount: { fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' },
  filterGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '20px' },
  searchBar: { background: 'var(--input-bg)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' },
  filterDropdown: { background: 'var(--input-bg)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { borderBottom: '2px solid var(--glass-border)' },
  th: { color: 'var(--text-secondary)', padding: '12px 14px', fontWeight: '600', fontSize: '0.85rem' },
  td: { padding: '14px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)', fontSize: '0.85rem', verticalAlign: 'middle' },
  nameCell: { padding: '14px', borderBottom: '1px solid var(--glass-border)', fontSize: '0.85rem' },
  tr: { transition: 'var(--transition-fast)', '&:hover': { background: 'var(--bg-card-hover)' } },
  noRecords: { padding: '30px', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalCard: { background: 'var(--bg-card)', padding: '32px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glow)', width: '400px', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '20px' },
  credentialsBox: { background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--primary)', display: 'flex', flexDirection: 'column', gap: '10px' },
  highlight: { color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.1rem', background: 'rgba(139, 92, 246, 0.1)', padding: '2px 6px', borderRadius: '4px' }
};

// Download modal styles (outside main styles to keep clean)
const dlBtnStyle = {
  padding: '5px 12px',
  background: 'rgba(5,150,105,0.1)',
  color: '#059669',
  border: '1px solid rgba(5,150,105,0.3)',
  borderRadius: '6px',
  fontSize: '0.78rem',
  fontWeight: '700',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const dlModalStyle = {
  background: '#ffffff',
  borderRadius: '18px',
  border: '1px solid #e5e7eb',
  width: '100%',
  maxWidth: '460px',
  boxShadow: '0 28px 72px rgba(0,0,0,0.25)',
  overflow: 'hidden',
};

const dlHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '20px 24px',
  borderBottom: '1px solid #e5e7eb',
};

const dlCheckRowStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid #e5e7eb',
  marginBottom: '10px',
  cursor: 'pointer',
  background: '#f9fafb',
};

const dlFooterStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  padding: '16px 24px',
  borderTop: '1px solid #e5e7eb',
  background: '#f9fafb',
};

const dlCancelBtnStyle = {
  padding: '9px 18px',
  background: 'transparent',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  color: '#6b7280',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '0.88rem',
};

const dlFormatBtnStyle = {
  padding: '9px 18px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: '700',
  fontSize: '0.88rem',
  border: 'none',
};
