import React, { useState, useEffect } from 'react';
import { getCourses, getTeachers, getTimetables, createTimetable, deleteTimetable, autoGenerateTimetable } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { Trash2, Plus, X, Settings, AlertCircle } from 'lucide-react';

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
  const [autoCourseId, setAutoCourseId] = useState('');
  const [autoReqs, setAutoReqs] = useState([{ subject: '', teacherId: '', count: 1 }]);
  const [autoError, setAutoError] = useState('');
  const [autoConflicts, setAutoConflicts] = useState([]);
  
  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const allPeriods = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6'];
  const [selectedDays, setSelectedDays] = useState([...allDays]);
  const [selectedPeriods, setSelectedPeriods] = useState([...allPeriods]);

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

  const toggleDay = (d) => {
    if (selectedDays.includes(d)) setSelectedDays(selectedDays.filter(day => day !== d));
    else setSelectedDays([...selectedDays, d]);
  };

  const togglePeriod = (p) => {
    if (selectedPeriods.includes(p)) setSelectedPeriods(selectedPeriods.filter(per => per !== p));
    else setSelectedPeriods([...selectedPeriods, p]);
  };

  const addReqRow = () => {
    setAutoReqs([...autoReqs, { subject: '', teacherId: '', count: 1 }]);
  };

  const removeReqRow = (idx) => {
    setAutoReqs(autoReqs.filter((_, i) => i !== idx));
  };

  const updateReq = (idx, field, value) => {
    const updated = [...autoReqs];
    updated[idx][field] = value;
    setAutoReqs(updated);
  };

  const handleAutoGenerate = async (e) => {
    e.preventDefault();
    setAutoError('');
    setAutoConflicts([]);

    if (!autoCourseId) {
      setAutoError('Please select a course.');
      return;
    }
    if (selectedDays.length === 0 || selectedPeriods.length === 0) {
      setAutoError('Please select at least one day and one period.');
      return;
    }

    const invalidReqs = autoReqs.some(r => !r.subject || !r.teacherId || r.count < 1);
    if (invalidReqs) {
      setAutoError('All requirements must have a subject, teacher, and valid count.');
      return;
    }

    try {
      setSubmitting(true);
      await autoGenerateTimetable({
        courseId: autoCourseId,
        days: selectedDays,
        periods: selectedPeriods,
        requirements: autoReqs.map(r => ({ ...r, count: parseInt(r.count) }))
      });
      setShowAutoModal(false);
      await loadData();
      alert('Timetable generated successfully!');
    } catch (err) {
      if (err.response?.status === 409) {
        setAutoConflicts(err.response.data.conflicts || []);
      } else {
        setAutoError(err.response?.data?.error || 'Failed to auto-generate timetable.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTimetables = filterCourse 
    ? timetables.filter(t => t.courseId === parseInt(filterCourse)) 
    : timetables;

  const grouped = {};
  allDays.forEach(d => grouped[d] = []);
  filteredTimetables.forEach(t => {
    if (grouped[t.dayOfWeek]) grouped[t.dayOfWeek].push(t);
  });

  if (loading) return <Loader message="Loading timetable data..." />;

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-gray-800 relative min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Master Timetable</h2>
          <p className="text-gray-500 mt-1">Assign weekly routines for teachers and courses.</p>
        </div>
        <button 
          onClick={() => setShowAutoModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition flex items-center gap-2 self-start"
        >
          <Settings size={18} /> Auto-Generate
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 items-start">
        {/* Left: Form */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-5 border-b border-gray-100 pb-3">Add Manual Entry</h3>
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
                {courses.map(c => <option key={c.id} value={c.id}>{c.className}-{c.section}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-sm font-medium text-gray-700">Day of Week</label>
              <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}>
                {allDays.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-sm font-medium text-gray-700">Period</label>
              <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={period} onChange={e => setPeriod(e.target.value)}>
                {allPeriods.map(p => <option key={p} value={p}>{p}</option>)}
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
              {courses.map(c => <option key={c.id} value={c.id}>{c.className}-{c.section}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-6">
            {allDays.map(day => (
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
                        <div className="text-xs text-gray-500">Course: {t.course.className}-{t.course.section}</div>
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

      {/* Auto-Generate Modal */}
      {showAutoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Settings size={20} className="text-emerald-600" />
                Auto-Generate Timetable
              </h3>
              <button onClick={() => setShowAutoModal(false)} className="text-gray-400 hover:text-gray-700 transition">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Errors/Conflicts */}
              {autoError && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{autoError}</span>
                </div>
              )}
              {autoConflicts.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-2">
                    <AlertCircle size={18} /> Scheduling Conflicts Detected
                  </h4>
                  <p className="text-amber-700 text-sm mb-3">Generation aborted. The following constraints could not be resolved:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-amber-900 font-medium">
                    {autoConflicts.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}

              {/* Top Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select Course</label>
                  <select 
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                    value={autoCourseId} 
                    onChange={e => setAutoCourseId(e.target.value)}
                  >
                    <option value="">-- Choose a Class --</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.className} - {c.section}</option>)}
                  </select>
                  <p className="text-xs text-amber-600 mt-2">
                    * Generating will override all existing timetable entries for this course.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Working Days</label>
                    <div className="flex flex-wrap gap-2">
                      {allDays.map(d => (
                        <label key={d} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input type="checkbox" checked={selectedDays.includes(d)} onChange={() => toggleDay(d)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                          {d.slice(0,3)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Periods / Day</label>
                    <div className="flex flex-wrap gap-2">
                      {allPeriods.map(p => (
                        <label key={p} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input type="checkbox" checked={selectedPeriods.includes(p)} onChange={() => togglePeriod(p)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                          {p.split(' ')[1]}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirements Builder */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-bold text-gray-700">Subject Requirements</label>
                  <button type="button" onClick={addReqRow} className="text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded text-sm font-medium flex items-center gap-1 transition">
                    <Plus size={16} /> Add Subject
                  </button>
                </div>
                <div className="space-y-3">
                  {autoReqs.map((req, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <input type="text" placeholder="Subject Name (e.g. Science)" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={req.subject} onChange={e => updateReq(idx, 'subject', e.target.value)} />
                      </div>
                      <div className="flex-1">
                        <select className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={req.teacherId} onChange={e => updateReq(idx, 'teacherId', e.target.value)}>
                          <option value="">Select Teacher</option>
                          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                      <div className="w-32">
                        <input type="number" min="1" placeholder="Periods" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={req.count} onChange={e => updateReq(idx, 'count', e.target.value)} title="Periods per week" />
                      </div>
                      <button type="button" onClick={() => removeReqRow(idx)} disabled={autoReqs.length === 1} className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50 mt-0.5">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAutoModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 font-medium rounded-lg transition text-sm">
                Cancel
              </button>
              <button type="button" onClick={handleAutoGenerate} disabled={submitting} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition shadow-sm disabled:opacity-50 text-sm">
                {submitting ? 'Generating...' : 'Generate Timetable'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
