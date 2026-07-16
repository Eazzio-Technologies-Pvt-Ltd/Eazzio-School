import express from 'express';
import prisma from '../prismaClient.js';
import { authenticateJWT, requireStudent } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middlewares to all student routes
router.use(authenticateJWT);
router.use(requireStudent);

// Helper to get student base data
const getBaseStudent = async (req) => {
  return prisma.student.findUnique({
    where: { id: req.user.userId },
    include: { class: true }
  });
};

// GET /api/student/dashboard-summary
router.get('/dashboard-summary', async (req, res) => {
  const schoolId = req.user.schoolId;

  try {
    const student = await prisma.student.findUnique({
      where: { id: req.user.userId },
      include: {
        attendance: true,
        class: true,
        payments: {
          where: { status: 'SUCCESS' }
        }
      }
    });

    if (!student || student.schoolId !== schoolId) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Attendance Stats
    const totalDays = student.attendance.length;
    const presentCount = student.attendance.filter(log => log.status === 'PRESENT').length;
    const lateCount = student.attendance.filter(log => log.status === 'LATE').length;
    const attendancePercentage = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 100;

    // Fees Stats
    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId, studentId: req.user.userId },
      include: {
        payments: { where: { status: 'SUCCESS' } }
      }
    });

    let totalFees = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let overallFeeStatus = 'PAID';
    let nextDueDate = null;

    invoices.forEach(inv => {
      const invPaid = inv.payments.reduce((acc, p) => acc + p.amount, 0);
      const invPending = Math.max(0, inv.amount - invPaid);
      
      totalFees += inv.amount;
      paidAmount += invPaid;
      pendingAmount += invPending;

      if (inv.status === 'OVERDUE') overallFeeStatus = 'OVERDUE';
      else if (inv.status === 'PENDING' && overallFeeStatus !== 'OVERDUE') overallFeeStatus = 'PENDING';

      // Find the earliest upcoming/past due date for pending/overdue invoices
      if (inv.status !== 'PAID') {
        if (!nextDueDate || new Date(inv.dueDate) < new Date(nextDueDate)) {
          nextDueDate = inv.dueDate;
        }
      }
    });

    // Notices (Top 3 recent)
    const notices = await prisma.notice.findMany({
      where: {
        schoolId,
        OR: [
          { audience: 'SCHOOL' },
          { audience: 'CLASS', classId: student.classId }
        ]
      },
      orderBy: { date: 'desc' },
      take: 3
    });

    // Routine for today
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    
    let todayRoutine = [];
    if (student.classId) {
      todayRoutine = await prisma.timetable.findMany({
        where: {
          schoolId,
          classId: student.classId,
          dayOfWeek: today
        },
        orderBy: { period: 'asc' },
        include: { teacher: true }
      });
    }

    return res.json({
      success: true,
      data: {
        profile: {
          name: student.name,
          studentId: student.studentId,
          rollNumber: student.rollNumber,
          className: student.class ? `${student.class.className}-${student.class.section}` : 'Unassigned',
        },
        attendance: {
          percentage: attendancePercentage,
          present: presentCount,
          absent: totalDays - presentCount - lateCount,
          late: lateCount,
          total: totalDays
        },
        fees: {
          totalFees,
          paidAmount,
          pendingAmount,
          feeStatus: overallFeeStatus,
          dueDate: nextDueDate
        },
        notices,
        todayRoutine
      }
    });
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/student/profile
router.get('/profile', async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.user.userId },
      include: { class: true }
    });
    
    // Omit sensitive data like password
    const { password, ...safeProfile } = student;
    return res.json({ success: true, data: safeProfile });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/student/attendance
router.get('/attendance', async (req, res) => {
  try {
    const attendance = await prisma.attendance.findMany({
      where: { studentId: req.user.userId },
      orderBy: { date: 'desc' },
      include: { teacher: { select: { name: true } } }
    });

    const totalDays = attendance.length;
    const presentCount = attendance.filter(log => log.status === 'PRESENT').length;
    const lateCount = attendance.filter(log => log.status === 'LATE').length;
    const absentCount = attendance.filter(log => log.status === 'ABSENT').length;
    
    return res.json({
      success: true,
      data: {
        stats: {
          totalDays,
          present: presentCount,
          late: lateCount,
          absent: absentCount,
          percentage: totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 100
        },
        records: attendance
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/student/fees
router.get('/fees', async (req, res) => {
  try {
    const studentId = req.user.userId;
    const schoolId = req.user.schoolId;

    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId, studentId },
      include: {
        payments: {
          where: { status: 'SUCCESS' },
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    let totalFees = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let overallFeeStatus = 'PAID';
    let nextDueDate = null;
    let allPayments = [];

    invoices.forEach(inv => {
      const invPaid = inv.payments.reduce((acc, p) => acc + p.amount, 0);
      const invPending = Math.max(0, inv.amount - invPaid);
      
      totalFees += inv.amount;
      paidAmount += invPaid;
      pendingAmount += invPending;

      if (inv.status === 'OVERDUE') overallFeeStatus = 'OVERDUE';
      else if (inv.status === 'PENDING' && overallFeeStatus !== 'OVERDUE') overallFeeStatus = 'PENDING';

      if (inv.status !== 'PAID') {
        if (!nextDueDate || new Date(inv.dueDate) < new Date(nextDueDate)) {
          nextDueDate = inv.dueDate;
        }
      }

      // Collect all payments for the history log
      inv.payments.forEach(p => {
        allPayments.push({
          ...p,
          feeType: inv.feeType
        });
      });
    });

    // Sort all historical payments by date descending
    allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.json({
      success: true,
      data: {
        summary: {
          totalFees,
          paidAmount,
          pendingAmount,
          feeStatus: overallFeeStatus,
          dueDate: nextDueDate
        },
        invoices,
        history: allPayments
      }
    });
  } catch (err) {
    console.error('Error fetching student fees:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/student/notices
router.get('/notices', async (req, res) => {
  try {
    const student = await getBaseStudent(req);
    const notices = await prisma.notice.findMany({
      where: {
        schoolId: req.user.schoolId,
        OR: [
          { audience: 'SCHOOL' },
          { audience: 'CLASS', classId: student.classId }
        ]
      },
      orderBy: { date: 'desc' },
      include: { class: true }
    });
    
    return res.json({ success: true, data: notices });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/student/routine
router.get('/routine', async (req, res) => {
  try {
    const student = await getBaseStudent(req);
    if (!student.classId) {
      return res.json({ success: true, data: {} });
    }

    const routineRecords = await prisma.timetable.findMany({
      where: {
        schoolId: req.user.schoolId,
        classId: student.classId
      },
      orderBy: { period: 'asc' },
      include: { teacher: true }
    });

    const grouped = {};
    routineRecords.forEach(r => {
      if (!grouped[r.dayOfWeek]) grouped[r.dayOfWeek] = [];
      grouped[r.dayOfWeek].push(r);
    });

    return res.json({ success: true, data: grouped });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
