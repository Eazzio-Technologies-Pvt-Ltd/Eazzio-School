import React, { useState, useEffect } from 'react';
import { getProfile, getRoutine } from '../../api/studentApi';
import Loader from '../../components/Loader';
import { BookOpen, Users, Clock, Calendar, Bookmark } from 'lucide-react';

export default function ClassDetails() {
  const [profile, setProfile] = useState(null);
  const [routine, setRoutine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [profileData, routineData] = await Promise.all([
        getProfile(),
        getRoutine()
      ]);
      setProfile(profileData);
      setRoutine(routineData);
    } catch (err) {
      console.error(err);
      setError('Failed to load class details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <Loader message="Loading Class Details..." />;
  if (error) return <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">{error}</div>;
  if (!profile) return null;

  const course = profile.course;
  
  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <BookOpen size={48} className="mb-4 text-gray-300" />
        <h3 className="text-xl font-bold text-gray-700">Not Assigned to a Class</h3>
        <p className="mt-2">You have not been assigned to a class yet. Please contact administration.</p>
      </div>
    );
  }

  // Derive unique subjects from routine
  const uniqueSubjectsMap = new Map();
  if (routine) {
    Object.values(routine).flat().forEach(item => {
      if (!uniqueSubjectsMap.has(item.subject)) {
        uniqueSubjectsMap.set(item.subject, item.teacher?.name || 'N/A');
      }
    });
  }
  const subjectsTaught = Array.from(uniqueSubjectsMap.entries()).map(([subject, teacher]) => ({ subject, teacher }));

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Calculate the maximum number of periods across all days to render the table correctly
  let maxPeriods = 0;
  if (routine) {
    Object.values(routine).forEach(dayRoutine => {
      dayRoutine.forEach(r => {
        const periodNum = parseInt(r.period, 10);
        if (!isNaN(periodNum) && periodNum > maxPeriods) {
          maxPeriods = periodNum;
        }
      });
    });
  }
  
  // Default to 8 periods if none found to show empty grid
  maxPeriods = maxPeriods > 0 ? maxPeriods : 8;

  return (
    <div className="flex flex-col gap-8 animate-fade-in text-gray-800">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Class Details</h2>
          <p className="text-gray-500">Information about your current class, subjects, and weekly timetable.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Class Info Card */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Users className="text-emerald-500" size={20} />
              Class Information
            </h3>
            
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Course & Section</p>
                <p className="text-xl font-bold text-emerald-700">{course.courseName} - {course.section}</p>
              </div>
              
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Academic Year</p>
                <p className="text-sm font-medium text-gray-800">{course.academicYear}</p>
              </div>
              
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Class Teacher</p>
                <p className="text-sm font-medium text-gray-800">{course.teacher?.name || 'Not Assigned'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Bookmark className="text-emerald-500" size={20} />
              Subjects Taught
            </h3>
            
            <div className="flex flex-col gap-3">
              {subjectsTaught.length === 0 ? (
                <p className="text-gray-500 italic text-sm">No subjects found in timetable.</p>
              ) : (
                subjectsTaught.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="font-semibold text-gray-800 text-sm">{item.subject}</span>
                    <span className="text-xs text-gray-500 font-medium">{item.teacher}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 h-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Calendar className="text-emerald-500" size={20} />
              Weekly Timetable
            </h3>
            
            <div className="overflow-x-auto custom-scrollbar-emerald pb-2">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr>
                    <th className="py-3 px-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-600 text-sm w-32 border-r rounded-tl-lg">Day / Period</th>
                    {Array.from({ length: maxPeriods }).map((_, i) => (
                      <th key={i} className="py-3 px-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-600 text-sm text-center min-w-[120px]">
                        Period {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daysOfWeek.map((day, idx) => {
                    const dayRoutine = routine ? routine[day] || [] : [];
                    return (
                      <tr key={day} className="border-b border-gray-100">
                        <td className="py-4 px-4 bg-gray-50 font-semibold text-gray-700 text-sm border-r">{day}</td>
                        {Array.from({ length: maxPeriods }).map((_, i) => {
                          const periodNum = (i + 1).toString();
                          const session = dayRoutine.find(r => r.period === periodNum);
                          return (
                            <td key={i} className="py-2 px-2 text-center border-r border-gray-50 last:border-0 relative hover:bg-emerald-50 transition-colors group">
                              {session ? (
                                <div className="flex flex-col items-center justify-center p-2 rounded-md bg-white border border-emerald-100 shadow-sm h-full w-full">
                                  <span className="font-bold text-emerald-700 text-sm leading-tight">{session.subject}</span>
                                  <span className="text-[10px] text-gray-500 font-medium mt-1 truncate w-full">{session.teacher?.name || 'N/A'}</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center p-2 h-full w-full text-gray-300 text-xs">
                                  -
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
