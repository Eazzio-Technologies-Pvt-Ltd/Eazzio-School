import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prismaClient.js';
import { authenticateJWT, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTeacherSchema, createClassSchema, createStudentSchema } from '../validators/schemas.js';

const router = express.Router();

// Apply auth middlewares to all principal routes
router.use(authenticateJWT);
router.use(requireAdmin);

// 0. Dashboard Summary
router.get('/dashboard-summary', async (req, res) => {
  const schoolId = req.user.schoolId;
  try {
    const studentCount = await prisma.student.count({ where: { schoolId } });
    const teacherCount = await prisma.teacher.count({ where: { schoolId } });
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const presentToday = await prisma.attendance.count({
      where: { schoolId, date: { gte: startOfDay }, status: 'PRESENT' }
    });
    const absentToday = await prisma.attendance.count({
      where: { schoolId, date: { gte: startOfDay }, status: 'ABSENT' }
    });
    const globalAttendanceRate = (presentToday + absentToday) > 0 ? Math.round((presentToday / (presentToday + absentToday)) * 100) : 100;

    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId },
      include: { payments: { where: { status: 'SUCCESS' } } }
    });
    
    let paidFees = 0;
    let pendingFees = 0;
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const recentPayments = await prisma.feePayment.findMany({
      where: { schoolId, status: 'SUCCESS', date: { gte: startOfMonth } }
    });
    const monthlyFeeCollection = recentPayments.reduce((acc, curr) => acc + curr.amount, 0);

    invoices.forEach(inv => {
      const invPaid = inv.payments.reduce((acc, p) => acc + p.amount, 0);
      paidFees += invPaid;
      pendingFees += Math.max(0, inv.amount - invPaid);
    });

    const recentActivities = [
      { id: 1, text: "System checked monthly fee invoices.", time: new Date() },
      { id: 2, text: "Automated attendance log synced.", time: new Date(Date.now() - 3600000) }
    ];

    res.json({
      studentCount,
      teacherCount,
      presentToday,
      absentToday,
      pendingFees,
      monthlyFeeCollection,
      paidFees,
      globalAttendanceRate,
      recentActivities
    });
  } catch (err) {
    console.error('Error in dashboard-summary:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 0. AI Insights
router.get('/ai-insights', async (req, res) => {
  const schoolId = req.user.schoolId;
  try {
    const students = await prisma.student.findMany({
      where: { schoolId },
      include: { attendance: true }
    });
    const lowAttendance = [];
    students.forEach(student => {
      if (student.attendance.length > 0) {
        const present = student.attendance.filter(a => a.status === 'PRESENT').length;
        const percentage = Math.round((present / student.attendance.length) * 100);
        if (percentage < 75) {
          lowAttendance.push({ name: student.name, rollNumber: student.rollNumber || 'N/A', percentage });
        }
      }
    });

    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId, status: { in: ['PENDING', 'OVERDUE'] } },
      include: { student: true, payments: { where: { status: 'SUCCESS' } } }
    });
    
    const pendingMap = {};
    invoices.forEach(inv => {
      const invPaid = inv.payments.reduce((acc, p) => acc + p.amount, 0);
      const pendingAmount = Math.max(0, inv.amount - invPaid);
      if (pendingAmount > 0) {
        if (!pendingMap[inv.studentId]) {
          pendingMap[inv.studentId] = { name: inv.student.name, rollNumber: inv.student.rollNumber || 'N/A', totalFees: 0 };
        }
        pendingMap[inv.studentId].totalFees += pendingAmount;
      }
    });

    res.json({
      absentTrend: "Attendance is stable this week.",
      lowAttendance: lowAttendance.slice(0, 5),
      pendingFees: Object.values(pendingMap).slice(0, 5)
    });
  } catch (err) {
    console.error('Error in ai-insights:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 1. Register new Teacher
router.post('/teachers', validate(createTeacherSchema), async (req, res) => {
  const { name, email, phone, password } = req.body;
  const schoolId = req.user.schoolId;

  try {
    const existingTeacher = await prisma.teacher.findUnique({ where: { email } });
    if (existingTeacher) return res.status(400).json({ success: false, error: 'Email already exists' });

    // Fetch school to get schoolCode
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    
    // Generate employeeId: SCH001-TCH001
    const teacherCount = await prisma.teacher.count({ where: { schoolId } });
    const employeeId = `${school.schoolCode}-TCH${(teacherCount + 1).toString().padStart(3, '0')}`;

    const passwordHash = await bcrypt.hash(password, 10);
    const newTeacher = await prisma.teacher.create({
      data: {
        schoolId,
        name,
        email,
        password: passwordHash,
        phone,
        employeeId
      }
    });

    return res.status(201).json({ success: true, message: 'Teacher registered successfully', data: { id: newTeacher.id, name: newTeacher.name, email: newTeacher.email, employeeId: newTeacher.employeeId } });
  } catch (err) {
    console.error('Error registering teacher:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /teachers - Fetch all teachers for this school
router.get('/teachers', async (req, res) => {
  const schoolId = req.user.schoolId;
  try {
    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      include: { assignedCourse: true },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: teachers });
  } catch (err) {
    console.error('Error fetching teachers:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 2. Create New Class
router.post('/courses', validate(createClassSchema), async (req, res) => {
  const { courseName, section, academicYear } = req.body;
  const schoolId = req.user.schoolId;

  try {
    const existingClass = await prisma.course.findUnique({
      where: { schoolId_courseName_section_academicYear: { schoolId, courseName, section, academicYear } }
    });
    if (existingClass) return res.status(400).json({ success: false, error: 'Class already exists' });

    const newClass = await prisma.course.create({
      data: { schoolId, courseName, section, academicYear }
    });

    return res.status(201).json({ success: true, message: 'Class created successfully', data: newClass });
  } catch (err) {
    console.error('Error creating class:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /courses
router.get('/courses', async (req, res) => {
  const schoolId = req.user.schoolId;
  try {
    const classes = await prisma.course.findMany({
      where: { schoolId },
      include: {
        teacher: { select: { id: true, name: true } },
        _count: { select: { students: true } }
      },
      orderBy: [{ academicYear: 'desc' }, { courseName: 'asc' }, { section: 'asc' }]
    });
    return res.json({ success: true, data: classes });
  } catch (err) {
    console.error('Error fetching classes:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 3. Assign Class Teacher
router.put('/courses/:id/assign-teacher', async (req, res) => {
  const courseId = parseInt(req.params.id);
  const { teacherId } = req.body;
  const schoolId = req.user.schoolId;

  if (!teacherId) {
    return res.status(400).json({ error: 'Teacher ID is required' });
  }

  try {
    // Check if class belongs to this school
    const cls = await prisma.course.findFirst({ where: { id: courseId, schoolId } });
    if (!cls) return res.status(404).json({ success: false, error: 'Class not found' });

    // Ensure teacher belongs to this school
    const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    if (!teacher) return res.status(404).json({ success: false, error: 'Teacher not found' });

    // Ensure teacher isn't assigned to another class
    const existingAssignment = await prisma.course.findFirst({ where: { teacherId } });
    if (existingAssignment && existingAssignment.id !== courseId) {
      return res.status(400).json({ success: false, error: 'Teacher is already assigned to another class' });
    }

    const updatedClass = await prisma.course.update({
      where: { id: courseId },
      data: { teacherId }
    });

    return res.json({ success: true, message: 'Teacher assigned successfully', data: updatedClass });
  } catch (err) {
    console.error('Error assigning teacher:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 4. Add Student
function generatePassword() {
  return Math.random().toString(36).slice(-8); // 8 char random alphanumeric
}

router.post('/students', validate(createStudentSchema), async (req, res) => {
  const { name, rollNumber, courseId, fatherName, motherName, phone, address, admissionDate } = req.body;
  const schoolId = req.user.schoolId;

  try {
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
        courseId: parseInt(courseId),
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

// GET /students - Fetch all students for this school
router.get('/students', async (req, res) => {
  const schoolId = req.user.schoolId;
  try {
    const students = await prisma.student.findMany({
      where: { schoolId },
      include: { course: true },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: students });
  } catch (err) {
    console.error('Error fetching students:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /students/:id - Delete a student
router.delete('/students/:id', async (req, res) => {
  const schoolId = req.user.schoolId;
  const id = parseInt(req.params.id);

  try {
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student || student.schoolId !== schoolId) {
      return res.status(404).json({ error: 'Student not found' });
    }

    await prisma.student.delete({ where: { id } });
    return res.json({ success: true, message: 'Student deleted successfully' });
  } catch (err) {
    console.error('Error deleting student:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 5. View Attendance
router.get('/attendance-summary', async (req, res) => {
  const schoolId = req.user.schoolId;

  try {
    const classes = await prisma.course.findMany({
      where: { schoolId },
      include: {
        teacher: { select: { name: true } },
        students: {
          include: {
            attendance: true
          }
        }
      }
    });

    const summary = classes.map(cls => {
      const totalStudents = cls.students.length;
      let totalLogs = 0;
      let presentLogs = 0;
      let absentLogs = 0;

      cls.students.forEach(student => {
        totalLogs += student.attendance.length;
        presentLogs += student.attendance.filter(a => a.status === 'PRESENT').length;
        absentLogs += student.attendance.filter(a => a.status === 'ABSENT').length;
      });

      const percentage = totalLogs > 0 ? Math.round((presentLogs / totalLogs) * 100) : 0;

      return {
        courseId: cls.id,
        courseName: `${cls.courseName}-${cls.section}`,
        teacherName: cls.teacher ? cls.teacher.name : 'Unassigned',
        totalStudents,
        present: presentLogs,
        absent: absentLogs,
        percentage
      };
    });

    return res.json(summary);
  } catch (err) {
    console.error('Error fetching attendance summary:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. View Fee Collection
router.get('/fee-collection', async (req, res) => {
  const schoolId = req.user.schoolId;

  try {
    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId },
      include: {
        student: {
          include: { course: true }
        },
        payments: {
          where: { status: 'SUCCESS' }
        }
      }
    });

    let totalPaid = 0;
    let totalPending = 0;
    let totalDueAmount = 0;

    // Aggregate by student for the summary view
    const studentMap = {};

    invoices.forEach(inv => {
      const s = inv.student;
      if (!studentMap[s.id]) {
        studentMap[s.id] = {
          id: s.id,
          name: s.name,
          rollNumber: s.rollNumber,
          courseName: s.course ? `${s.course.courseName}-${s.course.section}` : 'N/A',
          totalFees: 0,
          paid: 0,
          pending: 0,
          status: 'PAID' // Start optimistic, downgrade if pending/overdue found
        };
      }

      const invPaid = inv.payments.reduce((acc, p) => acc + p.amount, 0);
      const invPending = Math.max(0, inv.amount - invPaid);

      studentMap[s.id].totalFees += inv.amount;
      studentMap[s.id].paid += invPaid;
      studentMap[s.id].pending += invPending;

      if (inv.status === 'OVERDUE') studentMap[s.id].status = 'OVERDUE';
      else if (inv.status === 'PENDING' && studentMap[s.id].status !== 'OVERDUE') studentMap[s.id].status = 'PENDING';

      totalPaid += invPaid;
      totalPending += invPending;
      totalDueAmount += invPending;
    });

    return res.json({
      paid: totalPaid,
      pending: totalPending,
      dueAmount: totalDueAmount,
      students: Object.values(studentMap)
    });
  } catch (err) {
    console.error('Error fetching fee collection:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. Manage Timetables
router.post('/timetables', async (req, res) => {
  const { teacherId, courseId, dayOfWeek, period, subject } = req.body;
  const schoolId = req.user.schoolId;

  if (!teacherId || !courseId || !dayOfWeek || !period || !subject) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const existing = await prisma.timetable.findUnique({
      where: { schoolId_teacherId_dayOfWeek_period: { schoolId, teacherId, dayOfWeek, period } }
    });
    if (existing) {
      return res.status(400).json({ error: 'Timetable entry already exists for this period' });
    }

    const newTimetable = await prisma.timetable.create({
      data: {
        schoolId,
        teacherId: parseInt(teacherId),
        courseId: parseInt(courseId),
        dayOfWeek,
        period,
        subject
      },
      include: {
        teacher: { select: { name: true } },
        course: { select: { courseName: true, section: true } }
      }
    });

    return res.status(201).json({ message: 'Timetable created successfully', timetable: newTimetable });
  } catch (err) {
    console.error('Error creating timetable:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/timetables', async (req, res) => {
  const schoolId = req.user.schoolId;
  const { courseId, teacherId } = req.query;

  try {
    const whereClause = { schoolId };
    if (courseId) whereClause.courseId = parseInt(courseId);
    if (teacherId) whereClause.teacherId = parseInt(teacherId);

    const timetables = await prisma.timetable.findMany({
      where: whereClause,
      include: {
        teacher: { select: { name: true } },
        course: { select: { courseName: true, section: true } }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { period: 'asc' }
      ]
    });
    return res.json(timetables);
  } catch (err) {
    console.error('Error fetching timetables:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/timetables/:id', async (req, res) => {
  const schoolId = req.user.schoolId;
  const id = parseInt(req.params.id);

  try {
    const entry = await prisma.timetable.findUnique({ where: { id } });
    if (!entry || entry.schoolId !== schoolId) {
      return res.status(404).json({ error: 'Timetable entry not found' });
    }

    await prisma.timetable.delete({ where: { id } });
    return res.json({ message: 'Timetable deleted successfully' });
  } catch (err) {
    console.error('Error deleting timetable:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 8. Manage Notices
router.post('/notices', async (req, res) => {
  const { title, content, audience, courseId } = req.body;
  const schoolId = req.user.schoolId;

  if (!title || !content || !audience) {
    return res.status(400).json({ error: 'Title, content, and audience are required' });
  }

  if (audience === 'COURSE' && !courseId) {
    return res.status(400).json({ error: 'Class ID is required for CLASS audience' });
  }

  try {
    const newNotice = await prisma.notice.create({
      data: {
        schoolId,
        title,
        content,
        audience,
        courseId: courseId ? parseInt(courseId) : null
      }
    });

    return res.status(201).json({ message: 'Notice created successfully', notice: newNotice });
  } catch (err) {
    console.error('Error creating notice:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 9. Manage Fee Structures & Invoices
router.post('/fees/structure', async (req, res) => {
  const { feeType, amount, courseId, dueDate } = req.body;
  const schoolId = req.user.schoolId;

  if (!feeType || !amount) {
    return res.status(400).json({ error: 'Fee Type and Amount are required' });
  }

  try {
    const structure = await prisma.feeStructure.create({
      data: {
        schoolId,
        feeType,
        amount: parseInt(amount),
        courseId: courseId ? parseInt(courseId) : null,
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });
    return res.status(201).json({ message: 'Fee structure created', structure });
  } catch (err) {
    console.error('Error creating fee structure:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/fees/structure', async (req, res) => {
  try {
    const structures = await prisma.feeStructure.findMany({
      where: { schoolId: req.user.schoolId },
      include: { course: true }
    });
    return res.json(structures);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/fees/generate-invoices', async (req, res) => {
  const { structureId, courseId } = req.body;
  const schoolId = req.user.schoolId;

  if (!structureId) return res.status(400).json({ error: 'Structure ID is required' });

  try {
    const structure = await prisma.feeStructure.findUnique({ where: { id: parseInt(structureId) } });
    if (!structure || structure.schoolId !== schoolId) return res.status(404).json({ error: 'Structure not found' });

    const targetClassId = courseId ? parseInt(courseId) : structure.courseId;
    const studentsQuery = targetClassId 
      ? { schoolId, courseId: targetClassId } 
      : { schoolId };

    const students = await prisma.student.findMany({ where: studentsQuery });
    let createdCount = 0;

    for (const student of students) {
      // Check if invoice for this structure/type already exists for student (simplified check based on feeType)
      const existing = await prisma.feeInvoice.findFirst({
        where: { schoolId, studentId: student.id, feeType: structure.feeType }
      });
      
      if (!existing) {
        await prisma.feeInvoice.create({
          data: {
            schoolId,
            studentId: student.id,
            feeType: structure.feeType,
            amount: structure.amount,
            dueDate: structure.dueDate || new Date(new Date().setMonth(new Date().getMonth() + 1)), // Default 1 month
            status: 'PENDING'
          }
        });
        createdCount++;
      }
    }

    return res.json({ message: `Generated ${createdCount} invoices successfully` });
  } catch (err) {
    console.error('Error generating invoices:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/fees/invoices', async (req, res) => {
  try {
    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId: req.user.schoolId },
      include: {
        student: { select: { name: true, rollNumber: true, course: true } },
        payments: true
      },
      orderBy: { dueDate: 'asc' }
    });
    return res.json(invoices);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 10. Record Payment against Invoice
router.post('/fees/invoices/:id/pay', async (req, res) => {
  const invoiceId = parseInt(req.params.id);
  const { amount, paymentMethod } = req.body;
  const schoolId = req.user.schoolId;

  if (!amount || !paymentMethod) return res.status(400).json({ error: 'Amount and paymentMethod are required' });

  try {
    const invoice = await prisma.feeInvoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true }
    });

    if (!invoice || invoice.schoolId !== schoolId) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'PAID') return res.status(400).json({ error: 'Invoice is already fully paid' });

    const receiptNumber = `RCPT-${new Date().getTime()}`;

    const newPayment = await prisma.feePayment.create({
      data: {
        schoolId,
        studentId: invoice.studentId,
        feeInvoiceId: invoice.id,
        amount: parseInt(amount),
        paymentMethod,
        status: 'SUCCESS',
        receiptNumber
      }
    });

    // Recalculate invoice status
    const allPayments = [...invoice.payments, newPayment].filter(p => p.status === 'SUCCESS');
    const totalPaid = allPayments.reduce((acc, curr) => acc + curr.amount, 0);

    if (totalPaid >= invoice.amount) {
      await prisma.feeInvoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID' }
      });
    }

    return res.status(201).json({ message: 'Payment recorded successfully', payment: newPayment });
  } catch (err) {
    console.error('Error recording payment:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
