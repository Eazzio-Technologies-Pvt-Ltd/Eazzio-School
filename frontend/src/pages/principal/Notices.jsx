import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import { getNotices, createNotice, deleteNotice } from '../../api/noticeApi';
import api from '../../api/axios';
import Loader from '../../components/Loader';
import { FileText, Trash2 } from 'lucide-react';

export default function PrincipalNotices() {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [notices, setNotices] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [publishMode, setPublishMode] = useState('now');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    audience: 'SCHOOL',
    courseId: '',
    scheduledAt: '',
  });
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [noticesData, coursesRes] = await Promise.all([
        getNotices({ schoolId: user.schoolId, role: 'PRINCIPAL' }),
        api.get('/principal/courses', { params: { schoolId: user.schoolId } })
      ]);
      setNotices(noticesData || []);
      setCourses(coursesRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('schoolId', user.schoolId);
      data.append('title', formData.title);
      data.append('content', formData.content);
      data.append('audience', formData.audience);
      if (formData.audience === 'COURSE' && formData.courseId) {
        data.append('courseId', formData.courseId);
      }
      if (publishMode === 'later' && formData.scheduledAt) {
        data.append('scheduledAt', formData.scheduledAt);
      }
      if (file) {
        data.append('attachment', file);
      }

      await createNotice(data);
      
      setFormData({ title: '', content: '', audience: 'SCHOOL', courseId: '', scheduledAt: '' });
      setPublishMode('now');
      setFile(null);
      setShowForm(false);
      loadData();
      showToast('Notice published successfully!', 'success');
    } catch (err) {
      console.error('Failed to create notice', err);
      showToast('Failed to create notice', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    try {
      await deleteNotice(id);
      loadData();
      showToast('Notice deleted', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete notice', 'error');
    }
  };

  if (loading) return <Loader message="Loading notices..." />;

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-gray-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Notice Board Management</h2>
          <p className="text-gray-500 mt-1">Publish circulars, announcements, and important updates.</p>
        </div>
        <button 
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm font-medium transition"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New Notice'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-5">Create Notice</h3>
          
          <div className="flex flex-col gap-1.5 mb-4">
            <label className="block text-sm font-medium text-gray-700">Notice Title</label>
            <input 
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g. Annual Sports Day"
            />
          </div>

          <div className="flex flex-col gap-1.5 mb-4">
            <label className="block text-sm font-medium text-gray-700">Audience</label>
            <select 
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              name="audience"
              value={formData.audience}
              onChange={handleInputChange}
            >
              <option value="SCHOOL">Entire School (Everyone)</option>
              <option value="TEACHERS">Teachers Only</option>
              <option value="STUDENTS">Students Only</option>
              <option value="COURSE">Specific Course</option>
            </select>
          </div>

          {formData.audience === 'COURSE' && (
            <div className="flex flex-col gap-1.5 mb-4">
              <label className="block text-sm font-medium text-gray-700">Select Course</label>
              <select 
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                name="courseId"
                required
                value={formData.courseId}
                onChange={handleInputChange}
              >
                <option value="">-- Choose Course --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.className} - Sec {c.section}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5 mb-4">
            <label className="block text-sm font-medium text-gray-700">Publishing Schedule</label>
            <div className="flex gap-6 items-center">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input 
                  type="radio" 
                  name="publishMode" 
                  value="now" 
                  checked={publishMode === 'now'} 
                  onChange={(e) => setPublishMode(e.target.value)} 
                  className="text-emerald-600 focus:ring-emerald-500"
                /> Publish Now
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input 
                  type="radio" 
                  name="publishMode" 
                  value="later" 
                  checked={publishMode === 'later'} 
                  onChange={(e) => setPublishMode(e.target.value)} 
                  className="text-emerald-600 focus:ring-emerald-500"
                /> Schedule for Later
              </label>
            </div>
          </div>

          {publishMode === 'later' && (
            <div className="flex flex-col gap-1.5 mb-4">
              <label className="block text-sm font-medium text-gray-700">Select Date & Time</label>
              <input 
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                type="datetime-local"
                name="scheduledAt"
                required={publishMode === 'later'}
                value={formData.scheduledAt}
                onChange={handleInputChange}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5 mb-4">
            <label className="block text-sm font-medium text-gray-700">Details (Optional)</label>
            <textarea 
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-y"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="Enter details..."
            />
          </div>

          <div className="flex flex-col gap-1.5 mb-4">
            <label className="block text-sm font-medium text-gray-700">Attach PDF Document (Optional)</label>
            <input 
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="w-full p-2 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-150 shadow-sm mt-2 disabled:opacity-50">
            {isSubmitting ? 'Publishing...' : 'Publish Notice'}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-4">
        {notices.length === 0 ? (
          <div className="text-gray-500 bg-white p-6 rounded-xl border border-gray-200 text-center">No notices have been published.</div>
        ) : (
          notices.map((note) => (
            <div key={note.id} className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 hover:shadow-md transition">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-bold text-gray-900">{note.title}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-gray-100 text-gray-600 border border-gray-200">
                    {note.audience === 'COURSE' 
                      ? `Course: ${note.course?.className || 'N/A'}` 
                      : note.audience}
                  </span>
                  {note.status === 'SCHEDULED' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                      SCHEDULED FOR: {new Date(note.scheduledAt).toLocaleString()}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      PUBLISHED
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 font-medium">{new Date(note.date).toLocaleDateString()}</span>
                  <button onClick={() => handleDelete(note.id)} className="flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors duration-150 px-2 py-1 bg-red-50 hover:bg-red-100 rounded text-xs font-medium border border-red-100">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
              
              {note.content && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>}
              
              {note.attachmentUrl && (
                <div className="mt-4">
                  <a href={`http://localhost:5000${note.attachmentUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition border border-emerald-100">
                    <FileText size={16} /> View Attached PDF
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
