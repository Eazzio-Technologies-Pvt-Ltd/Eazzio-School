import React, { useState, useEffect, useContext } from 'react';
import { getExamTimetables } from '../../api/examApi';
import { AuthContext } from '../../context/AuthContext';
import Loader from '../../components/Loader';
import { Calendar, Clock, MapPin, BookOpen, Download, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ExamSchedule() {
  const { user } = useContext(AuthContext);
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getExamTimetables(undefined, undefined);
        setTimetables(Array.isArray(res) ? res : (res?.data || []));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = filterType === 'ALL' ? timetables : timetables.filter(t => t.examType === filterType);

  const handleDownloadPDF = (tt) => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFillColor(13, 148, 136); doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.setFont(undefined, 'bold');
    doc.text(tt.title, pageW / 2, 10, { align: 'center' });
    doc.setFontSize(8); doc.setFont(undefined, 'normal');
    doc.text(`Class: ${tt.course?.courseName} - ${tt.course?.section} | ${tt.examType} | Year: ${tt.academicYear}`, pageW / 2, 18, { align: 'center' });
    const head = ['#', 'Subject', 'Date', 'Day', 'Start Time', 'End Time', 'Max Marks', 'Room No.'];
    const rows = tt.items.map((item, i) => {
      const d = new Date(item.examDate);
      return [
        i + 1, item.subject,
        d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        d.toLocaleDateString('en-IN', { weekday: 'long' }),
        item.startTime, item.endTime,
        item.maxMarks || '—', item.roomNo || '—'
      ];
    });
    autoTable(doc, { head: [head], body: rows, startY: 26, headStyles: { fillColor: [13, 148, 136], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center', cellPadding: 3 }, bodyStyles: { fontSize: 8, cellPadding: 3, halign: 'center' }, columnStyles: { 1: { halign: 'left', fontStyle: 'bold' } }, alternateRowStyles: { fillColor: [248, 250, 252] }, margin: { left: 14, right: 14 } });
    const curY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(7); doc.setTextColor(100, 116, 139);
    doc.text('Important: Bring your Admit Card, Stationery, and reach 30 minutes before the exam.', 14, curY);
    doc.save(`${tt.title.replace(/\s+/g, '_')}_Schedule.pdf`);
  };

  if (loading) return <Loader message="Loading exam schedule..." />;

  return (
    <div className="flex flex-col gap-5 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="text-teal-600" size={28} /> Exam Schedule
          </h2>
          <p className="text-gray-500 text-sm mt-1">Published Half-Yearly and Annual Examination schedules.</p>
        </div>
        <div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white">
            <option value="ALL">All Exams</option>
            <option value="HALF_YEARLY">Half-Yearly</option>
            <option value="ANNUAL">Annual / Final</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 flex flex-col items-center text-center">
          <Calendar className="text-gray-200 mb-4" size={56} />
          <h3 className="text-lg font-bold text-gray-700">No Exam Schedules Published</h3>
          <p className="text-gray-500 text-sm mt-2">The school has not published any exam timetables yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {filtered.map(tt => (
            <div key={tt.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-base">{tt.title}</h3>
                  <p className="text-teal-100 text-xs mt-0.5">
                    {tt.course?.courseName} - {tt.course?.section} | {tt.examType?.replace('_', '-')} | {tt.academicYear}
                  </p>
                </div>
                <button onClick={() => handleDownloadPDF(tt)}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-semibold transition">
                  <Download size={15} /> Download PDF
                </button>
              </div>

              {/* Notice banner */}
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-xs text-amber-800 font-medium flex items-center gap-2">
                ⚠️ Students are requested to arrive 30 minutes before the exam. Carry your Admit Card.
              </div>

              {/* Timetable items */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">#</th>
                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Subject</th>
                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Day</th>
                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center">Time</th>
                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center">Max Marks</th>
                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center">Room No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tt.items?.map((item, i) => {
                      const d = new Date(item.examDate);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const isPast = d < today;
                      const isToday = d.toDateString() === today.toDateString();
                      return (
                        <tr key={item.id} className={`border-b border-gray-100 transition-colors ${
                          isToday ? 'bg-teal-50 border-l-4 border-l-teal-500'
                          : isPast ? 'opacity-60 bg-gray-50/50'
                          : 'hover:bg-teal-50/20'
                        }`}>
                          <td className="py-3 px-4 text-sm text-gray-500">{i + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <BookOpen size={14} className="text-teal-500 shrink-0" />
                              <span className="text-sm font-semibold text-gray-800">{item.subject}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                              {isToday && <span className="text-xs text-teal-600 font-bold">TODAY</span>}
                              {isPast && !isToday && <span className="text-xs text-gray-400">Completed</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {d.toLocaleDateString('en-IN', { weekday: 'long' })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                              <Clock size={13} className="text-gray-400" />
                              {item.startTime} — {item.endTime}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm font-bold text-center text-gray-800">{item.maxMarks || '—'}</td>
                          <td className="py-3 px-4 text-center">
                            {item.roomNo ? (
                              <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                                <MapPin size={13} className="text-gray-400" />{item.roomNo}
                              </div>
                            ) : <span className="text-gray-400 text-sm">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Instructions */}
              {tt.items?.some(i => i.instructions) && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-600 mb-2">Special Instructions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {tt.items.filter(i => i.instructions).map((item, i) => (
                      <li key={i} className="text-xs text-gray-600"><strong>{item.subject}:</strong> {item.instructions}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
