import React, { useState, useEffect } from 'react';
import { getCourses, createCourse, assignCourseTeacher, getTeachers, updateCourse, deleteCourse } from '../../api/adminApi';
import SubjectsBadge from '../../components/SubjectsBadge';
import { Eye, Pencil, Trash2 } from 'lucide-react';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCourseToView, setSelectedCourseToView] = useState(null);
  const [editingCourseId, setEditingCourseId] = useState(null);

  const [courseName, setCourseName] = useState('');
  const [section, setSection] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [feeAmount, setFeeAmount] = useState('');
  const [feePlanType, setFeePlanType] = useState('MONTHLY');
  const [classTeacherId, setClassTeacherId] = useState('');
  const [subjectTeachers, setSubjectTeachers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addSubjectTeacher = () => setSubjectTeachers([...subjectTeachers, { subject: '', teacherId: '' }]);
  const updateSubjectTeacher = (index, field, value) => {
    const newArr = [...subjectTeachers];
    newArr[index][field] = value;
    setSubjectTeachers(newArr);
  };
  const removeSubjectTeacher = (index) => {
    setSubjectTeachers(subjectTeachers.filter((_, i) => i !== index));
  };

  // Assign Teacher Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clsData, tchData] = await Promise.all([getCourses(), getTeachers()]);
      setCourses(clsData);
      setTeachers(tchData);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCourseName('');
    setSection('');
    setAcademicYear('2026-2027');
    setFeeAmount('');
    setFeePlanType('MONTHLY');
    setClassTeacherId('');
    setSubjectTeachers([]);
    setEditingCourseId(null);
    setError('');
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (cls) => {
    resetForm();
    setEditingCourseId(cls.id);
    setCourseName(cls.courseName);
    setSection(cls.section);
    setAcademicYear(cls.academicYear);
    if (cls.feeStructures && cls.feeStructures.length > 0) {
      setFeeAmount(cls.feeStructures[0].amount);
      setFeePlanType(cls.feeStructures[0].planType || 'MONTHLY');
    }
    if (cls.teacherId) {
      setClassTeacherId(cls.teacherId);
    }
    if (cls.courseSubjects) {
      setSubjectTeachers(cls.courseSubjects.map(cs => ({
        subject: cs.subject,
        teacherId: cs.teacherId
      })));
    }
    setIsEditModalOpen(true);
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        courseName,
        section,
        academicYear,
        feeAmount: feeAmount ? parseInt(feeAmount) : null,
        feePlanType,
        classTeacherId: classTeacherId ? parseInt(classTeacherId) : null,
        subjectTeachers: subjectTeachers.filter(st => st.subject && st.teacherId).map(st => ({
          subject: st.subject,
          teacherId: parseInt(st.teacherId)
        }))
      };

      if (editingCourseId) {
        await updateCourse(editingCourseId, payload);
      } else {
        await createCourse(payload);
      }
      
      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      resetForm();
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (cls) => {
    if (cls._count.students > 0) {
      alert(`Cannot delete ${cls.courseName}-${cls.section} because ${cls._count.students} students are enrolled.`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${cls.courseName}-${cls.section}?`)) {
      try {
        await deleteCourse(cls.id);
        await fetchData();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete course');
      }
    }
  };

  const handleOpenViewModal = (cls) => {
    setSelectedCourseToView(cls);
    setIsViewModalOpen(true);
  };

  const openAssignModal = (cls) => {
    setSelectedCourse(cls);
    setSelectedTeacherId(cls.teacherId || '');
    setAssignModalOpen(true);
  };

  const handleAssignTeacher = async () => {
    if (!selectedTeacherId) return;
    setAssigning(true);
    try {
      await assignCourseTeacher(selectedCourse.id, parseInt(selectedTeacherId));
      setAssignModalOpen(false);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign teacher');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <>
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Manage Courses</h2>
          <button className="btn-primary" style={{ padding: '8px 16px' }} onClick={handleOpenCreateModal}>
            + Add Course
          </button>
        </div>


        {/* Courses List */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Course List</h3>
          {loading ? (
            <p>Loading courses...</p>
          ) : courses.length === 0 ? (
            <p>No courses found.</p>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Course</th>
                    <th style={styles.th}>Academic Year</th>
                    <th style={styles.th}>Class Teacher</th>
                    <th style={styles.th}>Subjects</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Fee</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Students</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(cls => (
                    <tr key={cls.id} style={styles.tr}>
                      <td style={styles.td}><strong>{cls.courseName}</strong> <span style={{ color: 'var(--text-muted)' }}>- {cls.section}</span></td>
                      <td style={styles.td}>{cls.academicYear}</td>
                      <td style={styles.td}>
                        {cls.teacher ? (
                          <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{cls.teacher.name}</span>
                        ) : (
                          <span style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '500', whiteSpace: 'nowrap' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <SubjectsBadge subjects={cls.courseSubjects || []} courseLabel={`${cls.courseName}-${cls.section}`} />
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        {cls.feeStructures?.length > 0 
                          ? <span style={{ fontWeight: '600', color: 'var(--success)' }}>
                              ₹{cls.feeStructures[0].amount} 
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px', fontWeight: 'normal' }}>
                                {cls.feeStructures[0].planType === 'MONTHLY' ? '/ mo' : 
                                 cls.feeStructures[0].planType === 'QUARTERLY' ? '/ qtr' : 
                                 cls.feeStructures[0].planType === 'ANNUALLY' ? '/ yr' : 
                                 cls.feeStructures[0].planType === 'FULL_COURSE' ? '(Full)' : ''}
                              </span>
                            </span>
                          : <span style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '500', whiteSpace: 'nowrap' }}>Not set</span>}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={{ display: 'inline-block', background: 'var(--glass-bg)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600' }}>
                          {cls._count.students}
                        </div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="btn-secondary" style={styles.iconBtn} onClick={() => handleOpenViewModal(cls)} aria-label="View course">
                            <Eye size={16} />
                          </button>
                          <button className="btn-primary" style={styles.iconBtn} onClick={() => handleOpenEditModal(cls)} aria-label="Edit course">
                            <Pencil size={16} />
                          </button>
                          <button style={{ ...styles.iconBtn, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }} onClick={() => handleDeleteCourse(cls)} aria-label="Delete course">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Course Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, width: '500px', maxWidth: '95%', maxHeight: '90vh', background: 'var(--bg-main)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', padding: 0, overflow: 'hidden' }}>
            
            <div style={{ padding: '24px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', background: 'var(--bg-card)' }}>
              <h3 style={{...styles.cardTitle, marginBottom: 0}}>{isEditModalOpen ? 'Edit Course' : 'Create New Course'}</h3>
              <button onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem' }}>✖</button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>
              {error && <div style={styles.errorAlert}>{error}</div>}
              <form onSubmit={handleSaveCourse} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label>Course Name (e.g. 10)</label>
                  <input type="text" value={courseName} onChange={e => setCourseName(e.target.value)} required />
                </div>
                <div style={styles.inputGroup}>
                  <label>Section (e.g. A)</label>
                  <input type="text" value={section} onChange={e => setSection(e.target.value)} required />
                </div>
                <div style={styles.inputGroup}>
                  <label>Academic Year</label>
                  <input type="text" value={academicYear} onChange={e => setAcademicYear(e.target.value)} required />
                </div>
                
                <div style={{ borderTop: '1px solid var(--border-glow)', margin: '10px 0' }}></div>
                
                <div style={styles.inputGroup}>
                  <label>Fee Details (Optional)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select value={feePlanType} onChange={e => setFeePlanType(e.target.value)} style={{ ...styles.select, flex: 1 }}>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="ANNUALLY">Annually</option>
                      <option value="FULL_COURSE">Full Course</option>
                    </select>
                    <input type="number" min="0" placeholder="Amount (₹)" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} style={{ flex: 1 }} />
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <label>Assign Class Teacher</label>
                  <select value={classTeacherId} onChange={e => setClassTeacherId(e.target.value)} style={styles.select}>
                    <option value="">-- No Class Teacher --</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Subject Teachers</label>
                    <button type="button" onClick={addSubjectTeacher} style={{ ...styles.smallBtn, background: 'var(--bg-glass)', color: 'var(--text-primary)' }}>+ Add</button>
                  </div>
                  {subjectTeachers.map((st, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <input type="text" placeholder="Subject (e.g. Math)" value={st.subject} onChange={e => updateSubjectTeacher(i, 'subject', e.target.value)} style={{ flex: 1 }} required />
                      <select value={st.teacherId} onChange={e => updateSubjectTeacher(i, 'teacherId', e.target.value)} style={{ ...styles.select, flex: 1 }} required>
                        <option value="">-- Select Teacher --</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <button type="button" onClick={() => removeSubjectTeacher(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✖</button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
                  <button type="button" className="btn-secondary" style={{ padding: '10px 24px' }} onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ padding: '10px 24px' }} disabled={saving}>
                    {saving ? 'Saving...' : (isEditModalOpen ? 'Update Course' : 'Create Course')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Course Modal */}
      {isViewModalOpen && selectedCourseToView && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, width: '500px', maxWidth: '95%', maxHeight: '90vh', background: 'var(--bg-main)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', padding: 0, overflow: 'hidden' }}>
            
            <div style={{ padding: '24px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', background: 'var(--bg-card)' }}>
              <h3 style={{...styles.cardTitle, marginBottom: 0}}>Course Details</h3>
              <button onClick={() => setIsViewModalOpen(false)} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem' }}>✖</button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Course Name</p>
                  <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{selectedCourseToView.courseName} - {selectedCourseToView.section}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Academic Year</p>
                  <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{selectedCourseToView.academicYear}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Class Teacher</p>
                  <p style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{selectedCourseToView.teacher ? selectedCourseToView.teacher.name : 'Unassigned'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Enrolled Students</p>
                  <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{selectedCourseToView._count.students}</p>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--glass-border)', margin: '16px 0' }}></div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' }}>Subject Teachers</h4>
              {selectedCourseToView.courseSubjects?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedCourseToView.courseSubjects.map(cs => (
                    <div key={cs.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{cs.subject}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{cs.teacher?.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No subject teachers assigned yet.</p>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" style={{ padding: '8px 24px' }} onClick={() => setIsViewModalOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {assignModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3>Assign Teacher for {selectedCourse?.courseName}-{selectedCourse?.section}</h3>
            <div style={styles.inputGroup}>
              <label>Select Teacher</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                style={styles.select}
              >
                <option value="">-- Select Teacher --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} {t.employeeId ? `(${t.employeeId})` : ''}</option>
                ))}
              </select>
            </div>
            <div style={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setAssignModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAssignTeacher} disabled={assigning || !selectedTeacherId}>
                {assigning ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  card: {
    background: 'var(--bg-card)',
    padding: '24px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-glow)',
  },
  cardTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    marginBottom: '16px',
    color: 'var(--text-primary)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  errorAlert: {
    padding: '10px',
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    borderRadius: '4px',
    marginBottom: '10px'
  },
  tableContainer: {
    overflowX: 'auto',
    marginTop: '10px'
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0 8px',
    textAlign: 'left'
  },
  th: {
    padding: '12px 16px',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--glass-border)',
  },
  tr: {
    transition: 'var(--transition-fast)',
  },
  td: {
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderTop: '1px solid var(--glass-border)',
    borderBottom: '1px solid var(--glass-border)',
    fontSize: '0.95rem',
    verticalAlign: 'middle',
    height: '60px'
  },
  iconBtn: {
    width: '28px',
    height: '28px',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalCard: {
    background: 'var(--bg-card)',
    padding: '24px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-glow)',
    width: '400px',
    maxWidth: '90%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  select: {
    padding: '10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text-primary)',
    width: '100%'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px'
  }
};
