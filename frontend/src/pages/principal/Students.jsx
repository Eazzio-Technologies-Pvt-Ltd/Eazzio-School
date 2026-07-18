import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudents, deleteStudent, bulkImportUpdateStudents, registerStudent, getCourses } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { ToastContext } from '../../context/ToastContext';
import { Search, Download, Upload, Plus, Trash2, User, Users, ChevronRight } from 'lucide-react';
import { parseExcelFile, exportToExcel, downloadExcelTemplate } from '../../utils/excelUtils';

export default function Students() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { showToast } = useContext(ToastContext);

  // State
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [stuData, crsData] = await Promise.all([getStudents(), getCourses()]);
      setStudents(stuData);
      setCourses(crsData);
    } catch (err) {
      console.error(err);
      setError('Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteStudent(id);
        setStudents(students.filter(s => s.id !== id));
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete student.');
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await parseExcelFile(file);

      // Map data to expected backend format
      const mappedData = data.map(row => ({
        studentId: row['Student ID'] || row['studentId'] || '',
        rollNumber: row['Roll Number'] || row['Roll'] || row['rollNumber'] || '',
        name: row['Name'] || row['name'] || '',
        courseName: row['Course Name'] || row['Course'] || row['courseName'] || '',
        section: row['Section'] || row['section'] || '',
        academicYear: row['Academic Year'] || row['academicYear'] || '',
        fatherName: row['Father Name'] || row['fatherName'] || '',
        motherName: row['Mother Name'] || row['motherName'] || '',
        phone: row['Phone'] || row['phone'] || '',
        address: row['Address'] || row['address'] || ''
      })).filter(row => row.name); // require name

      if (mappedData.length === 0) {
        setError('No valid data found in file. Ensure the "Name" column exists.');
        setUploading(false);
        return;
      }

      const res = await bulkImportUpdateStudents({ students: mappedData });
      showToast(res.message || 'Import successful!', 'success');
      loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to process file. ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    const exportData = filteredStudents.map(s => ({
      'Student ID': s.studentId,
      'Name': s.name,
      'Roll Number': s.rollNumber || '',
      'Course': s.course ? `${s.course.courseName} - ${s.course.section}` : '',
      'Attendance %': `${s.attendancePercentage}%`,
      'Fee Status': s.feeStatus,
      'Phone': s.phone || '',
      'Father Name': s.fatherName || ''
    }));

    exportToExcel(exportData, "Eazzio_Students.xlsx", "Students");
  };

  const downloadTemplate = () => {
    const templateData = [{
      'Student ID': '(Leave blank for new)',
      'Name': 'John Doe',
      'Roll Number': '101',
      'Course Name': 'Class 10',
      'Section': 'A',
      'Academic Year': '2026-2027',
      'Father Name': 'Mr. Doe',
      'Mother Name': 'Mrs. Doe',
      'Phone': '9876543210',
      'Address': '123 Main St'
    }];
    
    downloadExcelTemplate(templateData, "Student_Import_Template.xlsx", "Template");
  };

  // Filter students dynamically
  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.rollNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.studentId || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCourse = !courseFilter || student.courseId?.toString() === courseFilter;

    return matchesSearch && matchesCourse;
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6 bg-gray-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Student Directory</h2>
          <p className="text-gray-500 mt-1">Manage enrollments, academic profiles, and fees.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="file" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          
          <div className="group relative">
            <button className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-emerald-600 rounded-lg shadow-sm text-sm font-medium transition-colors duration-150 flex items-center gap-2">
              <Upload size={16} /> Import
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 shadow-xl rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-colors duration-150 z-10 p-2">
              <button onClick={() => fileInputRef.current.click()} disabled={uploading} className="w-full text-left px-4 py-2 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-sm text-gray-700 transition-colors duration-150">
                {uploading ? 'Processing...' : 'Upload Excel/CSV'}
              </button>
              <button onClick={downloadTemplate} className="w-full text-left px-4 py-2 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-sm text-gray-700 transition-colors duration-150">
                Download Template
              </button>
            </div>
          </div>

          <button onClick={handleExport} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-green-600 rounded-lg shadow-sm text-sm font-medium transition-colors duration-150 flex items-center gap-2">
            <Download size={16} /> Export
          </button>
          
          {/* We will route to a new /principal/students/new or use modal. For now, manual addition via excel is primary, but we'll leave a placeholder */}
          <button onClick={() => showToast('Single manual addition coming soon. Please use Bulk Import for now.', 'info')} className="px-4 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-sm text-sm font-medium transition-colors duration-150 flex items-center gap-2">
            <Plus size={16} /> Add Student
          </button>
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
            placeholder="Search by name, roll number, or ID..." 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <select 
            value={courseFilter} 
            onChange={(e) => setCourseFilter(e.target.value)} 
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
          >
            <option value="">All Courses</option>
            {courses.map(crs => (
              <option key={crs.id} value={crs.id}>{crs.courseName} - {crs.section}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <Loader message="Loading Students..." />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Student Profile</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Roll No</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Course</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider text-center">Attendance</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Fee Status</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Users size={48} className="mb-4 opacity-20" />
                        <p className="text-sm">No students found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors duration-150 group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{student.name}</div>
                            <div className="text-xs text-gray-500 font-medium">{student.studentId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 font-medium">
                        {student.rollNumber || '-'}
                      </td>
                      <td className="py-4 px-6 text-sm">
                        {student.course ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">
                            {student.course.courseName} - {student.course.section}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className={`text-sm font-bold ${
                            student.attendancePercentage >= 75 ? 'text-emerald-600' :
                            student.attendancePercentage >= 50 ? 'text-amber-500' : 'text-red-500'
                          }`}>
                            {student.attendancePercentage}%
                          </span>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                student.attendancePercentage >= 75 ? 'bg-emerald-500' :
                                student.attendancePercentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`} 
                              style={{ width: `${student.attendancePercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm">
                        {student.feeStatus === 'PAID' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Paid</span>}
                        {student.feeStatus === 'PENDING' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-medium bg-amber-50 text-amber-700 border border-amber-200">Pending</span>}
                        {student.feeStatus === 'OVERDUE' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-medium bg-red-50 text-red-700 border border-red-200">Overdue</span>}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-colors duration-150">
                          <button onClick={() => navigate(`/principal/students/${student.id}`)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors duration-150" title="View Details">
                            <ChevronRight size={18} />
                          </button>
                          <button onClick={() => handleDelete(student.id, student.name)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150" title="Delete Student">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="bg-gray-50 border-t border-gray-100 p-4 text-xs text-gray-500 flex justify-between items-center">
            <span>Showing {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
