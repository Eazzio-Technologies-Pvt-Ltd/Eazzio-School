import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Helper to calculate standard CBSE grade
function calculateGrade(percentage) {
  if (percentage >= 91) return 'A1';
  if (percentage >= 81) return 'A2';
  if (percentage >= 71) return 'B1';
  if (percentage >= 61) return 'B2';
  if (percentage >= 51) return 'C1';
  if (percentage >= 41) return 'C2';
  if (percentage >= 33) return 'D';
  return 'E'; // Needs Improvement
}

// Helper to verify if user has authority to grade/create exams for a given course & subject
async function canGrade(user, courseId, subject) {
  if (!user) return false;

  // Admin & Principal can do everything
  if (user.role === 'ADMIN' || user.role === 'PRINCIPAL') return true;

  if (user.role === 'TEACHER') {
    if (!courseId) return false;

    // Check 1: Is the teacher the CLASS TEACHER of this course?
    // Class teachers can create/grade for ANY subject in their class.
    const course = await prisma.course.findFirst({
      where: { id: parseInt(courseId), schoolId: user.schoolId }
    });
    if (course && course.teacherId === user.userId) return true;

    // Check 2: Is the teacher a SUBJECT TEACHER assigned to THIS EXACT SUBJECT in this course?
    if (!subject) return false;
    const subClean = subject.trim();
    const cs = await prisma.courseSubject.findFirst({
      where: {
        courseId: parseInt(courseId),
        teacherId: user.userId,
        course: { schoolId: user.schoolId },
        subject: { equals: subClean, mode: 'insensitive' }
      }
    });
    if (cs) return true;

    // Check 3: Check Teacher.subjects profile as fallback
    const teacher = await prisma.teacher.findUnique({
      where: { id: user.userId },
      select: { subjects: true }
    });
    if (teacher?.subjects?.some(s => s.trim().toLowerCase() === subClean.toLowerCase())) {
      return true;
    }

    return false;
  }

  return false;
}


// Valid exam types
const VALID_EXAM_TYPES = ['GENERAL', 'WEEKLY', 'SURPRISE', 'HALF_YEARLY', 'ANNUAL'];

// 1. GET /api/exams/courses - List courses for current school
router.get('/courses', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user.userId;
    const role = req.user.role;

    const courses = await prisma.course.findMany({
      where: { schoolId },
      include: {
        teacher: { select: { id: true, name: true } },
        courseSubjects: { select: { id: true, subject: true, teacherId: true } },
        _count: { select: { students: true, exams: true } }
      },
      orderBy: [{ courseName: 'asc' }, { section: 'asc' }]
    });

    // For subject teachers: include courses where they teach at least one subject OR are the class teacher OR match teacher profile subjects
    let filtered = courses;
    if (role === 'TEACHER') {
      const teacherInfo = await prisma.teacher.findUnique({
        where: { id: userId },
        select: { subjects: true }
      });
      const tSubs = (teacherInfo?.subjects || []).map(s => s.toLowerCase());

      filtered = courses.filter(c =>
        c.teacherId === userId || // class teacher
        c.courseSubjects.some(cs => cs.teacherId === userId) || // subject teacher in this course
        (tSubs.length > 0 && c.courseSubjects.some(cs => tSubs.includes(cs.subject.toLowerCase()))) // matching teacher profile subjects
      );
    }

    return res.json({ success: true, data: filtered });
  } catch (err) {
    console.error('Error fetching courses for exams:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch courses' });
  }
});

// 1b. GET /api/exams/my-subjects - Get subjects assigned to the logged-in teacher per course
router.get('/my-subjects', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user.userId;
    const role = req.user.role;

    if (role === 'ADMIN' || role === 'PRINCIPAL') {
      // Admin/Principal — return all subjects for all courses
      const allSubjects = await prisma.courseSubject.findMany({
        where: { course: { schoolId } },
        select: { courseId: true, subject: true }
      });
      return res.json({ success: true, data: allSubjects, isAdmin: true });
    }

    // Teacher — return only their assigned subjects per course
    const mySubjects = await prisma.courseSubject.findMany({
      where: { teacherId: userId, course: { schoolId } },
      select: { courseId: true, subject: true }
    });

    // Also include ALL subjects for courses where they are the class teacher
    const classTeacherCourses = await prisma.course.findMany({
      where: { teacherId: userId, schoolId },
      include: { courseSubjects: { select: { courseId: true, subject: true } } }
    });
    const classTeacherSubjects = classTeacherCourses.flatMap(c => c.courseSubjects);

    // Also include subjects from Teacher.subjects profile matching courseSubjects in this school
    const teacherRec = await prisma.teacher.findUnique({
      where: { id: userId },
      select: { subjects: true }
    });
    let profileSubjects = [];
    if (teacherRec && Array.isArray(teacherRec.subjects) && teacherRec.subjects.length > 0) {
      const allSchoolCourseSubjects = await prisma.courseSubject.findMany({
        where: { course: { schoolId } },
        select: { courseId: true, subject: true }
      });
      profileSubjects = allSchoolCourseSubjects.filter(cs =>
        teacherRec.subjects.some(ts => ts.trim().toLowerCase() === cs.subject.trim().toLowerCase())
      );
    }

    // Merge and deduplicate
    const combined = [...mySubjects, ...classTeacherSubjects, ...profileSubjects];
    const unique = combined.filter((item, index, self) =>
      index === self.findIndex(s => s.courseId === item.courseId && s.subject.toLowerCase() === item.subject.toLowerCase())
    );

    return res.json({ success: true, data: unique, isAdmin: false });
  } catch (err) {
    console.error('Error fetching teacher subjects:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
  }
});

router.get('/list', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId } = req.query;

    const where = { schoolId };
    if (courseId) {
      const cId = parseInt(courseId);
      if (isNaN(cId)) {
        return res.status(400).json({ success: false, error: 'Invalid courseId' });
      }
      const course = await prisma.course.findFirst({
        where: { id: cId, schoolId }
      });
      if (!course) {
        return res.status(404).json({ success: false, error: 'Course not found in your school' });
      }
      where.courseId = cId;
    }

    const exams = await prisma.exam.findMany({
      where,
      include: {
        course: { select: { id: true, courseName: true, section: true, academicYear: true } },
        _count: { select: { results: true } }
      },
      orderBy: [{ createdAt: 'desc' }]
    });

    return res.json({ success: true, data: exams });
  } catch (err) {
    console.error('Error fetching exams:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch exams' });
  }
});

// 3. POST /api/exams/create - Create an Exam (upgraded with examType support)
router.post('/create', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId, examName, term, academicYear, examDate, subject, maxMarks, examType, portion } = req.body;

    if (!courseId || !examName || !term) {
      return res.status(400).json({ success: false, error: 'Course, Exam Name, and Term are required' });
    }

    const cId = parseInt(courseId);
    if (isNaN(cId)) {
      return res.status(400).json({ success: false, error: 'Valid courseId is required' });
    }

    // Validate examType
    const resolvedExamType = examType ? examType.toUpperCase() : 'GENERAL';
    if (!VALID_EXAM_TYPES.includes(resolvedExamType)) {
      return res.status(400).json({ success: false, error: `examType must be one of: ${VALID_EXAM_TYPES.join(', ')}` });
    }

    // HALF_YEARLY / ANNUAL: ADMIN, PRINCIPAL, or CLASS TEACHER of this course allowed
    if ((resolvedExamType === 'HALF_YEARLY' || resolvedExamType === 'ANNUAL') && req.user.role === 'TEACHER') {
      const isClassTeacher = await prisma.course.findFirst({
        where: { id: cId, teacherId: req.user.userId, schoolId }
      });
      if (!isClassTeacher) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Only Admin, Principal, or the Class Teacher of this class can create Half-Yearly or Annual exams'
        });
      }
    }

    // WEEKLY / SURPRISE: subject, portion, maxMarks required
    if (resolvedExamType === 'WEEKLY' || resolvedExamType === 'SURPRISE') {
      if (!subject || maxMarks === undefined || maxMarks === null || maxMarks === '') {
        return res.status(400).json({
          success: false,
          error: 'Weekly/Surprise tests require subject and maxMarks'
        });
      }
    }

    // Resolve course to verify schoolId
    const course = await prisma.course.findFirst({
      where: { id: cId, schoolId }
    });

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found in your school' });
    }

    // Validate examDate if provided
    let parsedExamDate = new Date();
    if (examDate) {
      const d = new Date(examDate);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid exam date format' });
      }
      parsedExamDate = d;
    }

    // Validate maxMarks if passed
    let parsedMaxMarks = null;
    if (maxMarks !== undefined && maxMarks !== null && maxMarks !== '') {
      parsedMaxMarks = parseFloat(maxMarks);
      if (isNaN(parsedMaxMarks) || parsedMaxMarks <= 0) {
        return res.status(400).json({ success: false, error: 'Max marks must be a positive number' });
      }
    }

    // Authority check using canGrade
    if (subject && (resolvedExamType === 'WEEKLY' || resolvedExamType === 'SURPRISE')) {
      const allowed = await canGrade(req.user, cId, subject);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You are not authorized to create exams for this course and subject'
        });
      }
    } else if (req.user.role === 'TEACHER' && resolvedExamType === 'GENERAL') {
      // For GENERAL exams: class teacher can create for any subject, subject teacher only for their subject
      const isClassTeacher = course && course.teacherId === req.user.userId;
      if (!isClassTeacher) {
        if (subject) {
          const allowed = await canGrade(req.user, cId, subject);
          if (!allowed) {
            return res.status(403).json({
              success: false,
              error: 'Forbidden: You are not authorized to create exams for this course and subject'
            });
          }
        } else {
          const teachesAny = await prisma.courseSubject.findFirst({
            where: { courseId: cId, teacherId: req.user.userId, course: { schoolId } }
          });
          if (!teachesAny) {
            return res.status(403).json({
              success: false,
              error: 'Forbidden: You are not assigned to teach any subject in this course'
            });
          }
        }
      }
    }

    // HALF_YEARLY / ANNUAL: published = false on creation
    const publishedDefault = (resolvedExamType === 'HALF_YEARLY' || resolvedExamType === 'ANNUAL') ? false : true;

    const exam = await prisma.exam.create({
      data: {
        schoolId,
        courseId: cId,
        examName: examName.trim(),
        term: term.trim(),
        academicYear: (academicYear || course.academicYear || '2026-2027').trim(),
        examDate: parsedExamDate,
        examType: resolvedExamType,
        subject: subject ? subject.trim() : null,
        portion: portion ? portion.trim() : null,
        maxMarks: parsedMaxMarks,
        createdByTeacherId: req.user.role === 'TEACHER' ? req.user.userId : null,
        published: publishedDefault
      },
      include: {
        course: { select: { courseName: true, section: true } }
      }
    });

    return res.json({ success: true, data: exam, message: 'Exam created successfully' });
  } catch (err) {
    console.error('Error creating exam:', err);
    return res.status(500).json({ success: false, error: 'Failed to create exam' });
  }
});

// ─── STATIC ROUTES — must come BEFORE /:id param routes ───────────────────

// 4. GET /api/exams/monthly-summary?courseId=&year= - WEEKLY tests grouped by month
router.get('/monthly-summary', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId, year } = req.query;

    if (!courseId) {
      return res.status(400).json({ success: false, error: 'courseId is required' });
    }

    const cId = parseInt(courseId);
    if (isNaN(cId)) {
      return res.status(400).json({ success: false, error: 'Invalid courseId' });
    }

    const course = await prisma.course.findFirst({ where: { id: cId, schoolId } });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found in your school' });
    }

    // Date range filter: match examDate within year OR fallback to createdAt if examDate is null
    let dateFilter = {};
    if (year) {
      const y = parseInt(year);
      if (!isNaN(y)) {
        const start = new Date(`${y}-01-01T00:00:00.000Z`);
        const end = new Date(`${y + 1}-01-01T00:00:00.000Z`);
        dateFilter = {
          OR: [
            { examDate: { gte: start, lt: end } },
            { examDate: null, createdAt: { gte: start, lt: end } }
          ]
        };
      }
    }

    // TEACHER filtering:
    // If teacher is class teacher OR created the exam OR teaches subjects in this course
    let subjectFilter = {};
    if (req.user.role === 'TEACHER') {
      const isClassTeacher = course.teacherId === req.user.userId;
      if (!isClassTeacher) {
        const mySubjects = await prisma.courseSubject.findMany({
          where: { courseId: cId, teacherId: req.user.userId, course: { schoolId } },
          select: { subject: true }
        });
        const subNames = mySubjects.map(s => s.subject).filter(Boolean);
        if (subNames.length > 0) {
          subjectFilter = {
            OR: [
              { subject: { in: subNames } },
              { createdByTeacherId: req.user.userId },
              { subject: null }
            ]
          };
        } else {
          // If not assigned specific subjects in CourseSubject, allow exams created by this teacher
          subjectFilter = {
            createdByTeacherId: req.user.userId
          };
        }
      }
    }

    const weeklyExams = await prisma.exam.findMany({
      where: { schoolId, courseId: cId, examType: { notIn: ['HALF_YEARLY', 'ANNUAL'] }, ...dateFilter, ...subjectFilter },
      select: {
        id: true,
        examName: true,
        subject: true,
        portion: true,
        maxMarks: true,
        examDate: true,
        createdAt: true,
        published: true,
        results: {
          select: {
            id: true,
            studentId: true,
            marksObtained: true,
            maxMarks: true,
            grade: true,
            remarks: true,
            student: {
              select: {
                id: true,
                name: true,
                rollNumber: true,
                studentId: true
              }
            }
          }
        }
      },
      orderBy: [{ examDate: 'asc' }, { createdAt: 'asc' }]
    });

    const monthNames = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
    const byMonth = {};

    weeklyExams.forEach(exam => {
      const d = exam.examDate ? new Date(exam.examDate) : exam.createdAt ? new Date(exam.createdAt) : new Date();
      const monthKey = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'unknown';
      const monthLabel = d ? `${monthNames[d.getMonth()]} ${d.getFullYear()}` : 'Unknown';
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { monthKey, monthLabel, count: 0, exams: [] };
      }
      byMonth[monthKey].count += 1;
      byMonth[monthKey].exams.push(exam);
    });

    return res.json({
      success: true,
      data: {
        course: { id: course.id, courseName: course.courseName, section: course.section },
        totalWeeklyTests: weeklyExams.length,
        months: Object.values(byMonth).sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      }
    });
  } catch (err) {
    console.error('Error fetching monthly summary:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch monthly summary' });
  }
});

// 5. GET /api/exams/course-academic-summary - All students in a course across all exams
router.get('/course-academic-summary', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ success: false, error: 'courseId is required' });
    }

    const cId = parseInt(courseId);
    if (isNaN(cId)) {
      return res.status(400).json({ success: false, error: 'Invalid courseId' });
    }

    const [course, students, exams, allResults, attendanceRecords] = await Promise.all([
      prisma.course.findFirst({
        where: { id: cId, schoolId },
        include: { teacher: { select: { name: true } } }
      }),
      prisma.student.findMany({
        where: { courseId: cId, schoolId },
        orderBy: [{ rollNumber: 'asc' }, { name: 'asc' }]
      }),
      prisma.exam.findMany({
        where: { courseId: cId, schoolId },
        orderBy: [{ examDate: 'asc' }, { createdAt: 'asc' }]
      }),
      prisma.result.findMany({
        where: { courseId: cId, schoolId },
        include: { exam: true }
      }),
      prisma.attendance.findMany({
        where: { courseId: cId, schoolId }
      })
    ]);

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found in your school' });
    }

    const attMap = new Map();
    attendanceRecords.forEach(a => {
      if (!attMap.has(a.studentId)) attMap.set(a.studentId, { present: 0, total: 0 });
      const cur = attMap.get(a.studentId);
      cur.total += 1;
      if (a.status === 'PRESENT') cur.present += 1;
    });

    const studentResultsMap = new Map();
    allResults.forEach(r => {
      if (!studentResultsMap.has(r.studentId)) studentResultsMap.set(r.studentId, []);
      studentResultsMap.get(r.studentId).push(r);
    });

    const subjectSet = new Set();
    allResults.forEach(r => subjectSet.add(r.subject));
    const allSubjects = Array.from(subjectSet).sort();

    const studentSummaries = students.map(student => {
      const results = studentResultsMap.get(student.id) || [];
      const totalObtained = results.reduce((acc, r) => acc + r.marksObtained, 0);
      const totalMax = results.reduce((acc, r) => acc + r.maxMarks, 0);
      const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0;
      const grade = calculateGrade(percentage);

      const att = attMap.get(student.id) || { present: 0, total: 0 };
      const attPct = att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;

      const examTotals = {};
      exams.forEach(e => {
        const examResults = results.filter(r => r.examId === e.id);
        const eObt = examResults.reduce((acc, r) => acc + r.marksObtained, 0);
        const eMax = examResults.reduce((acc, r) => acc + r.maxMarks, 0);
        examTotals[e.id] = {
          examName: e.examName,
          obtained: eObt,
          max: eMax,
          percentage: eMax > 0 ? Math.round((eObt / eMax) * 1000) / 10 : 0,
          subjectsCount: examResults.length
        };
      });

      return {
        id: student.id,
        studentId: student.studentId,
        name: student.name,
        rollNumber: student.rollNumber || 'N/A',
        fatherName: student.fatherName || 'N/A',
        totalObtained,
        totalMax,
        percentage,
        grade,
        examCount: Object.values(examTotals).filter(e => e.subjectsCount > 0).length,
        attendancePercentage: attPct,
        examTotals,
        rawResults: results
      };
    });

    return res.json({
      success: true,
      data: { course, exams, subjects: allSubjects, students: studentSummaries }
    });
  } catch (err) {
    console.error('Error fetching course academic summary:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch course academic summary' });
  }
});

// 6. GET /api/exams/marks-sheet - Fetch students roster with existing marks for a course, exam, and subject
router.get('/marks-sheet', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId, examId, subject } = req.query;

    if (!courseId || !examId || !subject) {
      return res.status(400).json({ success: false, error: 'courseId, examId, and subject are required' });
    }

    const cId = parseInt(courseId);
    const eId = parseInt(examId);

    if (isNaN(cId) || isNaN(eId)) {
      return res.status(400).json({ success: false, error: 'Valid courseId and examId are required' });
    }

    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      return res.status(400).json({ success: false, error: 'Valid subject is required' });
    }

    // Authority check via canGrade
    const allowed = await canGrade(req.user, cId, trimmedSubject);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not authorized to view or grade this subject in this course'
      });
    }

    const [course, exam, students, existingResults] = await Promise.all([
      prisma.course.findFirst({ where: { id: cId, schoolId } }),
      prisma.exam.findFirst({ where: { id: eId, schoolId } }),
      prisma.student.findMany({
        where: { courseId: cId, schoolId },
        orderBy: [{ rollNumber: 'asc' }, { name: 'asc' }],
        select: { id: true, studentId: true, name: true, rollNumber: true }
      }),
      prisma.result.findMany({
        where: { schoolId, examId: eId, subject: { equals: trimmedSubject, mode: 'insensitive' } }
      })
    ]);

    if (!course || !exam) {
      return res.status(404).json({ success: false, error: 'Course or Exam not found in your school' });
    }

    if (exam.courseId !== cId) {
      return res.status(400).json({ success: false, error: 'Exam does not belong to the specified course' });
    }

    const resultMap = new Map();
    existingResults.forEach(r => resultMap.set(r.studentId, r));

    // Use exam.maxMarks first, then fallback to existing results, then 100
    const defaultMaxMarks = exam.maxMarks
      ? exam.maxMarks
      : (existingResults.length > 0 ? existingResults[0].maxMarks : 100);

    const studentRows = students.map(s => {
      const res = resultMap.get(s.id);
      return {
        studentId: s.id,
        rollNumber: s.rollNumber || 'N/A',
        name: s.name,
        marksObtained: res ? res.marksObtained : '',
        maxMarks: res ? res.maxMarks : defaultMaxMarks,
        grade: res ? res.grade : '',
        remarks: res ? res.remarks || '' : '',
        isRecorded: !!res
      };
    });

    return res.json({
      success: true,
      data: {
        course,
        // Full exam details including new fields — for frontend display
        exam: {
          id: exam.id,
          examName: exam.examName,
          term: exam.term,
          academicYear: exam.academicYear,
          examDate: exam.examDate,
          examType: exam.examType,
          subject: exam.subject,
          portion: exam.portion,
          maxMarks: exam.maxMarks,
          published: exam.published
        },
        subject: trimmedSubject,
        defaultMaxMarks,
        students: studentRows
      }
    });
  } catch (err) {
    console.error('Error fetching marks sheet:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch marks sheet' });
  }
});

// 7. POST /api/exams/save-marks - Bulk upsert marks
router.post('/save-marks', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId, examId, subject, maxMarks, marksData } = req.body;

    if (!courseId || !examId || !subject || !marksData || !Array.isArray(marksData)) {
      return res.status(400).json({ success: false, error: 'Invalid payload. Course, Exam, Subject, and Marks data are required.' });
    }

    const cId = parseInt(courseId);
    const eId = parseInt(examId);
    if (isNaN(cId) || isNaN(eId)) {
      return res.status(400).json({ success: false, error: 'Valid courseId and examId are required' });
    }

    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      return res.status(400).json({ success: false, error: 'Valid subject is required' });
    }

    // Verify course & exam exist in this school
    const [course, exam] = await Promise.all([
      prisma.course.findFirst({ where: { id: cId, schoolId } }),
      prisma.exam.findFirst({ where: { id: eId, schoolId } })
    ]);

    if (!course || !exam) {
      return res.status(404).json({ success: false, error: 'Course or Exam not found in your school' });
    }

    if (exam.courseId !== cId) {
      return res.status(400).json({ success: false, error: 'Exam does not belong to the specified course' });
    }

    // Authority check via canGrade
    const allowed = await canGrade(req.user, cId, trimmedSubject);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not authorized to save marks for this course and subject'
      });
    }

    // Use request body maxMarks if provided and valid, otherwise fall back to exam's maxMarks
    let parsedMaxMarks = null;
    if (maxMarks !== undefined && maxMarks !== null && maxMarks !== '') {
      parsedMaxMarks = parseFloat(maxMarks);
    } else if (exam.maxMarks) {
      parsedMaxMarks = parseFloat(exam.maxMarks);
    }

    if (!parsedMaxMarks || isNaN(parsedMaxMarks) || parsedMaxMarks <= 0) {
      return res.status(400).json({ success: false, error: 'Max marks must be a positive number (set it on the exam or pass it in the request)' });
    }

    // If maxMarks in request is different from exam.maxMarks, update exam.maxMarks
    if (exam.maxMarks !== parsedMaxMarks) {
      await prisma.exam.update({
        where: { id: eId },
        data: { maxMarks: parsedMaxMarks }
      });
    }

    // Validate marks entries
    const validItems = [];
    for (const item of marksData) {
      if (!item || item.studentId === undefined || item.studentId === null) continue;

      const sId = parseInt(item.studentId);
      if (isNaN(sId)) {
        return res.status(400).json({ success: false, error: 'Invalid student ID in marks data' });
      }

      // Preserve existing behaviour: skip blank/null marks
      if (item.marksObtained === '' || item.marksObtained === null || item.marksObtained === undefined) {
        continue;
      }

      const obt = parseFloat(item.marksObtained);
      if (isNaN(obt)) {
        return res.status(400).json({ success: false, error: `Marks obtained for student ID ${sId} must be a valid number` });
      }

      // Enforce 0..maxMarks range
      if (obt < 0 || obt > parsedMaxMarks) {
        return res.status(400).json({
          success: false,
          error: `Marks obtained (${obt}) for student ID ${sId} must be between 0 and ${parsedMaxMarks}`
        });
      }

      validItems.push({
        studentId: sId,
        marksObtained: obt,
        grade: item.grade ? item.grade.trim() : null,
        remarks: item.remarks ? item.remarks.trim() : null
      });
    }

    if (validItems.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid marks provided to save.' });
    }

    // Verify all students belong to this course & school
    const studentIds = validItems.map(v => v.studentId);
    const studentsInClass = await prisma.student.count({
      where: { id: { in: studentIds }, courseId: cId, schoolId }
    });

    if (studentsInClass !== studentIds.length) {
      return res.status(400).json({ success: false, error: 'One or more students do not belong to this class or school' });
    }

    const operations = validItems.map(item => {
      const marksObt = item.marksObtained;
      const pct = parsedMaxMarks > 0 ? (marksObt / parsedMaxMarks) * 100 : 0;
      const autoGrade = calculateGrade(pct);
      const grade = item.grade || autoGrade;

      return prisma.result.upsert({
        where: {
          studentId_examId_subject: {
            studentId: item.studentId,
            examId: eId,
            subject: trimmedSubject
          }
        },
        update: {
          marksObtained: marksObt,
          maxMarks: parsedMaxMarks,
          grade,
          remarks: item.remarks,
          courseId: cId
        },
        create: {
          schoolId,
          studentId: item.studentId,
          examId: eId,
          courseId: cId,
          subject: trimmedSubject,
          marksObtained: marksObt,
          maxMarks: parsedMaxMarks,
          grade,
          remarks: item.remarks
        }
      });
    });

    await prisma.$transaction(operations);

    return res.json({
      success: true,
      message: `Successfully recorded marks for ${operations.length} student(s) in ${trimmedSubject}.`
    });
  } catch (err) {
    console.error('Error saving marks:', err);
    return res.status(500).json({ success: false, error: 'Failed to save marks' });
  }
});

// 8. GET /api/exams/student-report-card/:studentId - Comprehensive Individual Report Card
router.get('/student-report-card/:studentId', authenticateJWT, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const studentId = parseInt(req.params.studentId);

    if (isNaN(studentId)) {
      return res.status(400).json({ success: false, error: 'Invalid student ID' });
    }

    // Authorization: STUDENT can only access own report card
    if (req.user.role === 'STUDENT' && req.user.userId !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are only allowed to view your own report card'
      });
    }

    const [student, school, allResults, attendanceRecords] = await Promise.all([
      prisma.student.findFirst({
        where: { id: studentId, schoolId },
        include: { course: { include: { teacher: { select: { name: true } } } } }
      }),
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { schoolName: true, schoolCode: true, email: true, phone: true, address: true, logo: true }
      }),
      prisma.result.findMany({
        where: { studentId, schoolId },
        include: { exam: true },
        orderBy: [{ exam: { examDate: 'asc' } }, { exam: { createdAt: 'asc' } }]
      }),
      prisma.attendance.findMany({ where: { studentId, schoolId } })
    ]);

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found in your school' });
    }

    // Students must only see published exams
    const results = req.user.role === 'STUDENT'
      ? allResults.filter(r => r.exam && (!('published' in r.exam) || r.exam.published !== false))
      : allResults;

    const totalAttDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(a => a.status === 'PRESENT').length;
    const attendancePercentage = totalAttDays > 0 ? Math.round((presentDays / totalAttDays) * 100) : 0;

    const examMap = new Map();
    results.forEach(r => { if (!examMap.has(r.examId)) examMap.set(r.examId, r.exam); });
    const exams = Array.from(examMap.values());

    const subjectMap = new Map();
    results.forEach(r => {
      if (!subjectMap.has(r.subject)) subjectMap.set(r.subject, {});
      subjectMap.get(r.subject)[r.examId] = {
        marksObtained: r.marksObtained,
        maxMarks: r.maxMarks,
        grade: r.grade,
        remarks: r.remarks
      };
    });

    let grandObtained = 0;
    let grandMax = 0;

    const subjectRows = Array.from(subjectMap.entries()).map(([subName, examMarks]) => {
      let subObtained = 0;
      let subMax = 0;
      const marksByExam = {};
      exams.forEach(e => {
        const mark = examMarks[e.id];
        if (mark) {
          subObtained += mark.marksObtained;
          subMax += mark.maxMarks;
          marksByExam[e.id] = mark;
        } else {
          marksByExam[e.id] = null;
        }
      });
      grandObtained += subObtained;
      grandMax += subMax;
      const subPct = subMax > 0 ? Math.round((subObtained / subMax) * 1000) / 10 : 0;
      return { subject: subName, marksByExam, totalObtained: subObtained, totalMax: subMax, percentage: subPct, grade: calculateGrade(subPct) };
    });

    const overallPercentage = grandMax > 0 ? Math.round((grandObtained / grandMax) * 1000) / 10 : 0;
    const overallGrade = calculateGrade(overallPercentage);

    return res.json({
      success: true,
      data: {
        school,
        student: {
          id: student.id,
          studentId: student.studentId,
          name: student.name,
          rollNumber: student.rollNumber || 'N/A',
          fatherName: student.fatherName || 'N/A',
          motherName: student.motherName || 'N/A',
          phone: student.phone || 'N/A',
          address: student.address || 'N/A',
          admissionDate: student.admissionDate,
          courseName: student.course ? student.course.courseName : 'N/A',
          section: student.course ? student.course.section : '',
          academicYear: student.course ? student.course.academicYear : '2026-2027',
          classTeacher: student.course && student.course.teacher ? student.course.teacher.name : 'Class Teacher'
        },
        attendance: { totalDays: totalAttDays, presentDays, percentage: attendancePercentage },
        exams,
        subjectRows,
        summary: {
          grandObtained,
          grandMax,
          overallPercentage,
          overallGrade,
          resultStatus: overallPercentage >= 33 ? 'PASSED' : 'NEEDS IMPROVEMENT',
          remarks: overallPercentage >= 75
            ? 'Excellent academic achievement throughout the session!'
            : overallPercentage >= 50
              ? 'Good performance. Keep striving for improvement.'
              : 'Consistent effort and revision required.'
        }
      }
    });
  } catch (err) {
    console.error('Error generating student report card:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate report card' });
  }
});

// ─── ROUTES WITH /:id PARAM — must come AFTER all static routes ────────────

// 9. GET /api/exams/consolidated/:examId - Half-yearly consolidated (one row per student, subject-wise)
router.get('/consolidated/:examId', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const eId = parseInt(req.params.examId);

    if (isNaN(eId)) {
      return res.status(400).json({ success: false, error: 'Invalid exam ID' });
    }

    const exam = await prisma.exam.findFirst({
      where: { id: eId, schoolId },
      include: { course: { include: { teacher: { select: { id: true, name: true } } } } }
    });

    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found in your school' });
    }

    // Access: ADMIN/PRINCIPAL always, TEACHER only if class teacher of this course
    if (req.user.role === 'TEACHER') {
      const isClassTeacher = exam.course && exam.course.teacher && exam.course.teacher.id === req.user.userId;
      if (!isClassTeacher) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Only Admin, Principal, or the class teacher can view the consolidated result'
        });
      }
    }

    const [students, results] = await Promise.all([
      prisma.student.findMany({
        where: { courseId: exam.courseId, schoolId },
        orderBy: [{ rollNumber: 'asc' }, { name: 'asc' }],
        select: { id: true, studentId: true, name: true, rollNumber: true }
      }),
      prisma.result.findMany({
        where: { examId: eId, schoolId },
        select: { studentId: true, subject: true, marksObtained: true, maxMarks: true, grade: true }
      })
    ]);

    const subjectSet = new Set(results.map(r => r.subject));
    const subjects = Array.from(subjectSet).sort();

    const rows = students.map(student => {
      const studentResults = results.filter(r => r.studentId === student.id);
      const subjectMarks = {};
      let totalObtained = 0;
      let totalMax = 0;

      subjects.forEach(sub => {
        const found = studentResults.find(r => r.subject.toLowerCase() === sub.toLowerCase());
        if (found) {
          subjectMarks[sub] = { marksObtained: found.marksObtained, maxMarks: found.maxMarks, grade: found.grade };
          totalObtained += found.marksObtained;
          totalMax += found.maxMarks;
        } else {
          subjectMarks[sub] = null;
        }
      });

      const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0;

      return {
        studentId: student.id,
        studentCode: student.studentId,
        name: student.name,
        rollNumber: student.rollNumber || 'N/A',
        subjectMarks,
        totalObtained,
        totalMax,
        percentage,
        grade: calculateGrade(percentage)
      };
    });

    return res.json({
      success: true,
      data: {
        exam: {
          id: exam.id,
          examName: exam.examName,
          examType: exam.examType,
          term: exam.term,
          academicYear: exam.academicYear,
          examDate: exam.examDate,
          published: exam.published
        },
        course: { id: exam.course.id, courseName: exam.course.courseName, section: exam.course.section },
        subjects,
        students: rows
      }
    });
  } catch (err) {
    console.error('Error fetching consolidated result:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch consolidated result' });
  }
});

// 10. PATCH /api/exams/:id/publish - Toggle publish status (ADMIN, PRINCIPAL, or CLASS TEACHER)
router.patch('/:id/publish', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const examId = parseInt(req.params.id);

    if (isNaN(examId)) {
      return res.status(400).json({ success: false, error: 'Invalid exam ID' });
    }

    const { published } = req.body;
    if (typeof published !== 'boolean') {
      return res.status(400).json({ success: false, error: '`published` field must be true or false (boolean)' });
    }

    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId },
      include: { course: true }
    });
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found in your school' });
    }

    if (req.user.role === 'TEACHER' && exam.course?.teacherId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only Admin, Principal, or the Class Teacher of this class can publish results.'
      });
    }

    const updated = await prisma.exam.update({
      where: { id: examId },
      data: { published },
      select: { id: true, examName: true, examType: true, published: true }
    });

    return res.json({
      success: true,
      data: updated,
      message: `Exam "${updated.examName}" has been ${published ? 'published' : 'unpublished'} successfully.`
    });
  } catch (err) {
    console.error('Error updating publish status:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to update publish status' });
  }
});

// 10b. PUT /api/exams/:id - Edit an Exam (maxMarks, name, portion, subject, etc.)
router.put('/:id', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const examId = parseInt(req.params.id);

    if (isNaN(examId)) {
      return res.status(400).json({ success: false, error: 'Invalid exam ID' });
    }

    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId },
      include: { course: true }
    });

    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found in your school' });
    }

    // Permission check
    if (req.user.role === 'TEACHER') {
      const isCreator = exam.createdByTeacherId === req.user.userId;
      const isClassTeacher = exam.course.teacherId === req.user.userId;
      const isAllowedSubject = await canGrade(req.user, exam.courseId, exam.subject);

      if (!isCreator && !isClassTeacher && !isAllowedSubject) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You are not authorized to edit this exam'
        });
      }

      if ((req.body.examType === 'HALF_YEARLY' || req.body.examType === 'ANNUAL') &&
          exam.examType !== req.body.examType) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Only Admin or Principal can manage Half-Yearly or Annual exams'
        });
      }
    }

    const { examName, maxMarks, portion, subject, examDate, term, academicYear, examType } = req.body;

    const dataToUpdate = {};
    if (examName !== undefined && examName.trim()) dataToUpdate.examName = examName.trim();
    if (term !== undefined && term.trim()) dataToUpdate.term = term.trim();
    if (academicYear !== undefined && academicYear.trim()) dataToUpdate.academicYear = academicYear.trim();
    if (portion !== undefined) dataToUpdate.portion = portion ? portion.trim() : null;
    if (subject !== undefined) dataToUpdate.subject = subject ? subject.trim() : null;
    if (examType !== undefined && VALID_EXAM_TYPES.includes(examType.toUpperCase())) {
      dataToUpdate.examType = examType.toUpperCase();
    }
    if (examDate !== undefined) {
      const d = new Date(examDate);
      if (!isNaN(d.getTime())) dataToUpdate.examDate = d;
    }

    let parsedMaxMarks = null;
    if (maxMarks !== undefined && maxMarks !== null && maxMarks !== '') {
      parsedMaxMarks = parseFloat(maxMarks);
      if (isNaN(parsedMaxMarks) || parsedMaxMarks <= 0) {
        return res.status(400).json({ success: false, error: 'Max marks must be a positive number' });
      }
      dataToUpdate.maxMarks = parsedMaxMarks;
    }

    const updatedExam = await prisma.$transaction(async (tx) => {
      const updated = await tx.exam.update({
        where: { id: examId },
        data: dataToUpdate
      });

      // If maxMarks changed, also update all existing results for this exam
      if (parsedMaxMarks !== null) {
        await tx.result.updateMany({
          where: { examId },
          data: { maxMarks: parsedMaxMarks }
        });
      }

      return updated;
    });

    return res.json({
      success: true,
      message: 'Exam updated successfully',
      data: updatedExam
    });
  } catch (err) {
    console.error('Error updating exam:', err);
    return res.status(500).json({ success: false, error: 'Failed to update exam' });
  }
});

// 11. DELETE /api/exams/:id - Delete an Exam (ADMIN, PRINCIPAL, or authorized TEACHER)
router.delete('/:id', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const examId = parseInt(req.params.id);

    if (isNaN(examId)) {
      return res.status(400).json({ success: false, error: 'Invalid exam ID' });
    }

    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId },
      include: { course: true }
    });
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found in your school' });
    }

    if (req.user.role === 'TEACHER') {
      const isCreator = exam.createdByTeacherId === req.user.userId;
      const isClassTeacher = exam.course.teacherId === req.user.userId;
      const isAllowedSubject = await canGrade(req.user, exam.courseId, exam.subject);

      if (!isCreator && !isClassTeacher && !isAllowedSubject) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You are not authorized to delete this exam'
        });
      }

      if (exam.examType === 'HALF_YEARLY' || exam.examType === 'ANNUAL') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Only Admin or Principal can delete Half-Yearly or Annual exams'
        });
      }
    }

    await prisma.$transaction([
      prisma.result.deleteMany({ where: { examId } }),
      prisma.exam.delete({ where: { id: examId } })
    ]);

    return res.json({ success: true, message: 'Exam and associated results deleted successfully' });
  } catch (err) {
    console.error('Error deleting exam:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete exam' });
  }
});

// ─── EXAM TIMETABLE ROUTES ─────────────────────────────────────────────────

// 12. POST /api/exams/timetable/create - Create or replace an Exam Timetable (Admin/Principal)
router.post('/timetable/create', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId, examType, title, academicYear, items } = req.body;

    if (!courseId || !examType || !title || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'courseId, examType, title, and items are required' });
    }

    if (!['HALF_YEARLY', 'ANNUAL'].includes(examType.toUpperCase())) {
      return res.status(400).json({ success: false, error: 'examType must be HALF_YEARLY or ANNUAL' });
    }

    const cId = parseInt(courseId);
    if (isNaN(cId)) return res.status(400).json({ success: false, error: 'Invalid courseId' });

    const course = await prisma.course.findFirst({ where: { id: cId, schoolId } });
    if (!course) return res.status(404).json({ success: false, error: 'Course not found in your school' });

    // Validate items
    for (const item of items) {
      if (!item.subject || !item.examDate) {
        return res.status(400).json({ success: false, error: 'Each timetable item requires subject and examDate' });
      }
      const d = new Date(item.examDate);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ success: false, error: `Invalid date for subject: ${item.subject}` });
      }
    }

    const timetable = await prisma.examTimetable.create({
      data: {
        schoolId,
        courseId: cId,
        examType: examType.toUpperCase(),
        title: title.trim(),
        academicYear: (academicYear || course.academicYear || '2026-2027').trim(),
        published: false,
        createdBy: req.user.role,
        items: {
          create: items.map(item => ({
            subject: item.subject.trim(),
            examDate: new Date(item.examDate),
            startTime: item.startTime || '09:00 AM',
            endTime: item.endTime || '12:00 PM',
            maxMarks: item.maxMarks ? parseFloat(item.maxMarks) : null,
            roomNo: item.roomNo ? item.roomNo.trim() : null,
            instructions: item.instructions ? item.instructions.trim() : null
          }))
        }
      },
      include: { items: true, course: { select: { courseName: true, section: true } } }
    });

    return res.json({ success: true, data: timetable, message: 'Exam timetable created successfully' });
  } catch (err) {
    console.error('Error creating exam timetable:', err);
    return res.status(500).json({ success: false, error: 'Failed to create exam timetable' });
  }
});

// 13. GET /api/exams/timetable/list?courseId=&examType= - List exam timetables
router.get('/timetable/list', authenticateJWT, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId, examType } = req.query;

    const where = { schoolId };
    if (courseId) {
      const cId = parseInt(courseId);
      if (!isNaN(cId)) where.courseId = cId;
    }
    if (examType) {
      where.examType = examType.toUpperCase();
    }

    // Non-admin/principal roles only see published timetables
    if (req.user.role === 'STUDENT') {
      where.published = true;
    }

    const timetables = await prisma.examTimetable.findMany({
      where,
      include: {
        items: { orderBy: { examDate: 'asc' } },
        course: { select: { id: true, courseName: true, section: true, academicYear: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: timetables });
  } catch (err) {
    console.error('Error fetching exam timetables:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch exam timetables' });
  }
});

// 14. PATCH /api/exams/timetable/:id/publish - Publish/Unpublish exam timetable (Admin, Principal, or Class Teacher)
router.patch('/timetable/:id/publish', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const ttId = parseInt(req.params.id);
    if (isNaN(ttId)) return res.status(400).json({ success: false, error: 'Invalid timetable ID' });

    const { published } = req.body;
    if (typeof published !== 'boolean') {
      return res.status(400).json({ success: false, error: '`published` must be boolean (true or false)' });
    }

    const tt = await prisma.examTimetable.findFirst({
      where: { id: ttId, schoolId },
      include: { course: true }
    });
    if (!tt) return res.status(404).json({ success: false, error: 'Exam timetable not found in your school' });

    if (req.user.role === 'TEACHER' && tt.course?.teacherId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only Admin, Principal, or the Class Teacher of this class can publish this exam schedule.'
      });
    }

    const updated = await prisma.examTimetable.update({
      where: { id: ttId },
      data: { published, publishedAt: published ? new Date() : null }
    });

    return res.json({
      success: true,
      data: updated,
      message: `Exam timetable has been ${published ? 'published' : 'unpublished'} successfully.`
    });
  } catch (err) {
    console.error('Error publishing exam timetable:', err);
    return res.status(500).json({ success: false, error: 'Failed to update publish status' });
  }
});

// 15. DELETE /api/exams/timetable/:id - Delete exam timetable (Admin/Principal)
router.delete('/timetable/:id', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const ttId = parseInt(req.params.id);
    if (isNaN(ttId)) return res.status(400).json({ success: false, error: 'Invalid timetable ID' });

    const tt = await prisma.examTimetable.findFirst({ where: { id: ttId, schoolId } });
    if (!tt) return res.status(404).json({ success: false, error: 'Exam timetable not found' });

    await prisma.examTimetable.delete({ where: { id: ttId } });
    return res.json({ success: true, message: 'Exam timetable deleted successfully' });
  } catch (err) {
    console.error('Error deleting exam timetable:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete exam timetable' });
  }
});

// 16. GET /api/exams/class-teacher-view?courseId= - Class Teacher: All subjects marks for their course
router.get('/class-teacher-view', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId, examType } = req.query;

    if (!courseId) return res.status(400).json({ success: false, error: 'courseId is required' });
    const cId = parseInt(courseId);
    if (isNaN(cId)) return res.status(400).json({ success: false, error: 'Invalid courseId' });

    const course = await prisma.course.findFirst({
      where: { id: cId, schoolId },
      include: { teacher: { select: { id: true, name: true } }, courseSubjects: { include: { teacher: { select: { id: true, name: true } } } } }
    });
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

    // TEACHER: must be class teacher of this course
    if (req.user.role === 'TEACHER') {
      if (course.teacherId !== req.user.userId) {
        return res.status(403).json({ success: false, error: 'Forbidden: Only the class teacher of this course can access this view' });
      }
    }

    // Filter exams by type if provided
    const examWhere = { courseId: cId, schoolId };
    if (examType) {
      const types = examType.toUpperCase().split(',').map(t => t.trim()).filter(Boolean);
      examWhere.examType = { in: types };
    }

    const [students, exams, results, courseSubjects] = await Promise.all([
      prisma.student.findMany({
        where: { courseId: cId, schoolId },
        orderBy: [{ rollNumber: 'asc' }, { name: 'asc' }],
        select: { id: true, studentId: true, name: true, rollNumber: true, fatherName: true }
      }),
      prisma.exam.findMany({
        where: examWhere,
        orderBy: [{ examDate: 'asc' }, { createdAt: 'asc' }]
      }),
      prisma.result.findMany({
        where: { courseId: cId, schoolId },
        include: { exam: { select: { examType: true, examName: true } } }
      }),
      prisma.courseSubject.findMany({
        where: { courseId: cId },
        include: { teacher: { select: { id: true, name: true } } }
      })
    ]);

    // Group results per student per subject per exam
    const resultMap = {};
    results.forEach(r => {
      const key = `${r.studentId}|${r.examId}|${r.subject}`;
      resultMap[key] = r;
    });

    const subjectSet = new Set(results.map(r => r.subject));
    const allSubjects = Array.from(subjectSet).sort();

    // Build student summaries
    const studentRows = students.map(student => {
      const studentResults = results.filter(r => r.studentId === student.id);
      const bySubject = {};
      allSubjects.forEach(sub => {
        const subResults = studentResults.filter(r => r.subject.toLowerCase() === sub.toLowerCase());
        const totalObt = subResults.reduce((acc, r) => acc + r.marksObtained, 0);
        const totalMax = subResults.reduce((acc, r) => acc + r.maxMarks, 0);
        bySubject[sub] = {
          marks: subResults.map(r => ({ examId: r.examId, examName: r.exam?.examName, marksObtained: r.marksObtained, maxMarks: r.maxMarks, grade: r.grade })),
          totalObtained: totalObt,
          totalMax,
          percentage: totalMax > 0 ? Math.round((totalObt / totalMax) * 1000) / 10 : 0,
          grade: totalMax > 0 ? calculateGrade((totalObt / totalMax) * 100) : 'N/A'
        };
      });

      const grandObt = studentResults.reduce((acc, r) => acc + r.marksObtained, 0);
      const grandMax = studentResults.reduce((acc, r) => acc + r.maxMarks, 0);
      const pct = grandMax > 0 ? Math.round((grandObt / grandMax) * 1000) / 10 : 0;

      return {
        id: student.id,
        studentId: student.studentId,
        name: student.name,
        rollNumber: student.rollNumber || 'N/A',
        fatherName: student.fatherName || 'N/A',
        bySubject,
        totalObtained: grandObt,
        totalMax: grandMax,
        percentage: pct,
        grade: grandMax > 0 ? calculateGrade(pct) : 'N/A'
      };
    });

    return res.json({
      success: true,
      data: {
        course: { id: course.id, courseName: course.courseName, section: course.section, academicYear: course.academicYear, classTeacher: course.teacher },
        courseSubjects,
        exams,
        subjects: allSubjects,
        students: studentRows
      }
    });
  } catch (err) {
    console.error('Error fetching class teacher view:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch class teacher view' });
  }
});

export default router;
