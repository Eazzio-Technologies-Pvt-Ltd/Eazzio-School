import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axios';
import Loader from '../../components/Loader';

const calculateFeeBreakdown = (selectedCourse) => {
  if (!selectedCourse || !selectedCourse.feesList || selectedCourse.feesList.length === 0) return null;
  
  // Find Tuition Fee structure
  const tuitionFee = selectedCourse.feesList.find(f => f.feeType === 'Tuition Fee') || selectedCourse.feesList[0];
  const baseAmount = tuitionFee.amount;
  const baseCycle = tuitionFee.planType || 'MONTHLY'; // 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'ONE_TIME'

  if (baseAmount <= 0) return null;

  // Let's first calculate the Yearly equivalent amount for Tuition Fee
  let yearlyAmount = 0;
  if (baseCycle === 'MONTHLY') {
    yearlyAmount = baseAmount * 12;
  } else if (baseCycle === 'QUARTERLY') {
    yearlyAmount = baseAmount * 4;
  } else if (baseCycle === 'HALF_YEARLY') {
    yearlyAmount = baseAmount * 2;
  } else if (baseCycle === 'YEARLY' || baseCycle === 'ONE_TIME') {
    yearlyAmount = baseAmount;
  }

  // Other one-time or non-tuition fees
  const otherFees = selectedCourse.feesList.filter(f => f.id !== tuitionFee.id);
  const otherTotal = otherFees.reduce((sum, f) => sum + f.amount, 0);

  // Return breakdown including other fees distributed or added
  return {
    tuition: {
      monthly: baseCycle === 'ONE_TIME' ? baseAmount : Math.round(yearlyAmount / 12),
      quarterly: baseCycle === 'ONE_TIME' ? baseAmount : Math.round(yearlyAmount / 4),
      halfYearly: baseCycle === 'ONE_TIME' ? baseAmount : Math.round(yearlyAmount / 2),
      yearly: baseCycle === 'ONE_TIME' ? baseAmount : yearlyAmount,
      oneTime: baseAmount
    },
    otherTotal,
    otherFees
  };
};

export default function AccountantStudents() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentsFeesList, setStudentsFeesList] = useState([]);
  const [classes, setClasses] = useState([]);

  // Filter States
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Forms
  const [showModal, setShowModal] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    classId: '',
    fatherName: '',
    motherName: '',
    phone: '',
    address: '',
    admissionDate: '',
    feeCycle: 'MONTHLY'
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    rollNumber: '',
    classId: '',
    fatherName: '',
    motherName: '',
    phone: '',
    address: '',
    admissionDate: '',
    feeCycle: 'MONTHLY'
  });

  // Bulk CSV Import States
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [lastImportedStudentIds, setLastImportedStudentIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lastImportedStudentIds')) || [];
    } catch (e) {
      return [];
    }
  });

  // Invoice & Payment details within profile
  const [studentInvoices, setStudentInvoices] = useState([]);
  const [loadingStudentInvoices, setLoadingStudentInvoices] = useState(false);
  const [recordingPaymentForInvoice, setRecordingPaymentForInvoice] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    paymentMethod: 'CASH',
    receiptNumber: ''
  });

  const [processing, setProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const downloadStudentPDF = (student, invoices) => {
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) {
      showToast('Please allow popups to download the PDF report.', 'error');
      return;
    }

    const calculatedTotal = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const calculatedPaid = invoices.reduce((sum, inv) => {
      const invPaid = inv.payments ? inv.payments.reduce((acc, p) => acc + p.amount, 0) : 0;
      return sum + invPaid;
    }, 0);
    const calculatedPending = Math.max(0, calculatedTotal - calculatedPaid);
    const feeStatus = calculatedTotal === 0 ? 'NO FEES' : (calculatedPending === 0 ? 'PAID' : 'PENDING');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student Fee Statement - ${student.name}</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #1f2937;
            line-height: 1.5;
            padding: 30px;
            background-color: #fff;
            margin: 0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #6366f1;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .header-left h1 {
            margin: 0;
            color: #4f46e5;
            font-size: 24px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header-left p {
            margin: 4px 0 0 0;
            color: #6b7280;
            font-size: 13px;
          }
          .badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .badge-paid {
            background-color: #ecfdf5;
            color: #065f46;
            border: 1px solid #a7f3d0;
          }
          .badge-pending {
            background-color: #fef2f2;
            color: #991b1b;
            border: 1px solid #fca5a5;
          }
          .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #374151;
            margin-top: 25px;
            margin-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 25px;
          }
          .info-item {
            font-size: 13px;
            display: flex;
          }
          .info-label {
            color: #4b5563;
            font-weight: 600;
            width: 140px;
            flex-shrink: 0;
          }
          .info-value {
            color: #1f2937;
          }
          .financial-cards {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          .card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            background-color: #f9fafb;
          }
          .card-title {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 700;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
          }
          .card-value {
            font-size: 20px;
            font-weight: 800;
            color: #111827;
          }
          .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .invoice-table th, .invoice-table td {
            border: 1px solid #e5e7eb;
            padding: 10px 12px;
            text-align: left;
            font-size: 12px;
          }
          .invoice-table th {
            background-color: #f3f4f6;
            color: #4b5563;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 11px;
          }
          .payment-history {
            margin-top: 8px;
            padding-left: 10px;
            font-size: 11px;
            color: #4b5563;
          }
          .payment-item {
            margin-top: 4px;
            padding: 4px 8px;
            background: #f0fdf4;
            border-left: 3px solid #10b981;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>Student Fee Statement</h1>
            <p>Generated on ${new Date().toLocaleDateString()} | Eazzio-School Portal</p>
          </div>
          <div>
            <span class="badge ${feeStatus === 'PAID' ? 'badge-paid' : 'badge-pending'}">${feeStatus}</span>
          </div>
        </div>

        <div class="section-title">👤 Student Information</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Student Name:</span>
            <span class="info-value">${student.name}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Student ID:</span>
            <span class="info-value">${student.studentId}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Roll Number:</span>
            <span class="info-value">${student.rollNumber || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Class / Course:</span>
            <span class="info-value">${student.className || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Session:</span>
            <span class="info-value">${student.academicYear || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Admission Date:</span>
            <span class="info-value">${student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Father's Name:</span>
            <span class="info-value">${student.fatherName || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Phone Number:</span>
            <span class="info-value">${student.phone || 'N/A'}</span>
          </div>
        </div>

        <div class="section-title">💰 Financial Dues Summary</div>
        <div class="financial-cards">
          <div class="card">
            <div class="card-title">Total Configured</div>
            <div class="card-value">₹${calculatedTotal.toLocaleString()}</div>
          </div>
          <div class="card">
            <div class="card-title">Total Paid</div>
            <div class="card-value" style="color: #059669;">₹${calculatedPaid.toLocaleString()}</div>
          </div>
          <div class="card">
            <div class="card-title">Outstanding Pending</div>
            <div class="card-value" style="color: ${calculatedPending > 0 ? '#dc2626' : '#1f2937'};">₹${calculatedPending.toLocaleString()}</div>
          </div>
        </div>

        <div class="section-title">📜 Invoice ledger & transaction log</div>
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Fee Particulars</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoices.map(inv => {
              const invPaid = inv.payments ? inv.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
              return `
                <tr>
                  <td style="font-weight: 600; vertical-align: top;">
                    ${inv.feeType}
                    ${inv.payments && inv.payments.length > 0 ? `
                      <div class="payment-history">
                        <div style="font-weight: bold; color: #4b5563; margin-bottom: 4px; font-size: 10px;">RECEIPTS HISTORY:</div>
                        ${inv.payments.map((p, idx) => `
                          <div class="payment-item">
                            <div>
                              <strong>Receipt #${idx + 1}:</strong> Paid <strong>₹${p.amount.toLocaleString()}</strong> (${p.paymentMethod} ${p.receiptNumber ? `| Ref: ${p.receiptNumber}` : ''})
                            </div>
                            <div style="color: #6b7280;">
                              ${new Date(p.date || p.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    ` : ''}
                  </td>
                  <td style="vertical-align: top;">${new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td style="vertical-align: top;">
                    <span style="font-weight: bold; color: ${inv.status === 'PAID' ? '#059669' : '#dc2626'};">
                      ${inv.status}
                    </span>
                  </td>
                  <td style="font-weight: 700; vertical-align: top;">₹${inv.amount.toLocaleString()}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Eazzio-School Management System Portal Report. All calculations based on student fee Cycle preference preference configurations.</p>
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

  const loadData = async (showBlocker = true) => {
    try {
      if (showBlocker) setLoading(true);
      setError('');
      
      // Load summary for student fees list
      const summaryResponse = await api.get('/accountant/dashboard-summary');
      if (summaryResponse.data && summaryResponse.data.data) {
        setStudentsFeesList(summaryResponse.data.data.studentsFeesList || []);
      } else if (summaryResponse.data && summaryResponse.data.studentsFeesList) {
        setStudentsFeesList(summaryResponse.data.studentsFeesList);
      }

      // Load classes
      const classesResponse = await api.get('/accountant/classes');
      if (classesResponse.data && classesResponse.data.success) {
        setClasses(classesResponse.data.data || classesResponse.data);
      } else if (Array.isArray(classesResponse.data)) {
        setClasses(classesResponse.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load administrative financials. Check connection.');
    } finally {
      if (showBlocker) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch detailed student invoices when viewing a student
  useEffect(() => {
    if (viewingStudent) {
      const fetchStudentInvoices = async () => {
        try {
          setLoadingStudentInvoices(true);
          const response = await api.get(`/accountant/invoices?studentId=${viewingStudent.id}`);
          if (response.data) {
            setStudentInvoices(Array.isArray(response.data) ? response.data : (response.data.data || []));
          }
        } catch (err) {
          console.error('Error fetching student invoices:', err);
        } finally {
          setLoadingStudentInvoices(false);
        }
      };
      fetchStudentInvoices();
    } else {
      setStudentInvoices([]);
    }
  }, [viewingStudent]);

  useEffect(() => {
    if (showModal || viewingStudent || editingStudent || recordingPaymentForInvoice) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal, viewingStudent, editingStudent, recordingPaymentForInvoice]);

  const parseCSV = (text) => {
    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push("");
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
        lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }

    if (lines.length < 2) return [];

    const headers = lines[0].map(h => h.trim().replace(/^["']|["']$/g, ''));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.length !== headers.length) continue; // Skip malformed rows
      
      const obj = {};
      let hasData = false;
      for (let j = 0; j < headers.length; j++) {
        const val = line[j].trim().replace(/^["']|["']$/g, '');
        obj[headers[j]] = val;
        if (val) hasData = true;
      }
      if (hasData) {
        result.push(obj);
      }
    }
    return result;
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setProcessing(true);
    setProcessingMessage('Importing CSV and parsing student records...');
    setError('');
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const parsedData = parseCSV(text);

        if (parsedData.length === 0) {
          setError('No valid student data found in the CSV file.');
          setProcessing(false);
          setImporting(false);
          return;
        }

        const firstRow = parsedData[0];
        const hasName = Object.keys(firstRow).some(key => key.toLowerCase() === 'name');
        if (!hasName) {
          setError('CSV file must contain a "name" column.');
          setProcessing(false);
          setImporting(false);
          return;
        }

        const response = await api.post('/accountant/students/bulk', { students: parsedData });
        if (response.data) {
          const ids = response.data.importedStudentIds || [];
          setImportResult({
            success: true,
            message: response.data.message || 'Import completed',
            importedCount: response.data.importedCount || 0,
            skippedCount: response.data.skippedCount || 0,
            skippedRows: response.data.skippedRows || [],
            importedStudentIds: ids
          });
          setLastImportedStudentIds(ids);
          localStorage.setItem('lastImportedStudentIds', JSON.stringify(ids));
          showToast('CSV data imported successfully!');
          
          setProcessingMessage('Refreshing student roster...');
          await loadData(false); // wait until data is fully loaded
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || 'Failed to import CSV. Please check formatting.');
      } finally {
        setProcessing(false);
        setImporting(false);
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      setError('Error reading the CSV file.');
      setProcessing(false);
      setImporting(false);
    };

    reader.readAsText(file);
  };

  const handleRevertImport = async () => {
    if (!lastImportedStudentIds || lastImportedStudentIds.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete all ${lastImportedStudentIds.length} newly imported students?`)) {
      return;
    }

    try {
      setError('');
      setProcessing(true);
      setProcessingMessage('Reverting CSV import and removing student accounts...');
      const response = await api.post('/accountant/students/bulk-delete', {
        studentIds: lastImportedStudentIds
      });
      if (response.data) {
        showToast('Import reverted and students deleted successfully!');
        setLastImportedStudentIds([]);
        localStorage.removeItem('lastImportedStudentIds');
        setImportResult(null);
        
        setProcessingMessage('Refreshing student roster...');
        await loadData(false); // reload data
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to revert CSV import. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete ${studentName}? This will permanently remove all their records.`)) {
      return;
    }

    try {
      setError('');
      setProcessing(true);
      setProcessingMessage(`Deleting student profile for ${studentName}...`);
      const response = await api.delete(`/accountant/students/${studentId}`);
      if (response.data) {
        setStudentsFeesList(prev => prev.filter(s => s.id !== studentId));
        showToast(`${studentName} deleted successfully!`);
        
        setProcessingMessage('Refreshing student roster...');
        await loadData(false); // background sync
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to delete student. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setProcessing(true);
      setProcessingMessage('Creating new student profile...');
      const response = await api.post('/accountant/students', formData);
      if (response.data) {
        showToast('New student added successfully!');
        setShowModal(false);
        setFormData({
          name: '',
          rollNumber: '',
          classId: '',
          fatherName: '',
          motherName: '',
          phone: '',
          address: '',
          admissionDate: '',
          feeCycle: 'MONTHLY'
        });
        
        setProcessingMessage('Refreshing student roster...');
        await loadData(false); // reload
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to add student. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const startEditing = (student) => {
    setEditingStudent(student);
    setEditFormData({
      name: student.name || '',
      rollNumber: student.rollNumber === 'N/A' ? '' : (student.rollNumber || ''),
      classId: student.classId || '',
      fatherName: student.fatherName === 'N/A' ? '' : (student.fatherName || ''),
      motherName: student.motherName === 'N/A' ? '' : (student.motherName || ''),
      phone: student.phone === 'N/A' ? '' : (student.phone || ''),
      address: student.address === 'N/A' ? '' : (student.address || ''),
      admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : '',
      feeCycle: student.feeCycle || 'MONTHLY'
    });
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setProcessing(true);
      setProcessingMessage('Saving student details changes...');
      const response = await api.put(`/accountant/students/${editingStudent.id}`, editFormData);
      if (response.data) {
        setEditingStudent(null);
        showToast('Student details updated successfully!');
        
        setProcessingMessage('Refreshing student roster...');
        await loadData(false); // reload
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update student. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setProcessing(true);
      setProcessingMessage('Recording student fee payment...');
      const response = await api.post('/accountant/payments', {
        feeInvoiceId: recordingPaymentForInvoice.id,
        amount: paymentFormData.amount,
        paymentMethod: paymentFormData.paymentMethod,
        receiptNumber: paymentFormData.receiptNumber
      });

      if (response.data) {
        showToast('Payment recorded successfully!');
        setRecordingPaymentForInvoice(null);
        setPaymentFormData({ amount: '', paymentMethod: 'CASH', receiptNumber: '' });
        
        setProcessingMessage('Refreshing transaction history...');
        await loadData(false);
        
        if (viewingStudent) {
          const res = await api.get(`/accountant/invoices?studentId=${viewingStudent.id}`);
          if (res.data) {
            setStudentInvoices(Array.isArray(res.data) ? res.data : (res.data.data || []));
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to record payment.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Loader message="Loading students list..." />;

  // Get unique sessions from classes
  const sessionsList = [...new Set(classes.map(c => c.academicYear))].filter(Boolean);

  // Filter students based on Class, Session, and Search Query
  const filteredStudentsList = studentsFeesList.filter((student) => {
    const matchesClass = selectedClassId === '' || Number(student.classId) === Number(selectedClassId);
    const matchesSession = selectedSession === '' || student.academicYear === selectedSession;
    const matchesSearch = searchQuery === '' || 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSession && matchesSearch;
  });

  // Sort by roll number numerically. If roll number is N/A or empty, put it at the end.
  const sortedStudentsList = [...filteredStudentsList].sort((a, b) => {
    const rollA = !a.rollNumber || a.rollNumber === 'N/A' ? Infinity : parseInt(a.rollNumber, 10);
    const rollB = !b.rollNumber || b.rollNumber === 'N/A' ? Infinity : parseInt(b.rollNumber, 10);
    
    if (isNaN(rollA) && isNaN(rollB)) {
      return String(a.rollNumber).localeCompare(String(b.rollNumber));
    }
    if (isNaN(rollA)) return 1;
    if (isNaN(rollB)) return -1;
    return rollA - rollB;
  });

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.headerRow}>
        <div>
          <h2>🎒 Students & Enrollment</h2>
          <p style={styles.sub}>Manage student records, CSV imports, class allocations, and billing status.</p>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 20px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--danger)',
          color: 'var(--danger)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.9rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {importResult && (
        <div style={{
          padding: '16px 20px',
          background: 'rgba(5, 150, 105, 0.1)',
          border: '1px solid var(--success)',
          color: 'var(--text-primary)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.9rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>
              ✅ {importResult.message}
            </span>
            <button 
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem' }}
              onClick={() => setImportResult(null)}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Imported: <strong>{importResult.importedCount}</strong> | Skipped: <strong>{importResult.skippedCount}</strong>
            </span>
            {importResult.importedStudentIds && importResult.importedStudentIds.length > 0 && (
              <button 
                onClick={handleRevertImport}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--danger)',
                  color: 'var(--danger)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                🗑️ Revert Import (Delete these students)
              </button>
            )}
          </div>
          {importResult.skippedRows.length > 0 && (
            <div style={{ maxHeight: '100px', overflowY: 'auto', marginTop: '6px', fontSize: '0.8rem', color: 'var(--danger)' }}>
              Skipped Rows Detail:
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                {importResult.skippedRows.map((row, idx) => (
                  <li key={idx}>Row {row.index}: {row.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Section */}
      <div style={styles.filterSection}>
        <div style={styles.filterGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Class Filter</label>
            <select
              style={styles.selectInput}
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.className} - {cls.section}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Academic Session</label>
            <select
              style={styles.selectInput}
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
            >
              <option value="">All Sessions</option>
              {sessionsList.map((session) => (
                <option key={session} value={session}>
                  {session}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Search Student</label>
            <input
              type="text"
              placeholder="Search name or ID..."
              style={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        margin: '12px 0',
        flexWrap: 'wrap'
      }}>
        <label style={{
          ...styles.addBtn,
          background: 'linear-gradient(135deg, var(--success), #34d399)',
          borderColor: 'var(--success)',
          cursor: 'pointer',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 4px 15px rgba(5, 150, 105, 0.3)'
        }}>
          📁 {importing ? 'Importing...' : 'Bulk Import (CSV)'}
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleCSVUpload}
            disabled={importing}
          />
        </label>

        {lastImportedStudentIds && lastImportedStudentIds.length > 0 && (
          <button 
            onClick={handleRevertImport}
            style={{
              ...styles.addBtn,
              background: 'linear-gradient(135deg, var(--danger), #f87171)',
              borderColor: 'var(--danger)',
              cursor: 'pointer',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
            }}
          >
            🗑️ Delete CSV (Revert Import)
          </button>
        )}

        <button style={styles.addBtn} onClick={() => setShowModal(true)}>
          ➕ Add New Student
        </button>
      </div>

      {/* Student Fees Status Panel */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>🎒 Student Fees & Academic Details</h3>
          <span style={styles.recordCounter}>{filteredStudentsList.length} Students found</span>
        </div>
        <div style={styles.tableContainer}>
          {filteredStudentsList.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0, padding: '20px', textAlign: 'center' }}>
              No students match the selected filters.
            </p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Student Name</th>
                  <th style={styles.th}>Roll No</th>
                  <th style={styles.th}>Class</th>
                  <th style={styles.th}>Session</th>
                  <th style={styles.th}>Total Fees</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudentsList.map((student) => {
                  return (
                    <tr key={student.id} style={styles.tr}>
                      <td style={{ ...styles.td, color: 'var(--text-primary)', fontWeight: '600' }}>
                        {student.name}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 'normal', marginTop: '2px' }}>
                          {student.studentId}
                        </span>
                      </td>
                      <td style={styles.td}>{student.rollNumber}</td>
                      <td style={styles.td}>{student.className}</td>
                      <td style={styles.td}>{student.academicYear || 'N/A'}</td>
                      <td style={styles.td}>₹{student.totalFees.toLocaleString()}</td>
                      <td style={{ ...styles.td }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          <button 
                            style={styles.detailsLink} 
                            onClick={() => setViewingStudent(student)}
                          >
                            👁️ More Details
                          </button>
                          <button 
                            style={{
                              ...styles.detailsLink,
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid var(--danger)',
                              color: 'var(--danger)',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s'
                            }}
                            onClick={() => handleDeleteStudent(student.id, student.name)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Student Modal */}
      {showModal && createPortal(
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="animate-scale-up">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>➕ Add New Student</h3>
              <button style={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleAddStudent} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Name *</label>
                  <input
                    type="text"
                    required
                    style={styles.input}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter student name"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Roll Number</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    placeholder="e.g. 101"
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Class *</label>
                  <select
                    required
                    style={styles.input}
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  >
                    <option value="">Select a Class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.className} - {cls.section} ({cls.academicYear})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Admission Date</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={formData.admissionDate}
                    onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                  />
                </div>
              </div>

              {(() => {
                const selectedCourseForAdd = classes.find(c => c.id.toString() === formData.classId.toString());
                const feeBreakdownForAdd = calculateFeeBreakdown(selectedCourseForAdd);
                if (!selectedCourseForAdd) return null;
                return (
                  <div style={{
                    gridColumn: 'span 2',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '10px',
                    padding: '14px',
                    marginTop: '8px',
                    marginBottom: '14px',
                  }}>
                    {(() => {
                      const calculatedTotal = selectedCourseForAdd.feesList ? selectedCourseForAdd.feesList.reduce((sum, fee) => {
                        let calculatedAmount = fee.amount;
                        if (fee.planType) {
                          const cycle = formData.feeCycle || 'MONTHLY';
                          if (cycle === 'MONTHLY') {
                            calculatedAmount = feeBreakdownForAdd.tuition.monthly;
                          } else if (cycle === 'QUARTERLY') {
                            calculatedAmount = feeBreakdownForAdd.tuition.quarterly;
                          } else if (cycle === 'HALF_YEARLY') {
                            calculatedAmount = feeBreakdownForAdd.tuition.halfYearly;
                          } else if (cycle === 'YEARLY') {
                            calculatedAmount = feeBreakdownForAdd.tuition.yearly;
                          } else if (cycle === 'ONE_TIME') {
                            calculatedAmount = feeBreakdownForAdd.tuition.oneTime;
                          }
                        }
                        return sum + calculatedAmount;
                      }, 0) : 0;

                      return (
                        <>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>💰 Course Fees Configured ({selectedCourseForAdd.className})</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                              Total: ₹{calculatedTotal.toLocaleString()}
                            </span>
                          </h4>

                          {/* List of individual fee structures */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                            {selectedCourseForAdd.feesList && selectedCourseForAdd.feesList.map(fee => {
                              let calculatedAmount = fee.amount;
                              let displayPlanType = fee.planType ? fee.planType.toLowerCase().replace('_', ' ') : 'one-time';
                              if (fee.planType) {
                                const cycle = formData.feeCycle || 'MONTHLY';
                                if (cycle === 'MONTHLY') {
                                  calculatedAmount = feeBreakdownForAdd.tuition.monthly;
                                } else if (cycle === 'QUARTERLY') {
                                  calculatedAmount = feeBreakdownForAdd.tuition.quarterly;
                                } else if (cycle === 'HALF_YEARLY') {
                                  calculatedAmount = feeBreakdownForAdd.tuition.halfYearly;
                                } else if (cycle === 'YEARLY') {
                                  calculatedAmount = feeBreakdownForAdd.tuition.yearly;
                                } else if (cycle === 'ONE_TIME') {
                                  calculatedAmount = feeBreakdownForAdd.tuition.oneTime;
                                }
                                displayPlanType = cycle.toLowerCase().replace('_', ' ');
                              }
                              return (
                                <div key={fee.id} style={{
                                  padding: '6px 12px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid var(--glass-border)',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>{fee.feeType}:</span>
                                  <strong style={{ color: 'var(--text-primary)' }}>₹{calculatedAmount.toLocaleString()}</strong>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                    ({displayPlanType})
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}

                    {/* Fee cycle estimations */}
                    {feeBreakdownForAdd ? (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Calculate tuition installment cycles:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                          {[
                            { key: 'MONTHLY', label: 'Monthly', value: feeBreakdownForAdd.tuition.monthly },
                            { key: 'QUARTERLY', label: 'Quarterly', value: feeBreakdownForAdd.tuition.quarterly },
                            { key: 'HALF_YEARLY', label: 'Half-Yearly', value: feeBreakdownForAdd.tuition.halfYearly },
                            { key: 'YEARLY', label: 'Yearly', value: feeBreakdownForAdd.tuition.yearly },
                            { key: 'ONE_TIME', label: 'One-time', value: feeBreakdownForAdd.tuition.oneTime },
                          ].map(item => {
                            const isSelected = formData.feeCycle === item.key;
                            return (
                              <div key={item.key} style={{
                                padding: '10px 8px',
                                background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.01)',
                                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isSelected ? '0 0 10px rgba(139, 92, 246, 0.2)' : 'none'
                              }}
                              onClick={() => setFormData({ ...formData, feeCycle: item.key })}
                              >
                                <span style={{ fontSize: '0.65rem', color: isSelected ? 'var(--primary)' : 'var(--text-secondary)', display: 'block', fontWeight: 'bold', pointerEvents: 'none' }}>{item.label}</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'block', marginTop: '4px', pointerEvents: 'none' }}>₹{item.value.toLocaleString()}</span>
                              </div>
                            );
                          })}
                        </div>
                        {feeBreakdownForAdd.otherTotal > 0 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic', textAlign: 'right' }}>
                            * Note: One-time/other fees of ₹{feeBreakdownForAdd.otherTotal.toLocaleString()} will apply separately.
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No tuition fee configured for this course yet.</span>
                    )}
                  </div>
                );
              })()}

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Father's Name</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    placeholder="Father's name"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Mother's Name</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.motherName}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    placeholder="Mother's name"
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    style={styles.input}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Contact number"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Address</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Residential address"
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fee Payment Cycle *</label>
                  <select
                    required
                    style={styles.input}
                    value={formData.feeCycle}
                    onChange={(e) => setFormData({ ...formData, feeCycle: e.target.value })}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half-Yearly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
                <div style={styles.formGroup} />
              </div>

              <div style={styles.formActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Student Details Modal */}
      {viewingStudent && createPortal(
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="animate-scale-up">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>👤 Student Profile Details</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  style={{ ...styles.detailsLink, borderColor: '#059669', color: '#fff', background: '#059669', margin: 0 }} 
                  onClick={() => downloadStudentPDF(viewingStudent, studentInvoices)}
                >
                  📄 Download PDF
                </button>
                <button 
                  style={{ ...styles.detailsLink, borderColor: 'var(--primary)', color: '#fff', background: 'var(--primary)', margin: 0 }} 
                  onClick={() => {
                    const studentToEdit = viewingStudent;
                    setViewingStudent(null);
                    startEditing(studentToEdit);
                  }}
                >
                  ✏️ Edit details
                </button>
                <button style={styles.closeBtn} onClick={() => setViewingStudent(null)}>✕</button>
              </div>
            </div>
            
            <div style={styles.profileDetailsContainer}>
              <div style={styles.profileHeader}>
                <div style={styles.bigAvatar}>
                  {viewingStudent.name ? viewingStudent.name[0].toUpperCase() : 'S'}
                </div>
                <div>
                  <h4 style={styles.profileName}>{viewingStudent.name}</h4>
                  <span style={styles.profileId}>{viewingStudent.studentId}</span>
                </div>
              </div>

              <div style={styles.detailsGrid}>
                <div style={styles.detailsItem}>
                  <span style={styles.detailsLabel}>Roll Number</span>
                  <span style={styles.detailsVal}>{viewingStudent.rollNumber}</span>
                </div>
                <div style={styles.detailsItem}>
                  <span style={styles.detailsLabel}>Class</span>
                  <span style={styles.detailsVal}>{viewingStudent.className}</span>
                </div>
                <div style={styles.detailsItem}>
                  <span style={styles.detailsLabel}>Session</span>
                  <span style={styles.detailsVal}>{viewingStudent.academicYear}</span>
                </div>
                <div style={styles.detailsItem}>
                  <span style={styles.detailsLabel}>Date of Admission</span>
                  <span style={styles.detailsVal}>
                    {viewingStudent.admissionDate ? new Date(viewingStudent.admissionDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div style={styles.detailsItem}>
                  <span style={styles.detailsLabel}>Father's Name</span>
                  <span style={styles.detailsVal}>{viewingStudent.fatherName}</span>
                </div>
                <div style={styles.detailsItem}>
                  <span style={styles.detailsLabel}>Mother's Name</span>
                  <span style={styles.detailsVal}>{viewingStudent.motherName}</span>
                </div>
                <div style={styles.detailsItem}>
                  <span style={styles.detailsLabel}>Phone Number</span>
                  <span style={styles.detailsVal}>{viewingStudent.phone}</span>
                </div>
                <div style={styles.detailsItem}>
                  <span style={styles.detailsLabel}>Address</span>
                  <span style={styles.detailsVal}>{viewingStudent.address}</span>
                </div>
                <div style={styles.detailsItem}>
                  <span style={styles.detailsLabel}>Payment Cycle Preference</span>
                  <span style={{ ...styles.detailsVal, textTransform: 'capitalize' }}>
                    {(viewingStudent.feeCycle || 'MONTHLY').toLowerCase().replace('_', ' ')}
                  </span>
                </div>
              </div>

              {(() => {
                const selectedCourseForView = classes.find(c => c.id.toString() === (viewingStudent.classId || viewingStudent.courseId || '').toString());
                const feeBreakdownForView = calculateFeeBreakdown(selectedCourseForView);
                if (!selectedCourseForView) return null;
                return (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '10px',
                    padding: '14px',
                    marginTop: '20px',
                  }}>
                    {(() => {
                      const cycle = (viewingStudent.feeCycle || 'MONTHLY').toUpperCase();
                      const calculatedTotal = selectedCourseForView.feesList ? selectedCourseForView.feesList.reduce((sum, fee) => {
                        let calculatedAmount = fee.amount;
                        if (fee.planType) {
                          if (cycle === 'MONTHLY') {
                            calculatedAmount = feeBreakdownForView.tuition.monthly;
                          } else if (cycle === 'QUARTERLY') {
                            calculatedAmount = feeBreakdownForView.tuition.quarterly;
                          } else if (cycle === 'HALF_YEARLY') {
                            calculatedAmount = feeBreakdownForView.tuition.halfYearly;
                          } else if (cycle === 'YEARLY') {
                            calculatedAmount = feeBreakdownForView.tuition.yearly;
                          } else if (cycle === 'ONE_TIME') {
                            calculatedAmount = feeBreakdownForView.tuition.oneTime;
                          }
                        }
                        return sum + calculatedAmount;
                      }, 0) : 0;

                      return (
                        <>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>💰 Course Fees Configured ({selectedCourseForView.className})</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                              Total: ₹{calculatedTotal.toLocaleString()}
                            </span>
                          </h4>

                          {/* List of individual fee structures */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                            {selectedCourseForView.feesList && selectedCourseForView.feesList.map(fee => {
                              let calculatedAmount = fee.amount;
                              let displayPlanType = fee.planType ? fee.planType.toLowerCase().replace('_', ' ') : 'one-time';
                              if (fee.planType) {
                                if (cycle === 'MONTHLY') {
                                  calculatedAmount = feeBreakdownForView.tuition.monthly;
                                } else if (cycle === 'QUARTERLY') {
                                  calculatedAmount = feeBreakdownForView.tuition.quarterly;
                                } else if (cycle === 'HALF_YEARLY') {
                                  calculatedAmount = feeBreakdownForView.tuition.halfYearly;
                                } else if (cycle === 'YEARLY') {
                                  calculatedAmount = feeBreakdownForView.tuition.yearly;
                                } else if (cycle === 'ONE_TIME') {
                                  calculatedAmount = feeBreakdownForView.tuition.oneTime;
                                }
                                displayPlanType = cycle.toLowerCase().replace('_', ' ');
                              }
                              return (
                                <div key={fee.id} style={{
                                  padding: '6px 12px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid var(--glass-border)',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>{fee.feeType}:</span>
                                  <strong style={{ color: 'var(--text-primary)' }}>₹{calculatedAmount.toLocaleString()}</strong>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                    ({displayPlanType})
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}

                    {/* Fee cycle preference estimation */}
                    {feeBreakdownForView && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Preference cycle amount:
                        </div>
                        {(() => {
                          const cycle = (viewingStudent.feeCycle || 'MONTHLY').toUpperCase();
                          let cycleLabel = 'Monthly';
                          let cycleVal = feeBreakdownForView.tuition.monthly;
                          if (cycle === 'QUARTERLY') {
                            cycleLabel = 'Quarterly';
                            cycleVal = feeBreakdownForView.tuition.quarterly;
                          } else if (cycle === 'HALF_YEARLY') {
                            cycleLabel = 'Half-Yearly';
                            cycleVal = feeBreakdownForView.tuition.halfYearly;
                          } else if (cycle === 'YEARLY') {
                            cycleLabel = 'Yearly';
                            cycleVal = feeBreakdownForView.tuition.yearly;
                          } else if (cycle === 'ONE_TIME') {
                            cycleLabel = 'One-time';
                            cycleVal = feeBreakdownForView.tuition.oneTime;
                          }
                          return (
                            <div style={{
                              padding: '10px 12px',
                              background: 'rgba(139, 92, 246, 0.15)',
                              border: '2px solid var(--primary)',
                              borderRadius: '8px',
                              display: 'inline-block',
                              textAlign: 'center',
                            }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--primary)', display: 'block', fontWeight: 'bold' }}>{cycleLabel} installment</span>
                              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'block', marginTop: '4px' }}>₹{cycleVal.toLocaleString()}</span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ marginTop: '24px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>💳 Financial Overview</h4>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailsItem}>
                    <span style={styles.detailsLabel}>Total Fees Due</span>
                    <span style={{ ...styles.detailsVal, color: 'var(--text-primary)', fontWeight: 'bold' }}>₹{viewingStudent.totalFees.toLocaleString()}</span>
                  </div>
                  <div style={styles.detailsItem}>
                    <span style={styles.detailsLabel}>Total Fees Paid</span>
                    <span style={{ ...styles.detailsVal, color: 'var(--success)', fontWeight: 'bold' }}>₹{viewingStudent.paid.toLocaleString()}</span>
                  </div>
                  <div style={styles.detailsItem}>
                    <span style={styles.detailsLabel}>Pending Amount</span>
                    <span style={{ ...styles.detailsVal, color: viewingStudent.pending > 0 ? 'var(--warning)' : 'var(--text-secondary)', fontWeight: 'bold' }}>
                      ₹{viewingStudent.pending.toLocaleString()}
                    </span>
                  </div>
                  <div style={styles.detailsItem}>
                    <span style={styles.detailsLabel}>Fee Status</span>
                    <span style={{
                      ...styles.badge,
                      color: viewingStudent.totalFees === 0 
                        ? 'var(--text-secondary)' 
                        : viewingStudent.pending === 0 
                          ? 'var(--success)' 
                          : 'var(--warning)',
                      background: viewingStudent.totalFees === 0 
                        ? 'rgba(255,255,255,0.05)' 
                        : viewingStudent.pending === 0 
                          ? 'var(--success-glow)' 
                          : 'var(--warning-glow)',
                      display: 'inline-block',
                      width: 'fit-content'
                    }}>
                      {viewingStudent.totalFees === 0 
                        ? 'NO FEES' 
                        : viewingStudent.pending === 0 
                          ? 'PAID' 
                          : 'PENDING'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>📄 Detailed Invoices</h4>
                {loadingStudentInvoices ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Loading student invoices...</p>
                ) : studentInvoices.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>No invoices found for this student.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                    {studentInvoices.map((inv) => {
                      const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
                      const pending = Math.max(0, inv.amount - paid);
                      return (
                        <div key={inv.id} style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          padding: '12px 14px',
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '8px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', display: 'block' }}>
                                {inv.feeType}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Total: ₹{inv.amount.toLocaleString()} | Paid: ₹{paid.toLocaleString()} | Due: {new Date(inv.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{
                                ...styles.badge,
                                color: inv.status === 'PAID' ? 'var(--success)' : 'var(--warning)',
                                background: inv.status === 'PAID' ? 'var(--success-glow)' : 'var(--warning-glow)'
                              }}>
                                {inv.status}
                              </span>
                              {inv.status !== 'PAID' && (
                                <button
                                  style={{
                                    ...styles.detailsLink,
                                    borderColor: 'var(--success)',
                                    color: 'var(--success)',
                                    background: 'rgba(5, 150, 105, 0.1)',
                                    padding: '4px 8px',
                                    fontSize: '0.7rem'
                                  }}
                                  onClick={() => {
                                    setRecordingPaymentForInvoice({
                                      ...inv,
                                      student: { name: viewingStudent.name }
                                    });
                                    setPaymentFormData({
                                      amount: pending.toString(),
                                      paymentMethod: 'CASH',
                                      receiptNumber: ''
                                    });
                                  }}
                                >
                                  💵 Pay
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Payment History Log (Sub-rows) */}
                          {inv.payments && inv.payments.length > 0 && (
                            <div style={{
                              marginTop: '4px',
                              paddingTop: '8px',
                              borderTop: '1px dashed var(--glass-border)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                📜 Payment History / Receipts:
                              </div>
                              {inv.payments.map((p, idx) => (
                                <div key={p.id} style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '0.75rem',
                                  padding: '4px 8px',
                                  background: 'rgba(255, 255, 255, 0.01)',
                                  borderRadius: '4px',
                                  borderLeft: '2.5px solid var(--success)'
                                }}>
                                  <div style={{ color: 'var(--text-primary)' }}>
                                    <span>Receipt #{idx + 1}: </span>
                                    <strong style={{ color: 'var(--success)', marginRight: '6px' }}>₹{p.amount.toLocaleString()}</strong>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                      ({p.paymentMethod} {p.receiptNumber ? `| Ref: ${p.receiptNumber}` : ''})
                                    </span>
                                  </div>
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                                    {new Date(p.date || p.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.formActions}>
              <button type="button" style={styles.cancelBtn} onClick={() => setViewingStudent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Student Modal */}
      {editingStudent && createPortal(
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="animate-scale-up">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>✏️ Edit Student Details</h3>
              <button style={styles.closeBtn} onClick={() => setEditingStudent(null)}>✕</button>
            </div>
            
            <form onSubmit={handleEditStudent} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Name *</label>
                  <input
                    type="text"
                    required
                    style={styles.input}
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="Enter student name"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Roll Number</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={editFormData.rollNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, rollNumber: e.target.value })}
                    placeholder="e.g. 101"
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Class *</label>
                  <select
                    required
                    style={styles.input}
                    value={editFormData.classId}
                    onChange={(e) => setEditFormData({ ...editFormData, classId: e.target.value })}
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.className} - {cls.section} ({cls.academicYear})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Date of Admission</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={editFormData.admissionDate}
                    onChange={(e) => setEditFormData({ ...editFormData, admissionDate: e.target.value })}
                  />
                </div>
              </div>

              {(() => {
                const selectedCourseForEdit = classes.find(c => c.id.toString() === editFormData.classId.toString());
                const feeBreakdownForEdit = calculateFeeBreakdown(selectedCourseForEdit);
                if (!selectedCourseForEdit) return null;
                return (
                  <div style={{
                    gridColumn: 'span 2',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '10px',
                    padding: '14px',
                    marginTop: '8px',
                    marginBottom: '14px',
                  }}>
                    {(() => {
                      const calculatedTotal = selectedCourseForEdit.feesList ? selectedCourseForEdit.feesList.reduce((sum, fee) => {
                        let calculatedAmount = fee.amount;
                        if (fee.planType) {
                          const cycle = editFormData.feeCycle || 'MONTHLY';
                          if (cycle === 'MONTHLY') {
                            calculatedAmount = feeBreakdownForEdit.tuition.monthly;
                          } else if (cycle === 'QUARTERLY') {
                            calculatedAmount = feeBreakdownForEdit.tuition.quarterly;
                          } else if (cycle === 'HALF_YEARLY') {
                            calculatedAmount = feeBreakdownForEdit.tuition.halfYearly;
                          } else if (cycle === 'YEARLY') {
                            calculatedAmount = feeBreakdownForEdit.tuition.yearly;
                          } else if (cycle === 'ONE_TIME') {
                            calculatedAmount = feeBreakdownForEdit.tuition.oneTime;
                          }
                        }
                        return sum + calculatedAmount;
                      }, 0) : 0;

                      return (
                        <>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>💰 Course Fees Configured ({selectedCourseForEdit.className})</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                              Total: ₹{calculatedTotal.toLocaleString()}
                            </span>
                          </h4>

                          {/* List of individual fee structures */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                            {selectedCourseForEdit.feesList && selectedCourseForEdit.feesList.map(fee => {
                              let calculatedAmount = fee.amount;
                              let displayPlanType = fee.planType ? fee.planType.toLowerCase().replace('_', ' ') : 'one-time';
                              if (fee.planType) {
                                const cycle = editFormData.feeCycle || 'MONTHLY';
                                if (cycle === 'MONTHLY') {
                                  calculatedAmount = feeBreakdownForEdit.tuition.monthly;
                                } else if (cycle === 'QUARTERLY') {
                                  calculatedAmount = feeBreakdownForEdit.tuition.quarterly;
                                } else if (cycle === 'HALF_YEARLY') {
                                  calculatedAmount = feeBreakdownForEdit.tuition.halfYearly;
                                } else if (cycle === 'YEARLY') {
                                  calculatedAmount = feeBreakdownForEdit.tuition.yearly;
                                } else if (cycle === 'ONE_TIME') {
                                  calculatedAmount = feeBreakdownForEdit.tuition.oneTime;
                                }
                                displayPlanType = cycle.toLowerCase().replace('_', ' ');
                              }
                              return (
                                <div key={fee.id} style={{
                                  padding: '6px 12px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid var(--glass-border)',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>{fee.feeType}:</span>
                                  <strong style={{ color: 'var(--text-primary)' }}>₹{calculatedAmount.toLocaleString()}</strong>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                    ({displayPlanType})
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}

                    {/* Fee cycle estimations */}
                    {feeBreakdownForEdit ? (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Calculate tuition installment cycles:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                          {[
                            { key: 'MONTHLY', label: 'Monthly', value: feeBreakdownForEdit.tuition.monthly },
                            { key: 'QUARTERLY', label: 'Quarterly', value: feeBreakdownForEdit.tuition.quarterly },
                            { key: 'HALF_YEARLY', label: 'Half-Yearly', value: feeBreakdownForEdit.tuition.halfYearly },
                            { key: 'YEARLY', label: 'Yearly', value: feeBreakdownForEdit.tuition.yearly },
                            { key: 'ONE_TIME', label: 'One-time', value: feeBreakdownForEdit.tuition.oneTime },
                          ].map(item => {
                            const isSelected = editFormData.feeCycle === item.key;
                            return (
                              <div key={item.key} style={{
                                padding: '10px 8px',
                                background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.01)',
                                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isSelected ? '0 0 10px rgba(139, 92, 246, 0.2)' : 'none'
                              }}
                              onClick={() => setEditFormData({ ...editFormData, feeCycle: item.key })}
                              >
                                <span style={{ fontSize: '0.65rem', color: isSelected ? 'var(--primary)' : 'var(--text-secondary)', display: 'block', fontWeight: 'bold', pointerEvents: 'none' }}>{item.label}</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'block', marginTop: '4px', pointerEvents: 'none' }}>₹{item.value.toLocaleString()}</span>
                              </div>
                            );
                          })}
                        </div>
                        {feeBreakdownForEdit.otherTotal > 0 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic', textAlign: 'right' }}>
                            * Note: One-time/other fees of ₹{feeBreakdownForEdit.otherTotal.toLocaleString()} will apply separately.
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No tuition fee configured for this course yet.</span>
                    )}
                  </div>
                );
              })()}

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Father's Name</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={editFormData.fatherName}
                    onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })}
                    placeholder="Father's name"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Mother's Name</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={editFormData.motherName}
                    onChange={(e) => setEditFormData({ ...editFormData, motherName: e.target.value })}
                    placeholder="Mother's name"
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    style={styles.input}
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="Contact number"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Address</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    placeholder="Residential address"
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fee Payment Cycle *</label>
                  <select
                    required
                    style={styles.input}
                    value={editFormData.feeCycle}
                    onChange={(e) => setEditFormData({ ...editFormData, feeCycle: e.target.value })}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half-Yearly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
                <div style={styles.formGroup} />
              </div>

              <div style={styles.formActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setEditingStudent(null)}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Record Fee Payment Modal */}
      {recordingPaymentForInvoice && createPortal(
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="animate-scale-up">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>💵 Record Fee Payment</h3>
              <button style={styles.closeBtn} onClick={() => setRecordingPaymentForInvoice(null)}>✕</button>
            </div>

            <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Student: <strong style={{ color: 'var(--text-primary)' }}>{recordingPaymentForInvoice.student?.name}</strong>
              </p>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Fee Type: <strong style={{ color: 'var(--text-primary)' }}>{recordingPaymentForInvoice.feeType}</strong>
              </p>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Invoice Amount: <strong style={{ color: 'var(--text-primary)' }}>₹{recordingPaymentForInvoice.amount.toLocaleString()}</strong>
              </p>
            </div>

            <form onSubmit={handleRecordPayment} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Payment Method *</label>
                <select
                  style={styles.input}
                  value={paymentFormData.paymentMethod}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NetBanking</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Amount Paid (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  style={styles.input}
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  onWheel={(e) => e.target.blur()}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Receipt Number / Transaction ID</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="Optional reference number"
                  value={paymentFormData.receiptNumber}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, receiptNumber: e.target.value })}
                />
              </div>

              <div style={styles.formActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setRecordingPaymentForInvoice(null)}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {processing && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100000,
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '3px solid rgba(139, 92, 246, 0.1)',
            borderTop: '3px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}></div>
          <p style={{
            color: '#fff',
            fontSize: '1rem',
            fontWeight: '600',
            margin: 0,
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}>{processingMessage}</p>
        </div>,
        document.body
      )}

      {toast.show && createPortal(
        <div style={{
          position: 'fixed',
          top: '32px',
          right: '32px',
          backgroundColor: '#111827',
          border: `1px solid ${toast.type === 'success' ? '#10b981' : '#f87171'}`,
          borderRadius: '8px',
          padding: '16px 24px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          zIndex: 999999,
        }}>
          <span style={{ fontSize: '1.25rem' }}>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{toast.message}</span>
        </div>,
        document.body
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '10px'
  },
  sub: {
    color: 'var(--text-secondary)',
    margin: '4px 0 0 0',
  },
  panel: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '12px',
  },
  panelTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0
  },
  recordCounter: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--text-muted)'
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '2px solid var(--glass-border)',
  },
  th: {
    color: 'var(--text-secondary)',
    padding: '12px 14px',
    fontWeight: '600',
    fontSize: '0.82rem',
  },
  td: {
    padding: '14px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--glass-border)',
    fontSize: '0.82rem',
  },
  tr: {
    transition: 'var(--transition-fast)',
    hover: {
      backgroundColor: 'rgba(255, 255, 255, 0.02)'
    }
  },
  badge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.72rem',
    fontWeight: '700',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '28px',
    width: '90%',
    maxWidth: '650px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
    maxHeight: '90vh',
    overflowY: 'auto',
    margin: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '12px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '1.2rem',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formRow: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  formGroup: {
    flex: '1',
    minWidth: '220px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  input: {
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '15px',
    borderTop: '1px solid var(--glass-border)',
    paddingTop: '16px',
  },
  cancelBtn: {
    padding: '10px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  submitBtn: {
    padding: '10px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--primary)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
    boxShadow: '0 4px 15px rgba(110, 68, 255, 0.3)',
  },
  detailsLink: {
    background: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text-primary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 12px',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  profileDetailsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginTop: '10px',
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '16px',
  },
  bigAvatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'var(--primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '1.4rem',
    boxShadow: '0 4px 12px rgba(110, 68, 255, 0.25)',
  },
  profileName: {
    fontSize: '1.15rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
  },
  profileId: {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  detailsItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailsLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.04em',
  },
  detailsVal: {
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
  filterSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '20px',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '20px 24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
  filterGrid: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    flex: 1
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '180px',
    flex: 1
  },
  filterLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  selectInput: {
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
  },
  searchInput: {
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
  },
  addBtn: {
    background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '11px 22px',
    fontWeight: '700',
    fontSize: '0.85rem',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(110, 68, 255, 0.3)',
    height: '42px',
    display: 'flex',
    alignItems: 'center'
  }
};
