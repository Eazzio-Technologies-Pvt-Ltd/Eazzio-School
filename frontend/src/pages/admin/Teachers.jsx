import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { getTeachers, registerTeacher, updateTeacher, deleteTeacher } from '../../api/adminApi';
import Loader from '../../components/Loader';

export default function Teachers() {
  const location = useLocation();
  const nameInputRef = useRef(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [subjects, setSubjects] = useState('');

  // Edit / View State
  const [viewTeacher, setViewTeacher] = useState(null);
  const [editTeacher, setEditTeacher] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  // Data List & Modal State
  const [teachersList, setTeachersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [toast, setToast] = useState({ visible: false, message: '' });

  const triggerToast = (msg, type = 'info') => {
    setToast({ visible: true, message: msg, type });
    setTimeout(() => setToast({ visible: false, message: '', type: '' }), 3000);
  };

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const teachers = await getTeachers();
      setTeachersList(teachers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTeachers(); }, []);

  useEffect(() => {
    if (!loading) {
      const params = new URLSearchParams(location.search);
      if (params.get('focus') === 'form') {
        setShowAddModal(true);
      }
    }
  }, [location, loading]);

  const resetForm = () => {
    setName(''); setEmail(''); setPassword(''); setPhone(''); setSubjects('');
    setFeedback({ type: '', message: '' });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    setSubmitting(true);
    try {
      await registerTeacher({ name, email, password, phone });
      setFeedback({ type: 'success', message: '✅ Teacher registered successfully!' });
      resetForm();
      await loadTeachers();
      setTimeout(() => { setShowAddModal(false); setFeedback({ type: '', message: '' }); }, 1500);
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Registration failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this teacher?")) {
      try {
        await deleteTeacher(id);
        triggerToast('Teacher deleted successfully', 'success');
        await loadTeachers();
      } catch (err) {
        triggerToast(err.response?.data?.error || 'Failed to delete teacher', 'error');
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    setSubmitting(true);
    try {
      const subjectArray = subjects.split(',').map(s => s.trim()).filter(Boolean);
      await updateTeacher(editTeacher.id, { name, email, phone, subjects: subjectArray });
      setFeedback({ type: 'success', message: '✅ Teacher updated successfully!' });
      await loadTeachers();
      setTimeout(() => { setEditTeacher(null); setFeedback({ type: '', message: '' }); }, 1500);
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Update failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (teacher) => {
    setEditTeacher(teacher);
    setName(teacher.name);
    setEmail(teacher.email);
    setPhone(teacher.phone || '');
    setSubjects(teacher.subjects ? teacher.subjects.join(', ') : '');
    setFeedback({ type: '', message: '' });
  };

  // Derive lists for filters from actual data
  const coursesList = [...new Set(teachersList.map(t => t.assignedCourse ? `${t.assignedCourse.courseName}-${t.assignedCourse.section}` : null).filter(Boolean))];
  const subjectsList = [...new Set(teachersList.flatMap(t => [
    ...(t.subjects || []), 
    ...(t.courseSubjects?.map(cs => cs.subject) || [])
  ]))].filter(Boolean);

  const filteredTeachers = teachersList.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const teacherCourse = user.assignedCourse ? `${user.assignedCourse.courseName}-${user.assignedCourse.section}` : '';
    const matchesCourse = !courseFilter || teacherCourse === courseFilter;
    const teacherSubjects = [...(user.subjects || []), ...(user.courseSubjects?.map(cs => cs.subject) || [])];
    const matchesSubject = !subjectFilter || teacherSubjects.includes(subjectFilter);
    return matchesSearch && matchesCourse && matchesSubject;
  });

  return (
    <div style={s.container} className="animate-fade-in">

      {/* Toast */}
      {toast.visible && (
        <div style={s.toast}>
          <span>💡</span> {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div style={s.header}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Faculty &amp; Teacher Registry</h2>
          <p style={s.sub}>Register and manage faculty members and courseroom assignments.</p>
        </div>
      </div>

      {/* Faculty Directory — Full Width */}
      <div style={s.card}>
        {/* Card Header */}
        <div style={s.cardHeader}>
          <div style={s.cardHeaderLeft}>
            <h3 style={s.cardTitle}>Faculty Directory</h3>
            <span style={s.badge}>{filteredTeachers.length} Records</span>
          </div>
          <button style={s.addBtn} onClick={() => { resetForm(); setShowAddModal(true); }}>
            ＋ Add Teacher
          </button>
        </div>

        {/* Filter Bar */}
        <div style={s.filterBar}>
          <input
            type="text"
            placeholder="🔍 Search name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={s.searchInput}
          />
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} style={s.select}>
            <option value="">All Courses</option>
            {coursesList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} style={s.select}>
            <option value="">All Subjects</option>
            {subjectsList.map(sub => <option key={sub} value={sub}>{sub}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <Loader message="Loading faculty list..." />
        ) : (
          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr style={s.thRow}>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Employee ID</th>
                  <th style={s.th}>Subject</th>
                  <th style={s.th}>Assigned Course</th>
                  <th style={s.th}>Phone</th>
                  <th style={s.th}>Status</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={s.empty}>
                      <div style={{ fontSize: '2rem', marginBottom: '10px' }}>👨‍🏫</div>
                      No teachers found. Click "＋ Add Teacher" to register one.
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((user) => {
                    const combinedSubjects = new Set([
                      ...(user.subjects || []),
                      ...(user.courseSubjects?.map(cs => cs.subject) || [])
                    ]);
                    const teacherSubjects = combinedSubjects.size > 0 ? Array.from(combinedSubjects).join(', ') : 'Unassigned';
                    return (
                      <tr key={user.id} style={s.tr}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={s.td}>
                          <div style={{ fontWeight: '700', color: '#111827' }}>{user.name}</div>
                          <div style={{ fontSize: '0.77rem', color: '#9ca3af' }}>{user.email}</div>
                        </td>
                        <td style={s.td}>
                          <span style={s.empIdBadge}>{user.employeeId}</span>
                        </td>
                        <td style={s.td}>{teacherSubjects}</td>
                        <td style={s.td}>
                          <span style={user.assignedCourse ? s.courseBadge : s.unassignedBadge}>
                            {user.assignedCourse ? `${user.assignedCourse.courseName}-${user.assignedCourse.section}` : 'Unassigned'}
                          </span>
                        </td>
                        <td style={s.td}>{user.phone || 'N/A'}</td>
                        <td style={s.td}>
                          <span style={s.activeBadge}>ACTIVE</span>
                        </td>
                        <td style={{ ...s.td, textAlign: 'center' }}>
                          <div style={s.actionGroup}>
                            <button style={s.viewBtn} title="View" onClick={() => setViewTeacher(user)}>👁 View</button>
                            <button style={s.editBtn} title="Edit" onClick={() => openEditModal(user)}>✏️ Edit</button>
                            <button style={s.deleteBtn} title="Deactivate" onClick={() => handleDelete(user.id)}>🚫</button>
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

      {/* ── ADD TEACHER MODAL ── */}
      {showAddModal && createPortal(
        <div style={s.overlay} onClick={() => !submitting && setShowAddModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={s.modalHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#111827' }}>＋ Register New Teacher</h3>
                <p style={{ margin: '5px 0 0', fontSize: '0.82rem', color: '#6b7280' }}>
                  Fill in the details to create a new faculty account.
                </p>
              </div>
              <button style={s.closeBtn} onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            {/* Feedback */}
            {feedback.message && (
              <div style={{
                margin: '0 28px',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                background: feedback.type === 'error' ? 'rgba(220,38,38,0.08)' : 'rgba(5,150,105,0.08)',
                border: `1px solid ${feedback.type === 'error' ? '#fca5a5' : '#6ee7b7'}`,
                color: feedback.type === 'error' ? '#dc2626' : '#059669',
              }}>
                {feedback.message}
              </div>
            )}

            {/* Form Body — 2 column grid */}
            <form onSubmit={handleRegister} style={s.modalBody}>
              <div style={s.formGrid}>
                {/* Full Name */}
                <div style={s.inputGroup}>
                  <label style={s.label}>Full Name <span style={{ color: '#dc2626' }}>*</span></label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    placeholder="e.g. Mrs. Sarah Davis"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    style={s.input}
                  />
                </div>

                {/* Phone */}
                <div style={s.inputGroup}>
                  <label style={s.label}>Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9876543210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={s.input}
                  />
                </div>

                {/* Email */}
                <div style={s.inputGroup}>
                  <label style={s.label}>Email Address <span style={{ color: '#dc2626' }}>*</span></label>
                  <input
                    type="email"
                    placeholder="e.g. sarah@school.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={s.input}
                  />
                </div>

                {/* Password */}
                <div style={s.inputGroup}>
                  <label style={s.label}>Temporary Password <span style={{ color: '#dc2626' }}>*</span></label>
                  <input
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={s.input}
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowAddModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" style={s.submitBtn} disabled={submitting}>
                  {submitting ? 'Registering...' : '✅ Register Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── EDIT TEACHER MODAL ── */}
      {editTeacher && createPortal(
        <div style={s.overlay} onClick={() => !submitting && setEditTeacher(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#111827' }}>✏️ Edit Teacher</h3>
                <p style={{ margin: '5px 0 0', fontSize: '0.82rem', color: '#6b7280' }}>Update teacher information.</p>
              </div>
              <button style={s.closeBtn} onClick={() => setEditTeacher(null)}>✕</button>
            </div>
            {feedback.message && (
              <div style={{ margin: '0 28px', padding: '10px 14px', borderRadius: '8px', fontSize: '0.88rem', background: feedback.type === 'error' ? 'rgba(220,38,38,0.08)' : 'rgba(5,150,105,0.08)', border: `1px solid ${feedback.type === 'error' ? '#fca5a5' : '#6ee7b7'}`, color: feedback.type === 'error' ? '#dc2626' : '#059669' }}>
                {feedback.message}
              </div>
            )}
            <form onSubmit={handleUpdate} style={s.modalBody}>
              <div style={s.formGrid}>
                <div style={s.inputGroup}>
                  <label style={s.label}>Full Name <span style={{ color: '#dc2626' }}>*</span></label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required style={s.input} />
                </div>
                <div style={s.inputGroup}>
                  <label style={s.label}>Phone Number</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)} style={s.input} />
                </div>
                <div style={s.inputGroup}>
                  <label style={s.label}>Email Address <span style={{ color: '#dc2626' }}>*</span></label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={s.input} />
                </div>
                <div style={s.inputGroup}>
                  <label style={s.label}>Subjects (comma separated)</label>
                  <input type="text" value={subjects} onChange={e => setSubjects(e.target.value)} placeholder="Math, Science" style={s.input} />
                </div>
              </div>
              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setEditTeacher(null)} disabled={submitting}>Cancel</button>
                <button type="submit" style={s.submitBtn} disabled={submitting}>{submitting ? 'Updating...' : '✅ Update Teacher'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── VIEW TEACHER MODAL ── */}
      {viewTeacher && createPortal(
        <div style={s.overlay} onClick={() => setViewTeacher(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#111827' }}>👁 Teacher Details</h3>
              </div>
              <button style={s.closeBtn} onClick={() => setViewTeacher(null)}>✕</button>
            </div>
            <div style={s.modalBody}>
              <p><strong>Name:</strong> {viewTeacher.name}</p>
              <p><strong>Email:</strong> {viewTeacher.email}</p>
              <p><strong>Phone:</strong> {viewTeacher.phone || 'N/A'}</p>
              <p><strong>Employee ID:</strong> {viewTeacher.employeeId}</p>
              <p><strong>Subjects:</strong> {
                Array.from(new Set([
                  ...(viewTeacher.subjects || []),
                  ...(viewTeacher.courseSubjects?.map(cs => cs.subject) || [])
                ])).join(', ') || 'Unassigned'
              }</p>
              <p><strong>Assigned Course:</strong> {viewTeacher.assignedCourse ? `${viewTeacher.assignedCourse.courseName}-${viewTeacher.assignedCourse.section}` : 'Unassigned'}</p>
              <div style={s.modalFooter}>
                <button type="button" style={s.cancelBtn} onClick={() => setViewTeacher(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const s = {
  container: { padding: '30px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' },
  sub: { color: 'var(--text-secondary)', marginTop: '6px', fontSize: '0.9rem' },

  toast: { position: 'fixed', bottom: '30px', right: '30px', background: '#ffffff', color: 'var(--text-primary)', padding: '12px 24px', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 3000, fontWeight: '500', borderLeft: '4px solid var(--primary)' },

  // Full-width card
  card: { background: '#ffffff', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid var(--glass-border)' },
  cardHeaderLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  cardTitle: { margin: 0, fontSize: '1.1rem', fontWeight: '700' },
  badge: { background: 'rgba(5,150,105,0.1)', color: '#059669', padding: '3px 12px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700' },
  addBtn: { padding: '10px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', letterSpacing: '0.3px' },

  filterBar: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', padding: '16px 28px', borderBottom: '1px solid var(--glass-border)' },
  searchInput: { padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: '#f9fafb', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' },
  select: { padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: '#f9fafb', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' },

  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { background: '#f9fafb', borderBottom: '1px solid var(--glass-border)' },
  th: { padding: '13px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px' },
  tr: { borderBottom: '1px solid var(--glass-border)', transition: 'background 0.15s' },
  td: { padding: '16px', verticalAlign: 'middle', fontSize: '0.88rem' },
  empty: { padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' },

  empIdBadge: { fontFamily: 'monospace', fontWeight: '700', color: '#059669', fontSize: '0.85rem' },
  courseBadge: { background: 'rgba(5,150,105,0.1)', color: '#059669', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700', border: '1px solid rgba(5,150,105,0.2)' },
  unassignedBadge: { background: 'rgba(156,163,175,0.15)', color: '#9ca3af', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' },
  activeBadge: { background: 'rgba(5,150,105,0.1)', color: '#059669', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', border: '1px solid rgba(5,150,105,0.2)' },

  actionGroup: { display: 'flex', gap: '6px', justifyContent: 'center' },
  viewBtn: { padding: '5px 12px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' },
  editBtn: { padding: '5px 12px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' },
  deleteBtn: { padding: '5px 10px', background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' },

  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modal: { background: '#ffffff', borderRadius: '18px', border: '1px solid var(--glass-border)', width: '100%', maxWidth: '580px', boxShadow: '0 28px 72px rgba(0,0,0,0.2)', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '22px 28px', borderBottom: '1px solid var(--glass-border)' },
  closeBtn: { background: 'none', border: 'none', fontSize: '1.1rem', color: '#9ca3af', cursor: 'pointer' },

  modalBody: { padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '0.82rem', fontWeight: '600', color: '#374151' },
  input: { padding: '11px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: '#f9fafb', color: '#111827', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box', outline: 'none' },

  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' },
  cancelBtn: { padding: '10px 22px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#6b7280', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem' },
  submitBtn: { padding: '10px 24px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem' },
};
