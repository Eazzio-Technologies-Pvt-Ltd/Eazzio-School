import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTeacherDetails, updateTeacher, getCourses } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { ToastContext } from '../../context/ToastContext';
import { 
  ArrowLeft, User, Phone, Mail, Calendar, BookOpen, 
  Clock, Edit2, X, AlertTriangle 
} from 'lucide-react';

export default function TeacherDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useContext(ToastContext);

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [coursesList, setCoursesList] = useState([]);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    subjects: [],
    courseId: ''
  });
  const [subjectInput, setSubjectInput] = useState('');

  const fetchTeacher = async () => {
    try {
      setLoading(true);
      const res = await getTeacherDetails(id);
      if (res && res.id) {
        setTeacher(res);
      } else {
        setError('Failed to fetch teacher details.');
      }
    } catch (err) {
      console.error(err);
      setError('Error loading teacher profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacher();
    
    // Fetch courses for the Class Teacher assignment dropdown
    const fetchCourses = async () => {
      try {
        const res = await getCourses();
        if (res && res.success) {
          setCoursesList(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      }
    };
    fetchCourses();
  }, [id]);

  const openEditModal = () => {
    setEditFormData({
      name: teacher.name || '',
      phone: teacher.phone || '',
      subjects: teacher.subjects || [],
      courseId: teacher.assignedCourse ? teacher.assignedCourse.id : ''
    });
    setSubjectInput('');
    setEditModalOpen(true);
  };

  const handleAddSubject = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault();
      const val = subjectInput.trim();
      if (val && !editFormData.subjects.includes(val)) {
        setEditFormData({ ...editFormData, subjects: [...editFormData.subjects, val] });
        setSubjectInput('');
      }
    }
  };

  const handleRemoveSubject = (sub) => {
    setEditFormData({ ...editFormData, subjects: editFormData.subjects.filter(s => s !== sub) });
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        name: editFormData.name,
        phone: editFormData.phone,
        subjects: editFormData.subjects,
        courseId: editFormData.courseId ? parseInt(editFormData.courseId) : null
      };
      await updateTeacher(id, payload);
      showToast('Teacher profile updated successfully', 'success');
      setEditModalOpen(false);
      fetchTeacher(); // Refresh the data
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update teacher', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8"><Loader message="Loading Teacher Profile..." /></div>;
  if (error) return <div className="p-8 text-red-500 font-medium">{error}</div>;
  if (!teacher) return <div className="p-8 text-gray-500">Teacher not found.</div>;

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6 bg-gray-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/principal/teachers')} 
            className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors duration-150"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xl font-bold">
            {teacher.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              {teacher.name}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-500 font-medium">Employee ID: {teacher.employeeId}</p>
              <button 
                onClick={openEditModal}
                className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition-colors duration-150"
              >
                <Edit2 size={14} /> Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Personal Info & Assignment */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Personal Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4 flex items-center gap-2">
              <User size={18} className="text-emerald-500" />
              <h3 className="font-semibold text-gray-800">Personal Details</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Email Address</p>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Mail size={14} className="text-gray-400" /> {teacher.email}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Contact Phone</p>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" /> {teacher.phone || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Joined Date</p>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" /> 
                  {new Date(teacher.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Academic Assignment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4 flex items-center gap-2">
              <BookOpen size={18} className="text-emerald-500" />
              <h3 className="font-semibold text-gray-800">Academic Profile</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5">
                  Class Teacher Assignment
                </p>
                {teacher.assignedCourse ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 mt-1">
                    {teacher.assignedCourse.courseName} - {teacher.assignedCourse.section}
                  </span>
                ) : (
                  <p className="text-sm text-gray-400 italic mt-1">Not assigned as a Class Teacher.</p>
                )}
              </div>
              
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Qualified Subjects</p>
                {teacher.subjects && teacher.subjects.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {teacher.subjects.map((sub, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium border border-gray-200">
                        {sub}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No specific subjects listed.</p>
                )}
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Column: Timetable */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1">
            <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4 flex items-center gap-2">
              <Clock size={18} className="text-emerald-500" />
              <h3 className="font-semibold text-gray-800">Weekly Schedule</h3>
            </div>
            <div className="p-0">
              {teacher.timetables && teacher.timetables.length > 0 ? (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">Day</th>
                        <th className="py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">Time / Period</th>
                        <th className="py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">Class</th>
                        <th className="py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">Subject</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...teacher.timetables]
                        .sort((a, b) => {
                          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                          if (days.indexOf(a.dayOfWeek) !== days.indexOf(b.dayOfWeek)) {
                             return days.indexOf(a.dayOfWeek) - days.indexOf(b.dayOfWeek);
                          }
                          return a.period.localeCompare(b.period);
                        })
                        .map(t => (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="py-3 px-4 font-medium text-gray-900">{t.dayOfWeek}</td>
                          <td className="py-3 px-4 text-gray-600">
                            <div className="font-medium">{t.period}</div>
                          </td>
                          <td className="py-3 px-4">
                            {t.course ? (
                               <span className="font-medium text-gray-800">{t.course.courseName} - {t.course.section}</span>
                            ) : (
                               <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-emerald-600 font-medium">{t.subject}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">No schedule assigned.</p>
                  <p className="text-sm text-gray-400 mt-1">This teacher does not have any active periods in the timetable.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Edit Teacher Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900">Edit Teacher Details</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <form id="editTeacherForm" onSubmit={handleUpdateTeacher} className="space-y-6">
                
                {/* Personal Info */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <User size={16} className="text-emerald-500" /> Personal Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Academic Profile */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <BookOpen size={16} className="text-emerald-500" /> Academic Profile
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assign Class Teacher Role</label>
                      <select
                        value={editFormData.courseId}
                        onChange={(e) => setEditFormData({ ...editFormData, courseId: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="">-- No Class Assigned --</option>
                        {coursesList.map(course => (
                          <option key={course.id} value={course.id}>
                            {course.courseName} - {course.section} ({course.academicYear})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Assigning a class will automatically remove any previous assignment, as a teacher can only lead one class.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Qualified Subjects</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={subjectInput}
                          onChange={(e) => setSubjectInput(e.target.value)}
                          onKeyDown={handleAddSubject}
                          placeholder="e.g. Mathematics"
                          className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <button 
                          type="button" 
                          onClick={handleAddSubject}
                          className="px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium rounded-lg text-sm transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {editFormData.subjects.map((sub, idx) => (
                          <span key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium border border-emerald-100">
                            {sub}
                            <button type="button" onClick={() => handleRemoveSubject(sub)} className="text-emerald-500 hover:text-emerald-800">
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-2">
                    <AlertTriangle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      <strong>Note:</strong> Timetable updates must be performed in the central Timetable module. Employee ID and email cannot be changed here.
                    </p>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-sm font-medium">
                Cancel
              </button>
              <button type="submit" form="editTeacherForm" disabled={submitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
