import React, { useState, useEffect, useMemo } from 'react';
import { getAttendance } from '../../api/studentApi';
import Loader from '../../components/Loader';
import { Calendar, CheckCircle, XCircle, Clock, Filter, CalendarDays } from 'lucide-react';

export default function MyAttendance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('ALL');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getAttendance();
        // The interceptor unwraps response.data, so res is the payload: { stats, records }
        setData(res);
      } catch (err) {
        console.error(err);
        setError('Failed to load attendance records.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const { stats, records } = data || {};

  // Extract unique months for the filter
  const availableMonths = useMemo(() => {
    if (!records) return [];
    const months = new Set();
    records.forEach(r => {
      const date = new Date(r.date);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthStr);
    });
    return Array.from(months).sort().reverse(); // Newest first
  }, [records]);

  // Filter records based on selected month
  const filteredRecords = useMemo(() => {
    if (!records) return [];
    if (selectedMonth === 'ALL') return records;
    return records.filter(r => {
      const date = new Date(r.date);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthStr === selectedMonth;
    });
  }, [records, selectedMonth]);

  const formatMonth = (yyyyMm) => {
    const [y, m] = yyyyMm.split('-');
    const date = new Date(y, parseInt(m) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  if (loading) return <Loader message="Loading Attendance Records..." />;
  if (error) return <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">{error}</div>;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-8 animate-fade-in text-gray-800">
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Attendance</h2>
        <p className="text-gray-500">Track your daily presence and academic engagement.</p>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-emerald-600 text-white shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <CalendarDays size={100} />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest text-emerald-100 mb-1 z-10">Overall</span>
          <span className="text-5xl font-black z-10">{stats.percentage}%</span>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle size={28} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Present</span>
            <span className="text-2xl font-bold text-gray-900">{stats.present} <span className="text-sm font-medium text-gray-500 lowercase">days</span></span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Clock size={28} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Late</span>
            <span className="text-2xl font-bold text-gray-900">{stats.late} <span className="text-sm font-medium text-gray-500 lowercase">days</span></span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <XCircle size={28} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Absent</span>
            <span className="text-2xl font-bold text-gray-900">{stats.absent} <span className="text-sm font-medium text-gray-500 lowercase">days</span></span>
          </div>
        </div>
      </div>

      {/* FILTER & RECORDS */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
        
        {/* Header & Filter */}
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="text-emerald-500" size={20} />
            Daily Records
          </h3>
          
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1">
            <Filter size={16} className="text-gray-400 ml-2" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-medium text-gray-700 py-1.5 px-2 outline-none cursor-pointer"
            >
              <option value="ALL">All Months</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List View */}
        <div className="overflow-x-auto max-h-[500px] custom-scrollbar-emerald">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 shadow-sm">
              <tr>
                <th className="py-3 px-6 font-semibold text-gray-600 text-sm">Date</th>
                <th className="py-3 px-6 font-semibold text-gray-600 text-sm">Day</th>
                <th className="py-3 px-6 font-semibold text-gray-600 text-sm">Status</th>
                <th className="py-3 px-6 font-semibold text-gray-600 text-sm">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <CalendarDays className="text-gray-300" size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-700">No Records Found</h3>
                      <p className="text-gray-500 max-w-sm mt-2 text-sm">There are currently no attendance records logged for the selected period.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => {
                  const dateObj = new Date(record.date);
                  
                  let statusStyles = '';
                  let StatusIcon = null;
                  if (record.status === 'PRESENT') {
                    statusStyles = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                    StatusIcon = CheckCircle;
                  } else if (record.status === 'ABSENT') {
                    statusStyles = 'bg-red-100 text-red-700 border-red-200';
                    StatusIcon = XCircle;
                  } else if (record.status === 'LATE') {
                    statusStyles = 'bg-amber-100 text-amber-700 border-amber-200';
                    StatusIcon = Clock;
                  } else {
                    statusStyles = 'bg-gray-100 text-gray-700 border-gray-200';
                    StatusIcon = Calendar;
                  }

                  return (
                    <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors group">
                      <td className="py-4 px-6 text-sm font-medium text-gray-800">
                        {dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full font-bold border ${statusStyles}`}>
                          <StatusIcon size={12} />
                          {record.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">
                        {record.remarks || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
