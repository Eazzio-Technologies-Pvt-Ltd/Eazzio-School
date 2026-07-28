import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { getAllMyClasses, getAssignments, createAssignment, deleteAssignment } from '../../api/teacherApi';
import Loader from '../../components/Loader';
import { Trash2, Paperclip, ExternalLink } from 'lucide-react';

export default function TeacherAssignments() {
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: '',
    dueDate: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [classesData, assignmentsData] = await Promise.all([
        getAllMyClasses(),
        getAssignments()
      ]);
      setClasses(classesData);
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
      
      if (classesData.length > 0) {
        setFormData(prev => ({ ...prev, courseId: classesData[0].courseId }));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setUploadError('');
    if (file) {
      // Validate size (5MB = 5 * 1024 * 1024 bytes)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('File exceeds 5MB limit.');
        setAttachment(null);
        e.target.value = null; // reset input
        return;
      }
      setAttachment(file);
    } else {
      setAttachment(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.courseId) return;

    try {
      setIsSubmitting(true);
      setError('');
      setUploadError('');
      
      let finalFormData = { ...formData };

      // Upload attachment to Cloudinary if selected
      if (attachment) {
        const uploadData = new FormData();
        uploadData.append('file', attachment);
        uploadData.append('upload_preset', 'eazzio_school');
        
        const cloudinaryRes = await fetch('https://api.cloudinary.com/v1_1/dpv9ov0ex/auto/upload', {
          method: 'POST',
          body: uploadData
        });

        if (!cloudinaryRes.ok) {
          throw new Error('Failed to upload attachment to Cloudinary');
        }
        
        const cloudData = await cloudinaryRes.json();
        finalFormData.attachmentUrl = cloudData.secure_url;
      }

      await createAssignment(finalFormData);
      setIsModalOpen(false);
      setFormData({ title: '', description: '', courseId: formData.courseId, dueDate: '' });
      setAttachment(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to post assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    
    try {
      setLoading(true);
      await deleteAssignment(id);
      await fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to delete assignment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader message="Loading assignments..." />;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.headerRow}>
        <div>
          <h2>Class Assignments</h2>
          <p style={styles.sub}>Post and track homework assignments for your classes.</p>
        </div>
        <button style={styles.primaryBtn} onClick={() => setIsModalOpen(true)}>
          + Post Assignment
        </button>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      <div style={styles.list}>
        {assignments.length === 0 ? (
          <p style={styles.noData}>You haven't posted any assignments yet.</p>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.title}>{assignment.title}</h3>
                  <span style={styles.courseBadge}>
                    {assignment.course?.courseName}-{assignment.course?.section}
                  </span>
                </div>
                <button 
                  onClick={() => handleDelete(assignment.id)} 
                  style={styles.deleteBtn}
                  title="Delete Assignment"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <p style={styles.desc}>{assignment.description}</p>
              
              <div style={styles.footerRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={styles.date}>Posted: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                  {assignment.attachmentUrl && (
                    <a href={assignment.attachmentUrl} target="_blank" rel="noopener noreferrer" style={styles.attachmentLink}>
                      <Paperclip size={14} /> View Attachment
                    </a>
                  )}
                </div>
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

      {isModalOpen && ReactDOM.createPortal(
        <div style={styles.modalOverlay} className="animate-fade-in">
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Post New Assignment</h3>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Target Class <span style={{color: 'var(--danger)'}}>*</span></label>
                <select 
                  name="courseId" 
                  value={formData.courseId} 
                  onChange={handleChange}
                  style={styles.input}
                  required
                >
                  <option value="" disabled>Select a class</option>
                  {classes.map(cls => (
                    <option key={cls.courseId} value={cls.courseId}>
                      {cls.courseName}-{cls.section} {cls.isHomeroom ? '(Homeroom)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Title <span style={{color: 'var(--danger)'}}>*</span></label>
                <input 
                  type="text" 
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Chapter 3 Review Questions"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Instructions / Description <span style={{color: 'var(--danger)'}}>*</span></label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Write detailed instructions here..."
                  style={{ ...styles.input, minHeight: '140px', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Due Date (Optional)</label>
                <input 
                  type="date" 
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Attachment (Photo/PDF up to 5MB, Optional)</label>
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  style={styles.fileInput}
                />
                {uploadError && <span style={styles.errorText}>{uploadError}</span>}
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} style={styles.submitBtn}>
                  {isSubmitting ? 'Posting...' : 'Post Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '1000px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sub: { color: 'var(--text-secondary)' },
  primaryBtn: { padding: '10px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s' },
  errorAlert: { padding: '12px 16px', background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px', fontWeight: '500' },
  list: { display: 'flex', flexDirection: 'column', gap: '20px' },
  noData: { color: 'var(--text-muted)', textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--glass-border)' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', padding: '24px 30px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', transition: 'transform 0.2s, box-shadow 0.2s' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: '700' },
  courseBadge: { padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '0.5px' },
  desc: { color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.6', marginBottom: '24px', fontSize: '0.95rem' },
  footerRow: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '16px', fontSize: '0.85rem', fontWeight: '500' },
  date: { color: 'var(--text-muted)' },
  dueDate: { color: 'var(--warning)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' },
  attachmentLink: { display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', textDecoration: 'none', background: 'var(--primary-glow)', padding: '4px 10px', borderRadius: '4px', fontWeight: '600', transition: 'all 0.2s', '&:hover': { background: 'var(--primary)', color: '#fff' } },
  
  // Modal Styles
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' },
  modalContent: { background: 'var(--bg-card)', width: '100%', maxWidth: '550px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', background: 'var(--bg-card-alt)', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 },
  closeBtn: { background: 'rgba(0,0,0,0.05)', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' },
  form: { padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px', overflowY: 'auto' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '600' },
  input: { padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '0.95rem', transition: 'border-color 0.2s, box-shadow 0.2s', outline: 'none' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' },
  cancelBtn: { padding: '10px 24px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' },
  submitBtn: { padding: '10px 24px', background: 'var(--primary)', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', transition: 'background 0.2s, transform 0.1s' },
  deleteBtn: { background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '6px', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  fileInput: { padding: '8px', border: '1px dashed var(--glass-border)', borderRadius: '8px', color: 'var(--text-secondary)', background: 'var(--bg-card-alt)', width: '100%' },
  errorText: { color: 'var(--danger)', fontSize: '0.85rem', marginTop: '4px' }
};
