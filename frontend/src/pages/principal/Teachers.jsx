import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getTeachers, registerTeacher, bulkImportUpdateTeachers, deleteTeacher, updateTeacher } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { Download, Upload, Search, UserPlus, BookOpen, AlertCircle, CheckCircle2, MoreVertical, Eye, Edit2, Trash2, X, Mail, Phone, Hash, Calendar, GraduationCap } from 'lucide-react';
import { parseExcelFile, downloadExcelTemplate } from '../../utils/excelUtils';

export default function Teachers() {
  const location = useLocation();
  const navigate = useNavigate();
  const nameInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  // Data List & State
  const [teachersList, setTeachersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', phone: '', subjects: [] });
  const [subjectInput, setSubjectInput] = useState('');

  // View Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [teacherToView, setTeacherToView] = useState(null);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const teachers = await getTeachers();
      setTeachersList(teachers);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Failed to load faculty roster.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (window.confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) {
      try {
        await deleteTeacher(teacherId);
        setFeedback({ type: 'success', message: 'Teacher deleted successfully.' });
        loadTeachers();
      } catch (err) {
        setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to delete teacher.' });
      }
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  useEffect(() => {
    if (!loading) {
      const params = new URLSearchParams(location.search);
      if (params.get('focus') === 'form' && nameInputRef.current) {
        nameInputRef.current.scrollIntoView({ behavior: 'smooth' });
        nameInputRef.current.focus();
      }
    }
  }, [location, loading]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    setSubmitting(true);

    try {
      await registerTeacher({ name, email, password, phone });
      setFeedback({ type: 'success', message: 'Teacher successfully registered!' });
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      await loadTeachers();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Registration failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setFeedback({ type: '', message: '' });
    try {
      const data = await parseExcelFile(file);
      const errors = [];
      const mappedData = [];

      data.forEach((row, index) => {
        const rowNum = index + 2; // +1 for 0-index, +1 for header row
        
        const name = row['Name*'] || row['Name'] || row['name'] || '';
        const email = row['Email*'] || row['Email'] || row['email'] || '';
        
        // Validate mandatory fields
        const missing = [];
        if (!name) missing.push('Name');
        if (!email) missing.push('Email');

        if (missing.length > 0) {
          errors.push(`Row ${rowNum}: Missing mandatory fields - ${missing.join(', ')}`);
          return;
        }

        mappedData.push({
          name: String(name),
          email: String(email),
          phone: String(row['Phone'] || row['phone'] || '')
        });
      });

      if (errors.length > 0) {
        setFeedback({ type: 'error', message: errors.join('\n') });
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (mappedData.length === 0) {
        setFeedback({ type: 'error', message: 'No valid data found in file. Ensure the template is correctly filled.' });
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const res = await bulkImportUpdateTeachers({ teachers: mappedData });
      setFeedback({ type: 'success', message: res.message || 'Import successful!' });
      loadTeachers();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Failed to process file. ' + (err.response?.data?.error || err.message) });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const templateData = [{ 
      'Name*': 'Jane Smith', 
      'Email*': 'jane@school.com', 
      'Phone': '9876543210' 
    }];
    downloadExcelTemplate(templateData, "Teacher_Import_Template.xlsx", "Template");
  };

  const openEditModal = (teacher) => {
    setSelectedTeacher(teacher);
    setEditFormData({
      name: teacher.name || '',
      phone: teacher.phone || '',
      subjects: teacher.subjects || []
    });
    setSubjectInput('');
    setEditModalOpen(true);
  };

  const openViewModal = (teacher) => {
    setTeacherToView(teacher);
    setViewModalOpen(true);
  };

  const handleAddSubject = (e) => {
    if (e.key === 'Enter' && subjectInput.trim()) {
      e.preventDefault();
      if (!editFormData.subjects.includes(subjectInput.trim())) {
        setEditFormData({ ...editFormData, subjects: [...editFormData.subjects, subjectInput.trim()] });
      }
      setSubjectInput('');
    }
  };

  const handleRemoveSubject = (subjectToRemove) => {
    setEditFormData({ ...editFormData, subjects: editFormData.subjects.filter(s => s !== subjectToRemove) });
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await updateTeacher(selectedTeacher.id, editFormData);
      setFeedback({ type: 'success', message: 'Teacher updated successfully.' });
      setEditModalOpen(false);
      loadTeachers();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to update teacher.' });
    } finally {
      setSubmitting(false);
    }
  };

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
    <div className="flex flex-col gap-6 animate-fade-in text-gray-800 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Faculty Registry</h2>
          <p className="text-gray-500 mt-1">Register and manage faculty members and courseroom assignments.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="hidden" />
          
          <div className="group relative">
            <button className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-emerald-600 rounded-lg shadow-sm text-sm font-medium transition-all flex items-center gap-2">
              <Upload size={16} /> Import Faculty
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 shadow-xl rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2">
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full text-left px-4 py-2 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-sm text-gray-700 transition">
                {uploading ? 'Processing...' : 'Upload Excel/CSV'}
              </button>
              <button onClick={downloadTemplate} className="w-full text-left px-4 py-2 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-sm text-gray-700 transition">
                Download Template
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Register Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <UserPlus size={20} />
            </div>
            <h3 className="font-semibold text-gray-800">Register New Teacher</h3>
          </div>
          
          <div className="p-5">
            {feedback.message && (
              <div className={`p-4 rounded-lg text-sm mb-6 flex items-start gap-3 border whitespace-pre-line ${feedback.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                {feedback.type === 'error' ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
                <p>{feedback.message}</p>
              </div>
            )}

            <form onSubmit={handleRegister} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reg-name">Full Name</label>
                <input
                  ref={nameInputRef}
                  id="reg-name"
                  type="text"
                  placeholder="e.g. Mrs. Sarah Davis"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reg-email">Email Address</label>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="e.g. sarah@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reg-password">Temporary Password</label>
                <input
                  id="reg-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reg-phone">Phone Number</label>
                <input
                  id="reg-phone"
                  type="text"
                  placeholder="e.g. +1 555-0198"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-70 flex justify-center items-center"
              >
                {submitting ? 'Registering...' : 'Register Teacher'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Faculty Directory */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative w-full sm:w-80">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search name or email..." 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
              <select 
                value={courseFilter} 
                onChange={(e) => setCourseFilter(e.target.value)} 
                className="w-full sm:w-40 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
              >
                <option value="">All Courses</option>
                {coursesList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              
              <select 
                value={subjectFilter} 
                onChange={(e) => setSubjectFilter(e.target.value)} 
                className="w-full sm:w-40 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
              >
                <option value="">All Subjects</option>
                {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Data Table */}
          {loading ? (
            <Loader message="Loading faculty directory..." />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                 <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                   <BookOpen size={18} className="text-emerald-500" /> Faculty Directory
                 </h3>
                 <span className="text-xs font-medium bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full">{filteredTeachers.length} Records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-white border-b border-gray-100">
                      <th className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teacher Profile</th>
                      <th className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee ID</th>
                      <th className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject & Course</th>
                      <th className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTeachers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-3">
                            <Search size={32} className="text-gray-300" />
                            <p>No faculty found matching the active search parameters.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTeachers.map((user) => {
                        const allSubjects = [...new Set([...(user.subjects || []), ...(user.timetables?.map(tt => tt.subject) || [])])];
                        const subjectsStr = allSubjects.length > 0 
                          ? allSubjects.join(', ')
                          : 'Unassigned Subjects';
                        const courseStr = user.assignedCourse ? `${user.assignedCourse.courseName}-${user.assignedCourse.section}` : 'Unassigned Course';
                        
                        return (
                          <tr key={user.id} onClick={() => navigate(`/principal/teachers/${user.id}`)} className="hover:bg-gray-50/80 transition-colors cursor-pointer group">
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
                            <td className="py-4 px-5">
                              <div className="flex justify-end gap-2">
                                <button onClick={(e) => { e.stopPropagation(); navigate(`/principal/teachers/${user.id}`); }} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="View Profile">
                                  <Eye size={16} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); openEditModal(user); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit Teacher">
                                  <Edit2 size={16} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteTeacher(user.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Remove">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Teacher Modal */}
      {editModalOpen && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900">Edit Teacher Profile</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateTeacher} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qualified Subjects</label>
                <p className="text-xs text-gray-500 mb-2">Type a subject and press Enter to add.</p>
                <div className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition-all">
                  {editFormData.subjects.map(sub => (
                    <span key={sub} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-sm font-medium rounded-md">
                      {sub}
                      <button type="button" onClick={() => handleRemoveSubject(sub)} className="text-emerald-600 hover:text-emerald-900 focus:outline-none">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    onKeyDown={handleAddSubject}
                    placeholder={editFormData.subjects.length === 0 ? "e.g. Mathematics, Physics..." : "Add another subject..."}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-sm p-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Teacher Modal */}
      {viewModalOpen && teacherToView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-2xl">
                  {teacherToView.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-xl text-gray-900">{teacherToView.name}</h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active Faculty
                  </span>
                </div>
              </div>
              <button onClick={() => setViewModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              {/* Contact Info */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact & Identity</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Hash size={18} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Employee ID</p>
                      <p className="font-medium text-gray-900">{teacherToView.employeeId}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail size={18} className="text-gray-400 mt-0.5" />
                    <div className="truncate">
                      <p className="text-xs text-gray-500">Email Address</p>
                      <p className="font-medium text-gray-900 truncate" title={teacherToView.email}>{teacherToView.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone size={18} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900">{teacherToView.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar size={18} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Joined Date</p>
                      <p className="font-medium text-gray-900">{new Date(teacherToView.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Academic Info */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Academic Portfolio</h4>
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={16} className="text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">Qualified Subjects</p>
                  </div>
                  {teacherToView.subjects && teacherToView.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pl-6">
                      {teacherToView.subjects.map(sub => (
                         <span key={sub} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-md border border-emerald-100">
                           {sub}
                         </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 pl-6 italic">No specific subjects documented.</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap size={16} className="text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">Class Teacher Assignment</p>
                  </div>
                  <div className="pl-6">
                    {teacherToView.assignedCourse ? (
                       <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg border border-blue-100">
                         Class {teacherToView.assignedCourse.courseName} - Section {teacherToView.assignedCourse.section}
                       </span>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Not currently a class teacher.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
            
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => setViewModalOpen(false)} className="px-5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-sm font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
  
