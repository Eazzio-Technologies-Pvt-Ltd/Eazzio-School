import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getNotices, createNotice, deleteNotice } from '../../api/noticeApi';
import api from '../../api/axios';
import Loader from '../../components/Loader';

export default function PrincipalNotices() {
  const { user } = useContext(AuthContext);
  const [notices, setNotices] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    audience: 'SCHOOL',
    courseId: '',
  });
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [noticesData, coursesRes] = await Promise.all([
        getNotices({ schoolId: user.schoolId, role: 'ADMIN' }),
        api.get('/admin/courses', { params: { schoolId: user.schoolId } })
      ]);
      setNotices(noticesData || []);
      setCourses(coursesRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('schoolId', user.schoolId);
      data.append('title', formData.title);
      data.append('content', formData.content);
      data.append('audience', formData.audience);
      if (formData.audience === 'COURSE' && formData.courseId) {
        data.append('courseId', formData.courseId);
      }
      if (file) {
        data.append('attachment', file);
      }

      await createNotice(data);
      
      setFormData({ title: '', content: '', audience: 'SCHOOL', courseId: '' });
      setFile(null);
      setShowForm(false);
      loadData();
    } catch (err) {
      console.error('Failed to create notice', err);
      alert('Failed to create notice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    try {
      await deleteNotice(id);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete notice');
    }
  };

  if (loading) return <Loader message="Loading notices..." />;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <div>
          <h2>Notice Board Management</h2>
          <p style={styles.sub}>Publish circulars, announcements, and important updates.</p>
        </div>
        <button 
          style={styles.primaryBtn}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New Notice'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.formCard}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Create Notice</h3>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Notice Title</label>
            <input 
              style={styles.input}
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g. Annual Sports Day"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Audience</label>
            <select 
              style={styles.input}
              name="audience"
              value={formData.audience}
              onChange={handleInputChange}
            >
              <option value="SCHOOL">Entire School (Everyone)</option>
              <option value="TEACHERS">Teachers Only</option>
              <option value="STUDENTS">Students Only</option>
              <option value="COURSE">Specific Course</option>
            </select>
          </div>

          {formData.audience === 'COURSE' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Select Course</label>
              <select 
                style={styles.input}
                name="courseId"
                required
                value={formData.courseId}
                onChange={handleInputChange}
              >
                <option value="">-- Choose Course --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.className} - Sec {c.section}</option>
                ))}
              </select>
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Details (Optional)</label>
            <textarea 
              style={{ ...styles.input, height: '80px', resize: 'vertical' }}
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="Enter details..."
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Attach PDF Document (Optional)</label>
            <input 
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              style={styles.fileInput}
            />
          </div>

          <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? 'Publishing...' : 'Publish Notice'}
          </button>
        </form>
      )}

      <div style={styles.list}>
        {notices.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No notices have been published.</p>
        ) : (
          notices.map((note) => (
            <div key={note.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={styles.title}>{note.title}</h3>
                  <span style={styles.badge(note.audience)}>
                    {note.audience === 'COURSE' 
                      ? `Course: ${note.course?.className || 'N/A'}` 
                      : note.audience}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={styles.date}>{new Date(note.date).toLocaleDateString()}</span>
                  <button onClick={() => handleDelete(note.id)} style={styles.deleteBtn}>Delete</button>
                </div>
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
    maxWidth: '900px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  sub: {
    color: 'var(--text-secondary)',
  },
  primaryBtn: {
    padding: '10px 20px',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  formCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px 30px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  formGroup: {
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  input: {
    padding: '10px 14px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
  },
  fileInput: {
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px dashed var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
  },
  submitBtn: {
    padding: '12px',
    width: '100%',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
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
    padding: '20px 24px',
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
    whiteSpace: 'pre-wrap',
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
  deleteBtn: {
    background: 'transparent',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
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
