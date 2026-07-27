import React, { useState, useEffect } from 'react';
import { getAssignments } from '../../api/studentApi';
import Loader from '../../components/Loader';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await getAssignments();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError('Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader message="Loading homework..." />;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>My Homework & Assignments</h2>
        <p style={styles.sub}>Check pending tasks assigned by your teachers.</p>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      <div style={styles.list}>
        {assignments.length === 0 ? (
          <p style={styles.noData}>You have no assignments at the moment. Enjoy your free time!</p>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.title}>{assignment.title}</h3>
                <span style={styles.teacherBadge}>
                  {assignment.teacher?.name || 'Teacher'}
                </span>
              </div>
              <p style={styles.desc}>{assignment.description}</p>
              
              <div style={styles.footerRow}>
                <span style={styles.date}>Assigned: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                {assignment.dueDate && (
                  <span style={styles.dueDate}>
                    Due: {new Date(assignment.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '900px' },
  header: { marginBottom: '10px' },
  sub: { color: 'var(--text-secondary)' },
  errorAlert: { padding: '10px', background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#fca5a5', borderRadius: '4px' },
  list: { display: 'flex', flexDirection: 'column', gap: '20px' },
  noData: { color: 'var(--text-muted)' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '24px 30px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' },
  teacherBadge: { padding: '4px 10px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' },
  desc: { color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.5', marginBottom: '20px' },
  footerRow: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '16px', fontSize: '0.85rem' },
  date: { color: 'var(--text-muted)' },
  dueDate: { color: 'var(--warning)', fontWeight: 'bold' }
};
