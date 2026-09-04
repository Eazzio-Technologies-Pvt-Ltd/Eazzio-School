import api from './axios';

export const getExamCourses = async () => {
  const res = await api.get('/exams/courses');
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
