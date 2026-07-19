import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary } from '../../api/studentApi';
import Loader from '../../components/Loader';
import { 
  User, BookOpen, Clock, Calendar, 
  CreditCard, Megaphone, CheckCircle, RefreshCw, AlertCircle
} from 'lucide-react';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getDashboardSummary();
      setData(response);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <Loader message="Loading Student Dashboard..." />;
  if (error) return <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">{error}</div>;
  if (!data) return null;

  const { profile, attendance, fees, notices, todayRoutine } = data;

  const getNextClass = () => {
    if (!todayRoutine || todayRoutine.length === 0) return null;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    const periods = [
      { p: '1', start: '08:00' }, { p: '2', start: '09:00' }, { p: '3', start: '10:00' }, 
      { p: '4', start: '11:00' }, { p: '5', start: '12:00' }, { p: '6', start: '13:00' }, 
      { p: '7', start: '14:00' }, { p: '8', start: '15:00' }
    ];

    for (const timeSlot of periods) {
      if (currentTimeStr < timeSlot.start) {
        const routineItem = todayRoutine.find(r => r.period === timeSlot.p);
        if (routineItem) return { ...routineItem, startTime: timeSlot.start };
      }
    }
    return null;
  };

  const nextClass = getNextClass();

  return (
    <div className="flex flex-col gap-8 animate-fade-in text-gray-800">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome, {profile.name}</h2>
          <p className="text-gray-500">
            Student ID: <span className="font-medium text-gray-700">{profile.studentId}</span> | Roll No: <span className="font-medium text-gray-700">{profile.rollNumber || 'N/A'}</span> | Class: <span className="font-medium text-gray-700">{profile.courseName}</span>
          </p>
        </div>
        <button onClick={loadData} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 rounded-lg text-sm transition-colors duration-150 shadow-sm">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (Span 2) */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* NEXT CLASS BANNER */}
          {nextClass && (
            <div className="bg-emerald-600 rounded-xl p-5 text-white shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <Clock size={24} className="text-emerald-50" />
                </div>
                <div className="flex flex-col">
                  <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-0.5">Up Next</span>
                  <h3 className="text-xl font-bold">{nextClass.subject}</h3>
                  <p className="text-emerald-100 text-sm mt-0.5">Period {nextClass.period} • {nextClass.teacher?.name} • Starts at {nextClass.startTime}</p>
                </div>
              </div>
              <div className="hidden sm:flex px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20 items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></div>
                 <span className="text-sm font-semibold">Coming up soon</span>
              </div>
            </div>
          )}

          {/* FEE DUE CARD */}
          <div className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="text-emerald-500" size={20} /> 
                  Fee Status
                </h3>
                <p className="text-sm text-gray-500">Your current fee overview and pending dues.</p>
              </div>
              <span className={`px-3 py-1 text-xs rounded-full font-bold border ${fees.pendingAmount > 0 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                {fees.feeStatus}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-6 justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-500 font-medium">Pending Amount</span>
                <span className={`text-3xl font-bold ${fees.pendingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  ₹{fees.pendingAmount.toLocaleString()}
                </span>
                {fees.pendingAmount > 0 && fees.dueDate && (
                  <span className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle size={12} /> Due by: {new Date(fees.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              
              {fees.pendingAmount > 0 ? (
                <button 
                  onClick={() => navigate('/student/fees')}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center whitespace-nowrap"
                >
                  Pay Now
                </button>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 font-medium px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                  <CheckCircle size={18} /> All caught up!
                </div>
              )}
            </div>
          </div>

          {/* TODAY'S ROUTINE */}
          <div className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Clock className="text-blue-500" size={20} />
              Today's Class Routine
            </h3>
            <p className="text-sm text-gray-500 mb-4">Your schedule for {new Date().toLocaleDateString('en-US', { weekday: 'long' })}.</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="py-3 px-4 font-semibold text-gray-600 text-sm rounded-tl-lg">Period</th>
                    <th className="py-3 px-4 font-semibold text-gray-600 text-sm">Subject</th>
                    <th className="py-3 px-4 font-semibold text-gray-600 text-sm rounded-tr-lg">Teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {!todayRoutine || todayRoutine.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-6 text-center text-gray-500 italic text-sm">No classes scheduled for today.</td>
                    </tr>
                  ) : (
                    todayRoutine.map((routine, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 text-sm">
                        <td className="py-3 px-4 font-medium text-gray-800">Period {routine.period}</td>
                        <td className="py-3 px-4 font-bold text-emerald-600">{routine.subject}</td>
                        <td className="py-3 px-4 text-gray-600">{routine.teacher?.name || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          
          {/* ATTENDANCE STATS */}
          <div className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow rounded-xl p-6 flex flex-col items-center">
            <div className="w-full text-left mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="text-emerald-500" size={20} />
                Attendance
              </h3>
              <p className="text-sm text-gray-500">Overall presence this academic year.</p>
            </div>

            {/* Ring Chart implementation using CSS */}
            <div className="relative w-40 h-40 flex items-center justify-center rounded-full bg-emerald-50 mb-6 shadow-inner" style={{ background: `conic-gradient(#10b981 ${(attendance?.percentage || 0)}%, #d1fae5 0)` }}>
              <div className="absolute inset-2 bg-white rounded-full flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-emerald-700">{attendance?.percentage || 0}%</span>
                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-1">Present</span>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-3">
               <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center flex flex-col items-center justify-center">
                 <span className="text-gray-500 text-xs font-medium uppercase">Present Days</span>
                 <span className="text-lg font-bold text-gray-800">{(attendance?.present || 0) + (attendance?.late || 0)}</span>
               </div>
               <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center flex flex-col items-center justify-center">
                 <span className="text-gray-500 text-xs font-medium uppercase">Absent Days</span>
                 <span className="text-lg font-bold text-gray-800">{attendance?.absent || 0}</span>
               </div>
            </div>
          </div>

          {/* RECENT NOTICES */}
          <div className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Megaphone className="text-pink-500" size={20} />
              Notice Board
            </h3>
            <p className="text-sm text-gray-500 mb-4">Latest school and class announcements.</p>
            <div className="flex flex-col gap-3">
              {!notices || notices.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-6">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <Megaphone className="text-gray-300" size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-700">No Recent Notices</h4>
                  <p className="text-xs text-gray-500 mt-1">Check back later for announcements.</p>
                </div>
              ) : (
                notices.map(notice => (
                  <div key={notice.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-sm transition cursor-pointer" onClick={() => navigate('/student/notices')}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-800 text-sm leading-tight">{notice.title}</h4>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200 shrink-0 ml-2">{notice.audience}</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{notice.content}</p>
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">{new Date(notice.date).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </div>
            
            <button 
              onClick={() => navigate('/student/notices')}
              className="mt-4 w-full py-2 text-sm text-emerald-600 font-medium hover:bg-emerald-50 rounded-lg transition-colors"
            >
              View All Notices
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
