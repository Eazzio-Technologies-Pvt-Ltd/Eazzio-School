import React, { useState, useEffect } from 'react';
import { getAttendanceSummary, getMonthlyAttendanceReport, getCourses } from '../../api/adminApi';
import Loader from '../../components/Loader';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatMonthName = (yyyymm) => {
  const [year, month] = yyyymm.split('-');
  const date = new Date(year, month - 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDisplayDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-');
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return dt.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export default function AttendanceOverview() {
  const [activeTab, setActiveTab] = useState('global');
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  useEffect(() => { fetchCourses(); }, []);
  useEffect(() => { fetchSummary(selectedDate); }, [selectedDate]);
  useEffect(() => {
    if (activeTab === 'monthly' && selectedCourse) fetchMonthlyReport();
  }, [activeTab, selectedCourse]);

  const fetchSummary = async (date) => {
    try {
      setLoading(true); setError('');
      const data = await getAttendanceSummary(date);
      setSummary(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load attendance summary.');
    } finally { setLoading(false); }
  };

  const fetchCourses = async () => {
    try {
      const data = await getCourses();
      setCourses(data);
      if (data.length > 0) setSelectedCourse(data[0].id.toString());
    } catch (err) { console.error('Failed to load courses', err); }
  };

  const fetchMonthlyReport = async () => {
    try {
      setMonthlyLoading(true);
      const data = await getMonthlyAttendanceReport(selectedCourse);
      setMonthlyReport(data);
    } catch (err) { console.error(err); }
    finally { setMonthlyLoading(false); }
  };

  const goToPrevDay = () => {
    const d = new Date(selectedDate); d.setDate(d.getDate() - 1);
    setSelectedDate(toLocalDateString(d));
  };
  const goToNextDay = () => {
    const d = new Date(selectedDate); d.setDate(d.getDate() + 1);
    if (toLocalDateString(d) <= toLocalDateString(new Date())) setSelectedDate(toLocalDateString(d));
  };
  const isToday = selectedDate === toLocalDateString(new Date());

  const handleDownloadPDF = () => {
    if (activeTab === 'global') {
      const doc = new jsPDF();
      doc.setFontSize(14); doc.text('Daily Attendance Overview', 14, 15);
      doc.setFontSize(10); doc.setTextColor(100);
      doc.text(`Date: ${formatDisplayDate(selectedDate)}`, 14, 22);
      doc.setTextColor(0);
      const tableColumn = ['Course', 'Teacher', 'Total Students', 'Present', 'Absent', 'Late', 'Attendance %'];
      const tableRows = summary.map(cls => [
        cls.courseName, cls.teacherName, cls.totalStudents,
        cls.attendanceTaken ? cls.present : 'N/A',
        cls.attendanceTaken ? cls.absent : 'N/A',
        cls.attendanceTaken ? cls.late : 'N/A',
        cls.attendanceTaken ? `${cls.percentage}%` : 'Not Taken'
      ]);
      autoTable(doc, { head: [tableColumn], body: tableRows, startY: 28 });
      doc.save(`Attendance_${selectedDate}.pdf`);
    } else {
      if (monthlyReport.length === 0) return;
      const doc = new jsPDF('landscape');
      const courseObj = courses.find(c => c.id.toString() === selectedCourse);
      const courseName = courseObj ? `${courseObj.courseName} - ${courseObj.section}` : '';
      doc.text(`Month-Wise Attendance - ${courseName}`, 14, 15);
      const monthSet = new Set();
      monthlyReport.forEach(s => Object.keys(s.months).forEach(m => monthSet.add(m)));
      const sortedMonths = Array.from(monthSet).sort();
      const tableColumn = ['Student Name', 'Roll No', ...sortedMonths.map(m => `${formatMonthName(m)} (P/A)`)];
      const tableRows = monthlyReport.map(s => {
        const row = [s.name, s.rollNumber];
        sortedMonths.forEach(m => row.push(s.months[m] ? `${s.months[m].present} / ${s.months[m].absent}` : '0 / 0'));
        return row;
      });
      autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
      doc.save(`Monthly_Attendance_${courseName}_${new Date().toISOString().split('T')[0]}.pdf`);
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

  const totalPresent = summary.reduce((a, c) => a + (c.attendanceTaken ? c.present : 0), 0);
  const totalAbsent = summary.reduce((a, c) => a + (c.attendanceTaken ? c.absent : 0), 0);
  const totalLate = summary.reduce((a, c) => a + (c.attendanceTaken ? c.late : 0), 0);
  const classesMarked = summary.filter(c => c.attendanceTaken).length;

  return (
    <div className="animate-fade-in" style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Attendance Overview</h2>
            <p style={styles.sub}>School-wide daily and monthly attendance monitoring.</p>
          </div>
          <button onClick={handleDownloadPDF} style={styles.downloadBtn}
            disabled={(activeTab === 'global' && summary.length === 0) || (activeTab === 'monthly' && monthlyReport.length === 0)}>
            &#11015; Download PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
        {[{ key: 'global', label: 'Day-wise Summary' }, { key: 'monthly', label: 'Monthly Report' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ ...styles.tabBtn, borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : 'none', color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      {activeTab === 'global' && (
        <>
          <div style={styles.dateStrip}>
            <button style={styles.navBtn} onClick={goToPrevDay}>Prev Day</button>
            <div style={styles.dateCenter}>
              <input type="date" value={selectedDate} max={toLocalDateString(new Date())}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                style={styles.dateInput} />
              <span style={styles.dateLabel}>{formatDisplayDate(selectedDate)}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!isToday && <button style={styles.todayBtn} onClick={() => setSelectedDate(toLocalDateString(new Date()))}>Today</button>}
              <button style={{ ...styles.navBtn, opacity: isToday ? 0.35 : 1, cursor: isToday ? 'not-allowed' : 'pointer' }}
                onClick={goToNextDay} disabled={isToday}>Next Day</button>
            </div>
          </div>

          {!loading && summary.length > 0 && (
            <div style={styles.statsRow}>
              {[
                { label: 'Total Present', value: totalPresent, color: '#059669' },
                { label: 'Total Absent', value: totalAbsent, color: '#dc2626' },
                { label: 'Total Late', value: totalLate, color: '#d97706' },
                { label: 'Classes Marked', value: `${classesMarked} / ${summary.length}`, color: '#6366f1' },
              ].map(stat => (
                <div key={stat.label} style={{ ...styles.statBox, borderLeft: `3px solid ${stat.color}` }}>
                  <div style={{ ...styles.statNum, color: stat.color }}>{stat.value}</div>
                  <div style={styles.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={styles.card}>
            {loading ? <Loader message="Loading attendance data..." /> :
              summary.length === 0 ? <p style={styles.noData}>No attendance data available.</p> : (
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Course</th>
                        <th style={styles.th}>Teacher</th>
                        <th style={styles.th}>Total Students</th>
                        <th style={{ ...styles.th, color: '#059669' }}>Present</th>
                        <th style={{ ...styles.th, color: '#dc2626' }}>Absent</th>
                        <th style={{ ...styles.th, color: '#d97706' }}>Late</th>
                        <th style={styles.th}>Attendance %</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.map(cls => (
                        <tr key={cls.courseId} style={styles.tr}>
                          <td style={{ ...styles.td, fontWeight: 'bold', color: 'var(--primary)' }}>{cls.courseName}</td>
                          <td style={styles.td}>{cls.teacherName}</td>
                          <td style={{ ...styles.td, fontWeight: '600' }}>{cls.totalStudents}</td>
                          <td style={{ ...styles.td, color: '#059669', fontWeight: '700', fontSize: '1rem' }}>
                            {cls.attendanceTaken ? cls.present : '---'}
                          </td>
                          <td style={{ ...styles.td, color: '#dc2626', fontWeight: '700', fontSize: '1rem' }}>
                            {cls.attendanceTaken ? cls.absent : '---'}
                          </td>
                          <td style={{ ...styles.td, color: '#d97706', fontWeight: '700', fontSize: '1rem' }}>
                            {cls.attendanceTaken ? cls.late : '---'}
                          </td>
                          <td style={styles.td}>
                            {cls.attendanceTaken ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={styles.progressBarContainer}>
                                  <div style={{ ...styles.progressBar, width: `${cls.percentage}%`, background: cls.percentage >= 75 ? '#059669' : '#dc2626' }} />
                                </div>
                                <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>{cls.percentage}%</span>
                              </div>
                            ) : '---'}
                          </td>
                          <td style={styles.td}>
                            <span style={{ ...styles.badge, ...(cls.attendanceTaken ? { background: 'rgba(5,150,105,0.1)', color: '#059669', border: '1px solid rgba(5,150,105,0.3)' } : { background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)' }) }}>
                              {cls.attendanceTaken ? 'Marked' : 'Not Taken'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </>
      )}

      {activeTab === 'monthly' && (
        <div style={styles.card}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontWeight: '600' }}>Select Class:</span>
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} style={styles.select}>
                {courses.map(c => <option key={c.id} value={c.id}>{c.courseName} - {c.section}</option>)}
              </select>
            </div>
            {monthlyLoading ? <Loader message="Loading monthly report..." /> :
              monthlyReport.length === 0 ? <p style={styles.noData}>No data available for this class.</p> : (
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Student Name</th>
                        <th style={styles.th}>Roll No</th>
                        {Array.from(new Set(monthlyReport.flatMap(s => Object.keys(s.months)))).sort().map(m => (
                          <th key={m} style={styles.th}>{formatMonthName(m)}<br /><span style={{ fontSize: '0.72rem', fontWeight: '400', color: 'var(--text-muted)' }}>(P / A)</span></th>
                        ))}
                        <th style={{ ...styles.th, textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyReport.map(student => {
                        const allMonths = Array.from(new Set(monthlyReport.flatMap(s => Object.keys(s.months)))).sort();
                        return (
                          <tr key={student.studentId} style={styles.tr}>
                            <td style={{ ...styles.td, fontWeight: '600' }}>{student.name}</td>
                            <td style={styles.td}>{student.rollNumber}</td>
                            {allMonths.map(m => (
                              <td key={m} style={styles.td}>
                                {student.months[m] ? (
                                  <>
                                    <span style={{ color: '#059669', fontWeight: '700' }}>{student.months[m].present}</span>
                                    {' / '}
                                    <span style={{ color: '#dc2626', fontWeight: '700' }}>{student.months[m].absent}</span>
                                  </>
                                ) : '---'}
                              </td>
                            ))}
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              <button onClick={() => handleDownloadIndividualPDF(student)}
                                style={{ padding: '6px 12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                PDF
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  header: { marginBottom: '4px' },
  sub: { color: 'var(--text-secondary)', marginTop: '4px' },
  errorAlert: { padding: '10px', background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#fca5a5', borderRadius: '4px' },
  downloadBtn: { padding: '9px 18px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' },
  tabBtn: { background: 'transparent', border: 'none', padding: '10px 15px', cursor: 'pointer', fontWeight: '600', transition: 'var(--transition-fast)', fontSize: '0.9rem' },
  dateStrip: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px 20px', gap: '16px', flexWrap: 'wrap' },
  dateCenter: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'center', flexWrap: 'wrap' },
  dateInput: { padding: '7px 12px', borderRadius: '8px', border: '1.5px solid var(--primary)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', outline: 'none' },
  dateLabel: { fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' },
  navBtn: { padding: '7px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem' },
  todayBtn: { padding: '7px 16px', borderRadius: '8px', border: '1px solid var(--primary)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' },
  statBox: { background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '14px 18px' },
  statNum: { fontSize: '1.6rem', fontWeight: '800', lineHeight: 1 },
  statLabel: { fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' },
  card: { background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glow)' },
  noData: { color: 'var(--text-muted)', textAlign: 'center', padding: '20px' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { color: 'var(--text-secondary)', padding: '12px 14px', fontWeight: '600', borderBottom: '2px solid var(--glass-border)', whiteSpace: 'nowrap' },
  td: { padding: '13px 14px', borderBottom: '1px solid var(--glass-border)', fontSize: '0.88rem', verticalAlign: 'middle' },
  tr: { transition: 'var(--transition-fast)' },
  progressBarContainer: { width: '80px', height: '6px', background: 'var(--glass-border)', borderRadius: '3px', display: 'inline-block', overflow: 'hidden' },
  progressBar: { height: '100%', transition: 'width 0.3s ease', borderRadius: '3px' },
  badge: { padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' },
  select: { padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.9rem' },
};
