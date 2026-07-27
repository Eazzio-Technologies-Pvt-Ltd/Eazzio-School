import React, { useState, useEffect } from 'react';
import { getAttendanceHistory, getAllMyClasses } from '../../api/teacherApi';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';

export default function AttendanceHistory() {
  const [classes, setClasses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [records, setRecords] = useState(null);
  
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState('');

  // 1. Load classes on mount
  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      const data = await getAllMyClasses();
      setClasses(data);
      if (data.length > 0) {
        setSelectedCourseId(data[0].courseId);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load assigned classes.');
    } finally {
      setLoadingClasses(false);
    }
  };

  // 2. Fetch dates when course changes
  useEffect(() => {
    if (selectedCourseId) {
      fetchDates(selectedCourseId);
    }
  }, [selectedCourseId]);

  const fetchDates = async (courseId) => {
    try {
      setLoadingDates(true);
      setError('');
      setRecords(null);
      setSelectedDate('');
      setAvailableDates([]);
      
      const data = await getAttendanceHistory(null, courseId);
      const dates = data.dates || [];
      setAvailableDates(dates);
      
      if (dates.length > 0) {
        // Auto-select the most recent date
        const recent = new Date(dates[0]).toISOString().split('T')[0];
        setSelectedDate(recent);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load attendance dates for this class.');
    } finally {
      setLoadingDates(false);
    }
  };

  // 3. Fetch records when date changes
  useEffect(() => {
    if (selectedDate && selectedCourseId) {
      fetchRecords(selectedDate, selectedCourseId);
    }
  }, [selectedDate, selectedCourseId]);

  const fetchRecords = async (dateStr, courseId) => {
    try {
      setLoadingRecords(true);
      setError('');
      const data = await getAttendanceHistory(dateStr, courseId);
      setRecords(data.records);
    } catch (err) {
      console.error(err);
      setError('Failed to load records for the selected date.');
    } finally {
      setLoadingRecords(false);
    }
  };

  // Compute stats for selected date
  const stats = records ? {
    present: records.filter(r => r.status === 'PRESENT').length,
    late: records.filter(r => r.status === 'LATE').length,
    absent: records.filter(r => r.status === 'ABSENT').length,
    total: records.length
  } : null;

  if (loadingClasses) return <Loader message="Loading teaching assignments..." />;

  if (classes.length === 0) {
    return (
      <div style={styles.container} className="animate-fade-in">
        <EmptyState
          icon="📅"
          title="No Teaching Assignments"
          description="You are not currently assigned to teach any classes or subjects."
        />
      </div>
    );
  }

  const currentCourse = classes.find(c => c.courseId.toString() === selectedCourseId.toString());

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>Attendance History</h2>
        <p style={styles.sub}>Review past daily attendance records for your assigned classes.</p>
      </div>

      <div style={styles.topControl}>
        <label style={styles.controlLabel}>Select Class:</label>
        <select 
          style={styles.select}
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
        >
          {classes.map(cls => (
            <option key={cls.courseId} value={cls.courseId}>
              {cls.courseName}-{cls.section} {cls.isHomeroom ? '(Homeroom)' : ''}
            </option>
          ))}
        </select>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      <div style={styles.mainLayout}>
        {/* Sidebar: Calendar / Date Selection */}
        <div style={styles.sidebar}>
          <h3 style={styles.panelTitle}>Select Date</h3>
          {loadingDates ? (
            <p>Loading dates...</p>
          ) : availableDates.length === 0 ? (
            <p style={styles.noData}>No attendance history found for {currentCourse?.courseName}-{currentCourse?.section}.</p>
          ) : (
            <div style={styles.dateList}>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                style={styles.dateInput}
              />
              <div style={styles.divider}>Or quick select:</div>
              <div style={styles.quickSelectGrid}>
                {availableDates.slice(0, 10).map((date, idx) => {
                  const dStr = new Date(date).toISOString().split('T')[0];
                  const isSelected = dStr === selectedDate;
                  return (
                    <button 
                      key={idx} 
                      onClick={() => setSelectedDate(dStr)}
                      style={{
                        ...styles.dateBtn,
                        ...(isSelected ? styles.dateBtnActive : {})
                      }}
                    >
                      {new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Main Area: Records */}
        <div style={styles.content}>
          <h3 style={styles.panelTitle}>
            Records for {selectedDate ? new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '...'}
          </h3>
          
          {loadingRecords ? (
            <Loader message="Loading records..." />
          ) : !records ? (
            <p style={styles.noData}>Select a date to view records.</p>
          ) : records.length === 0 ? (
            <p style={styles.noData}>No records found for this date.</p>
          ) : (
            <>
              {/* Stats Bar */}
              <div style={styles.statsBar}>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>Total</span>
                  <span style={styles.statValue}>{stats.total}</span>
                </div>
                <div style={{...styles.statItem, color: 'var(--success)'}}>
                  <span style={styles.statLabel}>Present</span>
                  <span style={styles.statValue}>{stats.present}</span>
                </div>
                <div style={{...styles.statItem, color: 'var(--warning)'}}>
                  <span style={styles.statLabel}>Late</span>
                  <span style={styles.statValue}>{stats.late}</span>
                </div>
                <div style={{...styles.statItem, color: 'var(--danger)'}}>
                  <span style={styles.statLabel}>Absent</span>
                  <span style={styles.statValue}>{stats.absent}</span>
                </div>
              </div>

              {/* Table */}
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Roll No</th>
                      <th style={styles.th}>Student ID</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.id} style={styles.tr}>
                        <td style={styles.td}>{r.student.rollNumber}</td>
                        <td style={styles.td}>{r.student.studentId}</td>
                        <td style={{...styles.td, fontWeight: 'bold'}}>{r.student.name}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.statusBadge,
                            ...(r.status === 'PRESENT' ? styles.statusPresent : r.status === 'LATE' ? styles.statusLate : styles.statusAbsent)
                          }}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px' },
  header: { marginBottom: '10px' },
  sub: { color: 'var(--text-secondary)' },
  topControl: { display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-card)', padding: '16px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' },
  controlLabel: { fontWeight: '600', color: 'var(--text-primary)' },
  select: { padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', minWidth: '250px' },
  errorAlert: { padding: '10px', background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#fca5a5', borderRadius: '4px' },
  mainLayout: { display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '24px', alignItems: 'start' },
  sidebar: { background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glow)' },
  content: { background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glow)' },
  panelTitle: { fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' },
  dateList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  dateInput: { padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', width: '100%' },
  divider: { textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', margin: '10px 0' },
  quickSelectGrid: { display: 'flex', flexDirection: 'column', gap: '8px' },
  dateBtn: { padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', fontSize: '0.9rem' },
  dateBtnActive: { background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: 'bold' },
  noData: { color: 'var(--text-muted)', fontStyle: 'italic' },
  statsBar: { display: 'flex', gap: '24px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--glass-border)' },
  statItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  statLabel: { fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statValue: { fontSize: '1.5rem', fontWeight: 'bold' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { color: 'var(--text-secondary)', padding: '12px 14px', fontWeight: '600', borderBottom: '2px solid var(--glass-border)' },
  td: { padding: '14px', borderBottom: '1px solid var(--glass-border)', fontSize: '0.9rem' },
  tr: { transition: 'var(--transition-fast)', '&:hover': { background: 'var(--bg-card-hover)' } },
  statusBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' },
  statusPresent: { background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' },
  statusLate: { background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' },
  statusAbsent: { background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }
};
