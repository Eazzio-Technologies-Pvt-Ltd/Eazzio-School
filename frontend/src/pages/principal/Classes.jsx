import React, { useState, useEffect } from 'react';
import { getClasses, createClass, assignClassTeacher, getTeachers } from '../../api/principalApi';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create Class Form
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Assign Teacher Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clsData, tchData] = await Promise.all([getClasses(), getTeachers()]);
      setClasses(clsData);
      setTeachers(tchData);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await createClass({ className, section, academicYear });
      setClassName('');
      setSection('');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create class');
    } finally {
      setCreating(false);
    }
  };

  const openAssignModal = (cls) => {
    setSelectedClass(cls);
    setSelectedTeacherId(cls.teacherId || '');
    setAssignModalOpen(true);
  };

  const handleAssignTeacher = async () => {
    if (!selectedTeacherId) return;
    setAssigning(true);
    try {
      await assignClassTeacher(selectedClass.id, parseInt(selectedTeacherId));
      setAssignModalOpen(false);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign teacher');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px' }}>Manage Classes</h2>

      <div style={styles.grid}>
        {/* Create Class Form */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Create New Class</h3>
          {error && <div style={styles.errorAlert}>{error}</div>}
          <form onSubmit={handleCreateClass} style={styles.form}>
            <div style={styles.inputGroup}>
              <label>Class Name (e.g. 10)</label>
              <input type="text" value={className} onChange={e => setClassName(e.target.value)} required />
            </div>
            <div style={styles.inputGroup}>
              <label>Section (e.g. A)</label>
              <input type="text" value={section} onChange={e => setSection(e.target.value)} required />
            </div>
            <div style={styles.inputGroup}>
              <label>Academic Year</label>
              <input type="text" value={academicYear} onChange={e => setAcademicYear(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary" disabled={creating} style={{ marginTop: '10px' }}>
              {creating ? 'Creating...' : 'Create Class'}
            </button>
          </form>
        </div>

        {/* Classes List */}
        <div style={{ ...styles.card, gridColumn: 'span 2' }}>
          <h3 style={styles.cardTitle}>Class List</h3>
          {loading ? (
            <p>Loading classes...</p>
          ) : classes.length === 0 ? (
            <p>No classes found.</p>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Academic Year</th>
                    <th>Class Teacher</th>
                    <th>Students</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map(cls => (
                    <tr key={cls.id}>
                      <td>{cls.className} - {cls.section}</td>
                      <td>{cls.academicYear}</td>
                      <td>{cls.teacher ? cls.teacher.name : <span style={{color:'var(--text-muted)'}}>Unassigned</span>}</td>
                      <td>{cls._count.students}</td>
                      <td>
                        <button className="btn-primary" style={styles.smallBtn} onClick={() => openAssignModal(cls)}>
                          Assign Teacher
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Assign Teacher Modal */}
      {assignModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3>Assign Teacher for {selectedClass?.className}-{selectedClass?.section}</h3>
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
    </div>
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
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  smallBtn: {
    padding: '4px 10px',
    fontSize: '0.8rem',
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
