import React, { useState, useEffect } from 'react';
import { getCourses, getTeachers, getTimetables, createTimetable, deleteTimetable } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { Trash2 } from 'lucide-react';

export default function Timetable() {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [teacherId, setTeacherId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [period, setPeriod] = useState('Period 1');
  const [subject, setSubject] = useState('');

  // Filter state
  const [filterCourse, setFilterCourse] = useState('');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const periods = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6'];

  const loadData = async () => {
    try {
      setLoading(true);
      const [clsData, tchData, ttData] = await Promise.all([
        getCourses(),
        getTeachers(),
        getTimetables()
      ]);
      setCourses(clsData);
      setTeachers(tchData);
      setTimetables(ttData);
    } catch (err) {
      console.error(err);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!teacherId || !courseId || !subject) {
      setError('All fields are required');
      return;
    }

    try {
      setSubmitting(true);
      await createTimetable({ teacherId, courseId, dayOfWeek, period, subject });
      
      // Reset some fields
      setSubject('');
      
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create timetable entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this routine entry?')) return;
    
    try {
      await deleteTimetable(id);
      await loadData();
    } catch (err) {
      setError('Failed to delete timetable entry.');
    }
  };

  const filteredTimetables = filterCourse 
    ? timetables.filter(t => t.courseId === parseInt(filterCourse)) 
    : timetables;

  // Group by day for the view
  const grouped = {};
  days.forEach(d => grouped[d] = []);
  filteredTimetables.forEach(t => {
    if (grouped[t.dayOfWeek]) grouped[t.dayOfWeek].push(t);
  });

  if (loading) return <Loader message="Loading timetable data..." />;

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-gray-800">
      <div className="mb-4">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Master Timetable</h2>
        <p className="text-gray-500 mt-1">Assign weekly routines for teachers and courses.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 items-start">
        {/* Left: Form */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-5 border-b border-gray-100 pb-3">Add Routine Entry</h3>
          {error && <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg mb-4 text-sm">{error}</div>}
          
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="block text-sm font-medium text-gray-700">Teacher</label>
              <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={teacherId} onChange={e => setTeacherId(e.target.value)} required>
                <option value="">Select Teacher</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="block text-sm font-medium text-gray-700">Course</label>
              <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={courseId} onChange={e => setCourseId(e.target.value)} required>
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.courseName}-{c.section}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-sm font-medium text-gray-700">Day of Week</label>
              <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-sm font-medium text-gray-700">Period</label>
              <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={period} onChange={e => setPeriod(e.target.value)}>
                {periods.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-sm font-medium text-gray-700">Subject</label>
              <input type="text" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics" required />
            </div>

            <button type="submit" disabled={submitting} className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors duration-150 shadow-sm disabled:opacity-50">
              {submitting ? 'Adding...' : 'Add Entry'}
            </button>
          </form>
        </div>

        {/* Right: View */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 h-full">
          <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
            <h3 className="text-lg font-bold text-gray-900">Routine Viewer</h3>
            <select className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
              <option value="">All Courses</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.courseName}-{c.section}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-6">
            {days.map(day => (
              <div key={day} className="flex flex-col gap-3">
                <h4 className="text-emerald-700 font-bold text-lg">{day}</h4>
                {grouped[day].length === 0 ? (
                  <p className="text-gray-400 italic text-sm">No periods assigned.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {grouped[day].map(t => (
                      <div key={t.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex flex-col gap-1.5 hover:shadow-sm transition-colors duration-150 group">
                        <div className="flex justify-between items-center">
                          <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">{t.period}</span>
                          <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-colors duration-150"><Trash2 size={16} /></button>
                        </div>
                        <div className="font-bold text-gray-900 text-base mt-1">{t.subject}</div>
                        <div className="text-xs text-gray-500">Course: {t.course.courseName}-{t.course.section}</div>
                        <div className="text-xs text-gray-500">Teacher: {t.teacher.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
