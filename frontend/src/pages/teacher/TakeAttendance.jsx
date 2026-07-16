import React, { useState, useEffect } from 'react';
import { getClassDetails, saveAttendance } from '../../api/teacherApi';
import Loader from '../../components/Loader';

export default function TakeAttendance() {
  const [assignedClass, setAssignedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(() => {
    const local = new Date();
    const year = local.getFullYear();
    const month = String(local.getMonth() + 1).padStart(2, '0');
    const day = String(local.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const triggerToast = (msg) => {
    setToast({ visible: true, message: msg });
    setTimeout(() => {
      setToast({ visible: false, message: '' });
    }, 3000);
  };

  const loadRoster = async () => {
    try {
      setLoading(true);
      setFeedback({ type: '', message: '' });
      const data = await getClassDetails();
      setAssignedClass(data.assignedClass);
      setStudents(data.students);
      initializeAttendance(data.students, attendanceDate);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error loading roster' });
    } finally {
      setLoading(false);
    }
  };

  const initializeAttendance = (list, dateStr) => {
    const map = {};
    const targetDateStr = new Date(dateStr).toDateString();
    let isMarked = false;

    list.forEach(student => {
      const log = student.attendance?.find(att => new Date(att.date).toDateString() === targetDateStr);
      if (log) {
        map[student.id] = log.status;
        isMarked = true;
      } else {
        map[student.id] = 'PRESENT';
      }
    });

    setAttendanceMap(map);
    setAlreadyMarked(isMarked);
  };

  useEffect(() => {
    loadRoster();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      initializeAttendance(students, attendanceDate);
    }
  }, [attendanceDate, students]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSelectAll = (status) => {
    const updated = {};
    students.forEach(s => {
      updated[s.id] = status;
    });
    setAttendanceMap(updated);
    triggerToast(`All students marked as ${status}!`);
  };

  const handleSave = async () => {
    setShowConfirm(false);
    setFeedback({ type: '', message: '' });
    setSubmitting(true);

    const records = Object.keys(attendanceMap).map(id => ({
      studentId: parseInt(id, 10),
      status: attendanceMap[id]
    }));

    try {
      await saveAttendance({
        date: attendanceDate,
        records
      });

      triggerToast('Attendance records saved successfully!');
      
      // Refresh local logs
      const data = await getClassDetails();
      setStudents(data.students);
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to save attendance' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader message="Loading class roster..." />;

  if (!assignedClass || assignedClass === 'Unassigned') {
    return (
      <div style={styles.container} className="animate-fade-in">
        <div style={styles.header}>
          <h2>Mark Student Attendance</h2>
          <p style={styles.sub}>You are not currently assigned to any class.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2>Mark Attendance - {assignedClass}</h2>
        <p style={styles.sub}>Log daily student attendance, including Late arrivals.</p>
      </div>

      {toast.visible && (
        <div style={styles.toast}>
          <span>✅</span> {toast.message}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Confirm Submission</h3>
            <p style={{ margin: '14px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Are you sure you want to submit the roll call sheet for {assignedClass} on {new Date(attendanceDate).toLocaleDateString()}?
            </p>
            <div style={styles.modalActions}>
              <button onClick={() => setShowConfirm(false)} className="btn-secondary" style={styles.modalBtn}>
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary" style={styles.modalBtn}>
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.pane}>
        {feedback.message && (
          <div style={{
            ...styles.feedback,
            ...(feedback.type === 'error' ? styles.errorFeedback : styles.successFeedback)
          }}>
            {feedback.type === 'error' ? '⚠️' : '✅'} {feedback.message}
          </div>
        )}

        {alreadyMarked && (
          <div style={styles.warningAlert}>
            <span>⚠️</span> **Notice**: Attendance has already been logged for this date. Submitting again will overwrite existing records.
          </div>
        )}

        <div style={styles.controlBar}>
          <div style={styles.controlsGroup}>
            <div style={styles.inputCol}>
              <label htmlFor="attendance-date">Roll Call Date</label>
              <input
                id="attendance-date"
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
          </div>

          <div style={styles.btnRow}>
            <button onClick={() => handleSelectAll('PRESENT')} className="btn-secondary" style={styles.shortcutBtn} disabled={students.length === 0}>
              ✓ All Present
            </button>
            <button onClick={() => handleSelectAll('ABSENT')} className="btn-secondary" style={styles.shortcutBtn} disabled={students.length === 0}>
              ✗ All Absent
            </button>

            <button
              id="attendance-submit"
              onClick={() => setShowConfirm(true)}
              className="btn-primary"
              disabled={submitting || students.length === 0}
              style={styles.saveBtn}
            >
              {submitting ? 'Recording...' : 'Submit Attendance'}
            </button>
          </div>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Roll Number</th>
                <th style={styles.th}>Student Name</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Attendance Status</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No student profiles found for this class.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const status = attendanceMap[student.id];
                  return (
                    <tr key={student.id} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: '700', color: 'var(--text-primary)' }}>{student.rollNumber}</td>
                      <td style={{ ...styles.td, fontWeight: '600' }}>{student.user?.name || student.name}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={styles.segmentedControl}>
                          <button
                            onClick={() => handleStatusChange(student.id, 'PRESENT')}
                            style={{
                              ...styles.segmentBtn,
                              ...(status === 'PRESENT' ? styles.segmentBtnActivePresent : {})
                            }}
                          >
                            PRESENT
                          </button>
                          <button
                            onClick={() => handleStatusChange(student.id, 'LATE')}
                            style={{
                              ...styles.segmentBtn,
                              ...(status === 'LATE' ? styles.segmentBtnActiveLate : {})
                            }}
                          >
                            LATE
                          </button>
                          <button
                            onClick={() => handleStatusChange(student.id, 'ABSENT')}
                            style={{
                              ...styles.segmentBtn,
                              ...(status === 'ABSENT' ? styles.segmentBtnActiveAbsent : {})
                            }}
                          >
                            ABSENT
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
  pane: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' },
  warningAlert: { background: 'var(--warning-glow)', border: '1px solid var(--warning)', color: 'var(--warning)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.4' },
  controlBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginBottom: '24px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '20px' },
  controlsGroup: { display: 'flex', gap: '16px', flexWrap: 'wrap', flex: 1 },
  inputCol: { display: 'flex', flexDirection: 'column', minWidth: '200px' },
  dateInput: { background: 'var(--input-bg)', padding: '10px', borderRadius: '4px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' },
  btnRow: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  shortcutBtn: { padding: '12px 20px', fontSize: '0.9rem' },
  saveBtn: { padding: '12px 28px', fontSize: '0.9rem' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { borderBottom: '2px solid var(--glass-border)' },
  th: { color: 'var(--text-secondary)', padding: '14px 16px', fontWeight: '600', fontSize: '0.85rem' },
  td: { padding: '16px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)', fontSize: '0.9rem', verticalAlign: 'middle' },
  tr: { transition: 'var(--transition-fast)', '&:hover': { background: 'var(--bg-card-hover)' } },
  segmentedControl: { display: 'inline-flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px' },
  segmentBtn: { border: 'none', background: 'transparent', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '4px', transition: 'all 0.2s ease' },
  segmentBtnActivePresent: { background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)' },
  segmentBtnActiveLate: { background: 'rgba(245, 158, 11, 0.2)', color: 'var(--warning)' },
  segmentBtnActiveAbsent: { background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' },
  feedback: { padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '20px' },
  errorFeedback: { background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: 'var(--danger)' },
  successFeedback: { background: 'var(--success-glow)', border: '1px solid var(--success)', color: 'var(--success)' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 6, 12, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  modal: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-glow)', borderRadius: 'var(--radius-md)', padding: '30px', maxWidth: '400px', width: '90%', textAlign: 'center' },
  modalActions: { display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px' },
  modalBtn: { padding: '10px 20px', fontSize: '0.9rem' },
  toast: { position: 'fixed', top: '20px', right: '20px', background: 'var(--sidebar-bg)', border: '1px solid var(--primary)', boxShadow: 'var(--shadow-glow)', borderRadius: 'var(--radius-sm)', padding: '12px 20px', color: 'var(--text-primary)', zIndex: 999, fontSize: '0.9rem', animation: 'fadeIn 0.3s ease' }
};
