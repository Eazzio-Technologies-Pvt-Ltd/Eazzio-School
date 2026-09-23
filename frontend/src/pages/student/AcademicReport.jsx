import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getResults } from '../../api/studentApi';
import { getStudentReportCard } from '../../api/examApi';
import Loader from '../../components/Loader';
import {
  FileText,
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Download,
  Calendar,
  TrendingUp,
  BarChart2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function getGradeColor(grade) {
  if (['A1', 'A2'].includes(grade)) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (['B1', 'B2'].includes(grade)) return 'bg-blue-100 text-blue-800 border-blue-300';
  if (['C1', 'C2'].includes(grade)) return 'bg-amber-100 text-amber-800 border-amber-300';
  if (grade === 'D') return 'bg-orange-100 text-orange-800 border-orange-300';
  return 'bg-red-100 text-red-800 border-red-300';
}

// Collapsible monthly section
function MonthSection({ month }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition"
      >
        <span className="font-bold text-gray-900 flex items-center gap-2">
          <Calendar size={17} className="text-teal-600" />
          {month.monthLabel}
        </span>
        <span className="flex items-center gap-3">
          <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full">
            {month.tests.length} test{month.tests.length !== 1 ? 's' : ''}
          </span>
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </span>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Test Name</th>
                <th className="py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Portion</th>
                <th className="py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Marks</th>
                <th className="py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Grade</th>
              </tr>
            </thead>
            <tbody>
              {month.tests.flatMap((test, ti) =>
                test.subjects.map((sub, si) => (
                  <tr key={`${ti}-${si}`} className="border-b border-gray-50 hover:bg-emerald-50/30 transition-colors">
                    <td className="py-3 px-5 text-sm text-gray-500">
                      {test.examDate
                        ? new Date(test.examDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                        : '—'}
                    </td>
                    <td className="py-3 px-5 text-sm font-medium text-gray-700">{test.examName}</td>
                    <td className="py-3 px-5 text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <BookOpen size={13} className="text-teal-500 shrink-0" />
                      {sub.subject}
                    </td>
                    <td className="py-3 px-5 text-sm text-gray-400 max-w-xs truncate">{test.portion || '—'}</td>
                    <td className="py-3 px-5 text-sm font-bold text-gray-900 text-right">
                      {sub.marksObtained}
                      <span className="font-normal text-gray-400 text-xs"> /{sub.maxMarks}</span>
                    </td>
                    <td className="py-3 px-5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${getGradeColor(sub.grade)}`}>
                        {sub.grade || '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AcademicReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [activeSection, setActiveSection] = useState('terminal'); // 'weekly' | 'terminal' | 'general'
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

  const handleDownloadPDF = async () => {
    if (!data || !data.studentId) return;
    try {
      setDownloadingPDF(true);
      const res = await getStudentReportCard(data.studentId);
      if (!res || !res.student) {
        alert('Could not generate report card.');
        return;
      }
      const { student, school, exams, subjectRows, attendance, summary } = res;

      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Borders
      doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.8);
      doc.rect(8, 8, pageW - 16, pageH - 16);
      doc.setDrawColor(13, 148, 136); doc.setLineWidth(0.3);
      doc.rect(10, 10, pageW - 20, pageH - 20);

      // Header
      doc.setFillColor(13, 148, 136);
      doc.rect(10, 10, pageW - 20, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16); doc.setFont(undefined, 'bold');
      doc.text(school?.schoolName || 'EAZZIO PUBLIC SCHOOL', pageW / 2, 18, { align: 'center' });
      doc.setFontSize(8.5); doc.setFont(undefined, 'normal');
      doc.text(`${school?.address || 'Senior Secondary School'} • Code: ${school?.schoolCode || 'SCH'}`, pageW / 2, 24, { align: 'center' });
      doc.text(`STUDENT ACADEMIC REPORT CARD • SESSION ${student.academicYear || '2026-2027'}`, pageW / 2, 30, { align: 'center' });

      // Student Card
      const cardY = 38; const cardH = 28;
      doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3);
      doc.roundedRect(14, cardY, pageW - 28, cardH, 2, 2, 'FD');
      doc.setFillColor(13, 148, 136);
      doc.roundedRect(14, cardY, 3, cardH, 1, 1, 'F');
      doc.setTextColor(15, 23, 42); doc.setFontSize(11); doc.setFont(undefined, 'bold');
      doc.text(student.name, 22, cardY + 7);
      doc.setFontSize(8.5); doc.setFont(undefined, 'normal'); doc.setTextColor(71, 85, 105);
      doc.text(`Roll Number:  ${student.rollNumber}`, 22, cardY + 13);
      doc.text(`Class & Section:  ${student.courseName} - ${student.section}`, 22, cardY + 19);
      doc.text(`Student ID:  ${student.studentId}`, 22, cardY + 25);
      doc.text(`Father's Name:  ${student.fatherName}`, pageW - 85, cardY + 13);
      doc.text(`Attendance:  ${attendance?.percentage}% (${attendance?.presentDays}/${attendance?.totalDays} Days)`, pageW - 85, cardY + 25);

      let curY = cardY + cardH + 7;
      doc.setFontSize(9.5); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 41, 59);
      doc.text('SCHOLASTIC PERFORMANCE MATRIX', 14, curY);

      const tableHead = ['Subject', ...(exams || []).map(e => e.examName), 'Grand Total', 'Percentage', 'Grade'];
      const tableBody = (subjectRows || []).map(sub => {
        const row = [sub.subject];
        (exams || []).forEach(e => {
          const mark = sub.marksByExam[e.id];
          row.push(mark ? `${mark.marksObtained} / ${mark.maxMarks}` : '—');
        });
        row.push(`${sub.totalObtained} / ${sub.totalMax}`, `${sub.percentage}%`, sub.grade);
        return row;
      });

      const totalRow = ['TOTALS'];
      (exams || []).forEach(e => {
        let eObt = 0; let eMax = 0; let hasMark = false;
        (subjectRows || []).forEach(sub => {
          const mark = sub.marksByExam[e.id];
          if (mark) { eObt += mark.marksObtained; eMax += mark.maxMarks; hasMark = true; }
        });
        totalRow.push(hasMark ? `${eObt} / ${eMax}` : '—');
      });
      totalRow.push(`${summary?.grandObtained} / ${summary?.grandMax}`, `${summary?.overallPercentage}%`, summary?.overallGrade);
      tableBody.push(totalRow);

      autoTable(doc, {
        head: [tableHead],
        body: tableBody,
        startY: curY + 2,
        headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold', fontSize: 7.5, halign: 'center', cellPadding: 3 },
        bodyStyles: { fontSize: 7.5, cellPadding: 2.8, textColor: [30, 41, 59], halign: 'center', valign: 'middle' },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 38 } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 }
      });

      curY = doc.lastAutoTable.finalY + 8;
      doc.setFillColor(254, 252, 232); doc.setDrawColor(254, 240, 138);
      doc.roundedRect(14, curY, pageW - 28, 12, 1.5, 1.5, 'FD');
      doc.setFontSize(7.5); doc.setFont(undefined, 'bold'); doc.setTextColor(133, 77, 14);
      doc.text('Assessment Remarks:', 18, curY + 5);
      doc.setFont(undefined, 'normal'); doc.setTextColor(113, 63, 18);
      doc.text(summary?.remarks || 'Good performance across all evaluations.', 18, curY + 9.5);

      const sigY = pageH - 26;
      doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.3);
      doc.line(20, sigY, 70, sigY);
      doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
      doc.text('Class Teacher Signature', 45, sigY + 4, { align: 'center' });
      doc.line(pageW - 70, sigY, pageW - 20, sigY);
      doc.text('Principal Signature & Seal', pageW - 45, sigY + 4, { align: 'center' });

      doc.save(`${student.name.replace(/\s+/g, '_')}_Academic_Report_Card.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to download report card PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) return <Loader message="Loading Academic Reports..." />;
  if (error) return <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">{error}</div>;
  if (!data) return null;

  const {
    resultOnHold,
    message,
    weeklyTests = [],   // new field: monthly-grouped weekly tests
    terminalExams = [], // new field: half-yearly / annual
    exams = [],         // legacy: GENERAL type grouped by exam
    studentId,
    summary
  } = data;

  // Decide which section to show by default
  const hasWeekly = weeklyTests.length > 0;
  const hasTerminal = terminalExams.length > 0;
  const hasGeneral = exams.length > 0;

  // ── Fee Hold Screen ────────────────────────────────────────────────────────
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

  const nothingAtAll = !hasWeekly && !hasTerminal && !hasGeneral;

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-gray-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Academic Report</h2>
          <p className="text-gray-500">View your term-wise examination results and performance.</p>
        </div>
        {(hasTerminal || hasGeneral) && studentId && (
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition shadow-sm disabled:opacity-50"
          >
            <Download size={16} />
            {downloadingPDF ? 'Generating...' : 'Download Report Card (PDF)'}
          </button>
        )}
      </div>

      {/* Summary strip */}
      {summary && (
        <div className="flex flex-wrap gap-3">
          <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-2 text-sm text-teal-800">
            <span className="font-semibold">{summary.totalWeeklyTests || 0}</span> Weekly Test{summary.totalWeeklyTests !== 1 ? 's' : ''}
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-sm text-indigo-800">
            <span className="font-semibold">{summary.totalTerminalExams || 0}</span> Terminal Exam{summary.totalTerminalExams !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Section Tabs — only show if more than one type exists */}
      {(hasWeekly && (hasTerminal || hasGeneral)) || (hasTerminal && hasGeneral) ? (
        <div className="flex gap-3 border-b border-gray-200">
          {hasTerminal && (
            <button onClick={() => setActiveSection('terminal')}
              className={`pb-3 px-4 font-medium text-sm transition-all border-b-2 flex items-center gap-2 ${
                activeSection === 'terminal' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <TrendingUp size={16} /> Term Exams
            </button>
          )}
          {hasWeekly && (
            <button onClick={() => setActiveSection('weekly')}
              className={`pb-3 px-4 font-medium text-sm transition-all border-b-2 flex items-center gap-2 ${
                activeSection === 'weekly' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <BarChart2 size={16} /> Weekly Tests
            </button>
          )}
          {hasGeneral && (
            <button onClick={() => setActiveSection('general')}
              className={`pb-3 px-4 font-medium text-sm transition-all border-b-2 flex items-center gap-2 ${
                activeSection === 'general' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <FileText size={16} /> Other Exams
            </button>
          )}
        </div>
      ) : null}

      {/* ── Empty state ── */}
      {nothingAtAll && (
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <FileText className="text-gray-300" size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-700">No Results Published Yet</h3>
          <p className="text-gray-500 max-w-sm mt-2">There are currently no examination results published for your profile.</p>
        </div>
      )}

      {/* ── TERMINAL EXAMS (Half-Yearly / Annual) ── */}
      {(activeSection === 'terminal' || (!hasTerminal || (!hasWeekly && !hasGeneral))) && hasTerminal && (
        <div className="flex flex-col gap-6">
          {terminalExams.map((exam, idx) => {
            const pct = exam.percentage || (exam.totalMax > 0 ? ((exam.totalObtained / exam.totalMax) * 100).toFixed(1) : 0);
            return (
              <div key={idx} className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
                <div className="bg-gray-50 p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {exam.examType?.replace('_', '-')}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{exam.examName}</h3>
                    <p className="text-sm font-medium text-emerald-600">
                      {exam.term} | {exam.academicYear}
                      {exam.examDate && ` | ${new Date(exam.examDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                    </p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Marks</span>
                      <span className="text-lg font-bold text-gray-800">{exam.totalObtained} / {exam.totalMax}</span>
                    </div>
                    <div className="h-10 w-px bg-gray-300"></div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Percentage</span>
                      <span className="text-lg font-bold text-emerald-600 flex items-center gap-1">
                        {pct}% <Award size={18} />
                      </span>
                    </div>
                  </div>
                </div>

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
                      {exam.subjects.map((sub, si) => (
                        <tr key={si} className="border-b border-gray-50 hover:bg-emerald-50/30 transition-colors">
                          <td className="py-4 px-6 text-sm font-bold text-gray-800 flex items-center gap-2">
                            <BookOpen size={16} className="text-emerald-500" /> {sub.subject}
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-600 text-right">{sub.maxMarks}</td>
                          <td className="py-4 px-6 text-sm font-bold text-gray-900 text-right">{sub.marksObtained}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getGradeColor(sub.grade)}`}>
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
          })}
        </div>
      )}

      {/* ── WEEKLY TESTS (Month-wise) ── */}
      {(activeSection === 'weekly' || (!hasTerminal && !hasGeneral)) && hasWeekly && (
        <div className="flex flex-col gap-4">
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center gap-3">
            <BarChart2 className="text-teal-600 shrink-0" size={24} />
            <p className="text-sm text-teal-800">
              <span className="font-semibold">Weekly tests</span> are short subject-wise tests. Below are your results grouped by month.
            </p>
          </div>
          {weeklyTests.map((month, idx) => (
            <MonthSection key={idx} month={month} />
          ))}
        </div>
      )}

      {/* ── GENERAL / LEGACY exams ── */}
      {(activeSection === 'general' || (!hasTerminal && !hasWeekly)) && hasGeneral && (
        <div className="flex flex-col gap-6">
          {exams.map((examGroup, idx) => {
            const { examDetails, subjects } = examGroup;
            const totalObtained = subjects.reduce((sum, s) => sum + s.marksObtained, 0);
            const totalMax = subjects.reduce((sum, s) => sum + s.maxMarks, 0);
            const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;

            return (
              <div key={idx} className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
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
                      {subjects.map((sub, si) => (
                        <tr key={sub.id || si} className="border-b border-gray-50 hover:bg-emerald-50/30 transition-colors">
                          <td className="py-4 px-6 text-sm font-bold text-gray-800 flex items-center gap-2">
                            <BookOpen size={16} className="text-emerald-500" /> {sub.subject}
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-600 text-right">{sub.maxMarks}</td>
                          <td className="py-4 px-6 text-sm font-bold text-gray-900 text-right">{sub.marksObtained}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                              ['A+', 'A', 'O'].includes(sub.grade) ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                              ['B+', 'B', 'B1', 'B2'].includes(sub.grade) ? 'bg-blue-100 text-blue-700 border-blue-200' :
                              ['C', 'P', 'C1', 'C2'].includes(sub.grade) ? 'bg-amber-100 text-amber-700 border-amber-200' :
                              'bg-red-100 text-red-700 border-red-200'}`}>
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
          })}
        </div>
      )}
    </div>
  );
}
