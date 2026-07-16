import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prismaClient.js';
import { authenticateJWT, requireTeacher } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createStudentSchema } from '../validators/schemas.js';

const router = express.Router();

// Apply auth middlewares to all teacher routes
router.use(authenticateJWT);
router.use(requireTeacher);

// GET /api/teacher/class-details
router.get('/class-details', async (req, res) => {
  try {
    const teacherProfile = await prisma.teacher.findUnique({
      where: { id: req.user.userId },
      include: { assignedClass: true }
    });

    if (!teacherProfile) {
      return res.status(404).json({ success: false, error: 'Teacher profile not found' });
    }

    const { assignedClass } = teacherProfile;
    const schoolId = req.user.schoolId;

    if (!assignedClass) {
      return res.json({ success: true, data: { assignedClass: 'Unassigned', students: [] } });
    }

    // Fetch students assigned to this class
    const students = await prisma.student.findMany({
      where: { schoolId, classId: assignedClass.id },
      include: {
        attendance: {
          select: { date: true, status: true }
        }
      },
      orderBy: { rollNumber: 'asc' }
    });

    return res.json({
      success: true,
      data: {
        assignedClass: `${assignedClass.className}-${assignedClass.section}`,
        students,
      }
    });
  } catch (err) {
    console.error('Error fetching class details:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/teacher/attendance
router.post('/attendance', async (req, res) => {
  const { date, records } = req.body;
  const schoolId = req.user.schoolId;
  const teacherId = req.user.userId;

  if (!date || !Array.isArray(records)) {
    return res.status(400).json({ success: false, error: 'Date and records array are required' });
  }

  try {
    const teacherProfile = await prisma.teacher.findUnique({ 
      where: { id: teacherId },
      include: { assignedClass: true }
    });
    if (!teacherProfile?.assignedClass) {
      return res.status(403).json({ success: false, error: 'You are not assigned to a class' });
    }
    const classId = teacherProfile.assignedClass.id;

    // Normalize date to start of UTC day (midnight) to fit unique constraint
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format' });
    }
    const targetDate = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()));

    // Run upserts in a transaction
    await prisma.$transaction(
      records.map(record => {
        const studentId = parseInt(record.studentId, 10);
        if (!studentId || !['PRESENT', 'ABSENT', 'LATE'].includes(record.status)) {
          throw new Error(`Invalid record data for studentId: ${record.studentId}`);
        }
        return prisma.attendance.upsert({
          where: {
            studentId_date: { studentId, date: targetDate },
          },
          update: { 
            status: record.status,
            teacherId,
            classId
          },
          create: {
            schoolId,
            studentId,
            date: targetDate,
            status: record.status,
            teacherId,
            classId
          },
        });
      })
    );

    return res.json({ success: true, message: 'Attendance recorded successfully' });
  } catch (err) {
    console.error('Error logging attendance:', err);
    return res.status(400).json({ success: false, error: err.message || 'Internal server error' });
  }
});

// GET /api/teacher/dashboard-summary
router.get('/dashboard-summary', async (req, res) => {
  try {
    const teacherProfile = await prisma.teacher.findUnique({
      where: { id: req.user.userId },
      include: { assignedClass: true }
    });

    if (!teacherProfile) {
      return res.status(404).json({ success: false, error: 'Teacher profile not found' });
    }

    const { assignedClass } = teacherProfile;
    const schoolId = req.user.schoolId;

    if (!assignedClass) {
      return res.json({
        success: true,
        data: {
          assignedClass: 'Unassigned',
          studentCount: 0,
          classAttendanceRate: 100,
          recentAbsentees: [],
          routine: []
        }
      });
    }

    // Get count of students in their assigned class
    const studentCount = await prisma.student.count({
      where: { schoolId, classId: assignedClass.id }
    });

    // Get attendance rate for students in their assigned class
    const studentsInClass = await prisma.student.findMany({
      where: { schoolId, classId: assignedClass.id },
      select: { id: true }
    });
    const studentIds = studentsInClass.map(s => s.id);

    const totalLogsCount = await prisma.attendance.count({
      where: { schoolId, studentId: { in: studentIds } }
    });

    const presentLogsCount = await prisma.attendance.count({
      where: { schoolId, studentId: { in: studentIds }, status: 'PRESENT' }
    });
    
    // Also consider LATE as present for basic attendance rate? Usually yes.
    const lateLogsCount = await prisma.attendance.count({
      where: { schoolId, studentId: { in: studentIds }, status: 'LATE' }
    });

    const classAttendanceRate = totalLogsCount > 0
      ? Math.round(((presentLogsCount + lateLogsCount) / totalLogsCount) * 100)
      : 100;

    // List recent absences (absent in last 3 days)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const recentAbsences = await prisma.attendance.findMany({
      where: {
        schoolId,
        studentId: { in: studentIds },
        status: 'ABSENT',
        date: { gte: threeDaysAgo }
      },
      include: {
        student: { select: { name: true, rollNumber: true } }
      },
      orderBy: { date: 'desc' },
      take: 5
    });

    const recentAbsentees = recentAbsences.map(log => ({
      studentId: log.studentId,
      name: log.student.name,
      rollNumber: log.student.rollNumber,
      date: log.date
    }));

    // Get today's routine
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[new Date().getDay()];
    
    const routine = await prisma.timetable.findMany({
      where: { schoolId, teacherId: req.user.userId, dayOfWeek: currentDay },
      orderBy: { period: 'asc' }
    });

    return res.json({
      success: true,
      data: {
        assignedClass: `${assignedClass.className}-${assignedClass.section}`,
        studentCount,
        classAttendanceRate,
        recentAbsentees,
        routine
      }
    });
  } catch (err) {
    console.error('Error fetching teacher dashboard summary:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 4. Add Student (restricted to own class)
function generateStudentId() {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `STU-${year}-${random}`;
}

function generatePassword() {
  return Math.random().toString(36).slice(-8);
}

// NOTE: Since the route doesn't accept classId in the body and instead uses assignedClassId,
// we cannot strictly use the generic createStudentSchema unless we modify it or just validate the rest manually.
// For simplicity, we keep the manual validation for this specialized route or use a tailored schema.
router.post('/students', async (req, res) => {
  const { name, rollNumber, fatherName, motherName, phone, address, admissionDate, totalFees } = req.body;
  const schoolId = req.user.schoolId;
  const teacherId = req.user.userId;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }

  try {
    const teacherProfile = await prisma.teacher.findUnique({ 
      where: { id: teacherId },
      include: { assignedClass: true }
    });
    if (!teacherProfile?.assignedClass) {
      return res.status(403).json({ success: false, error: 'You are not assigned to a class' });
    }
    const classId = teacherProfile.assignedClass.id;

    // Fetch school to get schoolCode
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    
    // Generate studentId: SCH001-ST0001
    const studentCount = await prisma.student.count({ where: { schoolId } });
    const studentId = `${school.schoolCode}-ST${(studentCount + 1).toString().padStart(4, '0')}`;
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    const newStudent = await prisma.student.create({
      data: {
        schoolId,
        studentId,
        password: passwordHash,
        name,
        rollNumber,
        classId,
        fatherName,
        motherName,
        phone,
        address,
        admissionDate: admissionDate ? new Date(admissionDate) : null,
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Student added successfully',
      data: {
        studentId: newStudent.studentId,
        password: password,
        id: newStudent.id,
        name: newStudent.name
      }
    });
  } catch (err) {
    console.error('Error adding student:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/teacher/attendance-history (for calendar view)
router.get('/attendance-history', async (req, res) => {
  const schoolId = req.user.schoolId;
  const teacherId = req.user.userId;
  const dateStr = req.query.date;

  try {
    const teacherProfile = await prisma.teacher.findUnique({ 
      where: { id: teacherId },
      include: { assignedClass: true }
    });
    if (!teacherProfile?.assignedClass) {
      return res.status(403).json({ success: false, error: 'You are not assigned to a class' });
    }
    const classId = teacherProfile.assignedClass.id;

    if (!dateStr) {
      // return all historical dates that have attendance for this class
      const distinctDates = await prisma.attendance.findMany({
        where: { schoolId, classId },
        select: { date: true },
        distinct: ['date'],
        orderBy: { date: 'desc' }
      });
      return res.json({ success: true, data: { dates: distinctDates.map(d => d.date) } });
    }

    // Return detailed attendance for a specific date
    const parsedDate = new Date(dateStr);
    const targetDate = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()));

    const records = await prisma.attendance.findMany({
      where: { schoolId, classId, date: targetDate },
      include: {
        student: { select: { name: true, rollNumber: true, studentId: true } }
      }
    });

    return res.json({ success: true, data: { date: targetDate, records } });
  } catch (err) {
    console.error('Error fetching attendance history:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/teacher/routine
router.get('/routine', async (req, res) => {
  const schoolId = req.user.schoolId;
  const teacherId = req.user.userId;

  try {
    const routine = await prisma.timetable.findMany({
      where: { schoolId, teacherId },
      include: {
        class: { select: { className: true, section: true } }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { period: 'asc' }
      ]
    });
    
    // Group by day for frontend
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const grouped = {};
    days.forEach(day => grouped[day] = []);
    
    routine.forEach(r => {
      if (grouped[r.dayOfWeek]) {
        grouped[r.dayOfWeek].push(r);
      } else {
        grouped[r.dayOfWeek] = [r];
      }
    });

    return res.json({ success: true, data: grouped });
  } catch (err) {
    console.error('Error fetching teacher routine:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/teacher/class-fees
router.get('/class-fees', async (req, res) => {
  try {
    const teacherProfile = await prisma.teacher.findUnique({
      where: { id: req.user.userId },
      include: { assignedClass: true }
    });

    if (!teacherProfile || !teacherProfile.assignedClass) {
      return res.status(403).json({ success: false, error: 'No assigned class found' });
    }

    const classId = teacherProfile.assignedClass.id;
    const schoolId = req.user.schoolId;

    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId, student: { classId } },
      include: {
        student: { select: { id: true, name: true, rollNumber: true } },
        payments: { where: { status: 'SUCCESS' } }
      }
    });

    const studentMap = {};

    invoices.forEach(inv => {
      const s = inv.student;
      if (!studentMap[s.id]) {
        studentMap[s.id] = {
          id: s.id,
          name: s.name,
          rollNumber: s.rollNumber,
          totalFees: 0,
          paid: 0,
          pending: 0,
          status: 'PAID'
        };
      }

      const invPaid = inv.payments.reduce((acc, p) => acc + p.amount, 0);
      const invPending = Math.max(0, inv.amount - invPaid);

      studentMap[s.id].totalFees += inv.amount;
      studentMap[s.id].paid += invPaid;
      studentMap[s.id].pending += invPending;

      if (inv.status === 'OVERDUE') studentMap[s.id].status = 'OVERDUE';
      else if (inv.status === 'PENDING' && studentMap[s.id].status !== 'OVERDUE') studentMap[s.id].status = 'PENDING';
    });

    return res.json({ success: true, data: Object.values(studentMap) });
  } catch (err) {
    console.error('Error fetching class fees:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
