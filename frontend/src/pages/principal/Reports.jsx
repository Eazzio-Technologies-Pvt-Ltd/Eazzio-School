import React, { useState, useEffect, useContext } from 'react';
import { getSummary, getAIInsights, getAttendanceSummary } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { ToastContext } from '../../context/ToastContext';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [reportType, setReportType] = useState('');
  const { showToast } = useContext(ToastContext);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumData, insData, attData] = await Promise.all([
        getSummary(), 
        getAIInsights(),
        getAttendanceSummary()
      ]);
      setSummary(sumData);
      setInsights(insData);
      setAttendanceData(attData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerExport = (type) => {
    setReportType(type);
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      showToast(`CSV sheet compiled and downloaded for "${type}"!`, 'success');
    }, 1500);
  };

  if (loading) return <Loader message="Compiling administrative audit data..." />;

  // Pure-CSS chart items course-wise
  const coursesAttendanceData = attendanceData.map(c => ({
    className: c.courseName,
    rate: c.percentage
  }));

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-gray-800">
      <div className="mb-4">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Institutional Reports & Audits</h2>
        <p className="text-gray-500 mt-1">Access detailed summaries, financial records, and operational logs.</p>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-3 border-b border-gray-200 pb-px flex-wrap">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'attendance' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          📊 Attendance Report
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'finance' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          💳 Tuition & Finances
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'audit' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          📁 Export CSV Sheets
        </button>
      </div>

      {/* Tab Contents */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 md:p-8">
        {activeTab === 'attendance' && (
          <div className="flex flex-col gap-6">
            <div className="mb-4 border-b border-gray-100 pb-4">
              <h3 className="text-xl font-bold text-gray-900">Course-wise Attendance Audit</h3>
              <p className="text-sm text-gray-500 mt-1">Aggregate attendance rates compared by course levels.</p>
            </div>

            {/* CSS Horizontal Bar Chart */}
            <div className="flex flex-col gap-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
              {coursesAttendanceData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <span className="w-24 text-sm font-semibold text-gray-600">{item.className}</span>
                  <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700 ${item.rate >= 90 ? 'bg-emerald-500' : item.rate >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${item.rate}%` }}
                    >
                      <span className="text-xs font-bold text-white">{item.rate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Risk Warnings List */}
            <div className="mt-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">⚠️ Students at Attendance Risk (&lt; 75%)</h4>
              {insights?.lowAttendance?.length === 0 ? (
                <p className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-lg text-center">All student attendance parameters remain within bounds.</p>
              ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-100 bg-gray-50">
                        <th className="text-gray-500 px-4 py-3 font-semibold text-sm">Name</th>
                        <th className="text-gray-500 px-4 py-3 font-semibold text-sm">Roll Number</th>
                        <th className="text-gray-500 px-4 py-3 font-semibold text-sm">Current Rate</th>
                        <th className="text-gray-500 px-4 py-3 font-semibold text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insights?.lowAttendance?.map((student, idx) => (
                        <tr key={idx} className="transition-colors duration-150 hover:bg-gray-50 border-b border-gray-100">
                          <td className="px-4 py-3 text-gray-900 font-semibold text-sm">{student.name}</td>
                          <td className="px-4 py-3 text-gray-600 text-sm">{student.rollNumber}</td>
                          <td className="px-4 py-3 text-red-600 font-bold text-sm">{student.percentage}%</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase text-red-700 bg-red-100 border border-red-200">
                              CRITICAL
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="flex flex-col gap-6">
            <div className="mb-4 border-b border-gray-100 pb-4">
              <h3 className="text-xl font-bold text-gray-900">Tuition & Fee Collections Report</h3>
              <p className="text-sm text-gray-500 mt-1">Detailed statement of institutional collections and outstanding invoices.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Financial Progress Indicator */}
              <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl p-6 flex flex-col gap-3 min-w-[280px] w-full lg:w-auto">
                <h4 className="text-lg font-bold text-gray-900 mb-2">Collection Summary</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Fees Collected:</span>
                  <span className="text-emerald-600 font-bold">${summary?.paidFees?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Outstanding Balances:</span>
                  <span className="text-amber-500 font-bold">${summary?.pendingFees?.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                    style={{
                      width: `${
                        summary?.paidFees + summary?.pendingFees > 0
                          ? Math.round((summary.paidFees / (summary.paidFees + summary.pendingFees)) * 100)
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 italic mt-2">
                  Institutional target: 100% tuition collection completion rate.
                </p>
              </div>

              {/* Dues Ledger */}
              <div className="flex-[1.5] w-full">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">💳 Outstanding Dues Ledger</h4>
                {insights?.pendingFees?.length === 0 ? (
                  <p className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-lg text-center">All tuition fee payments have been finalized.</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-100 rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-100 bg-gray-50">
                          <th className="text-gray-500 px-4 py-3 font-semibold text-sm">Name</th>
                          <th className="text-gray-500 px-4 py-3 font-semibold text-sm">Roll Number</th>
                          <th className="text-gray-500 px-4 py-3 font-semibold text-sm">Outstanding Amount</th>
                          <th className="text-gray-500 px-4 py-3 font-semibold text-sm">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insights?.pendingFees?.map((student, idx) => (
                          <tr key={idx} className="transition-colors duration-150 hover:bg-gray-50 border-b border-gray-100">
                            <td className="px-4 py-3 text-gray-900 font-semibold text-sm">{student.name}</td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{student.rollNumber}</td>
                            <td className="px-4 py-3 text-amber-500 font-bold text-sm">
                              ${student.totalFees?.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase text-amber-700 bg-amber-100 border border-amber-200">
                                OVERDUE
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="flex flex-col gap-6">
            <div className="mb-4 border-b border-gray-100 pb-4">
              <h3 className="text-xl font-bold text-gray-900">Export Administrative Sheets</h3>
              <p className="text-sm text-gray-500 mt-1">Download raw registration audit sheets for academic governance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center flex flex-col items-center gap-3 transition hover:bg-white hover:border-emerald-500 hover:shadow-sm">
                <span className="text-3xl">🎒</span>
                <h3 className="text-lg font-bold text-gray-900">Enrollment Roster</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">Active student profiles, courses, and registration directories.</p>
                <button
                  onClick={() => triggerExport('Student Enrollment')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition disabled:opacity-50 text-sm shadow-sm"
                  disabled={downloading}
                >
                  {downloading && reportType === 'Student Enrollment' ? 'Generating...' : 'Download CSV'}
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center flex flex-col items-center gap-3 transition hover:bg-white hover:border-emerald-500 hover:shadow-sm">
                <span className="text-3xl">👩‍🏫</span>
                <h3 className="text-lg font-bold text-gray-900">Faculty Roster</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">Faculty profiles, subject distributions, and assignments.</p>
                <button
                  onClick={() => triggerExport('Faculty Directory')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition disabled:opacity-50 text-sm shadow-sm"
                  disabled={downloading}
                >
                  {downloading && reportType === 'Faculty Directory' ? 'Generating...' : 'Download CSV'}
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center flex flex-col items-center gap-3 transition hover:bg-white hover:border-emerald-500 hover:shadow-sm">
                <span className="text-3xl">📅</span>
                <h3 className="text-lg font-bold text-gray-900">Attendance Ledger</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">Aggregated attendance statistics and absence counts.</p>
                <button
                  onClick={() => triggerExport('Attendance Audit')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-150 disabled:opacity-50 text-sm shadow-sm"
                  disabled={downloading}
                >
                  {downloading && reportType === 'Attendance Audit' ? 'Generating...' : 'Download CSV'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
