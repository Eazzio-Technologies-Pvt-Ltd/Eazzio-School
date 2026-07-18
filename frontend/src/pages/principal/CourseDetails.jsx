import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseDetails, updateCourse, deleteCourse, getTeachers, assignCourseTeacher } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { ArrowLeft, Edit2, Trash2, Users, Check, X, Calendar, BookOpen, AlertCircle, UserCheck } from 'lucide-react';

export default function CourseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [crs, setCrs] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ courseName: '', section: '', academicYear: '' });
  const [teacherId, setTeacherId] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [crsRes, tchRes] = await Promise.all([
        getCourseDetails(id),
        getTeachers()
      ]);
      setCrs(crsRes.data || crsRes);
      setTeachers(tchRes.data || tchRes);
      setFormData({
        courseName: crsRes.data.courseName,
        section: crsRes.data.section,
        academicYear: crsRes.data.academicYear
      });
      setTeacherId(crsRes.data.teacherId || '');
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
      await updateCourse(id, formData);
      if (teacherId !== (crs.teacherId || '')) {
         await assignCourseTeacher(id, parseInt(teacherId));
      }
      setEditMode(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update course.');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this course? This will orphan any linked students, attendance, and fee records.')) {
      try {
        await deleteCourse(id);
        navigate('/principal/courses');
      } catch (err) {
        alert('Failed to delete course.');
      }
    }
  };

  if (loading) return <Loader message="Loading course details..." />;
  if (error || !crs) return <div className="p-6 text-red-500">{error || 'Course not found'}</div>;

  const hasFee = crs.feeStructures && crs.feeStructures.length > 0;
  const subjects = crs.timetables ? Array.from(new Set(crs.timetables.map(t => t.subject))) : [];

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-gray-800">
      <div className="flex justify-between items-center">
        <button onClick={() => navigate('/principal/courses')} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium w-fit">
          <ArrowLeft size={16} /> Back to Courses
        </button>
        <button onClick={handleDelete} className="flex items-center gap-2 text-red-500 hover:text-red-700 font-medium px-3 py-1.5 border border-red-200 hover:bg-red-50 rounded-lg transition">
          <Trash2 size={16} /> Delete Course
        </button>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8">
        {editMode ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">Edit Course</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                <input type="text" value={formData.courseName} onChange={e => setFormData({...formData, courseName: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <input type="text" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <input type="text" value={formData.academicYear} onChange={e => setFormData({...formData, academicYear: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Teacher</label>
                <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-indigo-500 bg-white">
                  <option value="">-- Unassigned --</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleUpdate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700"><Check size={16}/> Save Changes</button>
              <button onClick={() => setEditMode(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-200"><X size={16}/> Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start">
            <div className="flex gap-5 items-start">
              <div className="p-5 bg-indigo-50 text-indigo-600 rounded-2xl">
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
                      <p className="font-semibold">{crs.teacher?.name || 'Unassigned'}</p>
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
            <button onClick={() => setEditMode(true)} className="px-4 py-2 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition flex items-center gap-2 font-medium">
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
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
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
          {subjects.length === 0 ? (
            <p className="text-gray-500 italic text-sm">No subjects assigned via timetable yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subjects.map((sub, i) => (
                <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium border border-indigo-100">
                  {sub}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
