import React, { useState, useEffect } from 'react';
import { getCourses, getTeachers, getTimetables, createTimetable, deleteTimetable, autoGenerateTimetable } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { Trash2, Settings, X, AlertCircle, Plus } from 'lucide-react';

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

  // Auto Generate State
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [autoDays, setAutoDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  const [autoPeriods, setAutoPeriods] = useState(6);
  const [autoClear, setAutoClear] = useState(true);
  const [autoError, setAutoError] = useState('');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const defaultPeriods = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6'];

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
      setSubject('');
      setShowManualModal(false);
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

  const handleAutoGenerate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAutoError('');
    try {
      await autoGenerateTimetable({
        days: autoDays,
        periods: parseInt(autoPeriods),
        clearExisting: autoClear
      });
      setShowAutoModal(false);
      loadData();
      alert('Timetable auto-generated successfully!');
    } catch (err) {
      setAutoError(err.response?.data?.error || 'Failed to auto-generate timetable');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTimetables = filterCourse 
    ? timetables.filter(t => t.courseId === parseInt(filterCourse)) 
    : timetables;

  // Extract all unique periods present in the filtered timetables + default periods to ensure columns exist
  const uniquePeriods = [...new Set([...defaultPeriods, ...filteredTimetables.map(t => t.period)])];
  uniquePeriods.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  if (loading) return <Loader message="Loading timetable data..." />;

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-gray-800 relative min-h-screen w-full max-w-[calc(100vw-280px)] xl:max-w-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Master Timetable</h2>
          <p className="text-gray-500 mt-1">Assign weekly routines for teachers and courses.</p>
        </div>
        <div className="flex gap-2 self-start">
          <button 
            onClick={() => setShowManualModal(true)}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl font-medium shadow-sm transition flex items-center gap-2"
          >
            <Plus size={18} /> Add Entry
          </button>
          <button 
            onClick={() => setShowAutoModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition flex items-center gap-2"
          >
            <Settings size={18} /> Auto-Generate
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm">{error}</div>}

      <div className="w-full flex flex-col gap-6 min-w-0">
        {/* Table View */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 w-full flex flex-col overflow-hidden min-w-0">
          <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3 shrink-0">
            <h3 className="text-lg font-bold text-gray-900">Routine Grid</h3>
            <select className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
              <option value="">All Courses</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.courseName}-{c.section}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50 text-emerald-800 border-y border-emerald-100">
                  <th className="p-3 border-r border-emerald-100 font-bold min-w-[100px]">Day</th>
                  {uniquePeriods.map(p => (
                    <th key={p} className="p-3 font-bold border-r border-emerald-100 min-w-[160px] text-center">{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map(day => (
                  <tr key={day} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="p-3 font-bold text-gray-700 border-r border-gray-100 align-top bg-gray-50/30">
                      {day.substring(0, 3)}
                    </td>
                    {uniquePeriods.map(p => {
                      const cells = filteredTimetables.filter(t => t.dayOfWeek === day && t.period === p);
                      return (
                        <td key={p} className="p-2 border-r border-gray-100 align-top min-w-[160px]">
                          {cells.length === 0 ? (
                            <div className="h-full min-h-[60px] flex items-center justify-center text-gray-300 italic text-xs">
                              -
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {cells.map(t => (
                                <div key={t.id} className="group relative bg-white border border-gray-200 rounded-md p-2 shadow-sm flex flex-col gap-0.5 hover:border-emerald-300 transition-colors">
                                  <div className="flex justify-between items-start gap-2">
                                    <span className="font-bold text-gray-900 truncate" title={t.subject}>{t.subject}</span>
                                    <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  <span className="text-xs text-gray-500 font-medium">Class: {t.course?.courseName}-{t.course?.section}</span>
                                  <span className="text-xs text-emerald-600 truncate">{t.teacher?.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed top-0 left-0 w-full h-full bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus size={20} className="text-emerald-600" />
                Add Manual Entry
              </h3>
              <button onClick={() => setShowManualModal(false)} className="text-gray-400 hover:text-gray-700 transition">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="flex flex-col">
              <div className="p-6 flex flex-col gap-4">
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
                    {defaultPeriods.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="block text-sm font-medium text-gray-700">Subject</label>
                  <input type="text" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics" required />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button type="button" onClick={() => setShowManualModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 font-medium rounded-lg transition text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition shadow-sm disabled:opacity-50 text-sm">
                  {submitting ? 'Adding...' : 'Add Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-Generate Modal */}
      {showAutoModal && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Settings size={20} className="text-emerald-600" />
                Auto-Generate Timetable
              </h3>
              <button onClick={() => setShowAutoModal(false)} className="text-gray-400 hover:text-gray-700 transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAutoGenerate} className="flex flex-col">
              <div className="p-6 space-y-5">
                {autoError && (
                  <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{autoError}</span>
                  </div>
                )}
                
                <p className="text-sm text-gray-500">
                  This will algorithmically assign teachers and subjects across all courses to available periods.
                </p>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Periods Per Day</label>
                  <input 
                    type="number" 
                    min="1" max="10" 
                    value={autoPeriods} 
                    onChange={e => setAutoPeriods(e.target.value)} 
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-gray-700 mt-2">
                    <input 
                      type="checkbox" 
                      checked={autoClear} 
                      onChange={e => setAutoClear(e.target.checked)} 
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    Clear existing timetable before generating
                  </label>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAutoModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 font-medium rounded-lg transition text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition shadow-sm disabled:opacity-50 text-sm">
                  {submitting ? 'Generating...' : 'Start Generation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
