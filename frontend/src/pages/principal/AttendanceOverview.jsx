import React, { useState, useEffect } from 'react';
import { getAttendanceSummary, getAttendanceDetail, getMonthlyAttendanceReport, getCourses } from '../../api/principalApi';
import Loader from '../../components/Loader';
import { Users, Calendar, TrendingUp, CheckCircle, XCircle, Clock, BookOpen, AlertCircle, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatMonthName = (yyyymm) => {
  const [year, month] = yyyymm.split('-');
  const date = new Date(year, month - 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

export default function AttendanceOverview() {
  const [activeTab, setActiveTab] = useState('global');
  
  // Global State
  const [summary, setSummary] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');

  // Detail State
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Monthly State
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  useEffect(() => {
    fetchGlobalSummary();
    fetchCourses();
  }, []);

  useEffect(() => {
    if (activeTab === 'detail' && selectedCourse && selectedDate) {
      fetchDetail();
    }
  }, [activeTab, selectedCourse, selectedDate]);

  useEffect(() => {
    if (activeTab === 'monthly' && selectedCourse) {
      fetchMonthlyReport();
    }
  }, [activeTab, selectedCourse]);

  const fetchGlobalSummary = async () => {
    try {
      setGlobalLoading(true);
      const data = await getAttendanceSummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
      setGlobalError('Failed to load attendance summary.');
    } finally {
      setGlobalLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const data = await getCourses();
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourse(data[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load courses', err);
    }
  };

  const fetchDetail = async () => {
    try {
      setDetailLoading(true);
      setDetailError('');
      const data = await getAttendanceDetail(selectedCourse, selectedDate);
      setDetailData(data);
    } catch (err) {
      console.error(err);
      setDetailError('Failed to load class details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchMonthlyReport = async () => {
    try {
      setMonthlyLoading(true);
      const data = await getMonthlyAttendanceReport(selectedCourse);
      setMonthlyReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setMonthlyLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    if (activeTab === 'global') {
      doc.text("Global Attendance Overview", 14, 15);
      
      const tableColumn = ["Course", "Teacher", "Total Students", "Present", "Absent", "Percentage"];
      const tableRows = [];

      summary.forEach(cls => {
        tableRows.push([
          cls.courseName,
          cls.teacherName,
          cls.totalStudents,
          cls.present,
          cls.absent,
          `${cls.percentage}%`
        ]);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
      });

      doc.save(`Global_Attendance_${new Date().toISOString().split('T')[0]}.pdf`);
    } else if (activeTab === 'monthly') {
      if (monthlyReport.length === 0) return;
      const doc = new jsPDF('landscape');
      
      const courseObj = courses.find(c => c.id.toString() === selectedCourse);
      const courseName = courseObj ? `${courseObj.courseName} - ${courseObj.section}` : '';
      
      doc.text(`Month-Wise Attendance Report - ${courseName}`, 14, 15);
      
      const monthSet = new Set();
      monthlyReport.forEach(student => {
        Object.keys(student.months).forEach(m => monthSet.add(m));
      });
      const sortedMonths = Array.from(monthSet).sort();
      
      const tableColumn = ["Student Name", "Roll No", ...sortedMonths.map(m => `${formatMonthName(m)} (P/A)`)];
      const tableRows = [];

      monthlyReport.forEach(student => {
        const rowData = [student.name, student.rollNumber];
        sortedMonths.forEach(m => {
          if (student.months[m]) {
            rowData.push(`${student.months[m].present} / ${student.months[m].absent}`);
          } else {
            rowData.push("0 / 0");
          }
        });
        tableRows.push(rowData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
      });

      doc.save(`Monthly_Attendance_${courseName}_${new Date().toISOString().split('T')[0]}.pdf`);
    } else {
      if (!detailData) return;
      const courseObj = courses.find(c => c.id.toString() === selectedCourse);
      const courseName = courseObj ? `${courseObj.courseName} - ${courseObj.section}` : 'Class';
      doc.text(`Class Attendance - ${courseName}`, 14, 15);
      doc.text(`Date: ${selectedDate}`, 14, 22);
      
      const tableColumn = ["Student Name", "Roll No", "Status"];
      const tableRows = [];

      detailData.students.forEach(student => {
        tableRows.push([
          student.name,
          student.rollNumber,
          student.status
        ]);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
      });

      doc.save(`Class_Attendance_${selectedDate}.pdf`);
    }
  };

  const handleDownloadIndividualPDF = (student) => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const courseObj = courses.find(c => c.id.toString() === selectedCourse);
    const courseName = courseObj ? `${courseObj.courseName} - ${courseObj.section}` : '';
    const sortedMonths = Object.keys(student.months).sort();

    // ── Helper: check if we need a new page ──
    const checkNewPage = (y, needed = 25) => {
      if (y + needed > pageH - 18) {
        doc.addPage();
        return 20;
      }
      return y;
    };

    // ── Header Banner ──
    doc.setFillColor(13, 148, 136); // Rich modern teal/emerald
    doc.rect(0, 0, pageW, 26, 'F');
    // Subtle top accent line
    doc.setFillColor(5, 150, 105);
    doc.rect(0, 26, pageW, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Student Attendance Report', pageW / 2, 13, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont(undefined, 'normal');
    doc.text(
      `Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`,
      pageW / 2,
      21,
      { align: 'center' }
    );

    // ── Student Info Card ──
    const cardY = 32;
    const cardH = 32;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, cardY, pageW - 28, cardH, 3, 3, 'FD');

    // Left accent bar
    doc.setFillColor(13, 148, 136);
    doc.roundedRect(14, cardY, 3.5, cardH, 2, 2, 'F');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'bold');
    doc.text('STUDENT PROFILE', 22, cardY + 7);

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(student.name, 22, cardY + 14);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Roll Number:  ${student.rollNumber || 'N/A'}`, 22, cardY + 21);
    doc.text(`Class / Course:  ${courseName || 'N/A'}`, 22, cardY + 27);

    // Right-side Metrics Badges
    const totalP = sortedMonths.reduce((a, m) => a + (student.months[m].present || 0), 0);
    const totalA = sortedMonths.reduce((a, m) => a + (student.months[m].absent || 0), 0);
    const totalDays = totalP + totalA;
    const overallPct = totalDays > 0 ? Math.round((totalP / totalDays) * 100) : 0;

    const stats = [
      { label: 'Total Days', val: String(totalDays), color: [30, 41, 59], bg: [241, 245, 249] },
      { label: 'Present', val: String(totalP), color: [5, 150, 105], bg: [240, 253, 244] },
      { label: 'Absent', val: String(totalA), color: [220, 38, 38], bg: [254, 242, 242] },
      { label: 'Attendance', val: `${overallPct}%`, color: overallPct >= 75 ? [5, 150, 105] : [220, 38, 38], bg: overallPct >= 75 ? [240, 253, 244] : [254, 242, 242] }
    ];

    const boxW = 21;
    const boxH = 22;
    const boxGap = 3;
    const rightEdge = pageW - 18;
    const startBoxX = rightEdge - (boxW * 4 + boxGap * 3);

    stats.forEach((s, idx) => {
      const bx = startBoxX + idx * (boxW + boxGap);
      const by = cardY + 5;
      doc.setFillColor(...s.bg);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(bx, by, boxW, boxH, 2, 2, 'FD');

      doc.setFontSize(10.5);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...s.color);
      doc.text(s.val, bx + boxW / 2, by + 10, { align: 'center' });

      doc.setFontSize(6.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(s.label, bx + boxW / 2, by + 16, { align: 'center' });
    });

    let curY = cardY + cardH + 8;

    // ── Monthly Summary Section ──
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('MONTHLY SUMMARY', 14, curY);

    autoTable(doc, {
      head: [['Month', 'Working Days', 'Present Days', 'Absent Days', 'Attendance Rate', 'Performance']],
      body: sortedMonths.map(m => {
        const p = student.months[m].present || 0;
        const a = student.months[m].absent || 0;
        const total = p + a;
        const pct = total > 0 ? Math.round((p / total) * 100) : 0;
        const status = pct >= 75 ? 'Satisfactory' : 'Low Attendance';
        return [formatMonthName(m), String(total), String(p), String(a), `${pct}%`, status];
      }),
      startY: curY + 3,
      headStyles: {
        fillColor: [13, 148, 136],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: 3
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [30, 30, 30],
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left', cellWidth: 42 },
        1: { halign: 'center', cellWidth: 26 },
        2: { textColor: [5, 150, 105], fontStyle: 'bold', halign: 'center', cellWidth: 26 },
        3: { textColor: [220, 38, 38], fontStyle: 'bold', halign: 'center', cellWidth: 26 },
        4: { fontStyle: 'bold', halign: 'center', cellWidth: 30 },
        5: { fontStyle: 'bold', halign: 'center', cellWidth: 32 }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 4) {
            const pct = parseInt(data.cell.raw);
            data.cell.styles.textColor = pct >= 75 ? [5, 150, 105] : [220, 38, 38];
          }
          if (data.column.index === 5) {
            const isGood = data.cell.raw === 'Satisfactory';
            data.cell.styles.textColor = isGood ? [5, 150, 105] : [220, 38, 38];
            data.cell.styles.fillColor = isGood ? [240, 253, 244] : [254, 242, 242];
          }
        }
      }
    });

    curY = doc.lastAutoTable.finalY + 9;

    // ── Day-wise Detail Tables per Month ──
    const getDayOfWeek = (dateStr) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length !== 3) return '';
      const [d, m, y] = parts.map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-US', { weekday: 'short' });
    };

    sortedMonths.forEach(m => {
      const monthData = student.months[m];
      const days = monthData.days || [];

      curY = checkNewPage(curY, 28);

      // Section Heading Bar
      const mP = monthData.present || 0;
      const mA = monthData.absent || 0;
      const mTotal = mP + mA;
      const mPct = mTotal > 0 ? Math.round((mP / mTotal) * 100) : 0;

      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(14, curY, pageW - 28, 8, 2, 2, 'FD');

      doc.setFillColor(13, 148, 136);
      doc.rect(14, curY, 3, 8, 'F');

      doc.setFontSize(8.5);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Daily Attendance Breakdown — ${formatMonthName(m)}`, 20, curY + 5.5);

      // Mini Stats on Right
      doc.setFontSize(7.5);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(`Present: ${mP}`, pageW - 68, curY + 5.5);
      doc.setTextColor(220, 38, 38);
      doc.text(`Absent: ${mA}`, pageW - 48, curY + 5.5);
      doc.setTextColor(mPct >= 75 ? 5 : 220, mPct >= 75 ? 150 : 38, mPct >= 75 ? 105 : 38);
      doc.text(`${mPct}%`, pageW - 28, curY + 5.5);

      curY += 10;

      if (days.length === 0) {
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text('No individual daily records found for this month.', 16, curY);
        curY += 8;
        return;
      }

      // Build balanced 2-set table:
      // Columns: Date | Day | Status || Date | Day | Status
      const half = Math.ceil(days.length / 2);
      const tableRows = [];
      for (let i = 0; i < half; i++) {
        const d1 = days[i];
        const d2 = i + half < days.length ? days[i + half] : null;

        tableRows.push([
          d1 ? d1.date : '',
          d1 ? getDayOfWeek(d1.date) : '',
          d1 ? d1.status : '',
          d2 ? d2.date : '',
          d2 ? getDayOfWeek(d2.date) : '',
          d2 ? d2.status : ''
        ]);
      }

      autoTable(doc, {
        head: [['Date', 'Day', 'Status', 'Date', 'Day', 'Status']],
        body: tableRows,
        startY: curY,
        headStyles: {
          fillColor: [51, 65, 85], // Slate-700
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center',
          cellPadding: 2.2
        },
        bodyStyles: {
          fontSize: 7.5,
          cellPadding: 2.2,
          textColor: [30, 41, 59],
          valign: 'middle'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 28 },
          1: { halign: 'center', cellWidth: 16, textColor: [100, 116, 139] },
          2: { halign: 'center', cellWidth: 47 },
          3: { halign: 'center', cellWidth: 28 },
          4: { halign: 'center', cellWidth: 16, textColor: [100, 116, 139] },
          5: { halign: 'center', cellWidth: 47 }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          if (data.section === 'body' && (data.column.index === 2 || data.column.index === 5)) {
            const val = data.cell.raw;
            if (val === 'PRESENT') {
              data.cell.styles.textColor = [5, 150, 105];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [240, 253, 244];
            } else if (val === 'ABSENT') {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [254, 242, 242];
            } else if (val === 'LATE') {
              data.cell.styles.textColor = [217, 119, 6];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [254, 243, 199];
            }
          }
        }
      });

      curY = doc.lastAutoTable.finalY + 8;
    });

    // ── Legend ──
    curY = checkNewPage(curY, 14);
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'normal');
    [
      { color: [5, 150, 105], label: 'Present' },
      { color: [220, 38, 38], label: 'Absent' },
      { color: [217, 119, 6], label: 'Late (Marked Absent)' }
    ].forEach((l, i) => {
      const x = 14 + i * 55;
      doc.setFillColor(...l.color);
      doc.circle(x + 2, curY + 2, 1.8, 'F');
      doc.setTextColor(71, 85, 105);
      doc.text(l.label, x + 6, curY + 3.2);
    });

    // ── Running Footer ──
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, pageH - 10, pageW - 14, pageH - 10);

      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setFont(undefined, 'normal');
      doc.text('Eazzio School Management System — Student Attendance Record', 14, pageH - 5.5);
      doc.text(`Page ${i} of ${totalPages}`, pageW - 14, pageH - 5.5, { align: 'right' });
    }

    doc.save(`${student.name.replace(/\s+/g, '_')}_Attendance_Report.pdf`);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6 bg-gray-50 min-h-screen">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Attendance Overview</h2>
          <p className="text-gray-500 mt-1">School-wide daily attendance monitoring.</p>
        </div>
        <button 
          onClick={handleDownloadPDF}
          disabled={(activeTab === 'global' && summary.length === 0) || (activeTab === 'detail' && (!detailData || detailData.students.length === 0)) || (activeTab === 'monthly' && monthlyReport.length === 0)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={18} /> Download PDF
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('global')}
          className={`pb-3 px-4 font-medium text-sm transition-all border-b-2 ${
            activeTab === 'global'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={16} /> Global Trends
          </div>
        </button>
        <button
          onClick={() => setActiveTab('detail')}
          className={`pb-3 px-4 font-medium text-sm transition-all border-b-2 ${
            activeTab === 'detail'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users size={16} /> Class Detail View
          </div>
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`pb-3 px-4 font-medium text-sm transition-all border-b-2 ${
            activeTab === 'monthly'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar size={16} /> Monthly Report
          </div>
        </button>
      </div>

      {/* Tab Content: Global Trends */}
      {activeTab === 'global' && (
        <div className="space-y-4 animate-fade-in">
          {globalError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm">
              {globalError}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {globalLoading ? (
              <div className="p-8"><Loader message="Loading global attendance data..." /></div>
            ) : summary.length === 0 ? (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                <AlertCircle size={48} className="mb-4 opacity-20" />
                <p>No attendance data available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Course</th>
                      <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Teacher</th>
                      <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Total Students</th>
                      <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Present</th>
                      <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Absent</th>
                      <th className="py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider min-w-[200px]">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summary.map(cls => (
                      <tr key={cls.courseId} className="hover:bg-gray-50/50 transition-colors duration-150">
                        <td className="py-4 px-6 font-semibold text-emerald-600">{cls.courseName}</td>
                        <td className="py-4 px-6 text-gray-700">{cls.teacherName}</td>
                        <td className="py-4 px-6 text-gray-700">{cls.totalStudents}</td>
                        <td className="py-4 px-6 text-emerald-600 font-medium">{cls.present}</td>
                        <td className="py-4 px-6 text-red-500 font-medium">{cls.absent}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${cls.percentage >= 75 ? 'bg-emerald-500' : cls.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                style={{ width: `${cls.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700 w-10 text-right">{cls.percentage}%</span>
                          </div>
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

      {/* Tab Content: Detail View */}
      {activeTab === 'detail' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen size={14} /> Select Class
              </label>
              <select 
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition text-gray-800"
              >
                {courses.length === 0 && <option value="">No courses available</option>}
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.courseName} - {c.section} ({c.academicYear})</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar size={14} /> Date
              </label>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition text-gray-800"
              />
            </div>
          </div>

          {/* Results Area */}
          {detailError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm">
              {detailError}
            </div>
          )}

          {detailLoading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
              <Loader message="Loading class attendance..." />
            </div>
          ) : detailData && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Summary Card */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
                  <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Class Attendance</h3>
                  <div className={`text-4xl font-bold mb-4 ${
                    detailData.percentage >= 75 ? 'text-emerald-500' :
                    detailData.percentage >= 50 ? 'text-amber-500' : 'text-red-500'
                  }`}>
                    {detailData.percentage}%
                  </div>
                  
                  <div className="w-full space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Total Enrolled:</span>
                      <span className="font-semibold text-gray-900">{detailData.totalStudents}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Present:</span>
                      <span className="font-semibold text-emerald-600">{detailData.present}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Absent:</span>
                      <span className="font-semibold text-red-500">{detailData.absent}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 text-blue-700 p-4 rounded-xl border border-blue-100 text-xs">
                  <p className="flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    This is a read-only view. Teachers must mark or modify attendance from their dedicated workspace.
                  </p>
                </div>
              </div>

              {/* Students List */}
              <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Student Name</th>
                        <th className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Roll No</th>
                        <th className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detailData.students.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="py-12 text-center text-gray-400">
                            No students enrolled in this class.
                          </td>
                        </tr>
                      ) : (
                        detailData.students.map(student => (
                          <tr key={student.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                            <td className="py-3 px-5 text-sm font-medium text-gray-900">{student.name}</td>
                            <td className="py-3 px-5 text-sm text-gray-500">{student.rollNumber}</td>
                            <td className="py-3 px-5 text-right">
                              {student.status === 'PRESENT' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle size={14} /> Present
                                </span>
                              )}
                              {student.status === 'ABSENT' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                  <XCircle size={14} /> Absent
                                </span>
                              )}
                              {student.status === 'LATE' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock size={14} /> Late
                                </span>
                              )}
                              {student.status === 'UNMARKED' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                  Not Marked
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
          )}
        </div>
      )}

      {/* Tab Content: Monthly Report */}
      {activeTab === 'monthly' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen size={14} /> Select Class
              </label>
              <select 
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition text-gray-800"
              >
                {courses.length === 0 && <option value="">No courses available</option>}
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.courseName} - {c.section} ({c.academicYear})</option>
                ))}
              </select>
            </div>
          </div>

          {monthlyLoading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
              <Loader message="Loading monthly report..." />
            </div>
          ) : monthlyReport.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
              <p>No data available for this class.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Student Name</th>
                      <th className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Roll No</th>
                      {Array.from(new Set(monthlyReport.flatMap(s => Object.keys(s.months)))).sort().map(m => (
                        <th key={m} className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">{formatMonthName(m)} (P/A)</th>
                      ))}
                      <th className="py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthlyReport.map(student => {
                      const allMonths = Array.from(new Set(monthlyReport.flatMap(s => Object.keys(s.months)))).sort();
                      return (
                        <tr key={student.studentId} className="hover:bg-gray-50/50 transition-colors duration-150">
                          <td className="py-3 px-5 text-sm font-medium text-gray-900">{student.name}</td>
                          <td className="py-3 px-5 text-sm text-gray-500">{student.rollNumber}</td>
                          {allMonths.map(m => (
                            <td key={m} className="py-3 px-5 text-sm text-gray-700">
                              {student.months[m] ? (
                                <span className="font-semibold text-emerald-600">{student.months[m].present}</span>
                                ) : '0'} / {student.months[m] ? (
                                <span className="font-semibold text-red-500">{student.months[m].absent}</span>
                                ) : '0'}
                            </td>
                          ))}
                          <td className="py-3 px-5 text-center">
                            <button 
                              onClick={() => handleDownloadIndividualPDF(student)}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-md text-xs font-medium transition-colors"
                            >
                              Download
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
