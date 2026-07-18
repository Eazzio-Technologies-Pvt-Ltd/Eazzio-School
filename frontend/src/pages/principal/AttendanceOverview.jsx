import React, { useState, useEffect } from 'react';
import { getAttendanceSummary, getAttendanceDetail, getCourses } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { Users, Calendar, TrendingUp, CheckCircle, XCircle, Clock, BookOpen, AlertCircle } from 'lucide-react';

export default function AttendanceOverview() {
  const [activeTab, setActiveTab] = useState('global');
  
  // Global State
  const [summary, setSummary] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');

  // Detail State
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    fetchGlobalSummary();
    fetchCourses();
  }, []);

  useEffect(() => {
    if (activeTab === 'detail' && selectedCourse && selectedDate) {
      fetchDetail();
    }
  }, [activeTab, selectedCourse, selectedDate]);

  const fetchGlobalSummary = async () => {
    try {
      setGlobalLoading(true);
      const data = await getAttendanceSummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
      setGlobalError('Failed to load attendance summary.');
    } finally {
      setGlobalLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const data = await getCourses();
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourse(data[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load courses', err);
    }
  };

  const fetchDetail = async () => {
    try {
      setDetailLoading(true);
      setDetailError('');
      const data = await getAttendanceDetail(selectedCourse, selectedDate);
      setDetailData(data);
    } catch (err) {
      console.error(err);
      setDetailError('Failed to load class details.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6 bg-gray-50 min-h-screen">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Attendance Overview</h2>
        <p className="text-gray-500 mt-1">School-wide daily attendance monitoring.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('global')}
          className={`pb-3 px-4 font-medium text-sm transition-all border-b-2 ${
            activeTab === 'global'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={16} /> Global Trends
          </div>
        </button>
        <button
          onClick={() => setActiveTab('detail')}
          className={`pb-3 px-4 font-medium text-sm transition-all border-b-2 ${
            activeTab === 'detail'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users size={16} /> Class Detail View
          </div>
        </button>
      </div>

      {/* Tab Content: Global Trends */}
      {activeTab === 'global' && (
        <div className="space-y-4 animate-fade-in">
          {globalError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm">
              {globalError}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {globalLoading ? (
              <div className="p-8"><Loader message="Loading global attendance data..." /></div>
            ) : summary.length === 0 ? (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                <AlertCircle size={48} className="mb-4 opacity-20" />
                <p>No attendance data available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Course</th>
                      <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Teacher</th>
                      <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Total Students</th>
                      <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Present</th>
                      <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Absent</th>
                      <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider min-w-[200px]">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summary.map(cls => (
                      <tr key={cls.courseId} className="hover:bg-gray-50/50 transition-colors duration-150">
                        <td className="py-4 px-6 font-semibold text-emerald-600">{cls.courseName}</td>
                        <td className="py-4 px-6 text-gray-700">{cls.teacherName}</td>
                        <td className="py-4 px-6 text-gray-700">{cls.totalStudents}</td>
                        <td className="py-4 px-6 text-emerald-600 font-medium">{cls.present}</td>
                        <td className="py-4 px-6 text-red-500 font-medium">{cls.absent}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${cls.percentage >= 75 ? 'bg-emerald-500' : cls.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                style={{ width: `${cls.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700 w-10 text-right">{cls.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Detail View */}
      {activeTab === 'detail' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen size={14} /> Select Class
              </label>
              <select 
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition text-gray-800"
              >
                {courses.length === 0 && <option value="">No courses available</option>}
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.courseName} - {c.section} ({c.academicYear})</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar size={14} /> Date
              </label>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition text-gray-800"
              />
            </div>
          </div>

          {/* Results Area */}
          {detailError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm">
              {detailError}
            </div>
          )}

          {detailLoading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
              <Loader message="Loading class attendance..." />
            </div>
          ) : detailData && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Summary Card */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
                  <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Class Attendance</h3>
                  <div className={`text-4xl font-bold mb-4 ${
                    detailData.percentage >= 75 ? 'text-emerald-500' :
                    detailData.percentage >= 50 ? 'text-amber-500' : 'text-red-500'
                  }`}>
                    {detailData.percentage}%
                  </div>
                  
                  <div className="w-full space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Total Enrolled:</span>
                      <span className="font-semibold text-gray-900">{detailData.totalStudents}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Present:</span>
                      <span className="font-semibold text-emerald-600">{detailData.present}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Absent:</span>
                      <span className="font-semibold text-red-500">{detailData.absent}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 text-blue-700 p-4 rounded-xl border border-blue-100 text-xs">
                  <p className="flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    This is a read-only view. Teachers must mark or modify attendance from their dedicated workspace.
                  </p>
                </div>
              </div>

              {/* Students List */}
              <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Student Name</th>
                        <th className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Roll No</th>
                        <th className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detailData.students.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="py-12 text-center text-gray-400">
                            No students enrolled in this class.
                          </td>
                        </tr>
                      ) : (
                        detailData.students.map(student => (
                          <tr key={student.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                            <td className="py-3 px-5 text-sm font-medium text-gray-900">{student.name}</td>
                            <td className="py-3 px-5 text-sm text-gray-500">{student.rollNumber}</td>
                            <td className="py-3 px-5 text-right">
                              {student.status === 'PRESENT' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle size={14} /> Present
                                </span>
                              )}
                              {student.status === 'ABSENT' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                  <XCircle size={14} /> Absent
                                </span>
                              )}
                              {student.status === 'LATE' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock size={14} /> Late
                                </span>
                              )}
                              {student.status === 'UNMARKED' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                  Not Marked
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}
