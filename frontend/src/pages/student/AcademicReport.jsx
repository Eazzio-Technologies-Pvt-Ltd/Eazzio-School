import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getResults } from '../../api/studentApi';
import Loader from '../../components/Loader';
import { FileText, AlertTriangle, ArrowRight, Award, BookOpen } from 'lucide-react';

export default function AcademicReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getResults();
        setData(res);
      } catch (err) {
        console.error(err);
        setError('Failed to load academic reports.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <Loader message="Loading Academic Reports..." />;
  if (error) return <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">{error}</div>;
  if (!data) return null;

  const { resultOnHold, message, exams } = data;

  if (resultOnHold) {
    return (
      <div className="flex flex-col gap-8 animate-fade-in text-gray-800">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Academic Report</h2>
          <p className="text-gray-500">View your term-wise examination results and performance.</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-red-800 mb-2">Results Withheld</h3>
          <p className="text-red-700 max-w-md mb-6">{message}</p>
          <button 
            onClick={() => navigate('/student/fees')}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition shadow-sm"
          >
            Go to Fee Portal <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in text-gray-800">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Academic Report</h2>
        <p className="text-gray-500">View your term-wise examination results and performance.</p>
      </div>

      <div className="flex flex-col gap-8">
        {exams.length === 0 ? (
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="text-gray-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-700">No Results Found</h3>
            <p className="text-gray-500 max-w-sm mt-2">There are currently no examination results published for your profile.</p>
          </div>
        ) : (
          exams.map((examGroup, idx) => {
            const { examDetails, subjects } = examGroup;
            const totalObtained = subjects.reduce((sum, s) => sum + s.marksObtained, 0);
            const totalMax = subjects.reduce((sum, s) => sum + s.maxMarks, 0);
            const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;
            
            return (
              <div key={idx} className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-bold text-gray-900">{examDetails.examName}</h3>
                    <p className="text-sm font-medium text-emerald-600">
                      Term: {examDetails.term} | Academic Year: {examDetails.academicYear}
                    </p>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Marks</span>
                      <span className="text-lg font-bold text-gray-800">{totalObtained} / {totalMax}</span>
                    </div>
                    <div className="h-10 w-px bg-gray-300"></div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Percentage</span>
                      <span className="text-lg font-bold text-emerald-600 flex items-center gap-1">
                        {percentage}% <Award size={18} />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-white">
                        <th className="py-3 px-6 font-semibold text-gray-600 text-sm">Subject</th>
                        <th className="py-3 px-6 font-semibold text-gray-600 text-sm text-right">Max Marks</th>
                        <th className="py-3 px-6 font-semibold text-gray-600 text-sm text-right">Marks Obtained</th>
                        <th className="py-3 px-6 font-semibold text-gray-600 text-sm text-center">Grade</th>
                        <th className="py-3 px-6 font-semibold text-gray-600 text-sm">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((sub, i) => (
                        <tr key={sub.id} className="border-b border-gray-50 hover:bg-emerald-50/30 transition-colors">
                          <td className="py-4 px-6 text-sm font-bold text-gray-800 flex items-center gap-2">
                            <BookOpen size={16} className="text-emerald-500" /> {sub.subject}
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-600 text-right">{sub.maxMarks}</td>
                          <td className="py-4 px-6 text-sm font-bold text-gray-900 text-right">{sub.marksObtained}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border 
                              ${['A+', 'A', 'O'].includes(sub.grade) ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                ['B+', 'B'].includes(sub.grade) ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                ['C', 'P'].includes(sub.grade) ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                'bg-red-100 text-red-700 border-red-200'}`}
                            >
                              {sub.grade || '-'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-500">{sub.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
