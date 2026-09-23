import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import {
  Award, BookOpen, Calendar, CheckCircle, Download, Eye, FileText, Filter,
  GraduationCap, Plus, RefreshCw, Save, Search, Trash2, TrendingUp, User,
  Users, X, AlertCircle, BarChart2, Globe, Lock, ChevronDown, ChevronUp,
  Edit3, Clock, MapPin, BookMarked, FlaskConical, Layers, Send, Eye as EyeIcon
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getExamCourses, getExamsList, createExam, updateExam, deleteExam, getMarksSheet,
  saveMarks, getCourseAcademicSummary, getStudentReportCard, getMonthlySummary,
  getConsolidated, publishExam, createExamTimetable, getExamTimetables,
  publishExamTimetable, deleteExamTimetable, getClassTeacherView, getMySubjects
} from '../../api/examApi';
import { AuthContext } from '../../context/AuthContext';
import Loader from '../../components/Loader';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_SUBJECTS = [
  'Mathematics','Science','English','Hindi','Social Science',
  'Computer Science','General Knowledge','Sanskrit','Physics','Chemistry','Biology'
];

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

function getGradeColor(grade) {
  if (['A1','A2'].includes(grade)) return '#059669';
  if (['B1','B2'].includes(grade)) return '#2563eb';
  if (['C1','C2'].includes(grade)) return '#d97706';
  if (grade === 'D') return '#ea580c';
  return '#dc2626';
}

function GradeBadge({ grade, small }) {
  const color = getGradeColor(grade || 'E');
  return (
    <span style={{ color, borderColor: color }}
      className={`inline-flex items-center border rounded-full font-bold ${small ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-0.5'}`}>
      {grade || '—'}
    </span>
  );
}

const EXAM_TYPE_LABELS = {
  GENERAL: { label: 'General', color: 'bg-blue-100 text-blue-800', icon: '📝' },
  WEEKLY:  { label: 'Weekly Test', color: 'bg-teal-100 text-teal-800', icon: '📊' },
  SURPRISE:{ label: 'Surprise Test', color: 'bg-purple-100 text-purple-800', icon: '⚡' },
  HALF_YEARLY: { label: 'Half-Yearly', color: 'bg-orange-100 text-orange-800', icon: '📅' },
  ANNUAL:  { label: 'Annual Exam', color: 'bg-red-100 text-red-800', icon: '🏆' }
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExamsAndMarks() {
  const { user } = useContext(AuthContext);
  const isAdminOrPrincipal = user && (user.role === 'ADMIN' || user.role === 'PRINCIPAL');
  const isTeacher = user && user.role === 'TEACHER';
  const isAdmin = user && user.role === 'ADMIN';

  // Tabs: 'register' | 'monthly' | 'term' | 'timetable' | 'classtview'
  const [activeTab, setActiveTab] = useState('register');

  // Courses
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(true);
  // mySubjects: { courseId, subject }[] — subjects assigned to this teacher per course
  const [mySubjects, setMySubjects] = useState([]);
  const [mySubjectsIsAdmin, setMySubjectsIsAdmin] = useState(false);

  // ── Tab 1: Register Marks ──
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [marksSheet, setMarksSheet] = useState(null);
  const [marksData, setMarksData] = useState([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });
  const [registerFilter, setRegisterFilter] = useState('ALL'); // 'ALL','WEEKLY','SURPRISE','GENERAL'

  // ── Tab 2: Monthly Continuous Assessment ──
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear().toString());
  const [expandedExamId, setExpandedExamId] = useState(null);
  const [monthlyTypeFilter, setMonthlyTypeFilter] = useState('WEEKLY,SURPRISE');

  // ── Tab 3: Term Results (Half-Yearly / Annual) ──
  const [halfYearlyExams, setHalfYearlyExams] = useState([]);
  const [selectedHalfExam, setSelectedHalfExam] = useState('');
  const [consolidated, setConsolidated] = useState(null);
  const [loadingConsolidated, setLoadingConsolidated] = useState(false);
  const [consolidatedError, setConsolidatedError] = useState('');
  const [publishingExam, setPublishingExam] = useState(false);
  const [courseSummary, setCourseSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [termView, setTermView] = useState('consolidated'); // 'consolidated' | 'individual'
  const [selectedStudentScorecard, setSelectedStudentScorecard] = useState(null);
  const [loadingScorecard, setLoadingScorecard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Tab 4: Exam Timetable ──
  const [examTimetables, setExamTimetables] = useState([]);
  const [loadingTimetables, setLoadingTimetables] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [ttTitle, setTtTitle] = useState('');
  const [ttExamType, setTtExamType] = useState('HALF_YEARLY');
  const [ttYear, setTtYear] = useState('2026-2027');
  const [ttItems, setTtItems] = useState([{ subject: '', examDate: '', startTime: '09:00 AM', endTime: '12:00 PM', maxMarks: '', roomNo: '', instructions: '' }]);
  const [creatingTimetable, setCreatingTimetable] = useState(false);
  const [timetableFilter, setTimetableFilter] = useState('ALL');
  const [publishingTt, setPublishingTt] = useState(null);

  // ── Tab 5: Class Teacher View ──
  const [classView, setClassView] = useState(null);
  const [loadingClassView, setLoadingClassView] = useState(false);
  const [classViewFilter, setClassViewFilter] = useState('ALL'); // 'ALL','WEEKLY,SURPRISE','HALF_YEARLY,ANNUAL'
  const [classViewSearch, setClassViewSearch] = useState('');

  // Create Exam Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExamName, setNewExamName] = useState('');
  const [newExamTerm, setNewExamTerm] = useState('Term 1');
  const [newExamYear, setNewExamYear] = useState('2026-2027');
  const [newExamDate, setNewExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [newExamType, setNewExamType] = useState('WEEKLY');
  const [newExamSubject, setNewExamSubject] = useState('');
  const [newExamPortion, setNewExamPortion] = useState('');
  const [newExamMaxMarks, setNewExamMaxMarks] = useState('');
  const [creatingExam, setCreatingExam] = useState(false);

  // Edit Exam Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editExamId, setEditExamId] = useState(null);
  const [editExamName, setEditExamName] = useState('');
  const [editExamTerm, setEditExamTerm] = useState('Term 1');
  const [editExamYear, setEditExamYear] = useState('2026-2027');
  const [editExamDate, setEditExamDate] = useState('');
  const [editExamType, setEditExamType] = useState('WEEKLY');
  const [editExamSubject, setEditExamSubject] = useState('');
  const [editExamPortion, setEditExamPortion] = useState('');
  const [editExamMaxMarks, setEditExamMaxMarks] = useState('');
  const [updatingExam, setUpdatingExam] = useState(false);
  const [deletingExamId, setDeletingExamId] = useState(null);

  // ── Initial Load ──
  useEffect(() => { fetchCourses(); fetchMySubjects(); }, []);

  const fetchMySubjects = async () => {
    try {
      const res = await getMySubjects();
      const data = Array.isArray(res?.data) ? res.data : [];
      setMySubjects(data);
      setMySubjectsIsAdmin(!!res?.isAdmin);
    } catch (err) {
      console.error('Failed to load my subjects:', err);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const res = await getExamCourses();
      const list = Array.isArray(res) ? res : (res?.data || []);
      setCourses(list);
      if (list.length > 0) setSelectedCourse(list[0].id.toString());
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  // ── Tab data loading ──
  useEffect(() => {
    if (!selectedCourse) return;
    fetchMySubjects();
    if (activeTab === 'register') fetchExamsForCourse(selectedCourse);
    if (activeTab === 'monthly') fetchMonthlySummary(selectedCourse);
    if (activeTab === 'term') { fetchHalfYearlyExams(selectedCourse); fetchCourseSummary(selectedCourse); }
    if (activeTab === 'timetable') fetchExamTimetablesList(selectedCourse);
    if (activeTab === 'classtview') fetchClassTeacherView(selectedCourse);
  }, [selectedCourse, activeTab]);

  useEffect(() => {
    if (activeTab === 'monthly' && selectedCourse) fetchMonthlySummary(selectedCourse);
  }, [monthlyYear]);

  useEffect(() => {
    if (selectedHalfExam) fetchConsolidated(selectedHalfExam);
  }, [selectedHalfExam]);

  // ── Data Fetchers ──
  const fetchExamsForCourse = async (courseId) => {
    try {
      const res = await getExamsList(courseId);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setExams(list);
      if (list.length > 0) setSelectedExam(list[0].id.toString());
      else { setSelectedExam(''); setMarksSheet(null); }
    } catch (err) { console.error('Failed to fetch exams:', err); }
  };

  const fetchCourseSummary = async (courseId) => {
    try {
      setLoadingSummary(true);
      const res = await getCourseAcademicSummary(courseId);
      setCourseSummary(res?.students ? res : (res?.data || null));
    } catch (err) { console.error(err); }
    finally { setLoadingSummary(false); }
  };

  const fetchMonthlySummary = async (courseId) => {
    if (!courseId) return;
    try {
      setLoadingMonthly(true);
      const res = await getMonthlySummary(courseId, monthlyYear);
      setMonthlySummary(res?.months !== undefined ? res : (res?.data || null));
    } catch (err) { console.error(err); setMonthlySummary(null); }
    finally { setLoadingMonthly(false); }
  };

  const fetchHalfYearlyExams = async (courseId) => {
    if (!courseId) return;
    try {
      const res = await getExamsList(courseId);
      const list = Array.isArray(res) ? res : (res?.data || []);
      const filtered = list.filter(e => e.examType === 'HALF_YEARLY' || e.examType === 'ANNUAL');
      setHalfYearlyExams(filtered);
      if (filtered.length > 0) setSelectedHalfExam(filtered[0].id.toString());
      else { setSelectedHalfExam(''); setConsolidated(null); }
    } catch (err) { console.error(err); }
  };

  const fetchConsolidated = async (examId) => {
    if (!examId) return;
    try {
      setLoadingConsolidated(true);
      setConsolidatedError('');
      const res = await getConsolidated(examId);
      setConsolidated(res?.exam !== undefined ? res : (res?.data || null));
    } catch (err) {
      setConsolidated(null);
      const status = err?.response?.status;
      setConsolidatedError(status === 403
        ? 'Only class teacher, Admin or Principal can view this consolidated result.'
        : 'Failed to load consolidated results.');
    } finally { setLoadingConsolidated(false); }
  };

  const fetchExamTimetablesList = async (courseId) => {
    try {
      setLoadingTimetables(true);
      const res = await getExamTimetables(courseId || undefined, undefined);
      setExamTimetables(Array.isArray(res) ? res : (res?.data || []));
    } catch (err) { console.error(err); }
    finally { setLoadingTimetables(false); }
  };

  const fetchClassTeacherView = async (courseId) => {
    if (!courseId) return;
    try {
      setLoadingClassView(true);
      const res = await getClassTeacherView(courseId, classViewFilter === 'ALL' ? undefined : classViewFilter);
      setClassView(res?.data || res || null);
    } catch (err) {
      console.error(err);
      setClassView(null);
    } finally { setLoadingClassView(false); }
  };

  useEffect(() => {
    if (activeTab === 'classtview' && selectedCourse) fetchClassTeacherView(selectedCourse);
  }, [classViewFilter]);

  // ── Available subjects ──
  const availableSubjects = useMemo(() => {
    const courseObj = courses.find(c => c.id.toString() === selectedCourse);
    const courseSubs = courseObj?.courseSubjects?.map(s => s.subject) || [];
    return Array.from(new Set([...courseSubs, ...DEFAULT_SUBJECTS]));
  }, [courses, selectedCourse]);

  // ── Filtered exams for register tab ──
  const filteredExams = useMemo(() => {
    if (registerFilter === 'ALL') return exams;
    return exams.filter(e => e.examType === registerFilter);
  }, [exams, registerFilter]);

  // When filter or available exams change, update selectedExam and clear old loaded sheet
  useEffect(() => {
    if (filteredExams.length > 0) {
      if (!filteredExams.some(e => e.id.toString() === selectedExam)) {
        setSelectedExam(filteredExams[0].id.toString());
        setMarksSheet(null);
        setMarksData([]);
      }
    } else {
      setSelectedExam('');
      setMarksSheet(null);
      setMarksData([]);
    }
  }, [filteredExams, registerFilter]);

  // ─── Marks Sheet Loading ───
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
        setMarksData(sheetData.students.map(s => ({
          studentId: s.studentId,
          marksObtained: s.marksObtained !== null && s.marksObtained !== undefined ? s.marksObtained : '',
          grade: s.grade || '',
          remarks: s.remarks || ''
        })));
      }
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: err.response?.data?.error || 'Failed to load marks sheet' });
    } finally { setLoadingSheet(false); }
  };

  const handleMarkChange = (studentId, val) => {
    setMarksData(prev => prev.map(item => {
      if (item.studentId !== studentId) return item;
      const obt = val === '' ? '' : Math.min(Number(val), maxMarks);
      const pct = obt !== '' && maxMarks > 0 ? (Number(obt) / maxMarks) * 100 : 0;
      return { ...item, marksObtained: obt, grade: obt !== '' ? calculateGrade(pct) : '' };
    }));
  };

  const handleRemarkChange = (studentId, val) =>
    setMarksData(prev => prev.map(item => item.studentId === studentId ? { ...item, remarks: val } : item));

  const handleSaveMarks = async () => {
    if (!selectedCourse || !selectedExam || !marksSheet) return;
    const finalSubject = customSubject.trim() || selectedSubject;
    try {
      setSavingMarks(true);
      setFeedbackMsg({ type: '', text: '' });
      const res = await saveMarks({ courseId: selectedCourse, examId: selectedExam, subject: finalSubject, maxMarks: Number(maxMarks) || 100, marksData });
      setFeedbackMsg({ type: 'success', text: res?.message || 'Marks saved successfully!' });
      handleLoadMarksSheet();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.error || 'Failed to save marks.' });
    } finally { setSavingMarks(false); }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!newExamName.trim() || !selectedCourse) return;
    if ((newExamType === 'WEEKLY' || newExamType === 'SURPRISE') && (!newExamSubject.trim() || !newExamMaxMarks)) {
      alert('Weekly/Surprise test requires Subject and Max Marks.');
      return;
    }
    try {
      setCreatingExam(true);
      const payload = { courseId: selectedCourse, examName: newExamName.trim(), term: newExamTerm, academicYear: newExamYear, examDate: newExamDate, examType: newExamType };
      if (newExamSubject.trim()) payload.subject = newExamSubject.trim();
      if (newExamPortion.trim()) payload.portion = newExamPortion.trim();
      if (newExamMaxMarks) payload.maxMarks = Number(newExamMaxMarks);
      const res = await createExam(payload);
      const examObj = res?.id ? res : (res?.data || null);
      setShowCreateModal(false);
      setNewExamName(''); setNewExamSubject(''); setNewExamPortion(''); setNewExamMaxMarks(''); setNewExamType('WEEKLY');
      await fetchExamsForCourse(selectedCourse);
      if (examObj?.id) setSelectedExam(examObj.id.toString());
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create exam');
    } finally { setCreatingExam(false); }
  };

  const openEditModal = (examObj) => {
    if (!examObj) return;
    setEditExamId(examObj.id);
    setEditExamName(examObj.examName || '');
    setEditExamTerm(examObj.term || 'Term 1');
    setEditExamYear(examObj.academicYear || '2026-2027');
    setEditExamDate(examObj.examDate ? new Date(examObj.examDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditExamType(examObj.examType || 'WEEKLY');
    setEditExamSubject(examObj.subject || selectedSubject || '');
    setEditExamPortion(examObj.portion || '');
    setEditExamMaxMarks(examObj.maxMarks !== null && examObj.maxMarks !== undefined ? examObj.maxMarks.toString() : maxMarks.toString());
    setShowEditModal(true);
  };

  const handleUpdateExam = async (e) => {
    e.preventDefault();
    if (!editExamId) return;
    if (!editExamName.trim()) {
      alert('Exam name is required');
      return;
    }
    const parsedMax = parseFloat(editExamMaxMarks);
    if (isNaN(parsedMax) || parsedMax <= 0) {
      alert('Max marks must be a positive number');
      return;
    }

    try {
      setUpdatingExam(true);
      const payload = {
        examName: editExamName.trim(),
        term: editExamTerm,
        academicYear: editExamYear,
        examDate: editExamDate,
        examType: editExamType,
        subject: editExamSubject.trim() || undefined,
        portion: editExamPortion.trim(),
        maxMarks: parsedMax
      };

      const res = await updateExam(editExamId, payload);
      const updated = res?.data || res;

      // Update maxMarks in state
      setMaxMarks(parsedMax);

      // Recalculate marksData grades based on new maxMarks
      setMarksData(prev => prev.map(item => {
        if (item.marksObtained === '' || item.marksObtained === null) return item;
        const obt = Math.min(Number(item.marksObtained), parsedMax);
        const pct = (obt / parsedMax) * 100;
        return { ...item, marksObtained: obt, grade: calculateGrade(pct) };
      }));

      // Update marksSheet if currently loaded
      if (marksSheet && marksSheet.exam?.id === editExamId) {
        setMarksSheet(prev => ({
          ...prev,
          exam: {
            ...prev.exam,
            examName: updated.examName || editExamName.trim(),
            portion: updated.portion !== undefined ? updated.portion : editExamPortion.trim(),
            maxMarks: parsedMax,
            examType: updated.examType || editExamType,
            subject: updated.subject || editExamSubject.trim()
          },
          defaultMaxMarks: parsedMax
        }));
      }

      await fetchExamsForCourse(selectedCourse);

      setShowEditModal(false);
      setFeedbackMsg({
        type: 'success',
        text: `Test updated successfully! Max marks changed to ${parsedMax}.`
      });
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update test');
    } finally {
      setUpdatingExam(false);
    }
  };

  const handleDeleteExamAction = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this test? All marks associated with it will be removed.')) return;
    try {
      setDeletingExamId(examId);
      await deleteExam(examId);
      setShowEditModal(false);
      if (marksSheet && marksSheet.exam?.id === examId) {
        setMarksSheet(null);
        setMarksData([]);
      }
      await fetchExamsForCourse(selectedCourse);
      setFeedbackMsg({ type: 'success', text: 'Test deleted successfully.' });
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete test');
    } finally {
      setDeletingExamId(null);
    }
  };

  const handlePublish = async (published) => {
    if (!selectedHalfExam) return;
    try {
      setPublishingExam(true);
      const res = await publishExam(parseInt(selectedHalfExam), published);
      await fetchConsolidated(selectedHalfExam);
      await fetchHalfYearlyExams(selectedCourse);
      setFeedbackMsg({
        type: 'success',
        text: res?.message || `Exam ${published ? 'published' : 'unpublished'} successfully.`
      });
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 5000);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to update publish status';
      setFeedbackMsg({ type: 'error', text: errMsg });
      alert(errMsg);
    } finally {
      setPublishingExam(false);
    }
  };

  const handleViewScorecard = async (studentId) => {
    try {
      setLoadingScorecard(true);
      const res = await getStudentReportCard(studentId);
      setSelectedStudentScorecard(res?.student ? res : (res?.data || null));
    } catch (err) { alert('Failed to load student scorecard'); }
    finally { setLoadingScorecard(false); }
  };

  // ── Create Exam Timetable ──
  const handleCreateTimetable = async (e) => {
    e.preventDefault();
    if (!ttTitle.trim() || !selectedCourse) return;
    const validItems = ttItems.filter(i => i.subject.trim() && i.examDate);
    if (validItems.length === 0) { alert('Add at least one subject with a date.'); return; }
    try {
      setCreatingTimetable(true);
      await createExamTimetable({ courseId: selectedCourse, examType: ttExamType, title: ttTitle.trim(), academicYear: ttYear, items: validItems });
      setShowTimetableModal(false);
      setTtTitle(''); setTtItems([{ subject: '', examDate: '', startTime: '09:00 AM', endTime: '12:00 PM', maxMarks: '', roomNo: '', instructions: '' }]);
      fetchExamTimetablesList(selectedCourse);
    } catch (err) { alert(err.response?.data?.error || 'Failed to create timetable'); }
    finally { setCreatingTimetable(false); }
  };

  const handlePublishTimetable = async (id, published) => {
    try {
      setPublishingTt(id);
      const res = await publishExamTimetable(id, published);
      setFeedbackMsg({
        type: 'success',
        text: res?.message || `Exam timetable has been ${published ? 'published' : 'unpublished'} successfully.`
      });
      fetchExamTimetablesList(selectedCourse);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to update timetable';
      setFeedbackMsg({ type: 'error', text: errMsg });
      alert(errMsg);
    } finally {
      setPublishingTt(null);
    }
  };

  const handleDeleteTimetable = async (id) => {
    if (!window.confirm('Delete this exam timetable?')) return;
    try {
      await deleteExamTimetable(id);
      fetchExamTimetablesList(selectedCourse);
    } catch (err) { alert('Failed to delete timetable'); }
  };

  // ── PDF: Individual Report Card (Half-Yearly / Annual style) ──
  const handleDownloadReportCardPDF = async (studentId) => {
    try {
      let data = selectedStudentScorecard;
      if (!data || data.student?.id !== studentId) {
        const res = await getStudentReportCard(studentId);
        data = res?.student ? res : (res?.data || null);
        if (!data) { alert('Could not fetch report card data.'); return; }
      }
      const { student, school, exams, subjectRows, attendance, summary } = data;
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.8); doc.rect(8, 8, pageW - 16, pageH - 16);
      doc.setDrawColor(13, 148, 136); doc.setLineWidth(0.3); doc.rect(10, 10, pageW - 20, pageH - 20);
      doc.setFillColor(13, 148, 136); doc.rect(10, 10, pageW - 20, 24, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont(undefined, 'bold');
      doc.text(school.schoolName || 'EAZZIO PUBLIC SCHOOL', pageW / 2, 18, { align: 'center' });
      doc.setFontSize(8); doc.setFont(undefined, 'normal');
      doc.text(`${school.address || 'CBSE Affiliated'} • School Code: ${school.schoolCode || ''}`, pageW / 2, 24, { align: 'center' });
      doc.text(`ACADEMIC PERFORMANCE REPORT CARD • SESSION ${student.academicYear || '2026-2027'}`, pageW / 2, 30, { align: 'center' });
      const cardY = 38;
      doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240); doc.roundedRect(14, cardY, pageW - 28, 28, 2, 2, 'FD');
      doc.setFillColor(13, 148, 136); doc.roundedRect(14, cardY, 3, 28, 1, 1, 'F');
      doc.setTextColor(15, 23, 42); doc.setFontSize(11); doc.setFont(undefined, 'bold');
      doc.text(student.name, 22, cardY + 7);
      doc.setFontSize(8); doc.setFont(undefined, 'normal'); doc.setTextColor(71, 85, 105);
      doc.text(`Roll No: ${student.rollNumber}`, 22, cardY + 13);
      doc.text(`Class: ${student.courseName} - ${student.section}`, 22, cardY + 19);
      doc.text(`Student ID: ${student.studentId}`, 22, cardY + 25);
      doc.text(`Father: ${student.fatherName}`, pageW - 85, cardY + 13);
      doc.text(`Class Teacher: ${student.classTeacher}`, pageW - 85, cardY + 19);
      doc.text(`Attendance: ${attendance.percentage}% (${attendance.presentDays}/${attendance.totalDays} Days)`, pageW - 85, cardY + 25);
      let curY = cardY + 35;
      doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 41, 59);
      doc.text('ACADEMIC PERFORMANCE REPORT', 14, curY);
      const tableHead = ['Subject', ...exams.map(e => e.examName), 'Total', '%', 'Grade'];
      const tableBody = subjectRows.map(sub => {
        const row = [sub.subject];
        exams.forEach(e => { const m = sub.marksByExam[e.id]; row.push(m ? `${m.marksObtained}/${m.maxMarks}` : '—'); });
        row.push(`${sub.totalObtained}/${sub.totalMax}`, `${sub.percentage}%`, sub.grade);
        return row;
      });
      const totRow = ['TOTALS'];
      exams.forEach(e => { let o=0,m=0,h=false; subjectRows.forEach(s => { const mk=s.marksByExam[e.id]; if(mk){o+=mk.marksObtained;m+=mk.maxMarks;h=true;}}); totRow.push(h?`${o}/${m}`:'—'); });
      totRow.push(`${summary.grandObtained}/${summary.grandMax}`, `${summary.overallPercentage}%`, summary.overallGrade);
      tableBody.push(totRow);
      autoTable(doc, { head: [tableHead], body: tableBody, startY: curY + 2, headStyles: { fillColor: [13,148,136], textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center', cellPadding: 2.5 }, bodyStyles: { fontSize: 7, cellPadding: 2.5, textColor: [30,41,59], halign: 'center' }, columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 36 } }, alternateRowStyles: { fillColor: [248,250,252] }, margin: { left: 14, right: 14 }, didParseCell: (d) => { if (d.row.index === tableBody.length-1 && d.section==='body') { d.cell.styles.fillColor=[241,245,249]; d.cell.styles.fontStyle='bold'; } } });
      curY = doc.lastAutoTable.finalY + 8;
      const kpis = [{ label: 'Marks', val: `${summary.grandObtained}/${summary.grandMax}` }, { label: 'Percentage', val: `${summary.overallPercentage}%` }, { label: 'Grade', val: summary.overallGrade }, { label: 'Result', val: summary.resultStatus }];
      const kpiW = (pageW - 28 - 9) / 4;
      kpis.forEach((k, i) => {
        const kx = 14 + i * (kpiW + 3);
        doc.setFillColor(248,250,252); doc.setDrawColor(226,232,240); doc.roundedRect(kx, curY, kpiW, 14, 1.5, 1.5, 'FD');
        doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(13,148,136);
        doc.text(k.val, kx + kpiW/2, curY+6.5, { align: 'center' });
        doc.setFontSize(6.5); doc.setFont(undefined, 'normal'); doc.setTextColor(100,116,139);
        doc.text(k.label, kx + kpiW/2, curY+11.5, { align: 'center' });
      });
      curY += 20;
      doc.setFillColor(254,252,232); doc.setDrawColor(254,240,138); doc.roundedRect(14, curY, pageW-28, 12, 1.5, 1.5, 'FD');
      doc.setFontSize(7); doc.setFont(undefined,'bold'); doc.setTextColor(133,77,14);
      doc.text('Remarks:', 18, curY+5);
      doc.setFont(undefined,'normal'); doc.setTextColor(113,63,18);
      doc.text(summary.remarks || 'Consistent academic performance throughout the session.', 18, curY+9.5);
      const sigY = pageH - 26;
      [{ label: 'Class Teacher', x: 20 }, { label: 'Exam Incharge', x: pageW/2-25 }, { label: 'Principal & Seal', x: pageW-70 }].forEach(s => {
        doc.setDrawColor(203,213,225); doc.line(s.x, sigY, s.x+50, sigY);
        doc.setFontSize(7); doc.setTextColor(100,116,139); doc.text(s.label, s.x+25, sigY+4, { align: 'center' });
      });
      doc.save(`${student.name.replace(/\s+/g,'_')}_Report_Card.pdf`);
    } catch (err) { console.error(err); alert('Failed to generate PDF'); }
  };

  // ── PDF: Monthly Continuous Assessment ──
  const handleDownloadMonthlySummaryPDF = () => {
    if (!monthlySummary) return;
    const doc = new jsPDF('landscape');
    const pageW = doc.internal.pageSize.getWidth();
    const courseObj = courses.find(c => c.id.toString() === selectedCourse);
    doc.setFillColor(13,148,136); doc.rect(0, 0, pageW, 20, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(14); doc.setFont(undefined,'bold');
    doc.text('Monthly Continuous Assessment Report', pageW/2, 10, { align: 'center' });
    doc.setFontSize(8); doc.setFont(undefined,'normal');
    doc.text(`Class: ${courseObj?.courseName || ''} - ${courseObj?.section || ''} | Year: ${monthlyYear} | Total Tests: ${monthlySummary.totalWeeklyTests || 0}`, pageW/2, 17, { align: 'center' });
    let curY = 25;
    monthlySummary.months?.forEach(month => {
      if (month.exams.length === 0) return;
      doc.setFontSize(9); doc.setFont(undefined,'bold'); doc.setTextColor(30,41,59);
      doc.text(month.monthLabel, 14, curY);
      curY += 3;
      const allStudentIds = new Set();
      month.exams.forEach(exam => { exam.results?.forEach(r => allStudentIds.add(r.student?.id)); });
      const head = [
        'Roll',
        'Student Name',
        ...month.exams.map(e => {
          const title = `${e.examName || 'Test'}${e.subject ? ` (${e.subject})` : ''}`;
          const portion = e.portion ? `\n[Portion: ${e.portion}]` : '';
          const max = `\nMax: ${e.maxMarks || '?'}`;
          return `${title}${portion}${max}`;
        }),
        'Total',
        '%'
      ];
      const studentMap = {};
      month.exams.forEach(exam => {
        exam.results?.forEach(r => {
          if (!studentMap[r.student?.id]) { studentMap[r.student?.id] = { name: r.student?.name||'?', roll: r.student?.rollNumber||'?', marks: {} }; }
          studentMap[r.student?.id].marks[exam.id] = { obt: r.marksObtained, max: r.maxMarks };
        });
      });
      const rows = Object.values(studentMap).map(st => {
        let totObt=0, totMax=0;
        const row = [st.roll, st.name];
        month.exams.forEach(exam => {
          const m = st.marks[exam.id];
          if (m) { row.push(`${m.obt}/${m.max}`); totObt+=m.obt; totMax+=m.max; }
          else row.push('—');
        });
        const pct = totMax>0 ? Math.round((totObt/totMax)*100) : 0;
        row.push(`${totObt}/${totMax}`, `${pct}%`);
        return row;
      });
      if (rows.length === 0) { doc.setFontSize(8); doc.setTextColor(100,116,139); doc.text('No marks recorded yet for this month.', 14, curY); curY += 8; return; }
      autoTable(doc, {
        head: [head],
        body: rows,
        startY: curY,
        headStyles: {
          fillColor: [13,148,136],
          textColor: 255,
          fontSize: 6.5,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 2.5
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 2,
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 14 },
          1: { halign: 'left', cellWidth: 38 }
        },
        margin: { left:14, right:14 }
      });
      curY = doc.lastAutoTable.finalY + 4;

      // Dedicated Portion / Syllabus Covered Box in PDF
      const examsWithPortion = month.exams.filter(e => e.portion);
      if (examsWithPortion.length > 0) {
        if (curY + 22 > doc.internal.pageSize.getHeight() - 15) {
          doc.addPage();
          curY = 15;
        }
        const boxH = 6 + (examsWithPortion.length * 4.8);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, curY, pageW - 28, boxH, 1.5, 1.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(14, curY, pageW - 28, boxH, 1.5, 1.5, 'S');

        doc.setFontSize(7.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(13, 148, 136);
        doc.text('TEST PORTIONS / SYLLABUS COVERED:', 18, curY + 4.5);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        examsWithPortion.forEach((e, idx) => {
          doc.text(`• ${e.examName}${e.subject ? ` (${e.subject})` : ''} — Portion: "${e.portion}"   |   Max Marks: ${e.maxMarks || '-'}`, 18, curY + 8.5 + (idx * 4.8));
        });
        curY += boxH + 8;
      } else {
        curY += 8;
      }
    });
    const cName = courseObj?.courseName?.replace(/\s+/g,'_') || 'Class';
    doc.save(`${cName}_Monthly_Assessment_${monthlyYear}.pdf`);
  };

  // ── PDF: Consolidated Term Result ──
  const handleDownloadConsolidatedPDF = () => {
    if (!consolidated) return;
    const { exam, course, subjects, students } = consolidated;
    const doc = new jsPDF('landscape');
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFillColor(13,148,136); doc.rect(0,0,pageW,20,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(13); doc.setFont(undefined,'bold');
    doc.text(`${exam.examName} - Consolidated Result`, pageW/2, 10, { align:'center' });
    doc.setFontSize(8); doc.setFont(undefined,'normal');
    doc.text(`Class: ${course.courseName} - ${course.section} | Academic Year: ${exam.academicYear}`, pageW/2, 17, { align:'center' });
    const head = ['Roll', 'Student', ...subjects.map(s=>s), 'Total', '%', 'Grade'];
    const rows = students.map(s => {
      const row = [s.rollNumber, s.name];
      subjects.forEach(sub => { const m=s.subjectMarks[sub]; row.push(m?`${m.marksObtained}/${m.maxMarks}`:'—'); });
      row.push(`${s.totalObtained}/${s.totalMax}`, `${s.percentage}%`, s.grade);
      return row;
    });
    autoTable(doc, { head:[head], body:rows, startY:24, headStyles:{fillColor:[13,148,136],textColor:255,fontSize:7,fontStyle:'bold',halign:'center',cellPadding:2.5}, bodyStyles:{fontSize:7.5,cellPadding:2.5,halign:'center'}, columnStyles:{1:{halign:'left',cellWidth:40}}, alternateRowStyles:{fillColor:[248,250,252]}, margin:{left:10,right:10} });
    doc.save(`${exam.examName.replace(/\s+/g,'_')}_Consolidated.pdf`);
  };

  // ── PDF: Exam Timetable ──
  const handleDownloadTimetablePDF = (tt) => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFillColor(13,148,136); doc.rect(0,0,pageW,22,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(14); doc.setFont(undefined,'bold');
    doc.text(tt.title, pageW/2, 10, { align:'center' });
    doc.setFontSize(8); doc.setFont(undefined,'normal');
    doc.text(`Class: ${tt.course?.courseName} - ${tt.course?.section} | ${tt.examType} | Year: ${tt.academicYear}`, pageW/2, 18, { align:'center' });
    const head = ['S.No', 'Subject', 'Date', 'Day', 'Start Time', 'End Time', 'Max Marks', 'Room No.', 'Instructions'];
    const rows = tt.items.map((item, i) => {
      const d = new Date(item.examDate);
      return [
        i+1, item.subject,
        d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }),
        d.toLocaleDateString('en-IN', { weekday:'long' }),
        item.startTime, item.endTime,
        item.maxMarks || '—', item.roomNo || '—', item.instructions || '—'
      ];
    });
    autoTable(doc, { head:[head], body:rows, startY:26, headStyles:{fillColor:[13,148,136],textColor:255,fontSize:8,fontStyle:'bold',halign:'center',cellPadding:3}, bodyStyles:{fontSize:8,cellPadding:3,halign:'center'}, columnStyles:{1:{halign:'left',fontStyle:'bold'},8:{halign:'left',cellWidth:40}}, alternateRowStyles:{fillColor:[248,250,252]}, margin:{left:14,right:14} });
    const curY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(7); doc.setTextColor(100,116,139);
    doc.text('Important: Students are required to bring their Admit Card, Stationery, and reach 30 minutes before the exam.', 14, curY);
    const sigY = curY + 15;
    [{ l:'Class Teacher', x:20 }, { l:'Exam Incharge', x: pageW/2-20 }, { l:'Principal & Seal', x: pageW-60 }].forEach(s => {
      doc.setDrawColor(203,213,225); doc.line(s.x, sigY, s.x+40, sigY);
      doc.setFontSize(7); doc.setTextColor(100,116,139); doc.text(s.l, s.x+20, sigY+5, { align:'center' });
    });
    doc.save(`${tt.title.replace(/\s+/g,'_')}_Timetable.pdf`);
  };

  const filteredStudentsForReports = useMemo(() => {
    if (!courseSummary?.students) return [];
    if (!searchQuery.trim()) return courseSummary.students;
    const q = searchQuery.toLowerCase();
    return courseSummary.students.filter(s => s.name.toLowerCase().includes(q) || s.rollNumber.toString().includes(q) || s.studentId?.toLowerCase().includes(q));
  }, [courseSummary, searchQuery]);

  // Subjects this teacher is allowed to see/use for the currently selected course.
  // - Admin / Principal → all subjects assigned to course or standard defaults
  // - Class Teacher → all subjects assigned to this course
  // - Subject Teacher → subjects assigned directly in courseSubjects, in mySubjects, or teacher profile
  const allowedSubjectsForCourse = useMemo(() => {
    const courseIdNum = parseInt(selectedCourse);
    if (!courseIdNum) return [];
    const courseObj = courses.find(c => Number(c.id) === courseIdNum);
    if (!courseObj) return [];

    if (isAdminOrPrincipal || mySubjectsIsAdmin) {
      // Admin/Principal: show all subjects assigned to this course + standard defaults
      const allSubs = courseObj.courseSubjects?.map(cs => cs.subject) || [];
      const defaults = ['Mathematics','Science','English','Hindi','Social Science',
        'Computer Science','General Knowledge','Sanskrit','Physics','Chemistry','Biology'];
      return Array.from(new Set([...allSubs, ...defaults].filter(Boolean)));
    }

    const myTeacherId = Number(user?.userId || user?.id);

    // Check if this teacher is the class teacher of this course
    const isClassTeacher = Number(courseObj.teacherId) === myTeacherId;
    if (isClassTeacher) {
      // Class teacher sees all subjects in their course
      return (courseObj.courseSubjects?.map(cs => cs.subject) || []).filter(Boolean);
    }

    // Subject teacher:
    // 1. Directly from courseObj.courseSubjects (already loaded with the course)
    const fromCourseSubjects = (courseObj.courseSubjects || [])
      .filter(cs => Number(cs.teacherId) === myTeacherId)
      .map(cs => cs.subject);

    // 2. From mySubjects API response for this course
    const fromMySubjects = (mySubjects || [])
      .filter(ms => Number(ms.courseId) === courseIdNum)
      .map(ms => ms.subject);

    // 3. Fallback: match from course subjects if teacher's profile subjects include it
    const profileSubjects = Array.isArray(user?.subjects) ? user.subjects : [];
    const fromProfile = (courseObj.courseSubjects || [])
      .filter(cs => profileSubjects.some(ps => ps.trim().toLowerCase() === cs.subject?.trim().toLowerCase()))
      .map(cs => cs.subject);

    // Combine and deduplicate
    const combined = Array.from(new Set([...fromCourseSubjects, ...fromMySubjects, ...fromProfile].filter(Boolean)));
    return combined;
  }, [selectedCourse, courses, mySubjects, mySubjectsIsAdmin, isAdminOrPrincipal, user]);

  // Auto-select first allowed subject for teacher if not selected or current selection is invalid
  useEffect(() => {
    if (isTeacher && !isAdminOrPrincipal && allowedSubjectsForCourse.length > 0) {
      if (!selectedSubject || !allowedSubjectsForCourse.some(s => s.toLowerCase() === selectedSubject.toLowerCase())) {
        setSelectedSubject(allowedSubjectsForCourse[0]);
      }
    }
  }, [allowedSubjectsForCourse, isTeacher, isAdminOrPrincipal, selectedSubject]);

  // Auto-select subject in Create modal as well
  useEffect(() => {
    if (isTeacher && !isAdminOrPrincipal && allowedSubjectsForCourse.length > 0) {
      if (!newExamSubject || !allowedSubjectsForCourse.some(s => s.toLowerCase() === newExamSubject.toLowerCase())) {
        setNewExamSubject(allowedSubjectsForCourse[0]);
      }
    }
  }, [allowedSubjectsForCourse, isTeacher, isAdminOrPrincipal, newExamSubject, showCreateModal]);

  const filteredTimetables = useMemo(() => {
    if (timetableFilter === 'ALL') return examTimetables;
    return examTimetables.filter(t => t.examType === timetableFilter);
  }, [examTimetables, timetableFilter]);

  if (loadingCourses) return <Loader message="Loading Examinations Suite..." />;

  // ── Tab Config ──
  const tabs = [
    { id: 'register', label: 'Marks Entry Register', icon: <FileText size={16}/> },
    { id: 'monthly', label: 'Monthly Continuous Assessment', icon: <BarChart2 size={16}/> },
    { id: 'term', label: 'Term Results (HY & Annual)', icon: <TrendingUp size={16}/> },
    ...(isAdminOrPrincipal || isTeacher ? [{ id: 'classtview', label: 'Class Teacher View', icon: <Users size={16}/> }] : []),
    ...(isAdminOrPrincipal ? [{ id: 'timetable', label: 'Exam Timetables', icon: <Calendar size={16}/> }] : []),
  ];

  return (
    <div className="flex flex-col gap-5 p-6 bg-gray-50 min-h-screen">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="text-teal-600" size={28} />
            Examinations & Marks Management
          </h2>
          <p className="text-gray-500 text-sm mt-1">Register marks, track continuous assessment, view term results & manage exam timetables.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow transition">
            <Plus size={16} /> New Test / Exam
          </button>
          {isAdminOrPrincipal && (
            <button onClick={() => { setActiveTab('timetable'); setShowTimetableModal(true); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow transition">
              <Calendar size={16} /> Create Exam Schedule
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-teal-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            }`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── Global Course Selector ── */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <GraduationCap size={18} className="text-teal-600" />
          <span className="text-sm font-semibold text-gray-700">Select Class:</span>
        </div>
        <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white min-w-[200px]">
          {courses.map(c => <option key={c.id} value={c.id}>{c.courseName} - {c.section} ({c.academicYear})</option>)}
        </select>
        {courses.length === 0 && <span className="text-sm text-red-500">No classes available. Please set up courses first.</span>}
      </div>

      {/* Global Feedback Banner */}
      {feedbackMsg.text && (
        <div className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm font-medium border shadow-sm ${
          feedbackMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <CheckCircle size={18}/> : <AlertCircle size={18}/>}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg({ type: '', text: '' })} className="text-gray-400 hover:text-gray-600 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: MARKS ENTRY REGISTER                                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'register' && (
        <div className="flex flex-col gap-5">
          {/* Filter + Exam + Subject selector */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <FileText size={15} className="text-teal-600" /> Marks Entry Register
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Exam Type Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Exam Type Filter</label>
                <select value={registerFilter} onChange={e => setRegisterFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white">
                  <option value="ALL">All Types</option>
                  <option value="WEEKLY">Weekly Tests</option>
                  <option value="SURPRISE">Surprise Tests</option>
                  <option value="GENERAL">General</option>
                  <option value="HALF_YEARLY">Half-Yearly</option>
                  <option value="ANNUAL">Annual</option>
                </select>
              </div>
              {/* Exam Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-600">Select Test / Exam</label>
                  {selectedExam && (
                    <button
                      type="button"
                      onClick={() => {
                        const found = exams.find(e => e.id.toString() === selectedExam);
                        if (found) openEditModal(found);
                      }}
                      className="text-xs text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-1 cursor-pointer"
                      title="Edit this test details / max marks"
                    >
                      <Edit3 size={12} /> Edit Test
                    </button>
                  )}
                </div>
                <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white">
                  {filteredExams.length === 0 && <option value="">No exams found</option>}
                  {filteredExams.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.examName}{e.subject ? ` (${e.subject})` : ''} [{EXAM_TYPE_LABELS[e.examType]?.label || e.examType}] - Max: {e.maxMarks || 100}
                    </option>
                  ))}
                </select>
                {filteredExams.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">
                    ⚠️ No {registerFilter === 'ALL' ? '' : (EXAM_TYPE_LABELS[registerFilter]?.label || registerFilter)} exam created for this class yet.
                  </p>
                )}
              </div>
              {/* Subject Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Subject
                  {isTeacher && !isAdminOrPrincipal && allowedSubjectsForCourse.length > 0 && (
                    <span className="ml-2 text-teal-600 font-normal text-xs">(Only your assigned subjects)</span>
                  )}
                </label>
                <select value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setCustomSubject(''); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white">
                  <option value="">Select Subject</option>
                  {allowedSubjectsForCourse.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {isTeacher && !isAdminOrPrincipal && allowedSubjectsForCourse.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">⚠️ No subjects assigned to you for this class. Contact Admin to assign subjects.</p>
                )}
              </div>
              {/* Custom Subject Override — only for Admin/Principal/Class Teacher */}
              {(isAdminOrPrincipal || mySubjectsIsAdmin) && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Or Custom Subject</label>
                <input type="text" value={customSubject} onChange={e => setCustomSubject(e.target.value)} placeholder="e.g. Drawing"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
              </div>
              )}
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Max Marks</label>
                <input type="number" min="1" value={maxMarks} onChange={e => setMaxMarks(Number(e.target.value))}
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
              </div>
              <div className="flex items-end gap-2 flex-1">
                <button onClick={handleLoadMarksSheet} disabled={loadingSheet || !selectedExam || (!selectedSubject && !customSubject)}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-semibold text-sm transition">
                  {loadingSheet ? <RefreshCw size={16} className="animate-spin" /> : <Eye size={16} />}
                  Load Student Register
                </button>
              </div>
            </div>
          </div>

          {/* Feedback */}
          {feedbackMsg.text && (
            <div className={`rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-medium border ${
              feedbackMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {feedbackMsg.type === 'success' ? <CheckCircle size={18}/> : <AlertCircle size={18}/>}
              {feedbackMsg.text}
            </div>
          )}

          {/* Marks Register Table */}
          {marksSheet && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              {/* Register Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-teal-700 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    📋 {marksSheet.exam?.examName || 'Exam'} — {marksSheet.subject}
                  </h3>
                  <p className="text-teal-100 text-xs mt-0.5 flex flex-wrap items-center gap-2">
                    <span>{marksSheet.course?.courseName} - {marksSheet.course?.section}</span>
                    {marksSheet.exam?.portion ? <span>| Portion: {marksSheet.exam.portion}</span> : null}
                    <span>| <span className="bg-white/20 text-white px-2 py-0.5 rounded font-bold">Max Marks: {maxMarks}</span></span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(marksSheet.exam)}
                    className="flex items-center gap-1.5 bg-white text-teal-800 hover:bg-teal-50 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    <Edit3 size={14} /> Edit Test / Max Marks
                  </button>
                  {marksSheet.exam?.examType && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${EXAM_TYPE_LABELS[marksSheet.exam.examType]?.color || 'bg-gray-100 text-gray-700'}`}>
                      {EXAM_TYPE_LABELS[marksSheet.exam.examType]?.icon} {EXAM_TYPE_LABELS[marksSheet.exam.examType]?.label}
                    </span>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wide w-16">#</th>
                      <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wide w-20">Roll No</th>
                      <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Student Name</th>
                      <th className="py-3 px-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wide w-32">Marks Obtained <span className="text-gray-400 font-normal">/ {maxMarks}</span></th>
                      <th className="py-3 px-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wide w-24">Grade</th>
                      <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marksSheet.students?.map((student, idx) => {
                      const entry = marksData.find(d => d.studentId === student.studentId) || {};
                      const pct = entry.marksObtained !== '' && entry.marksObtained !== undefined && maxMarks > 0
                        ? (Number(entry.marksObtained) / maxMarks) * 100 : null;
                      return (
                        <tr key={student.studentId} className={`border-b border-gray-100 transition-colors ${student.isRecorded ? 'bg-emerald-50/30' : 'hover:bg-gray-50'}`}>
                          <td className="py-3 px-4 text-sm text-gray-500">{idx + 1}</td>
                          <td className="py-3 px-4 text-sm font-semibold text-gray-700">{student.rollNumber}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-gray-800">{student.name}</span>
                              {student.isRecorded && <CheckCircle size={14} className="text-emerald-500 shrink-0" />}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <input
                                type="number" min="0" max={maxMarks} step="0.5"
                                value={entry.marksObtained !== undefined ? entry.marksObtained : ''}
                                onChange={e => handleMarkChange(student.studentId, e.target.value)}
                                className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold"
                                placeholder="—"
                              />
                              {pct !== null && (
                                <span className="text-xs text-gray-400">{Math.round(pct)}%</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {entry.grade ? <GradeBadge grade={entry.grade} small /> : <span className="text-gray-300 text-sm">—</span>}
                          </td>
                          <td className="py-3 px-4">
                            <input type="text" value={entry.remarks || ''}
                              onChange={e => handleRemarkChange(student.studentId, e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none text-gray-600"
                              placeholder="Optional remark..." />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
                <div className="text-sm text-gray-500">
                  {marksData.filter(d => d.marksObtained !== '' && d.marksObtained !== undefined).length} of {marksSheet.students?.length || 0} marks filled
                </div>
                <button onClick={handleSaveMarks} disabled={savingMarks}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow transition">
                  {savingMarks ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  Save All Marks
                </button>
              </div>
            </div>
          )}

          {/* Guidance card when no register is loaded */}
          {!marksSheet && (
            <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center text-center shadow-sm">
              <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-3">
                <FileText size={28} />
              </div>
              <h4 className="text-base font-bold text-gray-800">
                {filteredExams.length === 0
                  ? `No ${registerFilter === 'ALL' ? '' : (EXAM_TYPE_LABELS[registerFilter]?.label || registerFilter)} Exam Found`
                  : 'Ready to Enter Marks'}
              </h4>
              <p className="text-sm text-gray-500 max-w-md mt-1">
                {filteredExams.length === 0
                  ? (registerFilter === 'HALF_YEARLY' || registerFilter === 'ANNUAL'
                      ? `Please create the ${EXAM_TYPE_LABELS[registerFilter]?.label || registerFilter} exam first (Admin/Principal/Class Teacher). Once created, select your assigned subject to enter marks.`
                      : `No tests found matching the selected filter. Click "New Test / Exam" to create one.`)
                  : 'Select an exam, your assigned subject, and click "Load Student Register" to view and enter marks.'}
              </p>
              {filteredExams.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (registerFilter !== 'ALL') setNewExamType(registerFilter);
                    setShowCreateModal(true);
                  }}
                  className="mt-4 flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow transition"
                >
                  <Plus size={14} /> Create {registerFilter === 'ALL' ? 'New Test / Exam' : (EXAM_TYPE_LABELS[registerFilter]?.label || registerFilter)}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: MONTHLY CONTINUOUS ASSESSMENT                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'monthly' && (
        <div className="flex flex-col gap-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <BarChart2 size={15} className="text-teal-600" /> Monthly Continuous Assessment (Weekly & Surprise Tests)
            </h3>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Academic Year</label>
                <input type="number" value={monthlyYear} onChange={e => setMonthlyYear(e.target.value)} min="2020" max="2099"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none w-28" />
              </div>
              <button onClick={() => fetchMonthlySummary(selectedCourse)}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition">
                <RefreshCw size={15}/> Refresh
              </button>
              {monthlySummary && monthlySummary.months?.length > 0 && (
                <button onClick={handleDownloadMonthlySummaryPDF}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition ml-auto">
                  <Download size={15}/> Download Register PDF
                </button>
              )}
            </div>
          </div>

          {loadingMonthly ? <Loader message="Loading monthly summary..." /> : (
            !monthlySummary || monthlySummary.months?.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-16 flex flex-col items-center text-center">
                <BarChart2 className="text-gray-200 mb-4" size={56} />
                <h3 className="text-lg font-bold text-gray-700">No Continuous Assessment Tests Found</h3>
                <p className="text-gray-500 text-sm mt-2">No Weekly or Surprise tests have been created for this class in {monthlyYear}.</p>
                <button onClick={() => setShowCreateModal(true)}
                  className="mt-4 flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition">
                  <Plus size={15}/> Create Weekly Test
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Summary Banner */}
                <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-5 flex items-center justify-between text-white">
                  <div>
                    <p className="font-bold text-lg">{monthlySummary.course?.courseName} - {monthlySummary.course?.section}</p>
                    <p className="text-teal-100 text-sm mt-1">
                      Total tests in {monthlyYear}: <strong>{monthlySummary.totalWeeklyTests}</strong> across <strong>{monthlySummary.months?.length}</strong> month(s)
                    </p>
                  </div>
                  <BarChart2 size={40} className="text-teal-300 opacity-70" />
                </div>

                {/* Month Sections */}
                {monthlySummary.months?.map(month => (
                  <div key={month.monthKey} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Calendar size={18} className="text-teal-600" /> {month.monthLabel}
                      </h3>
                      <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full">
                        {month.count} test{month.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-100">
                            <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase text-left">Date</th>
                            <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase text-left">Test Name</th>
                            <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase text-left">Subject</th>
                            <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase text-left">Type</th>
                            <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase text-left">Portion</th>
                            <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase text-right">Max Marks</th>
                            <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase text-center">Status</th>
                            <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase text-center">Students Marks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {month.exams.map(exam => (
                            <React.Fragment key={exam.id}>
                              <tr className="border-b border-gray-50 hover:bg-teal-50/20 transition-colors">
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {exam.examDate ? new Date(exam.examDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                </td>
                                <td className="py-3 px-4 text-sm font-semibold text-gray-800">{exam.examName || '—'}</td>
                                <td className="py-3 px-4 text-sm text-gray-700">{exam.subject || '—'}</td>
                                <td className="py-3 px-4">
                                  {exam.examType && (
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${EXAM_TYPE_LABELS[exam.examType]?.color || 'bg-gray-100 text-gray-600'}`}>
                                      {EXAM_TYPE_LABELS[exam.examType]?.icon} {EXAM_TYPE_LABELS[exam.examType]?.label || exam.examType}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {exam.portion ? (
                                    <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1 max-w-[240px] truncate" title={exam.portion}>
                                      📖 {exam.portion}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic text-xs">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm font-bold text-gray-800 text-right">{exam.maxMarks || '—'}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${exam.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {exam.published ? '✓ Published' : '⏳ Draft'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    {exam.results && exam.results.length > 0 ? (
                                      <button onClick={() => setExpandedExamId(expandedExamId === exam.id ? null : exam.id)}
                                        className="flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 font-semibold bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition">
                                        {expandedExamId === exam.id ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                                        {exam.results.length} results
                                      </button>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic">No marks yet</span>
                                    )}
                                    <button onClick={() => openEditModal(exam)}
                                      title="Edit Test Details, Max Marks & Portion"
                                      className="text-xs text-teal-600 hover:text-teal-800 font-semibold bg-teal-50 hover:bg-teal-100 p-1.5 rounded-lg transition cursor-pointer">
                                      <Edit3 size={13}/>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {expandedExamId === exam.id && exam.results && exam.results.length > 0 && (
                                <tr>
                                  <td colSpan={8} className="bg-teal-50/50 px-6 py-4">
                                    {exam.portion && (
                                      <div className="mb-3 bg-white border border-teal-200 rounded-lg px-4 py-2.5 flex items-center justify-between text-xs shadow-sm">
                                        <span className="text-teal-900 font-semibold flex items-center gap-1.5">
                                          📖 <strong>Portion / Syllabus Tested:</strong> {exam.portion}
                                        </span>
                                        <span className="text-gray-600 font-bold bg-teal-50 px-2.5 py-0.5 rounded">Max Marks: {exam.maxMarks}</span>
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                      {exam.results.map(r => {
                                        const pct = r.maxMarks > 0 ? (r.marksObtained / r.maxMarks) * 100 : 0;
                                        return (
                                          <div key={r.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-center shadow-sm">
                                            <p className="text-xs font-semibold text-gray-700 truncate">{r.student?.name || 'Student'}</p>
                                            <p className="text-sm font-bold text-teal-700 mt-0.5">{r.marksObtained}/{r.maxMarks}</p>
                                            <p className="text-xs text-gray-500">{Math.round(pct)}%</p>
                                            {r.grade && <GradeBadge grade={r.grade} small />}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: TERM RESULTS (HALF-YEARLY / ANNUAL)                            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'term' && (
        <div className="flex flex-col gap-5">
          {/* Sub-view toggle */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-orange-600" /> Term Examination Results (Half-Yearly & Annual)
            </h3>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setTermView('consolidated')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${termView === 'consolidated' ? 'bg-orange-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                📊 Consolidated Class Result
              </button>
              <button onClick={() => setTermView('individual')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${termView === 'individual' ? 'bg-orange-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                👤 Individual Student Report Cards
              </button>
            </div>

            {/* Select Exam */}
            {halfYearlyExams.length === 0 ? (
              <div className="flex items-center gap-3 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
                <AlertCircle size={18}/> No Half-Yearly or Annual exams found for this class. Create one using the &quot;New Test / Exam&quot; button.
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Select Term Exam</label>
                  <select value={selectedHalfExam} onChange={e => setSelectedHalfExam(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white min-w-[250px]">
                    {halfYearlyExams.map(e => (
                      <option key={e.id} value={e.id}>{e.examName} [{EXAM_TYPE_LABELS[e.examType]?.label}] {e.published ? '✓ Published' : '(Draft)'}</option>
                    ))}
                  </select>
                </div>
                {isAdminOrPrincipal && selectedHalfExam && consolidated && (
                  <div className="flex items-end gap-2">
                    <button onClick={() => handlePublish(!consolidated.exam?.published)} disabled={publishingExam}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition ${consolidated.exam?.published ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                      {publishingExam ? <RefreshCw size={15} className="animate-spin"/> : (consolidated.exam?.published ? <Lock size={15}/> : <Globe size={15}/>)}
                      {consolidated.exam?.published ? 'Unpublish' : 'Publish Result'}
                    </button>
                    <button onClick={handleDownloadConsolidatedPDF}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition">
                      <Download size={15}/> Download PDF
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Consolidated Result View ── */}
          {termView === 'consolidated' && (
            <>
              {loadingConsolidated ? <Loader message="Loading consolidated results..." /> :
                consolidatedError ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-8 flex flex-col items-center text-center">
                    <AlertCircle className="text-red-400 mb-3" size={40} />
                    <p className="text-red-700 font-semibold">{consolidatedError}</p>
                  </div>
                ) : !consolidated ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center text-center">
                    <TrendingUp className="text-gray-200 mb-4" size={56} />
                    <h3 className="text-lg font-bold text-gray-700">No Term Exam Selected</h3>
                    <p className="text-gray-500 text-sm mt-2">Select a Half-Yearly or Annual exam to view consolidated results.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-bold text-base">📊 {consolidated.exam?.examName}</h3>
                        <p className="text-orange-100 text-xs mt-0.5">{consolidated.course?.courseName} - {consolidated.course?.section} | {consolidated.exam?.academicYear}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${consolidated.exam?.published ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'}`}>
                          {consolidated.exam?.published ? '✓ Published' : '⏳ Draft'}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[800px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Roll</th>
                            <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Student Name</th>
                            {consolidated.subjects?.map(sub => (
                              <th key={sub} className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center">{sub}</th>
                            ))}
                            <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center">Total</th>
                            <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center">%</th>
                            <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {consolidated.students?.map((student, i) => (
                            <tr key={student.studentId} className={`border-b border-gray-100 hover:bg-orange-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                              <td className="py-3 px-4 text-sm font-semibold text-gray-600">{student.rollNumber}</td>
                              <td className="py-3 px-4 text-sm font-semibold text-gray-800">{student.name}</td>
                              {consolidated.subjects?.map(sub => {
                                const m = student.subjectMarks?.[sub];
                                return (
                                  <td key={sub} className="py-3 px-4 text-sm text-center">
                                    {m ? (
                                      <span className="font-medium">{m.marksObtained}<span className="text-gray-400 text-xs">/{m.maxMarks}</span></span>
                                    ) : <span className="text-gray-300">—</span>}
                                  </td>
                                );
                              })}
                              <td className="py-3 px-4 text-sm font-bold text-gray-800 text-center">{student.totalObtained}/{student.totalMax}</td>
                              <td className="py-3 px-4 text-sm font-semibold text-center">{student.percentage}%</td>
                              <td className="py-3 px-4 text-center"><GradeBadge grade={student.grade} small /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              }
            </>
          )}

          {/* ── Individual Student Report Cards ── */}
          {termView === 'individual' && (
            <>
              {loadingSummary ? <Loader message="Loading student records..." /> : !courseSummary ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center text-center">
                  <Users className="text-gray-200 mb-4" size={56} />
                  <p className="text-gray-500">No academic data available for this class.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Search */}
                  <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
                    <Search size={16} className="text-gray-400" />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search student by name, roll number, or ID..."
                      className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400" />
                  </div>
                  {/* Student Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredStudentsForReports.map(student => (
                      <div key={student.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-base shrink-0">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{student.name}</p>
                            <p className="text-xs text-gray-500">Roll: {student.rollNumber} • ID: {student.studentId}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                            <p className="text-xs text-gray-500">Marks</p>
                            <p className="text-sm font-bold text-gray-800">{student.totalObtained}/{student.totalMax}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                            <p className="text-xs text-gray-500">Percent</p>
                            <p className="text-sm font-bold text-teal-700">{student.percentage}%</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                            <p className="text-xs text-gray-500">Grade</p>
                            <GradeBadge grade={student.grade} small />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleViewScorecard(student.id)}
                            className="flex-1 flex items-center justify-center gap-1 bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold text-xs py-2 rounded-lg transition">
                            <Eye size={13}/> View Report
                          </button>
                          <button onClick={() => handleDownloadReportCardPDF(student.id)}
                            className="flex-1 flex items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs py-2 rounded-lg transition">
                            <Download size={13}/> Download PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Scorecard Modal */}
          {selectedStudentScorecard && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-8 overflow-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
                <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-5 rounded-t-2xl flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold text-lg">📋 Academic Report Card</h3>
                    <p className="text-teal-100 text-sm">{selectedStudentScorecard.student?.name} — {selectedStudentScorecard.student?.courseName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDownloadReportCardPDF(selectedStudentScorecard.student?.id)}
                      className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-semibold transition">
                      <Download size={15}/> PDF
                    </button>
                    <button onClick={() => setSelectedStudentScorecard(null)} className="text-teal-200 hover:text-white transition">
                      <X size={22}/>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  {/* Student Info */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { l: 'Student ID', v: selectedStudentScorecard.student?.studentId },
                      { l: 'Roll No', v: selectedStudentScorecard.student?.rollNumber },
                      { l: "Father's Name", v: selectedStudentScorecard.student?.fatherName },
                      { l: 'Class', v: `${selectedStudentScorecard.student?.courseName} - ${selectedStudentScorecard.student?.section}` },
                      { l: 'Attendance', v: `${selectedStudentScorecard.attendance?.percentage}% (${selectedStudentScorecard.attendance?.presentDays}/${selectedStudentScorecard.attendance?.totalDays})` },
                      { l: 'Class Teacher', v: selectedStudentScorecard.student?.classTeacher }
                    ].map((item, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl px-4 py-3">
                        <p className="text-xs text-gray-500 mb-0.5">{item.l}</p>
                        <p className="text-sm font-semibold text-gray-800">{item.v || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                  {/* Subject Table */}
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left">
                      <thead className="bg-teal-600 text-white">
                        <tr>
                          <th className="py-2.5 px-4 text-xs font-bold uppercase">Subject</th>
                          {selectedStudentScorecard.exams?.map(e => (
                            <th key={e.id} className="py-2.5 px-3 text-xs font-bold uppercase text-center">{e.examName}</th>
                          ))}
                          <th className="py-2.5 px-4 text-xs font-bold uppercase text-center">Total</th>
                          <th className="py-2.5 px-4 text-xs font-bold uppercase text-center">%</th>
                          <th className="py-2.5 px-4 text-xs font-bold uppercase text-center">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStudentScorecard.subjectRows?.map((sub, i) => (
                          <tr key={sub.subject} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="py-2.5 px-4 text-sm font-semibold text-gray-700">{sub.subject}</td>
                            {selectedStudentScorecard.exams?.map(e => {
                              const m = sub.marksByExam?.[e.id];
                              return <td key={e.id} className="py-2.5 px-3 text-sm text-center">{m ? `${m.marksObtained}/${m.maxMarks}` : '—'}</td>;
                            })}
                            <td className="py-2.5 px-4 text-sm font-bold text-center">{sub.totalObtained}/{sub.totalMax}</td>
                            <td className="py-2.5 px-4 text-sm text-center">{sub.percentage}%</td>
                            <td className="py-2.5 px-4 text-center"><GradeBadge grade={sub.grade} small /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Summary */}
                  {selectedStudentScorecard.summary && (
                    <div className="mt-5 grid grid-cols-4 gap-3">
                      {[
                        { l: 'Total Marks', v: `${selectedStudentScorecard.summary.grandObtained}/${selectedStudentScorecard.summary.grandMax}`, c: 'text-gray-800' },
                        { l: 'Percentage', v: `${selectedStudentScorecard.summary.overallPercentage}%`, c: 'text-teal-700' },
                        { l: 'Overall Grade', v: selectedStudentScorecard.summary.overallGrade, c: 'text-indigo-700' },
                        { l: 'Result', v: selectedStudentScorecard.summary.resultStatus, c: selectedStudentScorecard.summary.resultStatus === 'PASSED' ? 'text-emerald-700' : 'text-red-700' }
                      ].map((k, i) => (
                        <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center">
                          <p className={`text-lg font-black ${k.c}`}>{k.v}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{k.l}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: CLASS TEACHER VIEW                                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'classtview' && (
        <div className="flex flex-col gap-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Users size={15} className="text-indigo-600" /> Class Teacher — All Subjects Marks View
              <span className="ml-2 text-xs font-normal text-gray-400 normal-case">(Authority: Class Teacher, Admin, Principal)</span>
            </h3>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Filter by Exam Type</label>
                <select value={classViewFilter} onChange={e => setClassViewFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
                  <option value="ALL">All Exams</option>
                  <option value="WEEKLY,SURPRISE">Weekly & Surprise Tests only</option>
                  <option value="HALF_YEARLY,ANNUAL">Half-Yearly & Annual only</option>
                </select>
              </div>
              <button onClick={() => fetchClassTeacherView(selectedCourse)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                <RefreshCw size={15}/> Refresh
              </button>
            </div>
          </div>

          {loadingClassView ? <Loader message="Loading class overview..." /> :
            !classView ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-8 flex flex-col items-center text-center">
                <AlertCircle className="text-red-400 mb-3" size={40}/>
                <p className="text-red-700 font-semibold">Access denied or no data available. Only the assigned class teacher can view this.</p>
              </div>
            ) : classView.students?.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center text-center">
                <Users className="text-gray-200 mb-4" size={56}/>
                <p className="text-gray-500">No students found in this class, or no marks have been recorded yet.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold">{classView.course?.courseName} - {classView.course?.section}</h3>
                    <p className="text-indigo-200 text-xs mt-0.5">
                      Class Teacher: {classView.course?.classTeacher?.name || 'N/A'} | {classView.students?.length} Students | {classView.subjects?.length} Subjects
                    </p>
                  </div>
                  <div className="text-indigo-200 text-xs">
                    <p>{classView.course?.academicYear}</p>
                  </div>
                </div>
                {/* Subject Teachers Info */}
                {classView.courseSubjects?.length > 0 && (
                  <div className="px-6 py-3 border-b border-gray-100 bg-indigo-50/40 flex flex-wrap gap-3">
                    {classView.courseSubjects.map(cs => (
                      <div key={cs.id} className="flex items-center gap-1.5 bg-white border border-indigo-100 px-3 py-1.5 rounded-full text-xs">
                        <BookOpen size={11} className="text-indigo-500"/>
                        <span className="font-semibold text-indigo-800">{cs.subject}</span>
                        <span className="text-gray-400">—</span>
                        <span className="text-gray-600">{cs.teacher?.name || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Search */}
                <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3">
                  <Search size={15} className="text-gray-400"/>
                  <input type="text" value={classViewSearch} onChange={e => setClassViewSearch(e.target.value)}
                    placeholder="Search student..." className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"/>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">Roll</th>
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase sticky left-12 bg-gray-50 z-10">Student Name</th>
                        {classView.subjects?.map(sub => (
                          <th key={sub} className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center">{sub}</th>
                        ))}
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center">Total %</th>
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classView.students
                        ?.filter(s => !classViewSearch.trim() || s.name.toLowerCase().includes(classViewSearch.toLowerCase()) || (s.rollNumber || '').includes(classViewSearch))
                        .map((student, i) => (
                          <tr key={student.id} className={`border-b border-gray-100 hover:bg-indigo-50/20 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                            <td className="py-3 px-4 text-sm font-semibold text-gray-600 sticky left-0 bg-white z-10">{student.rollNumber}</td>
                            <td className="py-3 px-4 sticky left-12 bg-white z-10">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                                  {student.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">{student.name}</p>
                                  <p className="text-xs text-gray-400">{student.fatherName}</p>
                                </div>
                              </div>
                            </td>
                            {classView.subjects?.map(sub => {
                              const subData = student.bySubject?.[sub];
                              return (
                                <td key={sub} className="py-3 px-4 text-center">
                                  {subData && subData.totalMax > 0 ? (
                                    <div className="text-center">
                                      <p className="text-sm font-bold text-gray-800">{subData.totalObtained}<span className="text-gray-400 font-normal text-xs">/{subData.totalMax}</span></p>
                                      <p className="text-xs text-gray-500">{subData.percentage}%</p>
                                      <GradeBadge grade={subData.grade} small />
                                    </div>
                                  ) : <span className="text-gray-300 text-sm">—</span>}
                                </td>
                              );
                            })}
                            <td className="py-3 px-4 text-center">
                              <p className="text-sm font-bold text-indigo-700">{student.percentage}%</p>
                              <p className="text-xs text-gray-400">{student.totalObtained}/{student.totalMax}</p>
                            </td>
                            <td className="py-3 px-4 text-center"><GradeBadge grade={student.grade} /></td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          }
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: EXAM TIMETABLES (Admin / Principal)                            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'timetable' && isAdminOrPrincipal && (
        <div className="flex flex-col gap-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <Calendar size={15} className="text-indigo-600" /> Exam Schedule Management (Half-Yearly & Annual)
              </h3>
              <div className="flex items-center gap-3">
                <div>
                  <select value={timetableFilter} onChange={e => setTimetableFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
                    <option value="ALL">All Types</option>
                    <option value="HALF_YEARLY">Half-Yearly</option>
                    <option value="ANNUAL">Annual</option>
                  </select>
                </div>
                <button onClick={() => setShowTimetableModal(true)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow transition">
                  <Plus size={15}/> Create Exam Schedule
                </button>
              </div>
            </div>
          </div>

          {loadingTimetables ? <Loader message="Loading exam timetables..." /> : filteredTimetables.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-14 flex flex-col items-center text-center">
              <Calendar className="text-gray-200 mb-4" size={56}/>
              <h3 className="text-lg font-bold text-gray-700">No Exam Timetables Created</h3>
              <p className="text-gray-500 text-sm mt-2">Create Half-Yearly or Annual Exam schedules for your classes.</p>
              <button onClick={() => setShowTimetableModal(true)}
                className="mt-4 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition">
                <Plus size={15}/> Create Exam Schedule
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredTimetables.map(tt => (
                <div key={tt.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <Calendar size={20} className="text-indigo-600"/>
                      <div>
                        <h3 className="font-bold text-gray-800">{tt.title}</h3>
                        <p className="text-xs text-gray-500">
                          {tt.course?.courseName} - {tt.course?.section} | {EXAM_TYPE_LABELS[tt.examType]?.label} | {tt.academicYear}
                          {tt.published && tt.publishedAt && ` | Published: ${new Date(tt.publishedAt).toLocaleDateString('en-IN')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${tt.published ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {tt.published ? '✓ Published' : '⏳ Draft'}
                      </span>
                      <button onClick={() => handleDownloadTimetablePDF(tt)}
                        className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition">
                        <Download size={13}/> PDF
                      </button>
                      {(isAdmin || isAdminOrPrincipal) && (
                        <button onClick={() => handlePublishTimetable(tt.id, !tt.published)} disabled={publishingTt === tt.id}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${tt.published ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'}`}>
                          {publishingTt === tt.id ? <RefreshCw size={13} className="animate-spin"/> : (tt.published ? <Lock size={13}/> : <Send size={13}/>)}
                          {tt.published ? 'Unpublish' : 'Publish'}
                        </button>
                      )}
                      <button onClick={() => handleDeleteTimetable(tt.id)}
                        className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition">
                        <Trash2 size={13}/> Delete
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="py-2.5 px-4 text-xs font-bold text-gray-500 uppercase">#</th>
                          <th className="py-2.5 px-4 text-xs font-bold text-gray-500 uppercase">Subject</th>
                          <th className="py-2.5 px-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                          <th className="py-2.5 px-4 text-xs font-bold text-gray-500 uppercase">Day</th>
                          <th className="py-2.5 px-4 text-xs font-bold text-gray-500 uppercase text-center">Time</th>
                          <th className="py-2.5 px-4 text-xs font-bold text-gray-500 uppercase text-center">Max Marks</th>
                          <th className="py-2.5 px-4 text-xs font-bold text-gray-500 uppercase text-center">Room</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tt.items?.map((item, i) => {
                          const d = new Date(item.examDate);
                          return (
                            <tr key={item.id} className={`border-b border-gray-100 hover:bg-indigo-50/20 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                              <td className="py-2.5 px-4 text-sm text-gray-500">{i+1}</td>
                              <td className="py-2.5 px-4 text-sm font-semibold text-gray-800">{item.subject}</td>
                              <td className="py-2.5 px-4 text-sm text-gray-700">{d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</td>
                              <td className="py-2.5 px-4 text-sm text-gray-600">{d.toLocaleDateString('en-IN', { weekday:'long' })}</td>
                              <td className="py-2.5 px-4 text-sm text-center text-gray-600">{item.startTime} — {item.endTime}</td>
                              <td className="py-2.5 px-4 text-sm font-bold text-center text-gray-800">{item.maxMarks || '—'}</td>
                              <td className="py-2.5 px-4 text-sm text-center text-gray-600">{item.roomNo || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Create Exam / Test                                              */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Plus size={20} className="text-teal-600"/> Create New Test / Exam</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-700"><X size={22}/></button>
            </div>
            <form onSubmit={handleCreateExam} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Exam Type *</label>
                  <select value={newExamType} onChange={e => setNewExamType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white">
                    {isAdminOrPrincipal && <option value="GENERAL">General</option>}
                    <option value="WEEKLY">⚡ Weekly Test</option>
                    <option value="SURPRISE">🎯 Surprise Test</option>
                    {isAdminOrPrincipal && <option value="HALF_YEARLY">📅 Half-Yearly Exam</option>}
                    {isAdminOrPrincipal && <option value="ANNUAL">🏆 Annual Exam</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Exam / Test Name *</label>
                  <input type="text" value={newExamName} onChange={e => setNewExamName(e.target.value)} required placeholder="e.g. Weekly Test 3"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
              </div>
              {(newExamType === 'WEEKLY' || newExamType === 'SURPRISE') && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Subject *
                        {isTeacher && !isAdminOrPrincipal && (
                          <span className="ml-2 text-teal-600 font-normal text-xs">(Your assigned subjects only)</span>
                        )}
                      </label>
                      <select value={newExamSubject} onChange={e => setNewExamSubject(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white">
                        <option value="">Select Subject</option>
                        {allowedSubjectsForCourse.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {isTeacher && !isAdminOrPrincipal && allowedSubjectsForCourse.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">⚠️ No subjects assigned. Ask Admin to assign subjects in Courses.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Max Marks *</label>
                      <input type="number" value={newExamMaxMarks} onChange={e => setNewExamMaxMarks(e.target.value)} min="1" placeholder="e.g. 20"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Portion / Syllabus Covered</label>
                    <input type="text" value={newExamPortion} onChange={e => setNewExamPortion(e.target.value)} placeholder="e.g. Chapter 1-3"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                  </div>
                </>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Term</label>
                  <select value={newExamTerm} onChange={e => setNewExamTerm(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white">
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Academic Year</label>
                  <input type="text" value={newExamYear} onChange={e => setNewExamYear(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
                  <input type="date" value={newExamDate} onChange={e => setNewExamDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 font-semibold transition">Cancel</button>
                <button type="submit" disabled={creatingExam}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold text-sm shadow transition">
                  {creatingExam ? <RefreshCw size={15} className="animate-spin"/> : <Plus size={15}/>} Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Edit Exam / Test Details                                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Edit3 size={20} className="text-teal-600"/> Edit Test Details & Max Marks
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-700">
                <X size={22}/>
              </button>
            </div>
            <form onSubmit={handleUpdateExam} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Test Name *</label>
                  <input
                    type="text"
                    value={editExamName}
                    onChange={e => setEditExamName(e.target.value)}
                    required
                    placeholder="e.g. Science PTI"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Test Type *</label>
                  <select
                    value={editExamType}
                    onChange={e => setEditExamType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                  >
                    <option value="WEEKLY">Weekly Test</option>
                    <option value="SURPRISE">Surprise Test</option>
                    <option value="GENERAL">General Assessment</option>
                    {isAdminOrPrincipal && <option value="HALF_YEARLY">Half-Yearly</option>}
                    {isAdminOrPrincipal && <option value="ANNUAL">Annual / Final</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
                  <select
                    value={editExamSubject}
                    onChange={e => setEditExamSubject(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                  >
                    <option value="">Select Subject</option>
                    {allowedSubjectsForCourse.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-teal-700 mb-1">
                    Total / Max Marks * <span className="text-xs font-normal text-gray-500">(e.g. 25)</span>
                  </label>
                  <input
                    type="number"
                    value={editExamMaxMarks}
                    onChange={e => setEditExamMaxMarks(e.target.value)}
                    min="1"
                    required
                    placeholder="e.g. 25"
                    className="w-full border-2 border-teal-500 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-teal-50/30"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Change from 20 to 25 or any desired marks</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Portion / Syllabus Covered</label>
                <input
                  type="text"
                  value={editExamPortion}
                  onChange={e => setEditExamPortion(e.target.value)}
                  placeholder="e.g. LIGHT (3.1,3.2)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Term</label>
                  <select
                    value={editExamTerm}
                    onChange={e => setEditExamTerm(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={editExamYear}
                    onChange={e => setEditExamYear(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Exam Date</label>
                  <input
                    type="date"
                    value={editExamDate}
                    onChange={e => setEditExamDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteExamAction(editExamId)}
                  disabled={deletingExamId === editExamId}
                  className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1.5 rounded hover:bg-red-50 transition cursor-pointer"
                >
                  <Trash2 size={14}/> Delete Test
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingExam}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold text-sm shadow transition"
                  >
                    {updatingExam ? <RefreshCw size={15} className="animate-spin"/> : <Save size={15}/>} Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Create Exam Timetable                                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showTimetableModal && isAdminOrPrincipal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-8 overflow-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Calendar size={20} className="text-indigo-600"/> Create Exam Schedule</h3>
              <button onClick={() => setShowTimetableModal(false)} className="text-gray-400 hover:text-gray-700"><X size={22}/></button>
            </div>
            <form onSubmit={handleCreateTimetable} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Timetable Title *</label>
                  <input type="text" value={ttTitle} onChange={e => setTtTitle(e.target.value)} required placeholder="e.g. Half-Yearly Examination Schedule 2026"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Exam Type *</label>
                  <select value={ttExamType} onChange={e => setTtExamType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
                    <option value="HALF_YEARLY">Half-Yearly</option>
                    <option value="ANNUAL">Annual / Final</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Academic Year</label>
                <input type="text" value={ttYear} onChange={e => setTtYear(e.target.value)}
                  className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              {/* Subjects (dynamic rows) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600">Subjects Schedule *</label>
                  <button type="button"
                    onClick={() => setTtItems(prev => [...prev, { subject: '', examDate: '', startTime: '09:00 AM', endTime: '12:00 PM', maxMarks: '', roomNo: '', instructions: '' }])}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
                    <Plus size={13}/> Add Subject
                  </button>
                </div>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                  {ttItems.map((item, i) => (
                    <div key={i} className="grid grid-cols-6 gap-2 items-center bg-gray-50 rounded-xl px-3 py-2.5">
                      <div className="col-span-1">
                        <input type="text" value={item.subject} onChange={e => setTtItems(prev => prev.map((it, idx) => idx === i ? { ...it, subject: e.target.value } : it))}
                          placeholder="Subject" required
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                      </div>
                      <div className="col-span-1">
                        <input type="date" value={item.examDate} onChange={e => setTtItems(prev => prev.map((it, idx) => idx === i ? { ...it, examDate: e.target.value } : it))}
                          required className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                      </div>
                      <div>
                        <input type="text" value={item.startTime} onChange={e => setTtItems(prev => prev.map((it, idx) => idx === i ? { ...it, startTime: e.target.value } : it))}
                          placeholder="Start" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                      </div>
                      <div>
                        <input type="text" value={item.endTime} onChange={e => setTtItems(prev => prev.map((it, idx) => idx === i ? { ...it, endTime: e.target.value } : it))}
                          placeholder="End" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                      </div>
                      <div>
                        <input type="number" value={item.maxMarks} onChange={e => setTtItems(prev => prev.map((it, idx) => idx === i ? { ...it, maxMarks: e.target.value } : it))}
                          placeholder="Max Marks" min="1"
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                      </div>
                      <div className="flex items-center gap-1">
                        <input type="text" value={item.roomNo} onChange={e => setTtItems(prev => prev.map((it, idx) => idx === i ? { ...it, roomNo: e.target.value } : it))}
                          placeholder="Room" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                        {ttItems.length > 1 && (
                          <button type="button" onClick={() => setTtItems(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                            <X size={15}/>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Columns: Subject | Date | Start Time | End Time | Max Marks | Room No</p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowTimetableModal(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 font-semibold transition">Cancel</button>
                <button type="submit" disabled={creatingTimetable}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold text-sm shadow transition">
                  {creatingTimetable ? <RefreshCw size={15} className="animate-spin"/> : <Calendar size={15}/>} Create Timetable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
