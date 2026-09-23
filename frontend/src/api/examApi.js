import api from './axios';

export const getExamCourses = async () => {
  const res = await api.get('/exams/courses');
  return res.data;
};

export const getMySubjects = async () => {
  const res = await api.get('/exams/my-subjects');
  return res.data;
};

export const getExamsList = async (courseId) => {
  const url = courseId ? `/exams/list?courseId=${courseId}` : '/exams/list';
  const res = await api.get(url);
  return res.data;
};

export const createExam = async (payload) => {
  const res = await api.post('/exams/create', payload);
  return res.data;
};

export const updateExam = async (id, payload) => {
  const res = await api.put(`/exams/${id}`, payload);
  return res.data;
};

export const deleteExam = async (id) => {
  const res = await api.delete(`/exams/${id}`);
  return res.data;
};

export const getMarksSheet = async (courseId, examId, subject) => {
  const res = await api.get(`/exams/marks-sheet?courseId=${courseId}&examId=${examId}&subject=${encodeURIComponent(subject)}`);
  return res.data;
};

export const saveMarks = async (payload) => {
  const res = await api.post('/exams/save-marks', payload);
  return res.data;
};

export const getCourseAcademicSummary = async (courseId) => {
  const res = await api.get(`/exams/course-academic-summary?courseId=${courseId}`);
  return res.data;
};

export const getStudentReportCard = async (studentId) => {
  const res = await api.get(`/exams/student-report-card/${studentId}`);
  return res.data;
};

export const getMonthlySummary = async (courseId, year) => {
  const url = year
    ? `/exams/monthly-summary?courseId=${courseId}&year=${year}`
    : `/exams/monthly-summary?courseId=${courseId}`;
  const res = await api.get(url);
  return res.data;
};

export const getConsolidated = async (examId) => {
  const res = await api.get(`/exams/consolidated/${examId}`);
  return res.data;
};

export const publishExam = async (examId, published) => {
  const res = await api.patch(`/exams/${examId}/publish`, { published });
  return res.data;
};

// ── Exam Timetable API ──────────────────────────────────────────────────────

export const createExamTimetable = async (payload) => {
  const res = await api.post('/exams/timetable/create', payload);
  return res.data;
};

export const getExamTimetables = async (courseId, examType) => {
  const params = new URLSearchParams();
  if (courseId) params.append('courseId', courseId);
  if (examType) params.append('examType', examType);
  const res = await api.get(`/exams/timetable/list?${params.toString()}`);
  return res.data;
};

export const publishExamTimetable = async (id, published) => {
  const res = await api.patch(`/exams/timetable/${id}/publish`, { published });
  return res.data;
};

export const deleteExamTimetable = async (id) => {
  const res = await api.delete(`/exams/timetable/${id}`);
  return res.data;
};

// ── Class Teacher Full View ─────────────────────────────────────────────────

export const getClassTeacherView = async (courseId, examType) => {
  const params = new URLSearchParams({ courseId });
  if (examType) params.append('examType', examType);
  const res = await api.get(`/exams/class-teacher-view?${params.toString()}`);
  return res.data;
};
