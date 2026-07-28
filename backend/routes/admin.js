import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prismaClient.js';
import { authenticateJWT, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTeacherSchema, createClassSchema, createStudentSchema, createPrincipalSchema, createAccountantSchema } from '../validators/schemas.js';
import { getNextStudentNumber, generateStudentId } from '../utils/idGenerator.js';

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
    const latestTeacher = await prisma.teacher.findFirst({
      where: { schoolId },
      orderBy: { id: 'desc' }
    });
    
    let nextIdNum = 1;
    if (latestTeacher && latestTeacher.employeeId) {
      const parts = latestTeacher.employeeId.split('TCH');
      if (parts.length === 2) {
        const lastNum = parseInt(parts[1], 10);
        if (!isNaN(lastNum)) {
          nextIdNum = lastNum + 1;
        }
      }
    }
    
    const employeeId = `${school.schoolCode}-TCH${nextIdNum.toString().padStart(3, '0')}`;

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
      include: { 
        assignedCourse: true,
        courseSubjects: { select: { subject: true } }
      },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: teachers });
  } catch (err) {
    console.error('Error fetching teachers:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// UPDATE /teachers/:id
router.put('/teachers/:id', async (req, res) => {
  const teacherId = parseInt(req.params.id);
  const { name, email, phone, subjects } = req.body;
  const schoolId = req.user.schoolId;

  try {
    const existingTeacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!existingTeacher || existingTeacher.schoolId !== schoolId) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    if (email && email !== existingTeacher.email) {
      const emailTaken = await prisma.teacher.findUnique({ where: { email } });
      if (emailTaken) {
        return res.status(400).json({ success: false, error: 'Email is already in use by another teacher' });
      }
    }

    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        name: name !== undefined ? name : existingTeacher.name,
        email: email !== undefined ? email : existingTeacher.email,
        phone: phone !== undefined ? phone : existingTeacher.phone,
        subjects: subjects !== undefined ? subjects : existingTeacher.subjects
      }
    });

    return res.json({ success: true, message: 'Teacher updated successfully', data: updatedTeacher });
  } catch (err) {
    console.error('Error updating teacher:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /teachers/:id
router.delete('/teachers/:id', async (req, res) => {
  const teacherId = parseInt(req.params.id);
  const schoolId = req.user.schoolId;

  try {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher || teacher.schoolId !== schoolId) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    await prisma.$transaction(async (tx) => {
      // Remove teacher from course assignments
      await tx.course.updateMany({
        where: { teacherId },
        data: { teacherId: null }
      });
      // Remove teacher from attendance logs where they were marked as taking attendance
      await tx.attendance.updateMany({
        where: { teacherId },
        data: { teacherId: null }
      });
      
      await tx.teacher.delete({ where: { id: teacherId } });
    });

    return res.json({ success: true, message: 'Teacher deleted successfully' });
  } catch (err) {
    console.error('Error deleting teacher:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 2. Create New Class
router.post('/courses', validate(createClassSchema), async (req, res) => {
  const { courseName, section, academicYear, feeAmount, feePlanType, classTeacherId, subjectTeachers } = req.body;
  const schoolId = req.user.schoolId;

  try {
    const existingClass = await prisma.course.findUnique({
      where: { schoolId_courseName_section_academicYear: { schoolId, courseName, section, academicYear } }
    });
    if (existingClass) return res.status(400).json({ success: false, error: 'Course already exists' });

    // Use a transaction to ensure all related records are created together
    const newClass = await prisma.$transaction(async (prisma) => {
      const course = await prisma.course.create({
        data: { 
          schoolId, 
          courseName, 
          section, 
          academicYear,
          teacherId: classTeacherId || null
        }
      });

      if (feeAmount && feeAmount > 0) {
        await prisma.feeStructure.create({
          data: {
            schoolId,
            feeType: "Tuition Fee",
            amount: feeAmount,
            courseId: course.id,
            planType: feePlanType || "MONTHLY"
          }
        });
      }

      if (subjectTeachers && subjectTeachers.length > 0) {
        await prisma.courseSubject.createMany({
          data: subjectTeachers.map(st => ({
            courseId: course.id,
            subject: st.subject,
            teacherId: st.teacherId
          }))
        });
      }

      return course;
    });

    return res.status(201).json({ success: true, message: 'Course created successfully', data: newClass });
  } catch (err) {
    console.error('Error creating class:', err);
    if (err.code === 'P2002' && err.meta?.target?.includes('teacherId')) {
      return res.status(400).json({ success: false, error: 'This teacher is already a class teacher for another course.' });
    }
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
        courseSubjects: {
          include: { teacher: { select: { id: true, name: true } } }
        },
        feeStructures: true,
        _count: { select: { students: true } }
      },
      orderBy: [{ academicYear: 'desc' }, { courseName: 'asc' }, { section: 'asc' }]
    });
    return res.json({ success: true, data: classes });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// UPDATE /courses/:id
router.put('/courses/:id', async (req, res) => {
  const courseId = parseInt(req.params.id);
  const { courseName, section, academicYear, feeAmount, feePlanType, classTeacherId, subjectTeachers } = req.body;
  const schoolId = req.user.schoolId;

  try {
    const existingClass = await prisma.course.findUnique({ where: { id: courseId } });
    if (!existingClass || existingClass.schoolId !== schoolId) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const updatedCourse = await prisma.$transaction(async (prisma) => {
      const course = await prisma.course.update({
        where: { id: courseId },
        data: {
          courseName,
          section,
          academicYear,
          teacherId: classTeacherId || null
        }
      });

      // Update Subject Teachers (Delete old, create new)
      await prisma.courseSubject.deleteMany({ where: { courseId } });
      if (subjectTeachers && subjectTeachers.length > 0) {
        await prisma.courseSubject.createMany({
          data: subjectTeachers.map(st => ({
            courseId: course.id,
            subject: st.subject,
            teacherId: st.teacherId
          }))
        });
      }

      // Update Fee Amount if provided
      if (feeAmount !== undefined && feeAmount !== null) {
        const existingFee = await prisma.feeStructure.findFirst({
          where: { courseId, feeType: 'Tuition Fee' }
        });
        
        if (existingFee) {
          if (feeAmount > 0) {
            await prisma.feeStructure.update({
              where: { id: existingFee.id },
              data: { amount: parseInt(feeAmount), planType: feePlanType || existingFee.planType }
            });
          } else {
            await prisma.feeStructure.delete({ where: { id: existingFee.id } });
          }
        } else if (feeAmount > 0) {
          await prisma.feeStructure.create({
            data: {
              schoolId,
              feeType: 'Tuition Fee',
              amount: parseInt(feeAmount),
              courseId: course.id,
              planType: feePlanType || 'MONTHLY'
            }
          });
        }
      }

      return course;
    });

    return res.json({ success: true, message: 'Course updated successfully', data: updatedCourse });
  } catch (err) {
    console.error('Error updating course:', err);
    if (err.code === 'P2002' && err.meta?.target?.includes('teacherId')) {
      return res.status(400).json({ success: false, error: 'This teacher is already a class teacher for another course.' });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /courses/:id
router.delete('/courses/:id', async (req, res) => {
  const courseId = parseInt(req.params.id);
  const schoolId = req.user.schoolId;

  try {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.schoolId !== schoolId) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    // Block if students are enrolled
    const studentCount = await prisma.student.count({ where: { courseId } });
    if (studentCount > 0) {
      return res.status(400).json({ success: false, error: `Cannot delete course: ${studentCount} students are currently enrolled in it.` });
    }

    await prisma.course.delete({ where: { id: courseId } });
    return res.json({ success: true, message: 'Course deleted successfully' });
  } catch (err) {
    console.error('Error deleting course:', err);
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



// GET /students - Fetch all students for this school
router.get('/students', async (req, res) => {
  const schoolId = req.user.schoolId;
  try {
    const students = await prisma.student.findMany({
      where: { schoolId },
      include: { 
        course: true,
        feeInvoices: {
          include: { payments: true }
        }
      },
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

// GET /students/:id/full-record - Download complete student record
router.get('/students/:id/full-record', async (req, res) => {
  const schoolId = req.user.schoolId;
  const id = parseInt(req.params.id);

  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        course: true,
        attendance: {
          orderBy: { date: 'desc' }
        },
        feeInvoices: {
          include: {
            payments: { where: { status: 'SUCCESS' }, orderBy: { date: 'desc' } }
          },
          orderBy: { dueDate: 'desc' }
        }
      }
    });

    if (!student || student.schoolId !== schoolId) {
      return res.status(404).json({ error: 'Student not found' });
    }

    return res.json({ success: true, student });
  } catch (err) {
    console.error('Error fetching student full record:', err);
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
    let todaysCollection = 0;

    // Aggregate by student for the summary view
    const studentMap = {};
    const courseBreakdown = {};
    const paymentModeBreakdown = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    invoices.forEach(inv => {
      const s = inv.student;
      const courseKey = s.course ? `${s.course.courseName}-${s.course.section}` : 'N/A';
      
      if (!studentMap[s.id]) {
        studentMap[s.id] = {
          id: s.id,
          name: s.name,
          rollNumber: s.rollNumber,
          courseName: courseKey,
          totalFees: 0,
          paid: 0,
          pending: 0,
          status: 'PAID' // Start optimistic, downgrade if pending/overdue found
        };
      }
      
      if (!courseBreakdown[courseKey]) {
        courseBreakdown[courseKey] = { courseName: courseKey, totalCollected: 0, totalPending: 0 };
      }

      let invPaid = 0;
      inv.payments.forEach(p => {
        invPaid += p.amount;
        
        // Payment mode breakdown
        paymentModeBreakdown[p.paymentMethod] = (paymentModeBreakdown[p.paymentMethod] || 0) + p.amount;
        
        // Today's collection
        const pDate = new Date(p.date);
        pDate.setHours(0, 0, 0, 0);
        if (pDate.getTime() === today.getTime()) {
          todaysCollection += p.amount;
        }
      });
      
      const invPending = Math.max(0, inv.amount - invPaid);

      studentMap[s.id].totalFees += inv.amount;
      studentMap[s.id].paid += invPaid;
      studentMap[s.id].pending += invPending;
      
      courseBreakdown[courseKey].totalCollected += invPaid;
      courseBreakdown[courseKey].totalPending += invPending;

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
      todaysCollection,
      courseBreakdown: Object.values(courseBreakdown),
      paymentModeBreakdown,
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
      where: { schoolId_teacherId_dayOfWeek_period: { schoolId, teacherId: parseInt(teacherId), dayOfWeek, period } }
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

router.post('/timetables/auto-generate', async (req, res) => {
  const schoolId = req.user.schoolId;
  const { days, periods, clearExisting } = req.body;

  if (!days || !periods || days.length === 0 || periods <= 0) {
    return res.status(400).json({ error: 'Valid days array and periods count are required' });
  }

  try {
    if (clearExisting) {
      await prisma.timetable.deleteMany({ where: { schoolId } });
    }

    const courses = await prisma.course.findMany({
      where: { schoolId },
      include: {
        courseSubjects: true
      }
    });

    const newEntries = [];
    const teacherBusyMap = {};
    
    for (const course of courses) {
      const subjects = course.courseSubjects;
      if (subjects.length === 0) continue;

      let subjectIndex = 0;
      
      for (const day of days) {
        for (let p = 1; p <= periods; p++) {
          const periodStr = `Period ${p}`;
          
          let assigned = false;
          let attempts = 0;
          
          while (!assigned && attempts < subjects.length) {
            const sub = subjects[subjectIndex % subjects.length];
            const teacherKey = `${sub.teacherId}-${day}-${periodStr}`;
            
            if (!teacherBusyMap[teacherKey]) {
              teacherBusyMap[teacherKey] = true;
              newEntries.push({
                schoolId,
                teacherId: sub.teacherId,
                dayOfWeek: day,
                period: periodStr,
                subject: sub.subject,
                courseId: course.id
              });
              assigned = true;
            }
            
            subjectIndex++;
            attempts++;
          }
        }
      }
    }

    if (newEntries.length > 0) {
      await prisma.timetable.createMany({ data: newEntries });
    }

    res.json({ message: 'Timetable generated successfully', generatedSlots: newEntries.length });
  } catch (err) {
    console.error('Error auto generating timetable:', err);
    res.status(500).json({ error: 'Internal server error' });
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
    return res.status(400).json({ error: 'Course ID is required for COURSE audience' });
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
  const { 
    feeType, amount, courseId, dueDate, 
    feeNature, applicableTo, studentId, academicYear, 
    isMandatory, isActive, planType, autoGenerateInvoices
  } = req.body;
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
        dueDate: dueDate ? new Date(dueDate) : null,
        feeNature: feeNature || 'Recurring',
        applicableTo: applicableTo || 'Specific Class',
        studentId: studentId ? parseInt(studentId) : null,
        academicYear: academicYear || '2026-2027',
        isMandatory: isMandatory !== undefined ? Boolean(isMandatory) : true,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        planType: planType || 'MONTHLY'
      }
    });

    let generatedCount = 0;
    if (autoGenerateInvoices) {
      const targetClassId = courseId ? parseInt(courseId) : null;
      let studentsQuery = { schoolId };
      if (applicableTo === 'Individual Student' && studentId) {
        studentsQuery.id = parseInt(studentId);
      } else if (applicableTo === 'Specific Class' && targetClassId) {
        studentsQuery.courseId = targetClassId;
      }

      const students = await prisma.student.findMany({ where: studentsQuery });
      const invoiceData = students.map(student => ({
        schoolId,
        studentId: student.id,
        feeType,
        amount: parseInt(amount),
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        status: 'PENDING'
      }));
      
      if (invoiceData.length > 0) {
        const result = await prisma.feeInvoice.createMany({ data: invoiceData, skipDuplicates: true });
        generatedCount = result.count;
      }
    }

    return res.status(201).json({ message: 'Fee structure created', structure, generatedCount });
  } catch (err) {
    console.error('Error creating fee structure:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/fees/structure/:id', async (req, res) => {
  const structureId = parseInt(req.params.id);
  const schoolId = req.user.schoolId;
  const { 
    feeType, amount, courseId, dueDate, 
    feeNature, applicableTo, studentId, academicYear, 
    isMandatory, isActive, planType
  } = req.body;

  try {
    const structure = await prisma.feeStructure.findFirst({
      where: { id: structureId, schoolId }
    });
    if (!structure) return res.status(404).json({ error: 'Fee structure not found' });

    const updated = await prisma.feeStructure.update({
      where: { id: structureId },
      data: {
        feeType,
        amount: amount ? parseInt(amount) : structure.amount,
        courseId: courseId ? parseInt(courseId) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        feeNature: feeNature || structure.feeNature,
        applicableTo: applicableTo || structure.applicableTo,
        studentId: studentId ? parseInt(studentId) : null,
        academicYear: academicYear || structure.academicYear,
        isMandatory: isMandatory !== undefined ? Boolean(isMandatory) : structure.isMandatory,
        isActive: isActive !== undefined ? Boolean(isActive) : structure.isActive,
        planType: planType || structure.planType
      }
    });
    return res.json({ message: 'Fee structure updated', structure: updated });
  } catch (err) {
    console.error('Error updating fee structure:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/fees/structure/:id', async (req, res) => {
  const structureId = parseInt(req.params.id);
  const schoolId = req.user.schoolId;
  try {
    const structure = await prisma.feeStructure.findFirst({
      where: { id: structureId, schoolId }
    });
    if (!structure) return res.status(404).json({ error: 'Fee structure not found' });

    await prisma.feeStructure.delete({ where: { id: structureId } });
    return res.json({ message: 'Fee structure deleted' });
  } catch (err) {
    console.error('Error deleting fee structure:', err);
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

// ==================== FEE CATEGORIES ====================

router.get('/fees/categories', async (req, res) => {
  try {
    const categories = await prisma.feeCategory.findMany({ where: { schoolId: req.user.schoolId } });
    return res.json({ data: categories });
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/fees/categories', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const category = await prisma.feeCategory.create({
      data: { name, description, schoolId: req.user.schoolId }
    });
    return res.status(201).json({ message: 'Category created', data: category });
  } catch (err) {
    console.error('Error creating category:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/fees/categories/:id', async (req, res) => {
  const categoryId = parseInt(req.params.id);
  try {
    await prisma.feeCategory.deleteMany({
      where: { id: categoryId, schoolId: req.user.schoolId }
    });
    return res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error('Error deleting category:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== STAFF MANAGEMENT ====================

// --- Principals ---
router.get('/principals', async (req, res) => {
  try {
    const principals = await prisma.principal.findMany({ where: { schoolId: req.user.schoolId } });
    return res.json({ success: true, principals });
  } catch (err) {
    console.error('Error fetching principals:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/principals', async (req, res) => {
  const result = createPrincipalSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.errors[0].message });
  try {
    const { name, email, phone, password } = result.data;
    
    // Check if email is already taken by ANY user in the system (Students use studentId, not email)
    const [admin, principal, accountant, teacher] = await Promise.all([
      prisma.admin.findUnique({ where: { email } }),
      prisma.principal.findUnique({ where: { email } }),
      prisma.accountant.findUnique({ where: { email } }),
      prisma.teacher.findUnique({ where: { email } })
    ]);
    if (admin || principal || accountant || teacher) {
      return res.status(400).json({ error: 'Email already exists in the system' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newPrincipal = await prisma.principal.create({
      data: { 
        name, 
        email, 
        phone,
        password: hashedPassword,
        schoolId: req.user.schoolId
      }
    });
    return res.status(201).json({ success: true, principal: newPrincipal });
  } catch (err) {
    console.error('Error creating principal:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message, stack: err.stack });
  }
});

router.put('/principals/:id', async (req, res) => {
  try {
    const principalId = parseInt(req.params.id);
    const principal = await prisma.principal.findUnique({ where: { id: principalId } });
    if (!principal) return res.status(404).json({ error: 'Principal not found' });
    if (principal.schoolId !== req.user.schoolId) return res.status(403).json({ error: 'Forbidden' });

    const { name, email, phone } = req.body;
    const updated = await prisma.principal.update({
      where: { id: principalId },
      data: { name, email, phone: phone || null },
    });
    return res.json({ success: true, principal: updated });
  } catch (err) {
    console.error('Error updating principal:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/principals/:id', async (req, res) => {
  try {
    const principalId = parseInt(req.params.id);
    const principal = await prisma.principal.findUnique({ where: { id: principalId } });
    if (!principal) return res.status(404).json({ error: 'Principal not found' });
    if (principal.schoolId !== req.user.schoolId) return res.status(403).json({ error: 'Forbidden' });
    
    await prisma.principal.delete({ where: { id: principalId } });
    
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting principal:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Accountants ---
router.get('/accountants', async (req, res) => {
  try {
    const accountants = await prisma.accountant.findMany({ where: { schoolId: req.user.schoolId } });
    return res.json({ success: true, accountants });
  } catch (err) {
    console.error('Error fetching accountants:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/accountants', async (req, res) => {
  const result = createAccountantSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.errors[0].message });
  try {
    const { name, email, phone, password } = result.data;
    
    // Check if email is already taken by ANY user in the system (Students use studentId, not email)
    const [admin, principal, accountant, teacher] = await Promise.all([
      prisma.admin.findUnique({ where: { email } }),
      prisma.principal.findUnique({ where: { email } }),
      prisma.accountant.findUnique({ where: { email } }),
      prisma.teacher.findUnique({ where: { email } })
    ]);
    if (admin || principal || accountant || teacher) {
      return res.status(400).json({ error: 'Email already exists in the system' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newAccountant = await prisma.accountant.create({
      data: { 
        name, 
        email, 
        phone,
        password: hashedPassword,
        schoolId: req.user.schoolId
      }
    });
    return res.status(201).json({ success: true, accountant: newAccountant });
  } catch (err) {
    console.error('Error creating accountant:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message, stack: err.stack });
  }
});

router.put('/accountants/:id', async (req, res) => {
  try {
    const accountantId = parseInt(req.params.id);
    const accountant = await prisma.accountant.findUnique({ where: { id: accountantId } });
    if (!accountant) return res.status(404).json({ error: 'Accountant not found' });
    if (accountant.schoolId !== req.user.schoolId) return res.status(403).json({ error: 'Forbidden' });

    const { name, email, phone } = req.body;
    const updated = await prisma.accountant.update({
      where: { id: accountantId },
      data: { name, email, phone: phone || null },
    });
    return res.json({ success: true, accountant: updated });
  } catch (err) {
    console.error('Error updating accountant:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/accountants/:id', async (req, res) => {
  try {
    const accountantId = parseInt(req.params.id);
    const accountant = await prisma.accountant.findUnique({ where: { id: accountantId } });
    if (!accountant) return res.status(404).json({ error: 'Accountant not found' });
    if (accountant.schoolId !== req.user.schoolId) return res.status(403).json({ error: 'Forbidden' });
    
    await prisma.accountant.delete({ where: { id: accountantId } });
    
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting accountant:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- FEE CATEGORIES API ---

router.get('/fee-categories', async (req, res) => {
  const schoolId = req.user.schoolId;
  try {
    const categories = await prisma.feeCategory.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: categories });
  } catch (err) {
    console.error('Error fetching fee categories:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/fee-categories', async (req, res) => {
  const schoolId = req.user.schoolId;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  try {
    const existing = await prisma.feeCategory.findUnique({
      where: { schoolId_name: { schoolId, name } }
    });
    if (existing) return res.status(400).json({ error: 'Fee category already exists' });

    const newCategory = await prisma.feeCategory.create({
      data: { schoolId, name, description }
    });
    return res.status(201).json({ success: true, message: 'Fee category created', data: newCategory });
  } catch (err) {
    console.error('Error creating fee category:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/fee-categories/:id', async (req, res) => {
  const schoolId = req.user.schoolId;
  const id = parseInt(req.params.id);
  const { name, description } = req.body;

  try {
    const category = await prisma.feeCategory.findUnique({ where: { id } });
    if (!category || category.schoolId !== schoolId) return res.status(404).json({ error: 'Fee category not found' });

    const updatedCategory = await prisma.feeCategory.update({
      where: { id },
      data: { name, description }
    });
    return res.json({ success: true, message: 'Fee category updated', data: updatedCategory });
  } catch (err) {
    console.error('Error updating fee category:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.delete('/fee-categories/:id', async (req, res) => {
  const schoolId = req.user.schoolId;
  const id = parseInt(req.params.id);

  try {
    const category = await prisma.feeCategory.findUnique({ where: { id } });
    if (!category || category.schoolId !== schoolId) return res.status(404).json({ error: 'Fee category not found' });

    await prisma.feeCategory.delete({ where: { id } });
    return res.json({ success: true, message: 'Fee category deleted' });
  } catch (err) {
    console.error('Error deleting fee category:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
