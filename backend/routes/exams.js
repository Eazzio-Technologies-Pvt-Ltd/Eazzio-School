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

// 1. GET /api/exams/courses - List courses for current school
router.get('/courses', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const courses = await prisma.course.findMany({
      where: { schoolId },
      include: {
        teacher: { select: { id: true, name: true } },
        courseSubjects: { select: { id: true, subject: true } },
        _count: { select: { students: true, exams: true } }
      },
      orderBy: [{ courseName: 'asc' }, { section: 'asc' }]
    });
    return res.json({ success: true, data: courses });
  } catch (err) {
    console.error('Error fetching courses for exams:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch courses' });
  }
});

// 2. GET /api/exams/list - List exams (optionally filtered by courseId)
router.get('/list', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId } = req.query;

    const where = { schoolId };
    if (courseId) {
      where.courseId = parseInt(courseId);
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

// 3. POST /api/exams/create - Create an Exam
router.post('/create', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId, examName, term, academicYear, examDate } = req.body;

    if (!courseId || !examName || !term) {
      return res.status(400).json({ success: false, error: 'Course, Exam Name, and Term are required' });
    }

    // Resolve course to get fallback academic year if needed
    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) }
    });

    if (!course || course.schoolId !== schoolId) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const exam = await prisma.exam.create({
      data: {
        schoolId,
        courseId: parseInt(courseId),
        examName: examName.trim(),
        term: term.trim(),
        academicYear: (academicYear || course.academicYear || '2026-2027').trim(),
        examDate: examDate ? new Date(examDate) : new Date()
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

// 4. DELETE /api/exams/:id - Delete an Exam (and associated results)
router.delete('/:id', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const examId = parseInt(req.params.id);

    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId }
    });

    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    // Cascade delete results and exam
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

// 5. GET /api/exams/marks-sheet - Fetch students roster with existing marks for a course, exam, and subject
router.get('/marks-sheet', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId, examId, subject } = req.query;

    if (!courseId || !examId || !subject) {
      return res.status(400).json({ success: false, error: 'courseId, examId, and subject are required' });
    }

    const [course, exam, students, existingResults] = await Promise.all([
      prisma.course.findFirst({
        where: { id: parseInt(courseId), schoolId }
      }),
      prisma.exam.findFirst({
        where: { id: parseInt(examId), schoolId }
      }),
      prisma.student.findMany({
        where: { courseId: parseInt(courseId), schoolId },
        orderBy: [
          { rollNumber: 'asc' },
          { name: 'asc' }
        ],
        select: {
          id: true,
          studentId: true,
          name: true,
          rollNumber: true
        }
      }),
      prisma.result.findMany({
        where: {
          schoolId,
          examId: parseInt(examId),
          subject: subject.trim()
        }
      })
    ]);

    if (!course || !exam) {
      return res.status(404).json({ success: false, error: 'Course or Exam not found' });
    }

    const resultMap = new Map();
    existingResults.forEach(r => resultMap.set(r.studentId, r));

    const defaultMaxMarks = existingResults.length > 0 ? existingResults[0].maxMarks : 100;

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
        exam,
        subject,
        defaultMaxMarks,
        students: studentRows
      }
    });
  } catch (err) {
    console.error('Error fetching marks sheet:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch marks sheet' });
  }
});

// 6. POST /api/exams/save-marks - Bulk upsert marks
router.post('/save-marks', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId, examId, subject, maxMarks, marksData } = req.body;

    if (!courseId || !examId || !subject || !marksData || !Array.isArray(marksData)) {
      return res.status(400).json({ success: false, error: 'Invalid payload. Course, Exam, Subject, and Marks data are required.' });
    }

    const parsedMaxMarks = parseFloat(maxMarks) || 100;
    const trimmedSubject = subject.trim();

    const operations = marksData
      .filter(item => item.marksObtained !== '' && item.marksObtained !== null && !isNaN(Number(item.marksObtained)))
      .map(item => {
        const marksObt = Math.max(0, parseFloat(item.marksObtained));
        const pct = parsedMaxMarks > 0 ? (marksObt / parsedMaxMarks) * 100 : 0;
        const autoGrade = calculateGrade(pct);
        const grade = item.grade ? item.grade.trim() : autoGrade;
        const remarks = item.remarks ? item.remarks.trim() : null;

        return prisma.result.upsert({
          where: {
            studentId_examId_subject: {
              studentId: parseInt(item.studentId),
              examId: parseInt(examId),
              subject: trimmedSubject
            }
          },
          update: {
            marksObtained: marksObt,
            maxMarks: parsedMaxMarks,
            grade,
            remarks,
            courseId: parseInt(courseId)
          },
          create: {
            schoolId,
            studentId: parseInt(item.studentId),
            examId: parseInt(examId),
            courseId: parseInt(courseId),
            subject: trimmedSubject,
            marksObtained: marksObt,
            maxMarks: parsedMaxMarks,
            grade,
            remarks
          }
        });
      });

    if (operations.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid marks provided to save.' });
    }

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

// 7. GET /api/exams/course-academic-summary - All students in a course across all exams
router.get('/course-academic-summary', authenticateJWT, requireRole(['ADMIN', 'PRINCIPAL', 'TEACHER']), async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ success: false, error: 'courseId is required' });
    }

    const cId = parseInt(courseId);

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
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    // Aggregate attendance per student
    const attMap = new Map();
    attendanceRecords.forEach(a => {
      if (!attMap.has(a.studentId)) attMap.set(a.studentId, { present: 0, total: 0 });
      const cur = attMap.get(a.studentId);
      cur.total += 1;
      if (a.status === 'PRESENT') cur.present += 1;
    });

    // Group results per student
    const studentResultsMap = new Map();
    allResults.forEach(r => {
      if (!studentResultsMap.has(r.studentId)) studentResultsMap.set(r.studentId, []);
      studentResultsMap.get(r.studentId).push(r);
    });

    // Extract unique subjects tested
    const subjectSet = new Set();
    allResults.forEach(r => subjectSet.add(r.subject));
    const allSubjects = Array.from(subjectSet).sort();

    const studentSummaries = students.map(student => {
      const results = studentResultsMap.get(student.id) || [];
      const totalObtained = results.reduce((acc, r) => acc + r.marksObtained, 0);
      const totalMax = results.reduce((acc, r) => acc + r.maxMarks, 0);
      const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0;
      const grade = calculateGrade(percentage);

      // Attendance
      const att = attMap.get(student.id) || { present: 0, total: 0 };
      const attPct = att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;

      // Map exam-wise totals
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
      data: {
        course,
        exams,
        subjects: allSubjects,
        students: studentSummaries
      }
    });
  } catch (err) {
    console.error('Error fetching course academic summary:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch course academic summary' });
  }
});

// 8. GET /api/exams/student-report-card/:studentId - Comprehensive Individual Report Card
router.get('/student-report-card/:studentId', authenticateJWT, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const studentId = parseInt(req.params.studentId);

    // Fetch student, school, results, and attendance
    const [student, school, results, attendanceRecords] = await Promise.all([
      prisma.student.findFirst({
        where: { id: studentId, schoolId },
        include: {
          course: {
            include: {
              teacher: { select: { name: true } }
            }
          }
        }
      }),
      prisma.school.findUnique({
        where: { id: schoolId },
        select: {
          schoolName: true,
          schoolCode: true,
          email: true,
          phone: true,
          address: true,
          logo: true
        }
      }),
      prisma.result.findMany({
        where: { studentId, schoolId },
        include: {
          exam: true
        },
        orderBy: [
          { exam: { examDate: 'asc' } },
          { exam: { createdAt: 'asc' } }
        ]
      }),
      prisma.attendance.findMany({
        where: { studentId, schoolId }
      })
    ]);

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Attendance stats
    const totalAttDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(a => a.status === 'PRESENT').length;
    const attendancePercentage = totalAttDays > 0 ? Math.round((presentDays / totalAttDays) * 100) : 0;

    // Distinct exams the student participated in
    const examMap = new Map();
    results.forEach(r => {
      if (!examMap.has(r.examId)) {
        examMap.set(r.examId, r.exam);
      }
    });
    const exams = Array.from(examMap.values());

    // Distinct subjects
    const subjectMap = new Map();
    results.forEach(r => {
      if (!subjectMap.has(r.subject)) {
        subjectMap.set(r.subject, {});
      }
      subjectMap.get(r.subject)[r.examId] = {
        marksObtained: r.marksObtained,
        maxMarks: r.maxMarks,
        grade: r.grade,
        remarks: r.remarks
      };
    });

    // Build consolidated subject rows
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

      return {
        subject: subName,
        marksByExam,
        totalObtained: subObtained,
        totalMax: subMax,
        percentage: subPct,
        grade: calculateGrade(subPct)
      };
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
        attendance: {
          totalDays: totalAttDays,
          presentDays,
          percentage: attendancePercentage
        },
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

export default router;
