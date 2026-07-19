import React, { useState, useEffect } from 'react';
import { getFeeCollection } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { CreditCard, AlertTriangle, AlertCircle, Search, Filter } from 'lucide-react';

export default function FeesOverview() {
  const [collectionData, setCollectionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, PENDING_FULL, PARTIAL, OVERDUE
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const colRes = await getFeeCollection();
      setCollectionData(colRes);
    } catch (err) {
      console.error(err);
      setError('Failed to load fee management data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8"><Loader message="Loading fee monitoring data..." /></div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 m-6">{error}</div>;

  const students = collectionData?.students || [];

  // Categorize students
  const pendingFull = students.filter(s => s.pending > 0 && s.paid === 0);
  const partiallyPaid = students.filter(s => s.pending > 0 && s.paid > 0);
  const onHold = students.filter(s => s.status === 'OVERDUE');

  // Filter for display
  let displayedStudents = students.filter(s => s.pending > 0); // Only show students with dues
  if (filterType === 'PENDING_FULL') displayedStudents = pendingFull;
  if (filterType === 'PARTIAL') displayedStudents = partiallyPaid;
  if (filterType === 'OVERDUE') displayedStudents = onHold;

  if (searchQuery) {
    displayedStudents = displayedStudents.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (s.rollNumber && s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6 bg-gray-50 min-h-screen">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Fee Monitoring</h2>
        <p className="text-gray-500 mt-1">Monitor school-wide outstanding student dues and financial standing.</p>
        <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-xs font-medium border border-blue-100">
          <AlertCircle size={14} />
          Read-only view. Invoices and payment collection are managed by the Accountant workspace.
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          onClick={() => setFilterType(filterType === 'PENDING_FULL' ? 'ALL' : 'PENDING_FULL')}
          className={`bg-white border rounded-xl p-5 cursor-pointer transition-all ${filterType === 'PENDING_FULL' ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md' : 'border-gray-200 hover:border-amber-300 shadow-sm'}`}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-500">Students with Pending Fees</h3>
            <CreditCard size={20} className="text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{pendingFull.length}</div>
          <p className="text-xs text-gray-400 mt-1">No payments made yet</p>
        </div>

        <div 
          onClick={() => setFilterType(filterType === 'PARTIAL' ? 'ALL' : 'PARTIAL')}
          className={`bg-white border rounded-xl p-5 cursor-pointer transition-all ${filterType === 'PARTIAL' ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' : 'border-gray-200 hover:border-blue-300 shadow-sm'}`}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-500">Partially Paid Fees</h3>
            <CreditCard size={20} className="text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{partiallyPaid.length}</div>
          <p className="text-xs text-gray-400 mt-1">Some amount paid, balance pending</p>
        </div>

        <div 
          onClick={() => setFilterType(filterType === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          className={`bg-white border rounded-xl p-5 cursor-pointer transition-all ${filterType === 'OVERDUE' ? 'border-red-500 ring-2 ring-red-500/20 shadow-md' : 'border-gray-200 hover:border-red-300 shadow-sm'}`}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-500">Result on Hold</h3>
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{onHold.length}</div>
          <p className="text-xs text-gray-400 mt-1">Deadlines missed (Overdue status)</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4 items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Filter size={18} className="text-emerald-500" />
            {filterType === 'ALL' ? 'All Students with Dues' : 
             filterType === 'PENDING_FULL' ? 'Students with Pending Fees (Full)' : 
             filterType === 'PARTIAL' ? 'Students with Partially Paid Fees' : 
             'Students with Result on Hold'}
          </h3>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Search student or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Student Name</th>
                <th className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Roll No</th>
                <th className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Course</th>
                <th className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Total Billed</th>
                <th className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Paid</th>
                <th className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Pending Balance</th>
                <th className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider text-right">Standing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-400 italic">
                    No students found matching this criteria.
                  </td>
                </tr>
              ) : (
                displayedStudents.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                    <td className="py-4 px-5 font-medium text-gray-900">{student.name}</td>
                    <td className="py-4 px-5 text-sm text-gray-500">{student.rollNumber || '-'}</td>
                    <td className="py-4 px-5 text-sm text-gray-700">{student.courseName}</td>
                    <td className="py-4 px-5 text-sm font-medium text-gray-600">₹{student.totalFees.toLocaleString()}</td>
                    <td className="py-4 px-5 text-sm font-medium text-emerald-600">₹{student.paid.toLocaleString()}</td>
                    <td className="py-4 px-5 text-sm font-bold text-amber-600">₹{student.pending.toLocaleString()}</td>
                    <td className="py-4 px-5 text-right">
                      {student.status === 'OVERDUE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 uppercase tracking-wider">
                          <AlertTriangle size={12} /> Result on Hold
                        </span>
                      ) : student.paid > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                          Partial
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
