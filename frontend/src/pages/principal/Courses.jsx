import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCourses, getTeachers } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { ToastContext } from '../../context/ToastContext';
import { BookOpen, Search, Eye, CheckCircle, XCircle } from 'lucide-react';

const getCurrentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  if (now.getMonth() < 5) {
    return `${year - 1}-${year}`;
  }
  return `${year}-${year + 1}`;
};

export default function Courses() {
  const { showToast } = useContext(ToastContext);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  
  // Read-only view state

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [crsRes, tchRes] = await Promise.all([getCourses(), getTeachers()]);
      setCourses(crsRes.data || crsRes || []);
      setTeachers(tchRes.data || tchRes || []);
    } catch (err) {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search courses..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-64"
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
                    <tr key={crs.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-4 px-4 font-bold text-emerald-600">{crs.courseName}-{crs.section}</td>
                      <td className="py-4 px-4 text-gray-600">{crs.academicYear}</td>
                      <td className="py-4 px-4 text-center font-semibold text-gray-800">{crs._count?.students || 0}</td>
                      <td className="py-4 px-4 text-gray-700">{crs.teacher ? `${crs.teacher.name} ${crs.teacher.employeeId ? `(${crs.teacher.employeeId})` : ''}` : <span className="text-gray-400 italic">Unassigned</span>}</td>
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
                      <td className="py-4 px-4 flex gap-3">
                        <button onClick={() => navigate(`/principal/courses/${crs.id}`)} className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1 text-sm font-medium transition-colors duration-150">
                          <Eye size={16} /> View Details
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
