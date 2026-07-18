import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getCourseDetails } from '../../api/teacherApi';
import Loader from '../../components/Loader';

export default function TeacherProfile() {
  const { user } = useContext(AuthContext);
  const [assignedCourse, setAssignedCourse] = useState('');
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getCourseDetails();
        setAssignedCourse(data.assignedCourse);
        setStudentCount(data.students.length);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  if (loading) return <Loader message="Loading profile specifications..." />;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>Faculty Profile Details</h2>
        <p style={styles.sub}>Personal credentials and academic courseroom mapping details.</p>
      </div>

      <div style={styles.pane}>
        <div style={styles.avatarLarge}>
          {user?.name ? user.name[0].toUpperCase() : 'T'}
        </div>

        <div style={styles.infoList}>
          <div style={styles.infoItem}>
            <span style={styles.label}>Full Instructor Name</span>
            <span style={styles.value}>{user?.name}</span>
          </div>

          <div style={styles.infoItem}>
            <span style={styles.label}>Instructor Email Address</span>
            <span style={styles.value}>{user?.email}</span>
          </div>

          <div style={styles.infoItem}>
            <span style={styles.label}>Assigned Course / Grade</span>
            <span style={{ ...styles.value, color: 'var(--primary)', fontWeight: '700' }}>{assignedCourse}</span>
          </div>

          <div style={styles.infoItem}>
            <span style={styles.label}>Students Enrolled In Course</span>
            <span style={styles.value}>{studentCount} Students</span>
          </div>
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
    maxWidth: '600px',
  },
  header: {
    marginBottom: '10px',
  },
  sub: {
    color: 'var(--text-secondary)',
  },
  pane: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '40px 32px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '30px',
  },
  avatarLarge: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary), #a78bfa)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '2.5rem',
    fontWeight: '800',
    color: '#fff',
    boxShadow: '0 0 20px var(--primary-glow)',
  },
  infoList: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '12px',
  },
  label: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: '600',
  },
  value: {
    fontSize: '1.05rem',
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
};
