import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getNotices } from '../../api/noticeApi';
import Loader from '../../components/Loader';

export default function Notices() {
  const { user } = useContext(AuthContext);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotices = async () => {
      try {
        const data = await getNotices({ schoolId: user.schoolId, role: 'STUDENT', courseId: user.courseId });
        setNotices(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadNotices();
  }, [user]);

  if (loading) return <Loader message="Loading notice board..." />;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>Announcements Bulletin Board</h2>
        <p style={styles.sub}>Check circulars, exam notifications, and campus event flyers.</p>
      </div>

      <div style={styles.list}>
        {notices.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No announcements available.</p>
        ) : (
          notices.map((note) => (
            <div key={note.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={styles.title}>{note.title}</h3>
                  <span style={styles.badge(note.audience)}>
                    {note.audience === 'COURSE' 
                      ? `Course: ${note.course?.courseName || 'N/A'}` 
                      : note.audience}
                  </span>
                </div>
                <span style={styles.date}>{new Date(note.date).toLocaleDateString()}</span>
              </div>
              {note.content && <p style={styles.desc}>{note.content}</p>}
              
              {note.attachmentUrl && (
                <div style={{ marginTop: '16px' }}>
                  <a href={`http://localhost:5000${note.attachmentUrl}`} target="_blank" rel="noreferrer" style={styles.downloadLink}>
                    📄 View Attached PDF
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
    maxWidth: '800px',
  },
  header: {
    marginBottom: '10px',
  },
  sub: {
    color: 'var(--text-secondary)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px 30px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '12px',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '8px',
  },
  title: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  date: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  desc: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
  },
  badge: (audience) => ({
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    background: audience === 'SCHOOL' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
    color: audience === 'SCHOOL' ? 'var(--primary)' : 'var(--success)',
  }),
  downloadLink: {
    color: 'var(--primary)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 'var(--radius-sm)',
  }
};
