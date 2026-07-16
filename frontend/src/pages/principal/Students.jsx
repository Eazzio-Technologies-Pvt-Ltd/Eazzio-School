import React, { useState, useEffect, useRef } from 'react';
import { getStudents, registerStudent, getClasses, deleteStudent } from '../../api/principalApi';
import Loader from '../../components/Loader';

export default function Students() {
  const nameInputRef = useRef(null);

  // Form Fields
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [classId, setClassId] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');

  // Data List & Modal State
  const [studentsList, setStudentsList] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Credentials Modal
  const [credentialsModal, setCredentialsModal] = useState({ visible: false, studentId: '', password: '', name: '' });

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [students, clsData] = await Promise.all([getStudents(), getClasses()]);
      setStudentsList(students);
      setClassesList(clsData);
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

    if (!rollNumber || !classId || !name) {
      setError('Name, Roll number, and Class are required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await registerStudent({
        name,
        rollNumber,
        classId,
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
      setClassId('');
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
    // Search query matching
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.rollNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.studentId || '').toLowerCase().includes(searchQuery.toLowerCase());

    // Class filter matching
    const matchesClass = !classFilter || student.classId?.toString() === classFilter;

    return matchesSearch && matchesClass;
  });

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>Student Administration</h2>
        <p style={styles.sub}>Register and manage academic profiles and admission details.</p>
      </div>

      <div style={styles.mainLayoutGrid}>
        {/* Left Form: Register */}
        <div style={styles.pane}>
          <h3 style={styles.paneTitle}>Add New Student</h3>
          {error && <div style={styles.errorAlert}>{error}</div>}

          <form onSubmit={handleRegister} style={styles.form}>
            <div style={styles.inputGroup}>
              <label>Student Full Name</label>
              <input ref={nameInputRef} type="text" placeholder="e.g. Alex Johnson" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div style={styles.grid2}>
              <div style={styles.inputGroup}>
                <label>Roll Number</label>
                <input type="text" placeholder="e.g. 101" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} required />
              </div>
              <div style={styles.inputGroup}>
                <label>Assign Class</label>
                <select value={classId} onChange={(e) => setClassId(e.target.value)} required style={styles.select}>
                  <option value="">Select Class</option>
                  {classesList.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.className} - {cls.section}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.grid2}>
              <div style={styles.inputGroup}>
                <label>Father's Name</label>
                <input type="text" value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
              </div>
              <div style={styles.inputGroup}>
                <label>Mother's Name</label>
                <input type="text" value={motherName} onChange={(e) => setMotherName(e.target.value)} />
              </div>
            </div>

            <div style={styles.grid2}>
              <div style={styles.inputGroup}>
                <label>Phone Number</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div style={styles.inputGroup}>
                <label>Admission Date</label>
                <input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label>Address</label>
              <textarea rows="2" value={address} onChange={(e) => setAddress(e.target.value)} style={styles.textarea} />
            </div>

            <button type="submit" className="btn-primary" disabled={submitting} style={styles.submitBtn}>
              {submitting ? 'Registering...' : 'Add Student'}
            </button>
          </form>
        </div>

        {/* Right Section: Filtered Table */}
        <div style={styles.tablePane}>
          <div style={styles.tablePaneHeader}>
            <h3 style={styles.paneTitle}>Student Directory</h3>
            <span style={styles.recordsCount}>{filteredStudents.length} Records found</span>
          </div>

          {/* Filtering Controls */}
          <div style={styles.filterGrid}>
            <input type="text" placeholder="🔍 Search name, roll, ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={styles.searchBar} />
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={styles.filterDropdown}>
              <option value="">All Classes</option>
              {classesList.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.className} - {cls.section}</option>
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
                    <th style={styles.th}>Roll</th>
                    <th style={styles.th}>Class</th>
                    <th style={styles.th}>Phone</th>
                    <th style={styles.th}>Admission Date</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={styles.noRecords}>No students found.</td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id} style={styles.tr}>
                        <td style={{...styles.td, fontWeight: 'bold'}}>{student.studentId}</td>
                        <td style={styles.nameCell}>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{student.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{student.fatherName ? `Father: ${student.fatherName}` : ''}</div>
                        </td>
                        <td style={styles.td}>{student.rollNumber}</td>
                        <td style={{ ...styles.td, color: 'var(--primary)', fontWeight: 'bold' }}>
                          {student.class ? `${student.class.className}-${student.class.section}` : 'N/A'}
                        </td>
                        <td style={styles.td}>{student.phone || '-'}</td>
                        <td style={styles.td}>{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '-'}</td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>
                          <button 
                            onClick={() => handleDelete(student.id, student.name)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--danger)' }}
                            title="Delete Student"
                          >
                            🗑️
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
  select: { padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', width: '100%' },
  textarea: { padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', width: '100%', resize: 'vertical' },
  submitBtn: { padding: '12px', fontSize: '0.9rem', marginTop: '10px' },
  errorAlert: { padding: '10px', background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#fca5a5', borderRadius: '4px', marginBottom: '10px' },
  tablePane: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)', overflow: 'hidden' },
  tablePaneHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  recordsCount: { fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' },
  filterGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '20px' },
  searchBar: { background: 'rgba(11, 13, 25, 0.8)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' },
  filterDropdown: { background: 'rgba(11, 13, 25, 0.8)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' },
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
