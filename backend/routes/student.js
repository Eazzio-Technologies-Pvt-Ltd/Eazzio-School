import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prismaClient.js';
import { authenticateJWT, requireStudent } from '../middleware/auth.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const router = express.Router();

// Apply auth middlewares to all student routes
router.use(authenticateJWT);
router.use(requireStudent);

// Helper to get student base data
const getBaseStudent = async (req) => {
  return prisma.student.findUnique({
    where: { id: req.user.userId },
    include: { course: true }
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
        course: true,
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
          { audience: 'COURSE', courseId: student.courseId }
        ]
      },
      orderBy: { date: 'desc' },
      take: 3
    });

    // Routine for today
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    
    let todayRoutine = [];
    if (student.courseId) {
      todayRoutine = await prisma.timetable.findMany({
        where: {
          schoolId,
          courseId: student.courseId,
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
          courseName: student.course ? `${student.course.courseName}-${student.course.section}` : 'Unassigned',
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
      include: { course: { include: { teacher: { select: { name: true } } } } }
    });
    
    // Omit sensitive data like password
    const { password, ...safeProfile } = student;
    return res.json({ success: true, data: safeProfile });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/student/profile
router.put('/profile', async (req, res) => {
  try {
    const { phone } = req.body;
    const updatedStudent = await prisma.student.update({
      where: { id: req.user.userId },
      data: { phone }
    });
    const { password, ...safeProfile } = updatedStudent;
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
          { audience: 'COURSE', courseId: student.courseId }
        ]
      },
      orderBy: { date: 'desc' },
      include: { course: true }
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
    if (!student.courseId) {
      return res.json({ success: true, data: {} });
    }

    const routineRecords = await prisma.timetable.findMany({
      where: {
        schoolId: req.user.schoolId,
        courseId: student.courseId
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

// PUT /api/student/change-password
router.put('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Current and new passwords are required' });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: req.user.userId }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, student.password);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Incorrect current password' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await prisma.student.update({
      where: { id: req.user.userId },
      data: { password: passwordHash }
    });

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/student/fees/create-order
router.post('/fees/create-order', async (req, res) => {
  try {
    const { invoiceId } = req.body;
    
    // Verify invoice belongs to req.user.userId AND req.user.schoolId
    const invoice = await prisma.feeInvoice.findFirst({
      where: {
        id: invoiceId,
        studentId: req.user.userId,
        schoolId: req.user.schoolId
      },
      include: {
        payments: {
          where: { status: 'SUCCESS' }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found or unauthorized' });
    }

    // Calculate pending amount
    const paidAmount = invoice.payments.reduce((acc, p) => acc + p.amount, 0);
    const pendingAmount = invoice.amount - paidAmount;

    if (pendingAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Already fully paid' });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: pendingAmount * 100, // in paise
      currency: 'INR',
      receipt: `rcpt_${invoiceId}_${Date.now()}`
    };

    const order = await instance.orders.create(options);

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
      }
    });

  } catch (err) {
    console.error('Error creating Razorpay order:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/student/fees/verify-payment
router.post('/fees/verify-payment', async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, invoiceId } = req.body;

    // Verify signature
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    // Re-verify invoice ownership
    const invoice = await prisma.feeInvoice.findFirst({
      where: {
        id: invoiceId,
        studentId: req.user.userId,
        schoolId: req.user.schoolId
      },
      include: {
        payments: {
          where: { status: 'SUCCESS' }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found or unauthorized' });
    }

    const paidAmount = invoice.payments.reduce((acc, p) => acc + p.amount, 0);
    const pendingAmount = invoice.amount - paidAmount;

    const paymentAmount = pendingAmount;

    // Create FeePayment
    const payment = await prisma.feePayment.create({
      data: {
        schoolId: req.user.schoolId,
        studentId: req.user.userId,
        feeInvoiceId: invoiceId,
        amount: paymentAmount,
        status: 'SUCCESS',
        paymentMethod: 'ONLINE',
        receiptNumber: `RCPT-${Date.now()}`,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      }
    });

    // Update FeeInvoice status
    const newPaidAmount = paidAmount + paymentAmount;
    if (newPaidAmount >= invoice.amount) {
      await prisma.feeInvoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID' }
      });
    }

    return res.json({ success: true, data: payment });

  } catch (err) {
    console.error('Error verifying Razorpay payment:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/student/fees/receipt/:paymentId
router.get('/fees/receipt/:paymentId', async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    
    const payment = await prisma.feePayment.findFirst({
      where: {
        id: paymentId,
        studentId: req.user.userId
      },
      include: {
        feeInvoice: true,
        student: { select: { name: true, studentId: true } },
        school: { select: { schoolName: true, address: true, phone: true, email: true, logo: true } }
      }
    });

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment receipt not found' });
    }

    return res.json({ success: true, data: payment });
  } catch (err) {
    console.error('Error fetching receipt:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/student/results
router.get('/results', async (req, res) => {
  try {
    const studentId = req.user.userId;
    const schoolId = req.user.schoolId;

    // Check fee status
    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId, studentId },
      include: { payments: { where: { status: 'SUCCESS' } } }
    });
    
    let hasOverdue = false;
    invoices.forEach(inv => {
      const paid = inv.payments.reduce((acc, p) => acc + p.amount, 0);
      const pending = inv.amount - paid;
      if (pending > 0 && (inv.status === 'OVERDUE' || new Date(inv.dueDate) < new Date())) {
        hasOverdue = true;
      }
    });

    if (hasOverdue) {
      return res.json({
        success: true,
        data: {
          resultOnHold: true,
          message: "Results withheld due to pending fees. Please clear dues to view your academic report.",
          exams: []
        }
      });
    }

    const results = await prisma.result.findMany({
      where: { schoolId, studentId },
      include: { exam: true },
      orderBy: [
        { exam: { academicYear: 'desc' } },
        { exam: { examDate: 'desc' } }
      ]
    });

    const grouped = {};
    results.forEach(r => {
      if (!grouped[r.examId]) {
        grouped[r.examId] = {
          examDetails: r.exam,
          subjects: []
        };
      }
      grouped[r.examId].subjects.push(r);
    });

    return res.json({ success: true, data: { resultOnHold: false, exams: Object.values(grouped) } });
  } catch (err) {
    console.error('Error fetching results:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
