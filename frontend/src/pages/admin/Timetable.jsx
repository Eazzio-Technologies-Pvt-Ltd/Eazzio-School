import React, { useState, useEffect } from 'react';
import { getClasses, getTeachers, getTimetables, createTimetable, deleteTimetable } from '../../api/adminApi';
import Loader from '../../components/Loader';

export default function Timetable() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [teacherId, setTeacherId] = useState('');
  const [classId, setClassId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [period, setPeriod] = useState('Period 1');
  const [subject, setSubject] = useState('');

  // Filter state
  const [filterClass, setFilterClass] = useState('');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const periods = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6'];

  const loadData = async () => {
    try {
      setLoading(true);
      const [clsData, tchData, ttData] = await Promise.all([
        getClasses(),
        getTeachers(),
        getTimetables()
      ]);
      setClasses(clsData);
      setTeachers(tchData);
      setTimetables(ttData);
    } catch (err) {
      console.error(err);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!teacherId || !classId || !subject) {
      setError('All fields are required');
      return;
    }

    try {
      setSubmitting(true);
      await createTimetable({ teacherId, classId, dayOfWeek, period, subject });
      
      // Reset some fields
      setSubject('');
      
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create timetable entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this routine entry?')) return;
    
    try {
      await deleteTimetable(id);
      await loadData();
    } catch (err) {
      setError('Failed to delete timetable entry.');
    }
  };

  const filteredTimetables = filterClass 
    ? timetables.filter(t => t.classId === parseInt(filterClass)) 
    : timetables;

  // Group by day for the view
  const grouped = {};
  days.forEach(d => grouped[d] = []);
  filteredTimetables.forEach(t => {
    if (grouped[t.dayOfWeek]) grouped[t.dayOfWeek].push(t);
  });

  if (loading) return <Loader message="Loading timetable data..." />;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>Master Timetable</h2>
        <p style={styles.sub}>Assign weekly routines for teachers and classes.</p>
      </div>

      <div style={styles.mainGrid}>
        {/* Left: Form */}
        <div style={styles.pane}>
          <h3 style={styles.paneTitle}>Add Routine Entry</h3>
          {error && <div style={styles.errorAlert}>{error}</div>}
          
          <form onSubmit={handleCreate} style={styles.form}>
            <div style={styles.inputGroup}>
              <label>Teacher</label>
              <select value={teacherId} onChange={e => setTeacherId(e.target.value)} required>
                <option value="">Select Teacher</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            
            <div style={styles.inputGroup}>
              <label>Class</label>
              <select value={classId} onChange={e => setClassId(e.target.value)} required>
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.className}-{c.section}</option>)}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label>Day of Week</label>
              <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label>Period</label>
              <select value={period} onChange={e => setPeriod(e.target.value)}>
                {periods.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label>Subject</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics" required />
            </div>

            <button type="submit" className="btn-primary" disabled={submitting} style={styles.submitBtn}>
              {submitting ? 'Adding...' : 'Add Entry'}
            </button>
          </form>
        </div>

        {/* Right: View */}
        <div style={styles.viewPane}>
          <div style={styles.viewHeader}>
            <h3 style={styles.paneTitle}>Routine Viewer</h3>
            <select style={styles.filterSelect} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.className}-{c.section}</option>)}
            </select>
          </div>

          <div style={styles.routineWrapper}>
            {days.map(day => (
              <div key={day} style={styles.daySection}>
                <h4 style={styles.dayTitle}>{day}</h4>
                {grouped[day].length === 0 ? (
                  <p style={styles.noData}>No periods assigned.</p>
                ) : (
                  <div style={styles.cardsGrid}>
                    {grouped[day].map(t => (
                      <div key={t.id} style={styles.card}>
                        <div style={styles.cardTop}>
                          <span style={styles.periodBadge}>{t.period}</span>
                          <button onClick={() => handleDelete(t.id)} style={styles.deleteBtn}>✕</button>
                        </div>
                        <div style={styles.subjectText}>{t.subject}</div>
                        <div style={styles.metaText}>Class: {t.class.className}-{t.class.section}</div>
                        <div style={styles.metaText}>Teacher: {t.teacher.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  header: { marginBottom: '10px' },
  sub: { color: 'var(--text-secondary)' },
  errorAlert: { padding: '10px', background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#fca5a5', borderRadius: '4px', marginBottom: '16px' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' },
  pane: { background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glow)' },
  viewPane: { background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glow)', height: '100%' },
  paneTitle: { fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  submitBtn: { padding: '12px', marginTop: '10px' },
  viewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' },
  filterSelect: { padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' },
  routineWrapper: { display: 'flex', flexDirection: 'column', gap: '24px' },
  daySection: { display: 'flex', flexDirection: 'column', gap: '12px' },
  dayTitle: { color: 'var(--primary)', fontSize: '1.1rem' },
  noData: { color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' },
  card: { background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  periodBadge: { background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' },
  deleteBtn: { background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1rem' },
  subjectText: { fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)' },
  metaText: { fontSize: '0.8rem', color: 'var(--text-secondary)' }
};
