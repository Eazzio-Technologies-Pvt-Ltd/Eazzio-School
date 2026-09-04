import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Download,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
  AlertCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getExamCourses,
  getExamsList,
  createExam,
  deleteExam,
  getMarksSheet,
  saveMarks,
  getCourseAcademicSummary,
  getStudentReportCard
} from '../../api/examApi';
import Loader from '../../components/Loader';

const DEFAULT_SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'Hindi',
  'Social Science',
  'Computer Science',
  'General Knowledge',
  'Sanskrit'
];

const EXAM_TEMPLATES = [
  { name: 'Periodic Test 1 (PT-1)', term: 'Term 1' },
  { name: 'Periodic Test 2 (PT-2)', term: 'Term 1' },
  { name: 'Half-Yearly Examination', term: 'Term 1' },
  { name: 'Surprise Test 1', term: 'Term 1' },
  { name: 'Periodic Test 3 (PT-3)', term: 'Term 2' },
  { name: 'Surprise Test 2', term: 'Term 2' },
  { name: 'Annual Examination', term: 'Term 2' }
];

function getGradeColor(grade) {
  if (['A1', 'A2'].includes(grade)) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (['B1', 'B2'].includes(grade)) return 'bg-blue-100 text-blue-800 border-blue-300';
  if (['C1', 'C2'].includes(grade)) return 'bg-amber-100 text-amber-800 border-amber-300';
  if (grade === 'D') return 'bg-orange-100 text-orange-800 border-orange-300';
  return 'bg-red-100 text-red-800 border-red-300';
}

function calculateGrade(pct) {
  if (pct >= 91) return 'A1';
  if (pct >= 81) return 'A2';
  if (pct >= 71) return 'B1';
  if (pct >= 61) return 'B2';
  if (pct >= 51) return 'C1';
  if (pct >= 41) return 'C2';
  if (pct >= 33) return 'D';
  return 'E';
}

export default function ExamsAndMarks() {
  const [activeTab, setActiveTab] = useState('record'); // 'record' | 'reports'

  // Courses & Common State
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Tab 1: Marks Entry State
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [customSubject, setCustomSubject] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [marksSheet, setMarksSheet] = useState(null);
  const [marksData, setMarksData] = useState([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  // Tab 2: Academic Reports State
  const [courseSummary, setCourseSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentScorecard, setSelectedStudentScorecard] = useState(null);
  const [loadingScorecard, setLoadingScorecard] = useState(false);

  // Create Exam Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExamName, setNewExamName] = useState('');
  const [newExamTerm, setNewExamTerm] = useState('Term 1');
  const [newExamYear, setNewExamYear] = useState('2026-2027');
  const [newExamDate, setNewExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [creatingExam, setCreatingExam] = useState(false);

  // Initial Load: Courses
  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const res = await getExamCourses();
      const list = Array.isArray(res) ? res : (res?.data || []);
      setCourses(list);
      if (list.length > 0) {
        setSelectedCourse(list[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  // When selectedCourse changes, fetch exams for this course
  useEffect(() => {
    if (selectedCourse) {
      fetchExamsForCourse(selectedCourse);
      if (activeTab === 'reports') {
        fetchCourseSummary(selectedCourse);
      }
    }
  }, [selectedCourse, activeTab]);

  const fetchExamsForCourse = async (courseId) => {
    try {
      const res = await getExamsList(courseId);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setExams(list);
      if (list.length > 0) {
        setSelectedExam(list[0].id.toString());
      } else {
        setSelectedExam('');
        setMarksSheet(null);
      }
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    }
  };

  const fetchCourseSummary = async (courseId) => {
    try {
      setLoadingSummary(true);
      const res = await getCourseAcademicSummary(courseId);
      const summaryData = res?.students ? res : (res?.data || null);
      if (summaryData) {
        setCourseSummary(summaryData);
      }
    } catch (err) {
      console.error('Failed to fetch academic summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Available subjects for the selected course
  const availableSubjects = useMemo(() => {
    const courseObj = courses.find((c) => c.id.toString() === selectedCourse);
    const courseSubs = courseObj && courseObj.courseSubjects ? courseObj.courseSubjects.map((s) => s.subject) : [];
    const combined = Array.from(new Set([...courseSubs, ...DEFAULT_SUBJECTS]));
    return combined;
  }, [courses, selectedCourse]);

  // Load Marks Sheet for Tab 1
  const handleLoadMarksSheet = async () => {
    if (!selectedCourse || !selectedExam) return;
    const finalSubject = customSubject.trim() || selectedSubject;
    if (!finalSubject) return;

    try {
      setLoadingSheet(true);
      setFeedbackMsg({ type: '', text: '' });
      const res = await getMarksSheet(selectedCourse, selectedExam, finalSubject);
      const sheetData = res?.students ? res : (res?.data || null);
      if (sheetData) {
        setMarksSheet(sheetData);
        setMaxMarks(sheetData.defaultMaxMarks || 100);
        setMarksData(
          sheetData.students.map((s) => ({
            studentId: s.studentId,
            marksObtained: s.marksObtained !== null && s.marksObtained !== undefined ? s.marksObtained : '',
            grade: s.grade || '',
            remarks: s.remarks || ''
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load marks sheet:', err);
      setFeedbackMsg({ type: 'error', text: 'Failed to load student marks sheet' });
    } finally {
      setLoadingSheet(false);
    }
  };

  // Handle Marks input change
  const handleMarkChange = (studentId, val) => {
    setMarksData((prev) =>
      prev.map((item) => {
        if (item.studentId === studentId) {
          const obt = val === '' ? '' : Math.min(Number(val), maxMarks);
          const pct = obt !== '' && maxMarks > 0 ? (Number(obt) / maxMarks) * 100 : 0;
          const autoGrade = obt !== '' ? calculateGrade(pct) : '';
          return {
            ...item,
            marksObtained: obt,
            grade: autoGrade
          };
        }
        return item;
      })
    );
  };

  const handleRemarkChange = (studentId, val) => {
    setMarksData((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, remarks: val } : item))
    );
  };

  // Save Marks
  const handleSaveMarks = async () => {
    if (!selectedCourse || !selectedExam || !marksSheet) return;
    const finalSubject = customSubject.trim() || selectedSubject;

    try {
      setSavingMarks(true);
      setFeedbackMsg({ type: '', text: '' });
      const res = await saveMarks({
        courseId: selectedCourse,
        examId: selectedExam,
        subject: finalSubject,
        maxMarks: Number(maxMarks) || 100,
        marksData
      });

      const msg = res?.message || 'Marks saved successfully!';
      setFeedbackMsg({ type: 'success', text: msg });
      // Refresh sheet to update recorded indicators
      handleLoadMarksSheet();
    } catch (err) {
      console.error('Failed to save marks:', err);
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save marks. Please try again.'
      });
    } finally {
      setSavingMarks(false);
    }
  };

  // Create New Exam
  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!newExamName.trim() || !selectedCourse) return;

    try {
      setCreatingExam(true);
      const res = await createExam({
        courseId: selectedCourse,
        examName: newExamName.trim(),
        term: newExamTerm,
        academicYear: newExamYear,
        examDate: newExamDate
      });

      const examObj = res?.id ? res : (res?.data || null);
      setShowCreateModal(false);
      setNewExamName('');
      await fetchExamsForCourse(selectedCourse);
      if (examObj?.id) {
        setSelectedExam(examObj.id.toString());
      }
    } catch (err) {
      console.error('Failed to create exam:', err);
      alert(err.response?.data?.error || 'Failed to create exam');
    } finally {
      setCreatingExam(false);
    }
  };

  // View Student Scorecard Modal
  const handleViewScorecard = async (studentId) => {
    try {
      setLoadingScorecard(true);
      const res = await getStudentReportCard(studentId);
      const cardData = res?.student ? res : (res?.data || null);
      if (cardData) {
        setSelectedStudentScorecard(cardData);
      }
    } catch (err) {
      console.error('Failed to load scorecard:', err);
      alert('Failed to load student scorecard');
    } finally {
      setLoadingScorecard(false);
    }
  };

  // ── Download Individual Student PDF Report Card ──
  const handleDownloadReportCardPDF = async (studentId) => {
    try {
      let data = selectedStudentScorecard;
      if (!data || data.student?.id !== studentId) {
        const res = await getStudentReportCard(studentId);
        data = res?.student ? res : (res?.data || null);
        if (!data) {
          alert('Could not fetch report card data.');
          return;
        }
      }

      const { student, school, exams, subjectRows, attendance, summary } = data;

      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // ── Outer Border ──
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.8);
      doc.rect(8, 8, pageW - 16, pageH - 16);

      // Inner thin decorative line
      doc.setDrawColor(13, 148, 136);
      doc.setLineWidth(0.3);
      doc.rect(10, 10, pageW - 20, pageH - 20);

      // ── Top Header Banner ──
      doc.setFillColor(13, 148, 136);
      doc.rect(10, 10, pageW - 20, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(school.schoolName || 'EAZZIO PUBLIC SCHOOL', pageW / 2, 18, { align: 'center' });

      doc.setFontSize(8.5);
      doc.setFont(undefined, 'normal');
      doc.text(
        `${school.address || 'CBSE Affiliated Senior Secondary School'} • School Code: ${school.schoolCode || 'SCH-2026'}`,
        pageW / 2,
        24,
        { align: 'center' }
      );
      doc.text(
        `STUDENT ACADEMIC PERFORMANCE REPORT CARD • SESSION ${student.academicYear || '2026-2027'}`,
        pageW / 2,
        30,
        { align: 'center' }
      );

      // ── Student Details Card ──
      const cardY = 38;
      const cardH = 28;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(14, cardY, pageW - 28, cardH, 2, 2, 'FD');

      // Left bar
      doc.setFillColor(13, 148, 136);
      doc.roundedRect(14, cardY, 3, cardH, 1, 1, 'F');

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(student.name, 22, cardY + 7);

      doc.setFontSize(8.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Roll Number:  ${student.rollNumber}`, 22, cardY + 13);
      doc.text(`Class & Section:  ${student.courseName} - ${student.section}`, 22, cardY + 19);
      doc.text(`Student ID:  ${student.studentId}`, 22, cardY + 25);

      // Right column of details
      doc.text(`Father's Name:  ${student.fatherName}`, pageW - 85, cardY + 13);
      doc.text(`Class Teacher:  ${student.classTeacher}`, pageW - 85, cardY + 19);
      doc.text(`Attendance:  ${attendance.percentage}% (${attendance.presentDays}/${attendance.totalDays} Days)`, pageW - 85, cardY + 25);

      let curY = cardY + cardH + 7;

      // ── Academic Results Table ──
      doc.setFontSize(9.5);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('SCHOLASTIC PERFORMANCE MATRIX', 14, curY);

      // Dynamic table columns based on exams conducted
      // Head: ['Subject', ...examNames, 'Total', '%', 'Grade']
      const tableHead = ['Subject'];
      exams.forEach((e) => {
        tableHead.push(e.examName);
      });
      tableHead.push('Grand Total', 'Percentage', 'Grade');

      const tableBody = subjectRows.map((sub) => {
        const row = [sub.subject];
        exams.forEach((e) => {
          const mark = sub.marksByExam[e.id];
          if (mark) {
            row.push(`${mark.marksObtained} / ${mark.maxMarks}`);
          } else {
            row.push('—');
          }
        });
        row.push(`${sub.totalObtained} / ${sub.totalMax}`, `${sub.percentage}%`, sub.grade);
        return row;
      });

      // Add Total Row
      const totalRow = ['TOTALS'];
      exams.forEach((e) => {
        let eObt = 0;
        let eMax = 0;
        let hasMark = false;
        subjectRows.forEach((sub) => {
          const mark = sub.marksByExam[e.id];
          if (mark) {
            eObt += mark.marksObtained;
            eMax += mark.maxMarks;
            hasMark = true;
          }
        });
        totalRow.push(hasMark ? `${eObt} / ${eMax}` : '—');
      });
      totalRow.push(`${summary.grandObtained} / ${summary.grandMax}`, `${summary.overallPercentage}%`, summary.overallGrade);
      tableBody.push(totalRow);

      autoTable(doc, {
        head: [tableHead],
        body: tableBody,
        startY: curY + 2,
        headStyles: {
          fillColor: [13, 148, 136],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center',
          cellPadding: 3
        },
        bodyStyles: {
          fontSize: 7.5,
          cellPadding: 2.8,
          textColor: [30, 41, 59],
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 38 }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        didParseCell: (hookData) => {
          // Highlight totals row
          if (hookData.row.index === tableBody.length - 1 && hookData.section === 'body') {
            hookData.cell.styles.fillColor = [241, 245, 249];
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.textColor = [15, 23, 42];
          }
          // Highlight grade column
          if (hookData.section === 'body' && hookData.column.index === tableHead.length - 1) {
            const gr = hookData.cell.raw;
            if (['A1', 'A2'].includes(gr)) {
              hookData.cell.styles.textColor = [5, 150, 105];
            } else if (['B1', 'B2'].includes(gr)) {
              hookData.cell.styles.textColor = [37, 99, 235];
            } else if (['C1', 'C2', 'D'].includes(gr)) {
              hookData.cell.styles.textColor = [217, 119, 6];
            } else {
              hookData.cell.styles.textColor = [220, 38, 38];
            }
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
      });

      curY = doc.lastAutoTable.finalY + 8;

      // ── Summary KPI Boxes ──
      const kpis = [
        { label: 'Marks Obtained', val: `${summary.grandObtained} / ${summary.grandMax}`, color: [30, 41, 59] },
        { label: 'Overall Percentage', val: `${summary.overallPercentage}%`, color: summary.overallPercentage >= 60 ? [5, 150, 105] : [220, 38, 38] },
        { label: 'Final Grade', val: summary.overallGrade, color: [13, 148, 136] },
        { label: 'Result Status', val: summary.resultStatus, color: summary.resultStatus === 'PASSED' ? [5, 150, 105] : [220, 38, 38] }
      ];

      const kpiW = (pageW - 28 - 9) / 4;
      kpis.forEach((k, idx) => {
        const kx = 14 + idx * (kpiW + 3);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(kx, curY, kpiW, 14, 1.5, 1.5, 'FD');

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...k.color);
        doc.text(k.val, kx + kpiW / 2, curY + 6.5, { align: 'center' });

        doc.setFontSize(6.5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(k.label, kx + kpiW / 2, curY + 11.5, { align: 'center' });
      });

      curY += 20;

      // ── Teacher Remarks Box ──
      doc.setFillColor(254, 252, 232);
      doc.setDrawColor(254, 240, 138);
      doc.roundedRect(14, curY, pageW - 28, 12, 1.5, 1.5, 'FD');

      doc.setFontSize(7.5);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(133, 77, 14);
      doc.text('Remarks / Assessment:', 18, curY + 5);

      doc.setFont(undefined, 'normal');
      doc.setTextColor(113, 63, 18);
      doc.text(summary.remarks || 'Consistent academic performance throughout the academic session.', 18, curY + 9.5);

      // ── Official Signatures Section ──
      const sigY = pageH - 26;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);

      const sigSlots = [
        { label: 'Class Teacher Signature', x: 20 },
        { label: 'Exam Incharge Signature', x: pageW / 2 - 25 },
        { label: 'Principal Signature & Seal', x: pageW - 70 }
      ];

      sigSlots.forEach((s) => {
        doc.line(s.x, sigY, s.x + 50, sigY);
        doc.setFontSize(7.5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(s.label, s.x + 25, sigY + 4, { align: 'center' });
      });

      doc.save(`${student.name.replace(/\s+/g, '_')}_Academic_Report_Card.pdf`);
    } catch (err) {
      console.error('Error downloading PDF report card:', err);
      alert('Failed to generate PDF Report Card');
    }
  };

  // Filter students for Tab 2
  const filteredStudents = useMemo(() => {
    if (!courseSummary || !courseSummary.students) return [];
    if (!searchQuery.trim()) return courseSummary.students;
    const q = searchQuery.toLowerCase();
    return courseSummary.students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toString().toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q)
    );
  }, [courseSummary, searchQuery]);

  if (loadingCourses) {
    return <Loader message="Loading Examinations Suite..." />;
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Award className="text-teal-600" size={32} />
            Examinations & Academic Reports
          </h2>
          <p className="text-gray-500 mt-1">
            Record marks across PT1, PT2, Half-Yearly, Surprise Tests, and generate student Report Cards.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition"
          >
            <Plus size={18} />
            New Exam
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('record')}
          className={`pb-3 px-4 font-medium text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'record'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <FileText size={18} />
          Record Marks (Marks Entry)
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 px-4 font-medium text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <GraduationCap size={18} />
          Student Academic Reports (Session Overview)
        </button>
      </div>

      {/* ── TAB 1: RECORD MARKS ── */}
      {activeTab === 'record' && (
        <div className="flex flex-col gap-6">
          {/* Controls Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
              <Filter size={16} /> Select Class, Exam & Subject
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Course Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Class / Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courseName} - {c.section} ({c._count.students} Students)
                    </option>
                  ))}
                </select>
              </div>

              {/* Exam Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Examination / Test</label>
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                  disabled={exams.length === 0}
                >
                  {exams.length === 0 ? (
                    <option value="">No Exams Yet (Create One)</option>
                  ) : (
                    exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.examName} ({ex.term})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Subject Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setCustomSubject('');
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                >
                  {availableSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                  <option value="CUSTOM">+ Enter Custom Subject...</option>
                </select>
                {selectedSubject === 'CUSTOM' && (
                  <input
                    type="text"
                    placeholder="Type subject name..."
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                )}
              </div>

              {/* Max Marks & Load Button */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Max Marks</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                  <button
                    onClick={handleLoadMarksSheet}
                    disabled={!selectedCourse || !selectedExam || loadingSheet}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loadingSheet ? <RefreshCw className="animate-spin" size={16} /> : <FileText size={16} />}
                    Load Sheet
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Toast */}
          {feedbackMsg.text && (
            <div
              className={`p-4 rounded-xl border flex items-center gap-2 text-sm ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {feedbackMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {feedbackMsg.text}
            </div>
          )}

          {/* Marks Entry Grid */}
          {marksSheet && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-gray-900 text-base">
                    {marksSheet.course.courseName} - {marksSheet.course.section} • {marksSheet.exam.examName} (
                    {marksSheet.subject})
                  </h4>
                  <p className="text-xs text-gray-500">
                    Max Marks: <span className="font-semibold text-gray-700">{maxMarks}</span> • Enrolled Students:{' '}
                    <span className="font-semibold text-gray-700">{marksSheet.students.length}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-500">
                    Entered: {marksData.filter((m) => m.marksObtained !== '').length} / {marksData.length}
                  </span>
                  <button
                    onClick={handleSaveMarks}
                    disabled={savingMarks}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-semibold text-sm shadow-sm transition disabled:opacity-50"
                  >
                    {savingMarks ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                    Save Marks
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wider">
                      <th className="py-3 px-4 text-center w-16">Roll No</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4 w-40">Marks Obtained</th>
                      <th className="py-3 px-4 w-28 text-center">Grade</th>
                      <th className="py-3 px-4 w-52">Remarks</th>
                      <th className="py-3 px-4 w-28 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {marksSheet.students.map((student, idx) => {
                      const currentMark = marksData.find((m) => m.studentId === student.studentId);
                      const val = currentMark ? currentMark.marksObtained : '';
                      const grade = currentMark ? currentMark.grade : '';
                      const remarks = currentMark ? currentMark.remarks : '';

                      return (
                        <tr key={student.studentId} className="hover:bg-gray-50/80 transition">
                          <td className="py-3 px-4 text-center font-bold text-gray-700">
                            {student.rollNumber || idx + 1}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900">{student.name}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={maxMarks}
                                step="0.5"
                                placeholder="0"
                                value={val}
                                onChange={(e) => handleMarkChange(student.studentId, e.target.value)}
                                className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 font-semibold text-gray-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                              />
                              <span className="text-xs text-gray-400">/ {maxMarks}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {grade ? (
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getGradeColor(
                                  grade
                                )}`}
                              >
                                {grade}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              placeholder="e.g. Good, Revision needed"
                              value={remarks}
                              onChange={(e) => handleRemarkChange(student.studentId, e.target.value)}
                              className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            {student.isRecorded ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <CheckCircle size={12} /> Saved
                              </span>
                            ) : (
                              <span className="inline-block text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Action */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleSaveMarks}
                  disabled={savingMarks}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm transition disabled:opacity-50"
                >
                  {savingMarks ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                  Save All Marks
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: STUDENT ACADEMIC REPORTS (SESSION OVERVIEW) ── */}
      {activeTab === 'reports' && (
        <div className="flex flex-col gap-6">
          {/* Controls & Search */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Select Class / Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white min-w-[240px]"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courseName} - {c.section}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 max-w-md">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Search Student</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by name or roll number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => fetchCourseSummary(selectedCourse)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium transition"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          {/* Quick Metrics Bar */}
          {courseSummary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center font-bold">
                  <Users size={22} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{courseSummary.students.length}</div>
                  <div className="text-xs text-gray-500">Total Students</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                  <Award size={22} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{courseSummary.exams.length}</div>
                  <div className="text-xs text-gray-500">Exams Conducted</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center font-bold">
                  <BookOpen size={22} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{courseSummary.subjects.length}</div>
                  <div className="text-xs text-gray-500">Subjects Evaluated</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {courseSummary.students.length > 0
                      ? (
                          courseSummary.students.reduce((acc, s) => acc + s.percentage, 0) /
                          courseSummary.students.length
                        ).toFixed(1)
                      : 0}
                    %
                  </div>
                  <div className="text-xs text-gray-500">Class Average %</div>
                </div>
              </div>
            </div>
          )}

          {/* Students Roster Table */}
          {loadingSummary ? (
            <Loader message="Loading Academic Summary..." />
          ) : !courseSummary || filteredStudents.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
              <GraduationCap className="mx-auto text-gray-300 mb-3" size={40} />
              <p className="font-semibold text-gray-700">No student academic records found.</p>
              <p className="text-xs mt-1 text-gray-400">
                Record marks in the &quot;Record Marks&quot; tab to see consolidated session scorecards.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h4 className="font-bold text-gray-900 text-sm">
                  {courseSummary.course.courseName} - {courseSummary.course.section} • Session Performance Roster
                </h4>
                <span className="text-xs text-gray-500">{filteredStudents.length} Students Listed</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wider">
                      <th className="py-3 px-4 text-center w-16">Roll No</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4 text-center">Exams Taken</th>
                      <th className="py-3 px-4 text-center">Marks (Obt / Max)</th>
                      <th className="py-3 px-4 text-center w-36">Overall %</th>
                      <th className="py-3 px-4 text-center">Grade</th>
                      <th className="py-3 px-4 text-center">Attendance</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3 px-4 text-center font-bold text-gray-700">{s.rollNumber}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">{s.name}</div>
                          <div className="text-xs text-gray-400">Father: {s.fatherName}</div>
                        </td>
                        <td className="py-3 px-4 text-center text-xs font-semibold text-gray-600">
                          {s.examCount} of {courseSummary.exams.length}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs">
                          {s.totalObtained} / {s.totalMax}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  s.percentage >= 75
                                    ? 'bg-emerald-500'
                                    : s.percentage >= 50
                                    ? 'bg-blue-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(s.percentage, 100)}%` }}
                              />
                            </div>
                            <span className="font-bold text-xs">{s.percentage}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getGradeColor(
                              s.grade
                            )}`}
                          >
                            {s.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-xs font-semibold ${
                              s.attendancePercentage >= 75 ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {s.attendancePercentage}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewScorecard(s.id)}
                              className="p-1.5 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                              title="View Complete Scorecard"
                            >
                              <Eye size={17} />
                            </button>
                            <button
                              onClick={() => handleDownloadReportCardPDF(s.id)}
                              className="flex items-center gap-1.5 bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-teal-200 hover:border-transparent"
                              title="Download PDF Report Card"
                            >
                              <Download size={14} /> PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: CREATE NEW EXAM ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus className="text-teal-600" size={20} /> Create New Examination
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Target Class / Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courseName} - {c.section}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Exam Name (e.g. PT-1, Half-Yearly, Surprise Test)
                </label>
                <input
                  type="text"
                  placeholder="Enter exam name..."
                  value={newExamName}
                  onChange={(e) => setNewExamName(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />

                {/* Quick Templates */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {EXAM_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.name}
                      type="button"
                      onClick={() => {
                        setNewExamName(tmpl.name);
                        setNewExamTerm(tmpl.term);
                      }}
                      className="text-[11px] bg-gray-100 hover:bg-teal-50 hover:text-teal-700 text-gray-600 px-2 py-1 rounded transition"
                    >
                      {tmpl.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Term</label>
                  <select
                    value={newExamTerm}
                    onChange={(e) => setNewExamTerm(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Annual">Annual</option>
                    <option value="Special">Special / Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={newExamYear}
                    onChange={(e) => setNewExamYear(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Exam Date</label>
                <input
                  type="date"
                  value={newExamDate}
                  onChange={(e) => setNewExamDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingExam || !newExamName.trim()}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {creatingExam ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                  Create Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW STUDENT SCORECARD ── */}
      {selectedStudentScorecard && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-800 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {selectedStudentScorecard.student.name} • Academic Scorecard
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Roll No: {selectedStudentScorecard.student.rollNumber} • Class:{' '}
                  {selectedStudentScorecard.student.courseName} - {selectedStudentScorecard.student.section}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadReportCardPDF(selectedStudentScorecard.student.id)}
                  className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                >
                  <Download size={14} /> Download PDF
                </button>
                <button
                  onClick={() => setSelectedStudentScorecard(null)}
                  className="text-slate-300 hover:text-white p-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col gap-6">
              {/* Performance Stats */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-lg font-bold text-gray-900">
                    {selectedStudentScorecard.summary.grandObtained} / {selectedStudentScorecard.summary.grandMax}
                  </div>
                  <div className="text-[11px] text-gray-500">Total Marks</div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-lg font-bold text-emerald-700">
                    {selectedStudentScorecard.summary.overallPercentage}%
                  </div>
                  <div className="text-[11px] text-emerald-600">Overall %</div>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="text-lg font-bold text-blue-700">
                    {selectedStudentScorecard.summary.overallGrade}
                  </div>
                  <div className="text-[11px] text-blue-600">Final Grade</div>
                </div>

                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="text-lg font-bold text-purple-700">
                    {selectedStudentScorecard.attendance.percentage}%
                  </div>
                  <div className="text-[11px] text-purple-600">Attendance</div>
                </div>
              </div>

              {/* Subject Matrix Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 border-b border-gray-200 font-bold uppercase tracking-wider">
                        <th className="py-3 px-3">Subject</th>
                        {selectedStudentScorecard.exams.map((ex) => (
                          <th key={ex.id} className="py-3 px-3 text-center">
                            {ex.examName}
                          </th>
                        ))}
                        <th className="py-3 px-3 text-center">Total</th>
                        <th className="py-3 px-3 text-center">%</th>
                        <th className="py-3 px-3 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedStudentScorecard.subjectRows.map((sub) => (
                        <tr key={sub.subject} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-bold text-gray-800">{sub.subject}</td>
                          {selectedStudentScorecard.exams.map((ex) => {
                            const m = sub.marksByExam[ex.id];
                            return (
                              <td key={ex.id} className="py-2.5 px-3 text-center font-mono">
                                {m ? `${m.marksObtained}/${m.maxMarks}` : '—'}
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-3 text-center font-bold text-gray-900 font-mono">
                            {sub.totalObtained}/{sub.totalMax}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">{sub.percentage}%</td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${getGradeColor(sub.grade)}`}
                            >
                              {sub.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks */}
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                <span className="font-bold text-amber-900">Academic Assessment: </span>
                <span className="text-amber-800">{selectedStudentScorecard.summary.remarks}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
