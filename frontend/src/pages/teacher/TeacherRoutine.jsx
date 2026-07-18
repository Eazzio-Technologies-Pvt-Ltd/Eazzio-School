import React, { useState, useEffect } from 'react';
import { getRoutine } from '../../api/teacherApi';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';

export default function TeacherRoutine() {
  const [routine, setRoutine] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    const fetchRoutine = async () => {
      try {
        const data = await getRoutine();
        setRoutine(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load routine.');
      } finally {
        setLoading(false);
      }
    };
    fetchRoutine();
  }, []);

  if (loading) return <Loader message="Loading your weekly routine..." />;

  const hasRoutine = Object.values(routine).some(day => day && day.length > 0);

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>My Weekly Routine</h2>
        <p style={styles.sub}>View your assigned courses and periods for the week.</p>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      <div style={styles.card}>
        {!hasRoutine ? (
          <EmptyState icon="📅" title="No Routine Assigned" description="Your weekly timetable has not been set by the principal yet." />
        ) : (
          <div style={styles.routineWrapper}>
            {days.map(day => (
              <div key={day} style={styles.daySection}>
                <h3 style={styles.dayTitle}>{day}</h3>
                
                {(!routine[day] || routine[day].length === 0) ? (
                  <p style={styles.freeDay}>No periods assigned (Free Day)</p>
                ) : (
                  <div style={styles.periodsGrid}>
                    {routine[day].map((periodObj, idx) => (
                      <div key={idx} style={styles.periodCard}>
                        <div style={styles.periodBadge}>{periodObj.period}</div>
                        <div style={styles.subjectText}>{periodObj.subject}</div>
                        <div style={styles.courseText}>Course: {periodObj.course?.className}-{periodObj.course?.section}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  header: { marginBottom: '10px' },
  sub: { color: 'var(--text-secondary)' },
  errorAlert: { padding: '10px', background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#fca5a5', borderRadius: '4px' },
  card: { background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glow)' },
  routineWrapper: { display: 'flex', flexDirection: 'column', gap: '30px' },
  daySection: { display: 'flex', flexDirection: 'column', gap: '10px' },
  dayTitle: { fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' },
  freeDay: { color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' },
  periodsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  periodCard: { background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'transform 0.2s ease', '&:hover': { transform: 'translateY(-2px)' } },
  periodBadge: { background: 'var(--primary)', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', alignSelf: 'flex-start' },
  subjectText: { fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1.1rem' },
  courseText: { color: 'var(--text-secondary)', fontSize: '0.9rem' }
};
