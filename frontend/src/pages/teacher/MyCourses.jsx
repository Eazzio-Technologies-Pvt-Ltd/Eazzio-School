import React, { useState, useEffect } from 'react';
import { getAllMyClasses } from '../../api/teacherApi';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';

export default function MyCourses() {
  const [classes, setClasses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAllMyClasses();
      setClasses(data);
      if (data.length > 0) {
        setSelectedCourse(prev => {
          if (prev) {
            const stillExists = data.find(c => c.courseId === prev.courseId);
            return stillExists || data[0];
          }
          return data[0];
        });
      } else {
        setSelectedCourse(null);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load assigned classes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter students dynamically on the client
  const filteredStudents = selectedCourse?.students?.filter(student => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.rollNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.studentId || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) || [];

  if (loading) return <Loader message="Loading teaching assignments..." />;

  if (classes.length === 0) {
    return (
      <div style={styles.container} className="animate-fade-in">
        <EmptyState
          icon="📅"
          title="No Teaching Assignments"
          description="You are not currently assigned to teach any classes or subjects. Please contact the principal if this is an error."
        />
      </div>
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>My Teaching Assignments</h2>
        <p style={styles.sub}>
          Select a class to view its roster.
        </p>
      </div>
      
      {error && <div style={{color: '#ef4444'}}>{error}</div>}

      {/* Classes Grid */}
      <div style={styles.cardsGrid}>
        {classes.map(cls => (
          <div 
            key={cls.courseId} 
            style={{
              ...styles.classCard,
              ...(selectedCourse?.courseId === cls.courseId ? styles.classCardActive : {})
            }}
            onClick={() => {
              setSelectedCourse(cls);
              setSearchQuery('');
              setError('');
            }}
          >
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>{cls.courseName}-{cls.section}</h3>
              <span style={styles.cardCount}>{cls.students?.length || 0} Students</span>
            </div>
            <div style={styles.cardSubjects}>
              {cls.subjects.map((sub, idx) => (
                <span 
                  key={idx} 
                  style={sub === 'Homeroom' ? styles.badgeHomeroom : styles.badgeSubject}
                >
                  {sub}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={styles.tablePane}>
        <div style={styles.tablePaneHeader}>
          <h3 style={styles.tableTitle}>Student Directory: {selectedCourse?.courseName}-{selectedCourse?.section}</h3>
          <span style={styles.recordsCount}>{filteredStudents.length} Records found</span>
        </div>

        {/* Filtering Controls */}
        <div style={styles.filterGrid}>
          <input type="text" placeholder="🔍 Search name, roll, ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={styles.searchBar} />
        </div>

        {/* Records Table */}
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Student ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Roll</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" style={styles.noRecords}>No students found.</td>
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
                    <td style={styles.td}>{student.phone || '-'}</td>
                    <td style={styles.td}>
                      <span style={styles.activeBadge}>Active</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '30px' },
  header: { marginBottom: '10px' },
  sub: { color: 'var(--text-secondary)' },
  cardsGrid: { display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '10px' },
  classCard: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '16px', minWidth: '250px', cursor: 'pointer', transition: 'all 0.2s ease', opacity: 0.8 },
  classCardActive: { border: '2px solid var(--primary)', opacity: 1, boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)', transform: 'translateY(-2px)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  cardTitle: { fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 },
  cardCount: { fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' },
  cardSubjects: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  badgeSubject: { padding: '4px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#93c5fd', fontSize: '0.75rem', fontWeight: '600' },
  badgeHomeroom: { padding: '4px 8px', borderRadius: '4px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#fde047', fontSize: '0.75rem', fontWeight: '700' },
  
  tablePane: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)', overflow: 'hidden' },
  tablePaneHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  tableTitle: { fontSize: '1.1rem', fontWeight: '700', margin: 0 },
  recordsCount: { fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' },
  filterGrid: { display: 'flex', gap: '12px', marginBottom: '20px' },
  searchBar: { flex: 1, background: 'var(--input-bg)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { borderBottom: '2px solid var(--glass-border)' },
  th: { color: 'var(--text-secondary)', padding: '12px 14px', fontWeight: '600', fontSize: '0.85rem' },
  td: { padding: '14px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)', fontSize: '0.85rem', verticalAlign: 'middle' },
  nameCell: { padding: '14px', borderBottom: '1px solid var(--glass-border)', fontSize: '0.85rem' },
  tr: { transition: 'var(--transition-fast)', '&:hover': { background: 'var(--bg-card-hover)' } },
  noRecords: { padding: '30px', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' },
  activeBadge: { padding: '4px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: '#a7f3d0', fontSize: '0.8rem', fontWeight: '700' }
};
