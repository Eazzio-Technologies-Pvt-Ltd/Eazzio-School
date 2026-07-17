import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getTeachers, registerTeacher } from '../../api/adminApi';
import Loader from '../../components/Loader';

export default function Teachers() {
  const location = useLocation();
  const nameInputRef = useRef(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  // Data List & Toast State
  const [teachersList, setTeachersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [toast, setToast] = useState({ visible: false, message: '' });

  const triggerToast = (msg) => {
    setToast({ visible: true, message: msg });
    setTimeout(() => {
      setToast({ visible: false, message: '' });
    }, 3000);
  };

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const teachers = await getTeachers();
      setTeachersList(teachers);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Failed to load faculty roster.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  useEffect(() => {
    if (!loading) {
      const params = new URLSearchParams(location.search);
      if (params.get('focus') === 'form' && nameInputRef.current) {
        nameInputRef.current.scrollIntoView({ behavior: 'smooth' });
        nameInputRef.current.focus();
      }
    }
  }, [location, loading]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    setSubmitting(true);

    try {
      await registerTeacher({
        name,
        email,
        password,
        phone,
      });

      setFeedback({ type: 'success', message: 'Teacher successfully registered!' });
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      await loadTeachers();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Registration failed' });
    } finally {
      setSubmitting(false);
    }
  };

  // Mock subjects list for prototype filter
  const subjectsList = ['Mathematics', 'Science', 'English Literature', 'History', 'Computer Science'];
  
  // Extract classes list for Filter dropdown
  const classesList = [...new Set(teachersList.map(t => t.teacher?.assignedClass).filter(Boolean))];

  // Dynamic search/filters on client
  const filteredTeachers = teachersList.filter(user => {
    // Search matching name or email
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const teacherClass = user.assignedClass ? `${user.assignedClass.className}-${user.assignedClass.section}` : '';
    const matchesClass = !classFilter || teacherClass === classFilter;

    // Subject matching (mocked logic - associates teacher ID to mock index)
    const mockSubject = subjectsList[user.id % subjectsList.length];
    const matchesSubject = !subjectFilter || mockSubject === subjectFilter;

    return matchesSearch && matchesClass && matchesSubject;
  });

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>Faculty & Teacher Registry</h2>
        <p style={styles.sub}>Register and manage faculty members and classroom assignments.</p>
      </div>

      {toast.visible && (
        <div style={styles.toast}>
          <span>💡</span> {toast.message}
        </div>
      )}

      <div style={styles.mainGrid}>
        {/* Left Form */}
        <div style={styles.pane}>
          <h3 style={styles.paneTitle}>Register New Teacher</h3>
          {feedback.message && (
            <div style={{
              ...styles.feedback,
              ...(feedback.type === 'error' ? styles.errorFeedback : styles.successFeedback)
            }}>
              {feedback.type === 'error' ? '⚠️' : '✅'} {feedback.message}
            </div>
          )}

          <form onSubmit={handleRegister} style={styles.form}>
            <div style={styles.inputGroup}>
              <label htmlFor="reg-name">Teacher Full Name</label>
              <input
                ref={nameInputRef}
                id="reg-name"
                type="text"
                placeholder="e.g. Mrs. Sarah Davis"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label htmlFor="reg-email">Email Address</label>
              <input
                id="reg-email"
                type="email"
                placeholder="e.g. sarah@school.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label htmlFor="reg-password">Temporary Password</label>
              <input
                id="reg-password"
                type="password"
                placeholder="e.g. teacher123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label htmlFor="reg-phone">Phone Number</label>
              <input
                id="reg-phone"
                type="text"
                placeholder="e.g. +1 555-0198"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <button
              id="reg-submit"
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={styles.submitBtn}
            >
              {submitting ? 'Registering...' : 'Register Teacher'}
            </button>
          </form>
        </div>

        {/* Right Section: Roster Table with Filters */}
        <div style={styles.tablePane}>
          <div style={styles.tablePaneHeader}>
            <h3 style={styles.paneTitle}>Faculty Directory</h3>
            <span style={styles.recordsCount}>{filteredTeachers.length} Records found</span>
          </div>

          {/* Filters Bar */}
          <div style={styles.filterGrid}>
            <input
              type="text"
              placeholder="🔍 Search name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchBar}
            />

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              style={styles.filterDropdown}
            >
              <option value="">All Classes</option>
              {classesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              style={styles.filterDropdown}
            >
              <option value="">All Subjects</option>
              {subjectsList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <Loader message="Loading faculty list..." />
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Employee ID</th>
                    <th style={styles.th}>Subject</th>
                    <th style={styles.th}>Assigned Classroom</th>
                    <th style={styles.th}>Phone</th>
                    <th style={styles.th}>Status</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={styles.noRecords}>
                        No teachers found matching active search parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((user) => {
                      const mockSubject = subjectsList[user.id % subjectsList.length];
                      return (
                        <tr key={user.id} style={styles.trHover}>
                          <td style={styles.td}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '600' }}>{user.name}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</span>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <span style={{ fontWeight: '600', fontFamily: 'monospace', color: 'var(--primary)' }}>{user.employeeId}</span>
                          </td>
                          <td style={styles.td}>{mockSubject}</td>
                          <td style={{ ...styles.td, fontWeight: '700', color: 'var(--primary)' }}>
                            {user.assignedClass ? `${user.assignedClass.className}-${user.assignedClass.section}` : 'Unassigned'}
                          </td>
                          <td style={styles.td}>{user.phone || 'N/A'}</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.badge, color: 'var(--success)', background: 'var(--success-glow)' }}>
                              ACTIVE
                            </span>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>
                            <div style={styles.actionsRow}>
                              <button
                                onClick={() => triggerToast(`Viewing details for teacher: ${user.name}`)}
                                style={styles.actionIconBtn}
                                title="View Details"
                              >
                                👁️
                              </button>
                              <button
                                onClick={() => triggerToast(`Edit form launched for: ${user.name} (Prototype Placeholder)`)}
                                style={styles.actionIconBtn}
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => triggerToast(`Faculty member deactivation triggered: ${user.name}`)}
                                style={{ ...styles.actionIconBtn, color: 'var(--danger)' }}
                                title="Deactivate"
                              >
                                🚫
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  header: {
    marginBottom: '10px',
  },
  sub: {
    color: 'var(--text-secondary)',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '24px',
    alignItems: 'start',
  },
  pane: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  paneTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  submitBtn: {
    padding: '12px',
    fontSize: '0.95rem',
    marginTop: '10px',
  },
  feedback: {
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    marginBottom: '14px',
  },
  errorFeedback: {
    background: 'var(--danger-glow)',
    border: '1px solid var(--danger)',
    color: '#fca5a5',
  },
  successFeedback: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid var(--success)',
    color: '#a7f3d0',
  },
  tablePane: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
  },
  tablePaneHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  recordsCount: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr 1fr',
    gap: '12px',
    marginBottom: '20px',
  },
  searchBar: {
    background: 'rgba(11, 13, 25, 0.8)',
  },
  filterDropdown: {
    background: 'var(--input-bg)',
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
    fontSize: '0.85rem',
  },
  td: {
    padding: '14px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--glass-border)',
    fontSize: '0.85rem',
    verticalAlign: 'middle',
  },
  nameCell: {
    padding: '14px',
    borderBottom: '1px solid var(--glass-border)',
    fontSize: '0.85rem',
  },
  tr: {
    transition: 'var(--transition-fast)',
    '&:hover': {
      background: 'var(--bg-card-hover)',
    },
  },
  badge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  actionsRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '6px',
  },
  actionIconBtn: {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 8px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition-fast)',
    '&:hover': {
      background: 'rgba(139, 92, 246, 0.1)',
      borderColor: 'var(--primary)',
    },
  },
  noRecords: {
    padding: '30px',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'var(--sidebar-bg)',
    border: '1px solid var(--primary)',
    boxShadow: 'var(--shadow-glow)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 20px',
    color: 'var(--text-primary)',
    zIndex: 999,
    fontSize: '0.9rem',
    animation: 'fadeIn 0.3s ease',
  },
};
