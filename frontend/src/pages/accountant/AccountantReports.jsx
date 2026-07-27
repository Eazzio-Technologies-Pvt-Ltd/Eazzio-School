import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function AccountantReports() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Invoice & Detail States
  const [studentInvoices, setStudentInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [settings, setSettings] = useState({
    feeDueDay: 10,
    collectFeeAnyDay: true,
    allowPartPayment: false,
    lateFineAmount: 150
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch students list
        const summaryResponse = await api.get('/accountant/dashboard-summary');
        let studentsData = [];
        if (summaryResponse.data && summaryResponse.data.data) {
          studentsData = summaryResponse.data.data.studentsFeesList || [];
        } else if (summaryResponse.data && summaryResponse.data.studentsFeesList) {
          studentsData = summaryResponse.data.studentsFeesList;
        }
        setStudents(studentsData);

        // Fetch courses list
        const classesResponse = await api.get('/accountant/classes');
        let coursesData = [];
        if (classesResponse.data && classesResponse.data.success) {
          coursesData = classesResponse.data.data || classesResponse.data;
        } else if (Array.isArray(classesResponse.data)) {
          coursesData = classesResponse.data;
        }
        setCourses(coursesData);

        // Fetch School settings for fine amount
        try {
          const settingsResponse = await api.get('/accountant/settings');
          if (settingsResponse.data) {
            setSettings(settingsResponse.data);
          }
        } catch (err) {
          console.error('Failed to load settings:', err);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load students or classes. Check connection.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch detailed student invoices when student changes
  useEffect(() => {
    if (selectedStudent) {
      const fetchStudentInvoices = async () => {
        try {
          setLoadingInvoices(true);
          const response = await api.get(`/accountant/invoices?studentId=${selectedStudent.id}`);
          if (response.data) {
            setStudentInvoices(Array.isArray(response.data) ? response.data : (response.data.data || []));
          }
        } catch (err) {
          console.error('Error fetching student invoices:', err);
        } finally {
          setLoadingInvoices(false);
        }
      };
      fetchStudentInvoices();
      setShowMoreDetails(false);
    } else {
      setStudentInvoices([]);
      setShowMoreDetails(false);
    }
  }, [selectedStudent]);

  // Compute unique sessions from courses
  const sessions = Array.from(new Set(courses.map(c => c.academicYear))).filter(Boolean);

  // Filter students based on selection
  const filteredStudents = students.filter(student => {
    if (selectedSession && student.academicYear !== selectedSession) {
      return false;
    }
    if (selectedCourseId && student.courseId !== parseInt(selectedCourseId)) {
      return false;
    }
    if (searchQuery && !student.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleStudentSelect = (e) => {
    const val = e.target.value;
    setSelectedStudentId(val);
    if (val) {
      const found = students.find(s => s.id === parseInt(val));
      setSelectedStudent(found);
    } else {
      setSelectedStudent(null);
    }
  };

  const formatMethod = (method) => {
    if (!method) return '-';
    const m = method.toUpperCase();
    if (m === 'CASH') return 'Cash';
    if (m === 'UPI') return 'UPI';
    if (m === 'CARD') return 'Card';
    return method;
  };

  const ACADEMIC_MONTHS = [
    { name: 'April', index: 3 },
    { name: 'May', index: 4 },
    { name: 'June', index: 5 },
    { name: 'July', index: 6 },
    { name: 'August', index: 7 },
    { name: 'September', index: 8 },
    { name: 'October', index: 9 },
    { name: 'November', index: 10 },
    { name: 'December', index: 11 },
    { name: 'January', index: 0 },
    { name: 'February', index: 1 },
    { name: 'March', index: 2 }
  ];

  // PDF report generator
  const generatePDF = () => {
    if (!selectedStudent) return;

    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) {
      alert('Please allow popups to generate the PDF report.');
      return;
    }

    const monthlyData = ACADEMIC_MONTHS.map(month => {
      const monthInvoices = studentInvoices.filter(inv => {
        const date = new Date(inv.dueDate);
        return date.getMonth() === month.index;
      });

      const collected = monthInvoices.reduce((sum, inv) => 
        sum + inv.payments.reduce((pSum, p) => p.status === 'SUCCESS' ? pSum + p.amount : pSum, 0)
      , 0);

      const pending = monthInvoices.reduce((sum, inv) => {
        const invPaid = inv.payments.reduce((pSum, p) => p.status === 'SUCCESS' ? pSum + p.amount : pSum, 0);
        return sum + Math.max(0, inv.amount - invPaid);
      }, 0);

      const hasFine = monthInvoices.some(inv => {
        if (inv.status === 'PAID') return false;
        return new Date() > new Date(inv.dueDate);
      });
      const fine = hasFine ? settings.lateFineAmount : 0;

      const methods = Array.from(new Set(
        monthInvoices.flatMap(inv => 
          inv.payments.filter(p => p.status === 'SUCCESS').map(p => formatMethod(p.paymentMethod))
        )
      ));
      const methodStr = methods.length > 0 ? methods.join(', ') : '-';

      return {
        name: month.name,
        collected,
        pending,
        fine,
        methodStr
      };
    });

    const totalCollected = monthlyData.reduce((sum, m) => sum + m.collected, 0);
    const totalPending = monthlyData.reduce((sum, m) => sum + m.pending, 0);
    const totalFine = monthlyData.reduce((sum, m) => sum + m.fine, 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student Fee Report - ${selectedStudent.name}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1f2937;
            margin: 0;
            padding: 40px;
            background-color: #ffffff;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #6366f1;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .school-info h1 {
            font-size: 24px;
            margin: 0;
            color: #111827;
            font-weight: 800;
          }
          .school-info p {
            margin: 4px 0 0 0;
            font-size: 14px;
            color: #4b5563;
          }
          .report-title {
            text-align: right;
          }
          .report-title h2 {
            font-size: 20px;
            margin: 0;
            color: #6366f1;
            font-weight: 700;
          }
          .report-title p {
            margin: 4px 0 0 0;
            font-size: 12px;
            color: #9ca3af;
          }
          .section-title {
            font-size: 16px;
            font-weight: 700;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 15px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
          }
          .student-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 30px;
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #f3f4f6;
          }
          .student-item {
            font-size: 14px;
          }
          .student-label {
            font-weight: 600;
            color: #4b5563;
          }
          .student-value {
            color: #111827;
            margin-left: 8px;
          }
          .ledger-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .ledger-table th, .ledger-table td {
            padding: 12px 16px;
            text-align: left;
            font-size: 13px;
            border-bottom: 1px solid #e5e7eb;
          }
          .ledger-table th {
            background-color: #f3f4f6;
            color: #4b5563;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
          }
          .ledger-table tr:hover {
            background-color: #f9fafb;
          }
          .summary-card {
            display: flex;
            justify-content: flex-end;
            gap: 20px;
            margin-bottom: 50px;
          }
          .summary-box {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 15px 25px;
            text-align: right;
          }
          .summary-label {
            font-size: 12px;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 4px;
          }
          .summary-value {
            font-size: 18px;
            font-weight: 700;
          }
          .footer {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 12px;
            color: #9ca3af;
          }
          .signature-line {
            width: 200px;
            border-top: 1px solid #9ca3af;
            text-align: center;
            padding-top: 5px;
            color: #4b5563;
            font-weight: 600;
          }
          @media print {
            body {
              padding: 0;
            }
            .summary-box {
              border: 1px solid #cccccc;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="school-info">
            <h1>Eazzio School Management System</h1>
            <p>Financial Ledger & Student Fee Records</p>
          </div>
          <div class="report-title">
            <h2>FEE LEDGER REPORT</h2>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div class="section-title">Student Profile</div>
        <div class="student-grid">
          <div class="student-item"><span class="student-label">Name:</span><span class="student-value">${selectedStudent.name}</span></div>
          <div class="student-item"><span class="student-label">Student ID:</span><span class="student-value">${selectedStudent.studentId}</span></div>
          <div class="student-item"><span class="student-label">Roll Number:</span><span class="student-value">${selectedStudent.rollNumber}</span></div>
          <div class="student-item"><span class="student-label">Course / Class:</span><span class="student-value">${selectedStudent.className}</span></div>
          <div class="student-item"><span class="student-label">Session:</span><span class="student-value">${selectedStudent.academicYear}</span></div>
          <div class="student-item"><span class="student-label">Phone Number(s):</span><span class="student-value">
            ${(() => {
              const parts = (selectedStudent.phone || '').split(',').map(p => p.trim()).filter(Boolean);
              if (parts.length === 0) return 'N/A';
              if (parts.length === 1) return parts[0];
              return `${parts[0]} / ${parts[1]}`;
            })()}
          </span></div>
          <div class="student-item"><span class="student-label">Father's Name:</span><span class="student-value">${selectedStudent.fatherName}</span></div>
          <div class="student-item"><span class="student-label">Mother's Name:</span><span class="student-value">${selectedStudent.motherName}</span></div>
          <div class="student-item" style="grid-column: span 2;"><span class="student-label">Address:</span><span class="student-value">${selectedStudent.address || 'N/A'}</span></div>
        </div>

        <div class="section-title">Academic Year Monthly Breakdown</div>
        <table class="ledger-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Collected Fee</th>
              <th>Pending Fee</th>
              <th>Late Fine</th>
              <th>Payment Method</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyData.map(m => `
              <tr>
                <td style="font-weight: 600;">${m.name}</td>
                <td style="color: ${m.collected > 0 ? '#10b981' : '#4b5563'};">₹${m.collected.toLocaleString()}</td>
                <td style="color: ${m.pending > 0 ? '#f59e0b' : '#4b5563'};">₹${m.pending.toLocaleString()}</td>
                <td style="color: ${m.fine > 0 ? '#ef4444' : '#4b5563'};">₹${m.fine.toLocaleString()}</td>
                <td><span style="background: ${m.collected > 0 ? '#f3f4f6' : 'transparent'}; padding: 2px 6px; border-radius: 4px;">${m.methodStr}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">Summary Totals</div>
        <div class="summary-card">
          <div class="summary-box">
            <div class="summary-label">Total Collected</div>
            <div class="summary-value" style="color: #10b981;">₹${totalCollected.toLocaleString()}</div>
          </div>
          <div class="summary-box">
            <div class="summary-label">Total Pending</div>
            <div class="summary-value" style="color: #f59e0b;">₹${totalPending.toLocaleString()}</div>
          </div>
          <div class="summary-box">
            <div class="summary-label">Total Fine</div>
            <div class="summary-value" style="color: #ef4444;">₹${totalFine.toLocaleString()}</div>
          </div>
        </div>

        <div class="footer">
          <div>Generated by Eazzio portal.</div>
          <div class="signature-line">Authorized Signatory</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 600);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const styles = {
    container: {
      padding: '30px',
      minHeight: '100%',
      color: 'var(--text-primary)',
    },
    header: {
      marginBottom: '30px',
    },
    title: {
      fontSize: '2rem',
      fontWeight: '700',
      margin: '0 0 10px 0',
      color: 'var(--text-primary)',
    },
    subtitle: {
      fontSize: '1rem',
      color: 'var(--text-secondary)',
      margin: 0,
    },
    filterCard: {
      background: 'var(--bg-card)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      padding: '24px',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
      backdropFilter: 'blur(8px)',
      marginBottom: '30px',
    },
    filterRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    label: {
      fontSize: '0.85rem',
      fontWeight: '600',
      color: 'var(--text-secondary)',
    },
    input: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 14px',
      color: 'var(--text-primary)',
      fontSize: '0.95rem',
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    select: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 14px',
      color: 'var(--text-primary)',
      fontSize: '0.95rem',
      outline: 'none',
      cursor: 'pointer',
      transition: 'border-color 0.2s',
    },
    detailCard: {
      background: 'var(--bg-card)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      padding: '30px',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
      backdropFilter: 'blur(8px)',
      maxWidth: '850px',
      margin: '0 auto',
    },
    detailHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      borderBottom: '1px solid var(--glass-border)',
      paddingBottom: '20px',
      marginBottom: '20px',
    },
    detailName: {
      fontSize: '1.8rem',
      fontWeight: '700',
      margin: 0,
      color: 'var(--text-primary)',
    },
    detailMeta: {
      fontSize: '0.9rem',
      color: 'var(--text-secondary)',
      margin: '4px 0 0 0',
    },
    detailGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '20px 30px',
      alignItems: 'start',
    },
    detailItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    detailLabel: {
      fontSize: '0.8rem',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: 'var(--text-secondary)',
    },
    detailValue: {
      fontSize: '1.05rem',
      fontWeight: '600',
      color: 'var(--text-primary)',
    },
    moreDetailsBtn: {
      background: 'rgba(99, 102, 241, 0.1)',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--text-primary)',
      padding: '8px 20px',
      fontSize: '0.9rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      textAlign: 'center',
      outline: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      alignSelf: 'start',
      marginTop: '10px',
    },
    monthlySection: {
      marginTop: '30px',
      borderTop: '1px solid var(--glass-border)',
      paddingTop: '25px',
    },
    monthlyTitle: {
      fontSize: '1.25rem',
      fontWeight: '600',
      margin: '0 0 16px 0',
      color: 'var(--text-primary)',
    },
    tableWrapper: {
      overflowX: 'auto',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      background: 'rgba(0,0,0,0.1)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      textAlign: 'left',
    },
    th: {
      borderBottom: '1px solid var(--glass-border)',
      padding: '14px 18px',
      fontSize: '0.85rem',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: 'var(--text-secondary)',
      background: 'rgba(255,255,255,0.02)',
    },
    td: {
      padding: '14px 18px',
      borderBottom: '1px solid var(--glass-border)',
      fontSize: '0.95rem',
    },
    tr: {
      transition: 'background 0.2s',
    },
    btnRow: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginTop: '20px',
    },
    generateBtn: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      color: 'white',
      padding: '10px 24px',
      fontSize: '0.95rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'opacity 0.2s',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
    },
    resultsContainer: {
      background: 'var(--bg-card)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      padding: '24px',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
    },
    resultsTitle: {
      fontSize: '1.1rem',
      fontWeight: '600',
      margin: '0 0 16px 0',
      color: 'var(--text-primary)',
    },
    studentGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: '16px',
    },
    studentItem: {
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-sm)',
      padding: '16px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    loaderContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '100px 0',
    },
    loaderText: {
      color: 'var(--text-secondary)',
      fontSize: '1.1rem',
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>📈 Reports</h2>
          <p style={styles.subtitle}>Loading workspace data...</p>
        </div>
        <div style={styles.loaderContainer}>
          <div style={styles.loaderText}>⏳ Fetching Roster & Classes...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📈 Reports</h2>
        <p style={styles.subtitle}>Select a student or search to generate student-specific fee structures and ledger logs.</p>
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '6px', color: '#f87171', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div style={styles.filterCard}>
        <div style={styles.filterRow}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Search Student</label>
            <input
              type="text"
              style={styles.input}
              placeholder="🔍 Type name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedStudent(null);
                setSelectedStudentId('');
              }}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Select Student</label>
            <select
              style={styles.select}
              value={selectedStudentId}
              onChange={handleStudentSelect}
            >
              <option value="">-- Choose Student --</option>
              {filteredStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.rollNumber && s.rollNumber !== 'N/A' ? `(Roll: ${s.rollNumber})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Session</label>
            <select
              style={styles.select}
              value={selectedSession}
              onChange={(e) => {
                setSelectedSession(e.target.value);
                setSelectedStudent(null);
                setSelectedStudentId('');
              }}
            >
              <option value="">All Sessions</option>
              {sessions.map(sess => (
                <option key={sess} value={sess}>{sess}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Course / Class</label>
            <select
              style={styles.select}
              value={selectedCourseId}
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                setSelectedStudent(null);
                setSelectedStudentId('');
              }}
            >
              <option value="">All Courses</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.courseName} - {c.section}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedStudent ? (
        <div style={styles.detailCard}>
          <div style={styles.detailHeader}>
            <span style={{ fontSize: '2.5rem' }}>👤</span>
            <div>
              <h3 style={styles.detailName}>{selectedStudent.name}</h3>
              <p style={styles.detailMeta}>
                Student ID: {selectedStudent.studentId} | Roll No: {selectedStudent.rollNumber}
              </p>
            </div>
          </div>
          <div style={styles.detailGrid}>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Course / Class</span>
              <span style={styles.detailValue}>{selectedStudent.className}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Session</span>
              <span style={styles.detailValue}>{selectedStudent.academicYear}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Father's Name</span>
              <span style={styles.detailValue}>{selectedStudent.fatherName}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Mother's Name</span>
              <span style={styles.detailValue}>{selectedStudent.motherName}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Phone Number(s)</span>
              <span style={styles.detailValue}>
                {(() => {
                  const parts = (selectedStudent.phone || '').split(',').map(p => p.trim()).filter(Boolean);
                  if (parts.length === 0) return 'N/A';
                  if (parts.length === 1) return parts[0];
                  return `${parts[0]} / ${parts[1]}`;
                })()}
              </span>
            </div>
            <div style={styles.detailItem}>
              <button 
                onClick={() => setShowMoreDetails(!showMoreDetails)}
                style={styles.moreDetailsBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                }}
              >
                {showMoreDetails ? '🔼 Less Details' : '🔽 More Details'}
              </button>
            </div>
            <div style={{ ...styles.detailItem, gridColumn: 'span 2' }}>
              <span style={styles.detailLabel}>Address</span>
              <span style={{ ...styles.detailValue, lineHeight: '1.4' }}>
                {selectedStudent.address || 'N/A'}
              </span>
            </div>
          </div>

          {showMoreDetails && (
            <div style={styles.monthlySection}>
              <h4 style={styles.monthlyTitle}>📅 Month-wise Fee Ledger (Academic Session)</h4>
              
              {loadingInvoices ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                  ⏳ Fetching monthly ledger details...
                </div>
              ) : (
                <>
                  <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Month</th>
                          <th style={styles.th}>Collected Fee</th>
                          <th style={styles.th}>Pending Fee</th>
                          <th style={styles.th}>Late Fine</th>
                          <th style={styles.th}>Payment Method</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ACADEMIC_MONTHS.map(month => {
                          const monthInvoices = studentInvoices.filter(inv => {
                            const date = new Date(inv.dueDate);
                            return date.getMonth() === month.index;
                          });

                          const collected = monthInvoices.reduce((sum, inv) => 
                            sum + inv.payments.reduce((pSum, p) => p.status === 'SUCCESS' ? pSum + p.amount : pSum, 0)
                          , 0);

                          const pending = monthInvoices.reduce((sum, inv) => {
                            const invPaid = inv.payments.reduce((pSum, p) => p.status === 'SUCCESS' ? pSum + p.amount : pSum, 0);
                            return sum + Math.max(0, inv.amount - invPaid);
                          }, 0);

                          const hasFine = monthInvoices.some(inv => {
                            if (inv.status === 'PAID') return false;
                            return new Date() > new Date(inv.dueDate);
                          });
                          const fine = hasFine ? settings.lateFineAmount : 0;

                          const methods = Array.from(new Set(
                            monthInvoices.flatMap(inv => 
                              inv.payments.filter(p => p.status === 'SUCCESS').map(p => formatMethod(p.paymentMethod))
                            )
                          ));
                          const methodStr = methods.length > 0 ? methods.join(', ') : '-';

                          return (
                            <tr key={month.name} style={styles.tr}>
                              <td style={{ ...styles.td, fontWeight: '600', color: 'var(--text-primary)' }}>{month.name}</td>
                              <td style={{ ...styles.td, color: collected > 0 ? 'var(--success)' : 'var(--text-secondary)' }}>
                                ₹{collected.toLocaleString()}
                              </td>
                              <td style={{ ...styles.td, color: pending > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                                ₹{pending.toLocaleString()}
                              </td>
                              <td style={{ ...styles.td, color: fine > 0 ? '#f87171' : 'var(--text-secondary)' }}>
                                ₹{fine.toLocaleString()}
                              </td>
                              <td style={styles.td}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  background: methods.length > 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                                  border: methods.length > 0 ? '1px solid var(--glass-border)' : 'none',
                                  borderRadius: '4px',
                                  fontSize: '0.85rem'
                                }}>
                                  {methodStr}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={styles.btnRow}>
                    <button 
                      onClick={generatePDF}
                      style={styles.generateBtn}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      📄 Generate Report
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : searchQuery || selectedSession || selectedCourseId ? (
        <div style={styles.resultsContainer}>
          <h4 style={styles.resultsTitle}>Matching Students ({filteredStudents.length})</h4>
          {filteredStudents.length > 0 ? (
            <div style={styles.studentGrid}>
              {filteredStudents.map(s => (
                <div
                  key={s.id}
                  style={styles.studentItem}
                  onClick={() => {
                    setSelectedStudent(s);
                    setSelectedStudentId(s.id.toString());
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                >
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{s.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Roll: {s.rollNumber} | Class: {s.className}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '20px 0' }}>
              No students match the selected filters.
            </p>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--glass-border)', borderRadius: '8px' }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Start searching by typing a name or selecting filters above.
          </p>
        </div>
      )}
    </div>
  );
}
