import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseDetails, getTeachers, assignCourseTeacher, addCourseSubject, removeCourseSubject } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { ToastContext } from '../../context/ToastContext';
import { ArrowLeft, Edit2, Trash2, Users, Check, X, Calendar, BookOpen, AlertCircle, UserCheck } from 'lucide-react';

export default function CourseDetails() {
  const { showToast } = useContext(ToastContext);
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [crs, setCrs] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editMode, setEditMode] = useState(false);
  const [teacherId, setTeacherId] = useState('');
  
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTeacherId, setNewSubjectTeacherId] = useState('');
  const [addingSubject, setAddingSubject] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [crsRes, tchRes] = await Promise.all([
        getCourseDetails(id),
        getTeachers()
      ]);
      const courseData = crsRes.data || crsRes;
      setCrs(courseData);
      setTeachers(tchRes.data || tchRes);
      setTeacherId(courseData.teacherId || '');
    } catch (err) {
      setError('Failed to load course details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleUpdate = async () => {
    try {
      const currentTeacherId = crs.teacherId || null;
      const newTeacherId = teacherId ? parseInt(teacherId) : null;
      if (newTeacherId !== currentTeacherId) {
         await assignCourseTeacher(id, newTeacherId);
      }
      setEditMode(false);
      loadData();
      showToast('Course teacher updated successfully', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to assign teacher.', 'error');
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName || !newSubjectTeacherId) return;
    setAddingSubject(true);
    try {
      await addCourseSubject(id, { subject: newSubjectName, teacherId: newSubjectTeacherId });
      setNewSubjectName('');
      setNewSubjectTeacherId('');
      loadData();
      showToast('Subject added successfully', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add subject', 'error');
    } finally {
      setAddingSubject(false);
    }
  };

  const handleRemoveSubject = async (subjectId) => {
    if (!window.confirm('Are you sure you want to remove this subject?')) return;
    try {
      await removeCourseSubject(id, subjectId);
      loadData();
      showToast('Subject removed successfully', 'success');
    } catch (err) {
      showToast('Failed to remove subject', 'error');
    }
  };

  if (loading) return <Loader message="Loading course details..." />;
  if (error || !crs) return <div className="p-6 text-red-500">{error || 'Course not found'}</div>;

  const hasFee = crs.feeStructures && crs.feeStructures.length > 0;
  const subjects = crs.timetables ? Array.from(new Set(crs.timetables.map(t => t.subject))) : [];

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-gray-800">
      <div className="flex justify-between items-center">
        <button onClick={() => navigate('/principal/courses')} className="flex items-center gap-2 text-emerald-600 hover:text-emerald-800 font-medium w-fit">
          <ArrowLeft size={16} /> Back to Courses
        </button>

      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8">
        {editMode ? (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{crs.courseName} - Section {crs.section}</h2>
                <p className="text-gray-500">{crs.academicYear} Academic Session</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-3">Assign Class Teacher</h3>
              <div className="max-w-md">
                <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-emerald-500 bg-white">
                  <option value="">-- Unassigned --</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>)}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-lg font-bold mb-4">Manage Subjects & Teachers</h3>
              
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-6">
                <form onSubmit={handleAddSubject} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Subject Name</label>
                    <input required type="text" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="e.g. Mathematics" className="w-full p-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-emerald-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Subject Teacher</label>
                    <select required value={newSubjectTeacherId} onChange={e => setNewSubjectTeacherId(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-emerald-500 bg-white">
                      <option value="">Select Teacher...</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>)}
                    </select>
                  </div>
                  <div>
                    <button type="submit" disabled={addingSubject} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                      {addingSubject ? 'Adding...' : 'Add Subject'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {crs.courseSubjects && crs.courseSubjects.length > 0 ? (
                  crs.courseSubjects.map(sub => (
                    <div key={sub.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg bg-white shadow-sm">
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{sub.subject}</p>
                        <p className="text-xs text-gray-500">{sub.teacher?.name}</p>
                      </div>
                      <button onClick={() => handleRemoveSubject(sub.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-sm text-gray-500 italic">No subjects configured for this class yet.</div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleUpdate} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 hover:bg-emerald-700"><Check size={16}/> Save Changes</button>
              <button onClick={() => setEditMode(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-200"><X size={16}/> Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start">
            <div className="flex gap-5 items-start">
              <div className="p-5 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Users size={48} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{crs.courseName} - Section {crs.section}</h1>
                <p className="text-gray-500 flex items-center gap-2 mb-4">
                  <BookOpen size={16}/> Core Syllabus
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
                    <Calendar size={18} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Academic Year</p>
                      <p className="font-semibold">{crs.academicYear}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
                    <UserCheck size={18} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Course Teacher</p>
                      <p className="font-semibold">{crs.teacher ? `${crs.teacher.name} ${crs.teacher.employeeId ? `(${crs.teacher.employeeId})` : ''}` : 'Unassigned'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
                    <AlertCircle size={18} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Fee Status</p>
                      <p className={`font-semibold ${hasFee ? 'text-green-600' : 'text-red-600'}`}>{hasFee ? 'Configured' : 'Not Configured'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => setEditMode(true)} className="px-4 py-2 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors duration-150 flex items-center gap-2 font-medium">
              <Edit2 size={16} /> Edit Details
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 shadow-sm rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Enrolled Students ({crs.students?.length || 0})</h3>
          </div>
          <div className="overflow-y-auto max-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <th className="py-2 px-4 font-semibold text-gray-600 text-sm">Roll No</th>
                  <th className="py-2 px-4 font-semibold text-gray-600 text-sm">Name</th>
                  <th className="py-2 px-4 font-semibold text-gray-600 text-sm">Phone</th>
                </tr>
              </thead>
              <tbody>
                {crs.students?.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-6 text-center text-gray-500 italic">No students enrolled in this course.</td>
                  </tr>
                ) : (
                  crs.students?.map(s => (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-3 px-4 font-medium text-gray-700">{s.rollNumber || 'N/A'}</td>
                      <td className="py-3 px-4 text-gray-900">{s.name}</td>
                      <td className="py-3 px-4 text-gray-600">{s.phone || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 h-fit">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Assigned Subjects</h3>
          {!crs.courseSubjects || crs.courseSubjects.length === 0 ? (
            <p className="text-gray-500 italic text-sm">No subjects assigned yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {crs.courseSubjects.map((sub) => (
                <div key={sub.id} className="flex justify-between items-center px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="text-emerald-800 font-semibold text-sm">{sub.subject}</span>
                  <span className="text-emerald-600 text-xs font-medium bg-white px-2 py-0.5 rounded-full border border-emerald-200 shadow-sm">{sub.teacher?.name || 'Unassigned'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
