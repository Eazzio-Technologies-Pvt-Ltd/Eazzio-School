import React from 'react';
import { Search, Eye, Edit2, Trash2 } from 'lucide-react';

export default function TeacherTable({ 
  teachersList = [], 
  loading = false, 
  readOnly = false, 
  onView, 
  onEdit, 
  onDelete 
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
        <p className="text-gray-500 font-medium text-sm">Loading faculty directory...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
         <h3 className="font-semibold text-gray-800 flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
           Faculty Directory
         </h3>
         <span className="text-xs font-medium bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full">{teachersList.length} Records</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-white border-b border-gray-100">
              <th className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teacher Profile</th>
              <th className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee ID</th>
              <th className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject & Course</th>
              <th className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              {!readOnly && (
                <th className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {teachersList.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? "4" : "5"} className="py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-3">
                    <Search size={32} className="text-gray-300" />
                    <p>No faculty found matching the active search parameters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              teachersList.map((user) => {
                const allSubjects = [...new Set([...(user.subjects || []), ...(user.timetables?.map(tt => tt.subject) || [])])];
                const subjectsStr = allSubjects.length > 0 
                  ? allSubjects.join(', ')
                  : 'Unassigned Subjects';
                const courseStr = user.assignedCourse ? `${user.assignedCourse.courseName}-${user.assignedCourse.section}` : 'Unassigned Course';
                
                return (
                  <tr 
                    key={user.id} 
                    onClick={() => readOnly && onView && onView(user.id)} 
                    className={`hover:bg-gray-50/80 transition-colors group ${readOnly && onView ? 'cursor-pointer' : ''}`}
                  >
                    <td className="py-4 px-5">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 group-hover:text-emerald-700 transition-colors">{user.name}</span>
                        <span className="text-xs text-gray-500 mt-0.5">{user.email}</span>
                        {user.phone && <span className="text-xs text-gray-400 mt-0.5">{user.phone}</span>}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-mono text-sm text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{user.employeeId}</span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-700">{subjectsStr}</span>
                        <span className="text-xs font-medium text-gray-500 mt-1">{courseStr}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                      </span>
                    </td>
                    {!readOnly && (
                      <td className="py-4 px-5">
                        <div className="flex justify-end gap-2">
                          {onView && (
                            <button onClick={(e) => { e.stopPropagation(); onView(user.id); }} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="View Profile">
                              <Eye size={16} />
                            </button>
                          )}
                          {onEdit && (
                            <button onClick={(e) => { e.stopPropagation(); onEdit(user); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit Teacher">
                              <Edit2 size={16} />
                            </button>
                          )}
                          {onDelete && (
                            <button onClick={(e) => { e.stopPropagation(); onDelete(user.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Remove">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
