import express from 'express';
import prisma from '../prismaClient.js';
import { authenticateJWT } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Apply auth middleware to all accountant routes
router.use(authenticateJWT);

// GET /api/accountant/dashboard-summary
router.get('/dashboard-summary', async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    // 1. Fetch all successful payments
    const payments = await prisma.feePayment.findMany({
      where: { schoolId, status: 'SUCCESS' },
      orderBy: { date: 'desc' },
      include: { student: true }
    });
    const totalCollections = payments.reduce((sum, p) => sum + p.amount, 0);

    // 2. Fetch all invoices with payments
    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId },
      include: { payments: { where: { status: 'SUCCESS' } } }
    });

    let pendingFees = 0;
    invoices.forEach(inv => {
      const invPaid = inv.payments.reduce((acc, p) => acc + p.amount, 0);
      pendingFees += Math.max(0, inv.amount - invPaid);
    });
    const activeInvoices = invoices.length;

    // 3. Format recent payments
    const recentPayments = payments.slice(0, 5).map(p => ({
      id: p.id,
      studentName: p.student.name,
      amount: p.amount,
      method: p.paymentMethod,
      date: p.date
    }));

    // 4. Fetch all students and compute their fees
    const students = await prisma.student.findMany({
      where: { schoolId },
      include: {
        class: true,
        feeInvoices: {
          include: { payments: { where: { status: 'SUCCESS' } } }
        }
      },
      orderBy: { name: 'asc' }
    });

    const studentsFeesList = students.map(student => {
      let studentTotalFees = 0;
      let studentPaid = 0;
      let studentPending = 0;

      student.feeInvoices.forEach(inv => {
        const invPaid = inv.payments.reduce((acc, p) => acc + p.amount, 0);
        studentTotalFees += inv.amount;
        studentPaid += invPaid;
        studentPending += Math.max(0, inv.amount - invPaid);
      });

      return {
        id: student.id,
        studentId: student.studentId,
        name: student.name,
        rollNumber: student.rollNumber || 'N/A',
        className: student.class ? `${student.class.className}-${student.class.section}` : 'N/A',
        totalFees: studentTotalFees,
        paid: studentPaid,
        pending: studentPending
      };
    });

    return res.json({
      success: true,
      message: 'Accountant dashboard data fetched successfully',
      data: {
        schoolId,
        totalCollections,
        pendingFees,
        activeInvoices,
        recentPayments,
        studentsFeesList
      }
    });
  } catch (error) {
    console.error('Error in accountant dashboard-summary:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/accountant/classes - Fetch classes list for student registration dropdown
router.get('/classes', async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where: { schoolId: req.user.schoolId },
      orderBy: { className: 'asc' }
    });
    return res.json({ success: true, data: classes });
  } catch (error) {
    console.error('Error fetching classes for accountant:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/accountant/students - Add student from accountant workspace
router.post('/students', async (req, res) => {
  const { name, rollNumber, classId, fatherName, motherName, phone, address, admissionDate } = req.body;
  const schoolId = req.user.schoolId;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }

  try {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    const studentCount = await prisma.student.count({ where: { schoolId } });
    const studentId = `${school.schoolCode}-ST${(studentCount + 1).toString().padStart(4, '0')}`;

    // Default password "password" to allow easy student login
    const passwordHash = await bcrypt.hash('password', 10);

    const newStudent = await prisma.student.create({
      data: {
        schoolId,
        studentId,
        password: passwordHash,
        name,
        rollNumber: rollNumber || null,
        classId: classId ? parseInt(classId) : null,
        fatherName: fatherName || null,
        motherName: motherName || null,
        phone: phone || null,
        address: address || null,
        admissionDate: admissionDate ? new Date(admissionDate) : null,
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Student added successfully',
      data: newStudent
    });
  } catch (error) {
    console.error('Error adding student from accountant:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
