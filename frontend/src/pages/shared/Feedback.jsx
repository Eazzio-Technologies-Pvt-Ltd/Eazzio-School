import React, { useState, useEffect, useContext } from 'react';
import { getFeedbacks, createFeedback } from '../../api/feedbackApi';
import { getTeachers } from '../../api/principalApi';
import { getCourseDetails } from '../../api/teacherApi';
import { AuthContext } from '../../context/AuthContext';
import Loader from '../../components/Loader';

export default function Feedback() {
  const { user } = useContext(AuthContext);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create Form State
  const [showForm, setShowForm] = useState(false);
  const [targets, setTargets] = useState([]); // List of Teachers or Students
  const [selectedTarget, setSelectedTarget] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const targetLabel = user.role === 'PRINCIPAL' ? 'Teacher' : user.role === 'TEACHER' ? 'Student' : '';
  const canWrite = user.role === 'PRINCIPAL' || user.role === 'TEACHER';

  useEffect(() => {
    fetchFeedbacks();
    if (canWrite) {
      fetchTargets();
    }
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const data = await getFeedbacks();
      setFeedbacks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTargets = async () => {
    try {
      if (user.role === 'PRINCIPAL') {
        const teachers = await getTeachers();
        setTargets(teachers);
      } else if (user.role === 'TEACHER') {
        const course = await getCourseDetails();
        if (course && course.students) {
          setTargets(course.students);
        }
      }
    } catch (err) {
      console.error('Failed to load targets', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTarget || !content.trim()) {
      setError(`Please select a ${targetLabel} and write feedback.`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await createFeedback({
        targetType: user.role === 'PRINCIPAL' ? 'TEACHER' : 'STUDENT',
        targetId: selectedTarget,
        content
      });
      setSuccess('Feedback submitted successfully!');
      setContent('');
      setSelectedTarget('');
      setShowForm(false);
      fetchFeedbacks(); // Refresh list
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader message="Loading feedbacks..." />;

  return (
    <div style={s.container} className="animate-fade-in">
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Feedback & Reviews</h2>
          <p style={s.subtitle}>
            {user.role === 'ADMIN' ? 'School-wide feedback logs.' : `Manage performance feedback.`}
          </p>
        </div>
        {canWrite && (
          <button style={s.addBtn} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : `＋ Write Feedback`}
          </button>
        )}
      </div>

      {success && <div style={s.successBox}>✅ {success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={s.formCard}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#111827' }}>Submit Feedback</h3>
          {error && <div style={s.errorBox}>⚠️ {error}</div>}
          
          <div style={s.formGroup}>
            <label style={s.label}>Select {targetLabel}</label>
            <select 
              value={selectedTarget} 
              onChange={e => setSelectedTarget(e.target.value)}
              style={s.input}
            >
              <option value="">-- Choose {targetLabel} --</option>
              {targets.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.rollNumber ? `(${t.rollNumber})` : t.employeeId ? `(${t.employeeId})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Feedback / Remarks</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={`Write your remarks about the ${targetLabel.toLowerCase()} here...`}
              style={{ ...s.input, minHeight: '100px', resize: 'vertical' }}
            />
          </div>

          <div style={{ textAlign: 'right' }}>
            <button type="submit" style={s.submitBtn} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      )}

      <div style={s.feedContainer}>
        {feedbacks.length === 0 ? (
          <div style={s.emptyState}>No feedback records found.</div>
        ) : (
          feedbacks.map(fb => (
            <div key={fb.id} style={s.feedbackCard}>
              <div style={s.fbHeader}>
                <div style={s.fbTarget}>
                  <span style={s.targetLabel}>About:</span> 
                  <span style={s.targetName}>
                    {fb.targetTeacher ? `${fb.targetTeacher.name} (Teacher)` : 
                     fb.targetStudent ? `${fb.targetStudent.name} (Student)` : 'Unknown'}
                  </span>
                </div>
                <div style={s.fbDate}>{new Date(fb.createdAt).toLocaleDateString()} {new Date(fb.createdAt).toLocaleTimeString()}</div>
              </div>
              
              <div style={s.fbContent}>{fb.content}</div>
              
              <div style={s.fbFooter}>
                <span style={s.authorLabel}>Written by:</span>
                <span style={s.authorName}>
                  {fb.authorPrincipal ? `${fb.authorPrincipal.name} (Principal)` :
                   fb.authorTeacher ? `${fb.authorTeacher.name} (Teacher)` : 'Unknown'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const s = {
  container: { padding: '20px', maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { margin: 0, fontSize: '1.6rem', color: '#111827' },
  subtitle: { margin: '4px 0 0', color: '#6b7280', fontSize: '0.95rem' },
  addBtn: { background: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  
  successBox: { background: 'rgba(16,185,129,0.1)', color: '#059669', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(16,185,129,0.2)' },
  errorBox: { background: 'rgba(239,68,68,0.1)', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(239,68,68,0.2)' },
  
  formCard: { background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', marginBottom: '6px', fontSize: '0.88rem', fontWeight: '600', color: '#374151' },
  input: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem', boxSizing: 'border-box' },
  submitBtn: { background: '#111827', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },

  feedContainer: { display: 'flex', flexDirection: 'column', gap: '16px' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#9ca3af', background: '#f9fafb', borderRadius: '12px', border: '1px dashed #d1d5db' },
  feedbackCard: { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  fbHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' },
  fbTarget: { fontSize: '0.95rem' },
  targetLabel: { color: '#6b7280', marginRight: '6px' },
  targetName: { fontWeight: '700', color: '#111827' },
  fbDate: { color: '#9ca3af', fontSize: '0.85rem' },
  fbContent: { color: '#374151', lineHeight: '1.6', fontSize: '0.95rem', whiteSpace: 'pre-wrap', marginBottom: '16px' },
  fbFooter: { fontSize: '0.85rem', background: '#f9fafb', padding: '8px 12px', borderRadius: '6px', display: 'inline-block' },
  authorLabel: { color: '#6b7280', marginRight: '6px' },
  authorName: { fontWeight: '600', color: '#4b5563' }
};
