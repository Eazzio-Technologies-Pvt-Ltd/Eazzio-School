import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import Loader from '../../components/Loader';
import api from '../../api/axios';

export default function AccountantDashboard() {
  const { logout, user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [data, setData] = useState({
    totalCollections: 0,
    pendingFees: 0,
    activeInvoices: 0,
    recentPayments: [],
    studentsFeesList: []
  });

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
    admissionDate: ''
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    rollNumber: '',
    classId: '',
    fatherName: '',
    motherName: '',
    phone: '',
    address: '',
    admissionDate: ''
  });

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
      admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : ''
    });
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const response = await api.put(`/accountant/students/${editingStudent.id}`, editFormData);
      if (response.data) {
        const updatedStudent = response.data;
        setData(prev => {
          const newList = prev.studentsFeesList.map(s => {
            if (s.id === updatedStudent.id) {
              const matchedClass = classes.find(c => c.id === updatedStudent.classId);
              return {
                ...s,
                name: updatedStudent.name,
                rollNumber: updatedStudent.rollNumber || 'N/A',
                fatherName: updatedStudent.fatherName || 'N/A',
                motherName: updatedStudent.motherName || 'N/A',
                phone: updatedStudent.phone || 'N/A',
                address: updatedStudent.address || 'N/A',
                admissionDate: updatedStudent.admissionDate || null,
                classId: updatedStudent.classId,
                className: matchedClass ? `${matchedClass.className}-${matchedClass.section}` : 'N/A',
                academicYear: matchedClass ? matchedClass.academicYear : 'N/A'
              };
            }
            return s;
          });
          return { ...prev, studentsFeesList: newList };
        });

        setEditingStudent(null);
        showToast('Student details updated successfully!');
        loadData(false); // background sync
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update student. Please try again.');
    }
  };

  const [showSecurityBanner, setShowSecurityBanner] = useState(
    localStorage.getItem('showSecurityBanner') !== 'false'
  );

  const [lastImportedStudentIds, setLastImportedStudentIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lastImportedStudentIds')) || [];
    } catch (e) {
      return [];
    }
  });

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

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
    setError('');
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const parsedData = parseCSV(text);

        if (parsedData.length === 0) {
          setError('No valid student data found in the CSV file.');
          setImporting(false);
          return;
        }

        const firstRow = parsedData[0];
        const hasName = Object.keys(firstRow).some(key => key.toLowerCase() === 'name');
        if (!hasName) {
          setError('CSV file must contain a "name" column.');
          setImporting(false);
          return;
        }

        const response = await api.post('/accountant/students/bulk', { students: parsedData });
        if (response.data && response.data.success) {
          const ids = response.data.importedStudentIds || [];
          setImportResult({
            success: true,
            message: response.data.message,
            importedCount: response.data.importedCount,
            skippedCount: response.data.skippedCount,
            skippedRows: response.data.skippedRows || [],
            importedStudentIds: ids
          });
          setLastImportedStudentIds(ids);
          localStorage.setItem('lastImportedStudentIds', JSON.stringify(ids));
          showToast('CSV data imported successfully!');
          loadData(false); // reload students list
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || 'Failed to import CSV. Please check formatting.');
      } finally {
        setImporting(false);
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      setError('Error reading the CSV file.');
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
      const response = await api.post('/accountant/students/bulk-delete', {
        studentIds: lastImportedStudentIds
      });
      if (response.data) {
        showToast('Import reverted and students deleted successfully!');
        setLastImportedStudentIds([]);
        localStorage.removeItem('lastImportedStudentIds');
        setImportResult(null);
        loadData(false); // reload data
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to revert CSV import. Please try again.');
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete ${studentName}? This will permanently remove all their records.`)) {
      return;
    }

    try {
      setError('');
      const response = await api.delete(`/accountant/students/${studentId}`);
      if (response.data) {
        setData(prev => ({
          ...prev,
          studentsFeesList: prev.studentsFeesList.filter(s => s.id !== studentId)
        }));
        showToast(`${studentName} deleted successfully!`);
        loadData(false); // background sync
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to delete student. Please try again.');
    }
  };

  const loadData = async (showBlocker = true) => {
    try {
      if (showBlocker) setLoading(true);
      setError('');
      const response = await api.get('/accountant/dashboard-summary');
      if (response.data) {
        setData(response.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load administrative financials. Check connection.');
    } finally {
      if (showBlocker) setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const response = await api.get('/accountant/classes');
      if (response.data) {
        setClasses(response.data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const response = await api.post('/accountant/students', formData);
      if (response.data) {
        const newStudent = response.data;
        setData(prev => {
          const matchedClass = classes.find(c => c.id === newStudent.classId);
          const studentWithFees = {
            id: newStudent.id,
            studentId: newStudent.studentId,
            name: newStudent.name,
            rollNumber: newStudent.rollNumber || 'N/A',
            className: matchedClass ? `${matchedClass.className}-${matchedClass.section}` : 'N/A',
            classId: newStudent.classId,
            academicYear: matchedClass ? matchedClass.academicYear : 'N/A',
            fatherName: newStudent.fatherName || 'N/A',
            motherName: newStudent.motherName || 'N/A',
            phone: newStudent.phone || 'N/A',
            address: newStudent.address || 'N/A',
            admissionDate: newStudent.admissionDate || null,
            totalFees: 0,
            paid: 0,
            pending: 0
          };
          return {
            ...prev,
            studentsFeesList: [studentWithFees, ...prev.studentsFeesList]
          };
        });

        setShowModal(false);
        showToast('New student added successfully!');
        setFormData({
          name: '',
          rollNumber: '',
          classId: '',
          fatherName: '',
          motherName: '',
          phone: '',
          address: '',
          admissionDate: ''
        });
        loadData(false); // background sync
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to add student. Please try again.');
    }
  };

  useEffect(() => {
    loadData();
    loadClasses();
  }, []);

  useEffect(() => {
    if (showModal || viewingStudent || editingStudent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal, viewingStudent, editingStudent]);

  if (loading) {
    return (
      <div style={styles.container}>
        <style>{`
          aside, header {
            display: none !important;
          }
          main {
            padding: 0 !important;
            max-width: 100% !important;
          }
        `}</style>
        <Loader message="Loading accountant workspace..." />
      </div>
    );
  }

  // Get unique sessions from classes
  const sessionsList = [...new Set(classes.map(c => c.academicYear))].filter(Boolean);

  // Filter students based on Class, Session, and Search Query
  const filteredStudentsList = data.studentsFeesList.filter((student) => {
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

  // Calculate dynamic stats based on filtered list
  const filteredCollections = filteredStudentsList.reduce((sum, s) => sum + s.paid, 0);
  const filteredPending = filteredStudentsList.reduce((sum, s) => sum + s.pending, 0);
  const filteredActiveInvoices = filteredStudentsList.filter(s => s.totalFees > 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', backgroundColor: 'var(--bg-main)' }} className="animate-fade-in">
      {/* Global CSS Overrides to hide Sidebar and default Header */}
      <style>{`
        aside, header {
          display: none !important;
        }
        /* Make sure container covers the full screen */
        main {
          padding: 0 !important;
          max-width: 100% !important;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {showSecurityBanner && (
        <div style={{
          background: '#090d16',
          color: '#94a3b8',
          fontSize: '0.85rem',
          fontWeight: '500',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          borderBottom: '1px solid #1e293b',
          textAlign: 'center',
          zIndex: 100,
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1rem' }}>🔒</span>
            <span style={{ color: '#e2e8f0', letterSpacing: '0.3px' }}>
              Your data is safe and secure with us — Encrypted by AES 256-bit Encryption
            </span>
          </div>
          <button 
            onClick={() => {
              setShowSecurityBanner(false);
              localStorage.setItem('showSecurityBanner', 'false');
            }}
            style={{
              position: 'absolute',
              right: '24px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
          >
            ✕
          </button>
        </div>
      )}

      <div style={styles.container}>
        {/* Custom Top Navbar */}
      <div style={styles.customNavbar}>
        <div style={styles.brand}>
          <span style={styles.brandLogo}>💳</span>
          <div>
            <h1 style={styles.brandTitle}>Eazzio Accountant Portal</h1>
            <p style={styles.brandSub}>School Finance & Student Dues Directory</p>
          </div>
        </div>
        <div style={styles.profileRow}>
          <div style={styles.userBadge}>
            <div style={styles.avatar}>
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div style={styles.userText}>
              <span style={styles.userName}>{user?.name || 'Accountant'}</span>
              <span style={styles.userRole}>Finance Manager</span>
            </div>
          </div>
          <button style={styles.logoutBtn} onClick={logout}>
            🚪 Sign Out
          </button>
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
          margin: '0 24px'
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
          margin: '12px 24px 0 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--danger)';
                  e.target.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.target.style.color = 'var(--danger)';
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

      {/* Action Buttons Row (where the Metrics Grid used to be) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        margin: '12px 24px 24px 24px',
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
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--danger)';
                              e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                              e.currentTarget.style.color = 'var(--danger)';
                            }}
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
            
            <form 
              onSubmit={handleAddStudent} 
              style={styles.form}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                  e.preventDefault();
                  e.currentTarget.requestSubmit();
                }
              }}
            >
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
              </div>

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
            
            <form 
              onSubmit={handleEditStudent} 
              style={styles.form}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                  e.preventDefault();
                  e.currentTarget.requestSubmit();
                }
              }}
            >
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

      {/* Toast Notification */}
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
          animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}>
          <span style={{ fontSize: '1.25rem' }}>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{toast.message}</span>
        </div>,
        document.body
      )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    padding: '24px',
    backgroundColor: 'var(--bg-main)',
    minHeight: '100vh',
    width: '100%',
    boxSizing: 'border-box'
  },
  customNavbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--sidebar-bg)',
    backdropFilter: 'blur(20px)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px 24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  brandLogo: {
    fontSize: '2rem'
  },
  brandTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0
  },
  brandSub: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    margin: '2px 0 0 0'
  },
  profileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: 'var(--primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '1rem'
  },
  userText: {
    display: 'flex',
    flexDirection: 'column'
  },
  userName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  userRole: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },
  logoutBtn: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid var(--danger)',
    color: '#fca5a5',
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
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
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
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
    '&:hover': {
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
  }
};
