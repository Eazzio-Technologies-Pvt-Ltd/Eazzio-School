import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeachers } from '../../api/principalApi';
import { Search } from 'lucide-react';
import TeacherTable from '../../components/TeacherTable';

export default function Teachers() {
  const navigate = useNavigate();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  // Data List & State
  const [teachersList, setTeachersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const teachers = await getTeachers();
      setTeachersList(teachers);
    } catch (err) {
      console.error(err);
      setError('Failed to load faculty roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  // Extract subjects from real data (include explicit subjects and timetable subjects)
  const subjectsList = [...new Set(teachersList.flatMap(t => [...(t.subjects || []), ...(t.timetables?.map(tt => tt.subject) || [])]))].filter(Boolean);
  
  // Extract courses list for Filter dropdown
  const coursesList = [...new Set(teachersList.map(t => t.assignedCourse ? `${t.assignedCourse.courseName}-${t.assignedCourse.section}` : null).filter(Boolean))];

  // Dynamic search/filters on client
  const filteredTeachers = teachersList.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const teacherCourse = user.assignedCourse ? `${user.assignedCourse.courseName}-${user.assignedCourse.section}` : '';
    const matchesCourse = !courseFilter || teacherCourse === courseFilter;
    
    const userSubjects = [...new Set([...(user.subjects || []), ...(user.timetables ? user.timetables.map(tt => tt.subject) : [])])];
    const matchesSubject = !subjectFilter || userSubjects.includes(subjectFilter);

    return matchesSearch && matchesCourse && matchesSubject;
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-gray-800 pb-10 p-6 bg-gray-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Faculty Registry</h2>
          <p className="text-gray-500 mt-1">View faculty members and courseroom assignments.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm">
          {error}
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search name or email..." 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <select 
            value={courseFilter} 
            onChange={(e) => setCourseFilter(e.target.value)} 
            className="w-full sm:w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
          >
            <option value="">All Courses</option>
            {coursesList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          
          <select 
            value={subjectFilter} 
            onChange={(e) => setSubjectFilter(e.target.value)} 
            className="w-full sm:w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
          >
            <option value="">All Subjects</option>
            {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <TeacherTable 
        teachersList={filteredTeachers} 
        loading={loading} 
        readOnly={true} 
        onView={(id) => navigate(`/principal/teachers/${id}`)} 
      />

    </div>
  );
}
