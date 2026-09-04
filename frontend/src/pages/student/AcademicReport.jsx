import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getResults } from '../../api/studentApi';
import { getStudentReportCard } from '../../api/examApi';
import Loader from '../../components/Loader';
import { FileText, AlertTriangle, ArrowRight, Award, BookOpen, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AcademicReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingPDF, setDownloadingPDF] = useState(false);
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
      if (!res.success) {
        alert('Could not generate report card.');
        return;
      }
      const { student, school, exams, subjectRows, attendance, summary } = res.data;

      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Outer & Inner Borders
      doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.8);
      doc.rect(8, 8, pageW - 16, pageH - 16);
      doc.setDrawColor(13, 148, 136); doc.setLineWidth(0.3);
      doc.rect(10, 10, pageW - 20, pageH - 20);

      // Header Banner
      doc.setFillColor(13, 148, 136);
      doc.rect(10, 10, pageW - 20, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16); doc.setFont(undefined, 'bold');
      doc.text(school.schoolName || 'EAZZIO PUBLIC SCHOOL', pageW / 2, 18, { align: 'center' });
      doc.setFontSize(8.5); doc.setFont(undefined, 'normal');
      doc.text(`${school.address || 'Senior Secondary School'} • Code: ${school.schoolCode || 'SCH'}`, pageW / 2, 24, { align: 'center' });
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
      doc.text(`Attendance:  ${attendance.percentage}% (${attendance.presentDays}/${attendance.totalDays} Days)`, pageW - 85, cardY + 25);

      let curY = cardY + cardH + 7;
      doc.setFontSize(9.5); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 41, 59);
      doc.text('SCHOLASTIC PERFORMANCE MATRIX', 14, curY);

      const tableHead = ['Subject', ...exams.map(e => e.examName), 'Grand Total', 'Percentage', 'Grade'];
      const tableBody = subjectRows.map(sub => {
        const row = [sub.subject];
        exams.forEach(e => {
          const mark = sub.marksByExam[e.id];
          row.push(mark ? `${mark.marksObtained} / ${mark.maxMarks}` : '—');
        });
        row.push(`${sub.totalObtained} / ${sub.totalMax}`, `${sub.percentage}%`, sub.grade);
        return row;
      });

      // Total Row
      const totalRow = ['TOTALS'];
      exams.forEach(e => {
        let eObt = 0; let eMax = 0; let hasMark = false;
        subjectRows.forEach(sub => {
          const mark = sub.marksByExam[e.id];
          if (mark) { eObt += mark.marksObtained; eMax += mark.maxMarks; hasMark = true; }
        });
        totalRow.push(hasMark ? `${eObt} / ${eMax}` : '—');
      });
      totalRow.push(`${summary.grandObtained} / ${summary.grandMax}`, `${summary.overallPercentage}%`, summary.overallGrade);
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
      // Remarks
      doc.setFillColor(254, 252, 232); doc.setDrawColor(254, 240, 138);
      doc.roundedRect(14, curY, pageW - 28, 12, 1.5, 1.5, 'FD');
      doc.setFontSize(7.5); doc.setFont(undefined, 'bold'); doc.setTextColor(133, 77, 14);
      doc.text('Assessment Remarks:', 18, curY + 5);
      doc.setFont(undefined, 'normal'); doc.setTextColor(113, 63, 18);
      doc.text(summary.remarks || 'Good performance across all evaluations.', 18, curY + 9.5);

      // Signatures
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Academic Report</h2>
          <p className="text-gray-500">View your term-wise examination results and performance.</p>
        </div>
        {exams && exams.length > 0 && (
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
