import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentDetails } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { 
  ArrowLeft, User, Phone, MapPin, Calendar, CreditCard, 
  BookOpen, Clock, Bell, AlertTriangle, CheckCircle, TrendingUp
} from 'lucide-react';

export default function StudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setLoading(true);
        const res = await getStudentDetails(id);
        if (res && res.id) {
          setStudent(res);
        } else {
          setError('Failed to fetch student details.');
        }
      } catch (err) {
        console.error(err);
        setError('Error loading student profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  if (loading) return <div className="p-8"><Loader message="Loading Student Profile..." /></div>;
  if (error) return <div className="p-8 text-red-500 font-medium">{error}</div>;
  if (!student) return <div className="p-8 text-gray-500">Student not found.</div>;

  const totalFees = student.feeInvoices?.reduce((acc, inv) => acc + inv.amount, 0) || 0;
  const totalPaid = student.feeInvoices?.reduce((acc, inv) => 
    acc + inv.payments.reduce((pAcc, p) => pAcc + p.amount, 0)
  , 0) || 0;
  const totalPending = Math.max(0, totalFees - totalPaid);

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6 bg-gray-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/principal/students')} 
            className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors duration-150"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xl font-bold">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              {student.name}
              {student.feeStatus === 'OVERDUE' && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200 uppercase tracking-wider">
                  <AlertTriangle size={14} /> Result on Hold
                </span>
              )}
            </h2>
            <p className="text-gray-500 font-medium">ID: {student.studentId}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Personal & Academic Info */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Academic Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4 flex items-center gap-2">
              <BookOpen size={18} className="text-emerald-500" />
              <h3 className="font-semibold text-gray-800">Academic Info</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Course & Section</p>
                <p className="text-sm font-medium text-gray-900">
                  {student.course ? `${student.course.courseName} - ${student.course.section}` : <span className="text-gray-400 italic">Unassigned</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Roll Number</p>
                <p className="text-sm font-medium text-gray-900">{student.rollNumber || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Admission Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4 flex items-center gap-2">
              <User size={18} className="text-emerald-500" />
              <h3 className="font-semibold text-gray-800">Personal Details</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Father's Name</p>
                <p className="text-sm font-medium text-gray-900">{student.fatherName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Mother's Name</p>
                <p className="text-sm font-medium text-gray-900">{student.motherName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Contact Phone</p>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" /> {student.phone || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Address</p>
                <p className="text-sm font-medium text-gray-900 flex items-start gap-2">
                  <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" /> {student.address || '-'}
                </p>
              </div>
            </div>
          </div>
          
        </div>

        {/* Middle Column: Attendance & Fees */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Attendance Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" />
                <h3 className="font-semibold text-gray-800">Attendance Summary</h3>
              </div>
              <span className={`font-bold text-lg ${
                student.attendancePercentage >= 75 ? 'text-emerald-600' :
                student.attendancePercentage >= 50 ? 'text-amber-500' : 'text-red-600'
              }`}>
                {student.attendancePercentage}%
              </span>
            </div>
            <div className="p-5 flex-1 flex flex-col gap-4">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    student.attendancePercentage >= 75 ? 'bg-emerald-500' :
                    student.attendancePercentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${student.attendancePercentage}%` }}
                />
              </div>
              
              {student.monthlyAttendance && student.monthlyAttendance.length > 0 ? (
                <div className="space-y-3 mt-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Monthly Breakdown</h4>
                  {student.monthlyAttendance.map((record, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{record.month}</span>
                      <div className="flex items-center gap-3 w-32">
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${record.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-500 w-8 text-right">{record.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-400 italic">
                  No attendance records found.
                </div>
              )}
            </div>
          </div>

          {/* Fee Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-amber-500" />
                <h3 className="font-semibold text-gray-800">Fee Standing</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                student.feeStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                student.feeStatus === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-red-50 text-red-700 border-red-200'
              }`}>
                {student.feeStatus}
              </span>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium mb-1">Total Paid</p>
                  <p className="text-xl font-bold text-gray-900">₹{totalPaid.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xs text-red-500 font-medium mb-1">Total Pending</p>
                  <p className="text-xl font-bold text-red-700">₹{totalPending.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-xs text-center text-gray-400 mt-2">
                Note: Financial changes are restricted to the Accountant role.
              </p>
            </div>
          </div>

        </div>

        {/* Right Column: Notices & Timetable */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Notices */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4 flex items-center gap-2">
              <Bell size={18} className="text-blue-500" />
              <h3 className="font-semibold text-gray-800">Recent Notices</h3>
            </div>
            <div className="p-0">
              {student.notices && student.notices.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {student.notices.map((notice) => (
                    <div key={notice.id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{notice.title}</h4>
                        <span className="text-[10px] text-gray-400 font-medium shrink-0">
                          {new Date(notice.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{notice.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-gray-400 italic">
                  No active notices.
                </div>
              )}
            </div>
          </div>

          {/* Timetable Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1">
            <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4 flex items-center gap-2">
              <Calendar size={18} className="text-emerald-500" />
              <h3 className="font-semibold text-gray-800">Weekly Schedule</h3>
            </div>
            <div className="p-0">
              {student.timetables && student.timetables.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="py-2 px-4 font-medium text-gray-500">Day</th>
                        <th className="py-2 px-4 font-medium text-gray-500">Period</th>
                        <th className="py-2 px-4 font-medium text-gray-500">Subject</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {student.timetables.slice(0, 7).map(t => (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="py-2 px-4 font-medium text-gray-700">{t.dayOfWeek.substring(0, 3)}</td>
                          <td className="py-2 px-4 text-gray-500">{t.period}</td>
                          <td className="py-2 px-4 text-gray-900">{t.subject}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-gray-400 italic">
                  No timetable assigned.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
