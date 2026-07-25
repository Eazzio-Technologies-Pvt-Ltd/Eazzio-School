import React, { useState, useEffect } from 'react';
import { getRoutine } from '../../api/teacherApi';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import { Calendar, Clock, BookOpen } from 'lucide-react';

export default function TeacherRoutine() {
  const [routine, setRoutine] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    const fetchRoutine = async () => {
      try {
        const data = await getRoutine();
        setRoutine(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load routine.');
      } finally {
        setLoading(false);
      }
    };
    fetchRoutine();
  }, []);

  if (loading) return <Loader message="Loading your weekly routine..." />;

  const hasRoutine = Object.values(routine).some(day => day && day.length > 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-in relative min-h-screen text-gray-800">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">My Weekly Routine</h2>
        <p className="text-gray-500">View your assigned courses and periods for the week.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 md:p-8 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-50 -z-10 pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
        
        {!hasRoutine ? (
          <EmptyState icon="📅" title="No Routine Assigned" description="Your weekly timetable has not been set by the principal yet." />
        ) : (
          <div className="flex flex-col gap-8 relative z-10">
            {days.map(day => {
              const dayRoutine = routine[day] || [];
              const isFreeDay = dayRoutine.length === 0;

              return (
                <div key={day} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                    <Calendar size={20} className="text-emerald-600" />
                    <h3 className="text-xl font-bold text-gray-900">{day}</h3>
                  </div>
                  
                  {isFreeDay ? (
                    <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-center">
                      <p className="text-gray-400 italic text-sm">No periods assigned (Free Day)</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {dayRoutine.map((periodObj, idx) => (
                        <div 
                          key={idx} 
                          className="group bg-white border border-gray-100 hover:border-emerald-200 shadow-sm hover:shadow-md rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-1"
                        >
                          <div className="flex justify-between items-center">
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide flex items-center gap-1.5">
                              <Clock size={12} />
                              {periodObj.period}
                            </span>
                          </div>
                          
                          <div>
                            <h4 className="font-bold text-gray-900 text-lg flex items-start gap-2">
                              <BookOpen size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                              <span className="leading-tight">{periodObj.subject}</span>
                            </h4>
                          </div>
                          
                          <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Course</span>
                              <span className="text-sm font-medium text-gray-700">{periodObj.course?.courseName}-{periodObj.course?.section}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
