import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSummary } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { 
  BookOpen, School, Users, UserCheck, CheckCircle, 
  XCircle, CreditCard, Bell, PlusSquare, Upload, 
  Send, Calendar, RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Clock
} from 'lucide-react';

const StatCard = ({ title, value, icon, desc, colorCourse, iconColor }) => (
  <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex flex-col gap-2 hover:shadow-md transition">
    <div className="flex justify-between items-center">
      <h3 className="text-sm font-semibold text-gray-500">{title}</h3>
      <span className={iconColor || 'text-gray-400'}>{icon}</span>
    </div>
    <div className={`text-3xl font-bold ${colorCourse || 'text-gray-900'}`}>{value}</div>
    <p className="text-xs text-gray-500">{desc}</p>
  </div>
);

export default function PrincipalDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const sumData = await getSummary();
      setData(sumData);
    } catch (err) {
      console.error(err);
      setError('Failed to load administrative summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <Loader message="Loading Principal Dashboard..." />;
  if (error) return <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">{error}</div>;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-8 animate-fade-in text-gray-800">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Principal Dashboard</h2>
          <p className="text-gray-500">Overview of academic and administrative metrics.</p>
        </div>
        <button onClick={loadData} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 rounded-lg text-sm transition-colors duration-150 shadow-sm">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Courses" value={data.totalCourses || 0} icon={<BookOpen size={24} />} desc="Unique subjects taught" iconColor="text-emerald-500" />
        <StatCard title="Total Students" value={data.totalStudents || 0} icon={<Users size={24} />} desc="Enrolled students" iconColor="text-emerald-500" />
        <StatCard title="Total Teachers" value={data.totalTeachers || 0} icon={<UserCheck size={24} />} desc="Faculty members" iconColor="text-emerald-500" />
        <StatCard title="Today's Attendance" value={`${data.todayAttendance?.percentage || 0}%`} icon={<CheckCircle size={24} />} desc="Overall presence rate" colorCourse="text-emerald-600" iconColor="text-emerald-500" />
        <StatCard title="Absent Today" value={data.todayAttendance?.absent || 0} icon={<XCircle size={24} />} desc="Students missing" colorCourse="text-red-600" iconColor="text-red-500" />
        <StatCard title="Students with Pending Fees" value={data.studentsWithFeeDue || 0} icon={<CreditCard size={24} />} desc="Outstanding balances" colorCourse="text-amber-600" iconColor="text-amber-500" />
        <StatCard title="Active Notices" value={data.activeNoticesCount || 0} icon={<Bell size={24} />} desc="Published announcements" iconColor="text-pink-500" />
      </div>

      {/* INSIGHTS & EXCEPTIONS */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Insights & Exceptions</h3>
            <p className="text-sm text-gray-500">Key metrics requiring attention.</p>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full border border-amber-200 opacity-70">
            <Clock size={16} />
            <span className="text-sm font-semibold">{data.pendingLeaveRequests || 0} Pending Leave Requests</span>
            <span className="ml-2 text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Coming Soon</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Low Attendance */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-red-500" />
              <h4 className="font-semibold text-gray-800 text-sm">Low Attendance (Last 7 Days)</h4>
            </div>
            <div className="flex flex-col gap-2">
              {!data.lowAttendanceClasses || data.lowAttendanceClasses.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No classes below 75% attendance.</p>
              ) : (
                data.lowAttendanceClasses.map((c, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-white rounded border border-red-100 shadow-sm">
                    <span className="text-xs font-medium text-gray-700">{c.courseName}</span>
                    <span className="text-xs font-bold text-red-600">{c.percentage}%</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top 3 Classes */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-emerald-500" />
              <h4 className="font-semibold text-gray-800 text-sm">Top Performing Classes</h4>
            </div>
            <div className="flex flex-col gap-2">
              {!data.topClasses || data.topClasses.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No grade data available.</p>
              ) : (
                data.topClasses.map((c, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-white rounded border border-emerald-100 shadow-sm">
                    <span className="text-xs font-medium text-gray-700">{i + 1}. {c.courseName}</span>
                    <span className="text-xs font-bold text-emerald-600">{c.averageGrade}%</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom 3 Classes */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown size={18} className="text-red-500" />
              <h4 className="font-semibold text-gray-800 text-sm">Needs Improvement</h4>
            </div>
            <div className="flex flex-col gap-2">
              {!data.bottomClasses || data.bottomClasses.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No grade data available.</p>
              ) : (
                data.bottomClasses.map((c, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-white rounded border border-red-100 shadow-sm">
                    <span className="text-xs font-medium text-gray-700">{c.courseName}</span>
                    <span className="text-xs font-bold text-red-600">{c.averageGrade}%</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (Span 2) */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* FEE ALERT */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Fee Alert</h3>
            <p className="text-sm text-gray-500 mb-4">Students with outstanding due amounts.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="py-3 px-4 font-semibold text-gray-600 text-sm rounded-tl-lg">Student Name</th>
                    <th className="py-3 px-4 font-semibold text-gray-600 text-sm">Course</th>
                    <th className="py-3 px-4 font-semibold text-gray-600 text-sm">Due Amount</th>
                    <th className="py-3 px-4 font-semibold text-gray-600 text-sm rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.feeAlerts?.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-gray-500 italic text-sm">No pending fees.</td>
                    </tr>
                  ) : (
                    data.feeAlerts?.map((fee, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 text-sm">
                        <td className="py-3 px-4 font-medium text-gray-800">{fee.name}</td>
                        <td className="py-3 px-4 text-gray-600">{fee.courseName}</td>
                        <td className="py-3 px-4 font-bold text-amber-600">₹{fee.dueAmount.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${fee.status === 'OVERDUE' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                            {fee.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RECENT ACTIVITIES */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Recent Activities</h3>
            <p className="text-sm text-gray-500 mb-4">Latest system logs and updates.</p>
            <div className="flex flex-col gap-4">
              {data.recentActivities?.length === 0 ? (
                <p className="text-gray-500 italic text-sm">No recent activities found.</p>
              ) : (
                data.recentActivities?.map(activity => (
                  <div key={activity.id} className="flex gap-4 items-start">
                    <div className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(99,102,241,0.4)] shrink-0"></div>
                    <div>
                      <p className="text-gray-800 text-sm font-medium">{activity.text}</p>
                      <p className="text-xs text-gray-500">{new Date(activity.time).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          
          {/* TODAY'S ATTENDANCE */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Today's Attendance</h3>
            <p className="text-sm text-gray-500 mb-4">Daily campus presence.</p>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-700 text-sm font-medium">Present</span>
                <span className="font-bold text-emerald-600">{data.todayAttendance?.present || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-700 text-sm font-medium">Absent</span>
                <span className="font-bold text-red-600">{data.todayAttendance?.absent || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-700 text-sm font-medium">Leave</span>
                <span className="font-bold text-blue-600">{data.todayAttendance?.leave || 0}</span>
              </div>
              <div className="mt-4 text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="text-4xl font-bold text-emerald-700">{data.todayAttendance?.percentage || 0}%</div>
                <div className="text-xs text-emerald-500 font-medium mt-1 uppercase tracking-wider">Overall Attendance</div>
              </div>
            </div>
          </div>


          {/* UPCOMING NOTICES */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Upcoming Notices</h3>
            <p className="text-sm text-gray-500 mb-4">Latest published announcements.</p>
            <div className="flex flex-col gap-3">
              {data.upcomingNotices?.length === 0 ? (
                <p className="text-gray-500 italic text-sm">No active notices.</p>
              ) : (
                data.upcomingNotices?.map(notice => (
                  <div key={notice.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-sm transition">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-800 text-sm">{notice.title}</h4>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded-full border border-emerald-200">{notice.audience}</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{notice.content}</p>
                    <p className="text-[10px] text-gray-500 mt-2 font-medium">{new Date(notice.date).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
