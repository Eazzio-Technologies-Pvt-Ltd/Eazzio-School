import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCourses, createCourse, getTeachers } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { BookOpen, Plus, Search, Eye, CheckCircle, XCircle } from 'lucide-react';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ courseName: '', section: '', academicYear: '2026-2027' });
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getCourses();
      setCourses(res.data || res || []);
    } catch (err) {
      setError('Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createCourse(formData);
      setFormData({ courseName: '', section: '', academicYear: '2026-2027' });
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating course');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = (Array.isArray(courses) ? courses : []).filter(c => 
    (c.courseName || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.section || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-gray-800">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Courses Directory</h2>
          <p className="text-gray-500">Manage all institution courses and academic sessions.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 rounded-lg text-sm shadow-sm transition">
          <Plus size={16} /> {showForm ? 'Cancel' : 'Create Course'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-4">
          <h3 className="text-lg font-bold mb-4">Create New Course</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                <input required type="text" value={formData.courseName} onChange={e => setFormData({...formData, courseName: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-indigo-500" placeholder="e.g. B.Tech CS" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <input required type="text" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-indigo-500" placeholder="e.g. A" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <input required type="text" value={formData.academicYear} onChange={e => setFormData({...formData, academicYear: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <button disabled={submitting} type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Course'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search courses..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64"
            />
          </div>
          <span className="text-sm text-gray-500 font-medium">{filtered.length} courses</span>
        </div>

        {loading ? (
          <Loader message="Loading courses..." />
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-600 text-sm">Course Name</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-sm">Academic Session</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-sm text-center">Students</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-sm">Course Teacher</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-sm">Subjects</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-sm text-center">Fee Status</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(crs => {
                  const hasFee = crs.feeStructures && crs.feeStructures.length > 0;
                  const subjects = crs.timetables ? Array.from(new Set(crs.timetables.map(t => t.subject))).join(', ') : '';

                  return (
                    <tr key={crs.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-4 px-4 font-bold text-indigo-600">{crs.courseName}-{crs.section}</td>
                      <td className="py-4 px-4 text-gray-600">{crs.academicYear}</td>
                      <td className="py-4 px-4 text-center font-semibold text-gray-800">{crs._count?.students || 0}</td>
                      <td className="py-4 px-4 text-gray-700">{crs.teacher?.name || <span className="text-gray-400 italic">Unassigned</span>}</td>
                      <td className="py-4 px-4 text-xs text-gray-500 max-w-[150px] truncate" title={subjects}>
                        {subjects || 'No subjects'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {hasFee ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                            <CheckCircle size={12}/> Configured
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200">
                            <XCircle size={12}/> Not Configured
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <button onClick={() => navigate(`/principal/courses/${crs.id}`)} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm font-medium">
                          <Eye size={16} /> View
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-500">No courses found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
