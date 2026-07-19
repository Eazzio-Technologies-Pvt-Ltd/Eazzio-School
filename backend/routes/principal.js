import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prismaClient.js';
import { authenticateJWT, requirePrincipal } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTeacherSchema, createClassSchema, createStudentSchema } from '../validators/schemas.js';

const router = express.Router();

// Apply auth middlewares to all principal routes
router.use(authenticateJWT);
router.use(requirePrincipal);

// 0. Dashboard Summary
router.get('/dashboard-summary', async (req, res) => {
  const schoolId = req.user.schoolId;
  try {
    const studentCount = await prisma.student.count({ where: { schoolId } });
    const teacherCount = await prisma.teacher.count({ where: { schoolId } });
    const courseCount = await prisma.course.count({ where: { schoolId } });
    const activeNoticesCount = await prisma.notice.count({ where: { schoolId } });
    
    // Total courses (unique subjects in timetable)
    const timetables = await prisma.timetable.findMany({ 
      where: { schoolId }, 
      select: { subject: true },
      distinct: ['subject']
    });
    const totalCourses = timetables.length;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const presentToday = await prisma.attendance.count({
      where: { schoolId, date: { gte: startOfDay }, status: 'PRESENT' }
    });
    const absentToday = await prisma.attendance.count({
      where: { schoolId, date: { gte: startOfDay }, status: 'ABSENT' }
    });
    // Add late to absent? Or just 0 for leave
    const leaveToday = 0; 
    
    const totalAttendanceRecords = presentToday + absentToday;
    const globalAttendanceRate = totalAttendanceRecords > 0 ? Math.round((presentToday / totalAttendanceRecords) * 100) : 100;

    // Fee calculations
    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId },
      include: { 
        student: { select: { id: true, name: true, course: { select: { courseName: true, section: true } } } },
        payments: { where: { status: 'SUCCESS' } } 
      }
    });
    
    const studentFeeMap = {};
    invoices.forEach(inv => {
      const invPaid = inv.payments.reduce((acc, p) => acc + p.amount, 0);
      const pendingAmount = Math.max(0, inv.amount - invPaid);
      
      if (pendingAmount > 0) {
        if (!studentFeeMap[inv.studentId]) {
          studentFeeMap[inv.studentId] = {
            id: inv.student.id,
            name: inv.student.name,
            courseName: inv.student.course ? `${inv.student.course.courseName}-${inv.student.course.section}` : 'N/A',
            dueAmount: 0,
            status: inv.status
          };
        }
        studentFeeMap[inv.studentId].dueAmount += pendingAmount;
        if (inv.status === 'OVERDUE') {
          studentFeeMap[inv.studentId].status = 'OVERDUE';
        } else if (studentFeeMap[inv.studentId].status !== 'OVERDUE') {
           studentFeeMap[inv.studentId].status = 'PENDING';
        }
      }
    });

    const feeAlerts = Object.values(studentFeeMap).sort((a, b) => b.dueAmount - a.dueAmount).slice(0, 10);
    const studentsWithFeeDue = Object.keys(studentFeeMap).length;

    // Upcoming Notices
    const upcomingNotices = await prisma.notice.findMany({
      where: { schoolId },
      orderBy: { date: 'desc' },
      take: 5,
      include: { course: { select: { courseName: true, section: true } } }
    });

    // Recent Activities (simulated/aggregated from recent db entries)
    const recentActivities = [];
    
    const recentNotices = await prisma.notice.findMany({ where: { schoolId }, orderBy: { date: 'desc' }, take: 2 });
    recentNotices.forEach(n => recentActivities.push({ id: `n-${n.id}`, text: `Notice published: ${n.title}`, time: n.date, type: 'Notice' }));

    const recentStudents = await prisma.student.findMany({ where: { schoolId }, orderBy: { createdAt: 'desc' }, take: 2 });
    recentStudents.forEach(s => recentActivities.push({ id: `s-${s.id}`, text: `Student imported: ${s.name}`, time: s.createdAt, type: 'Student' }));

    const recentTeachers = await prisma.teacher.findMany({ where: { schoolId }, orderBy: { createdAt: 'desc' }, take: 2 });
    recentTeachers.forEach(t => recentActivities.push({ id: `t-${t.id}`, text: `Teacher imported: ${t.name}`, time: t.createdAt, type: 'Teacher' }));
    
    const recentClasses = await prisma.course.findMany({ where: { schoolId }, orderBy: { createdAt: 'desc' }, take: 2 });
    recentClasses.forEach(c => recentActivities.push({ id: `c-${c.id}`, text: `Class created: ${c.courseName}-${c.section}`, time: c.createdAt, type: 'Class' }));

    // Sort combined activities by time desc, take top 5
    recentActivities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const topActivities = recentActivities.slice(0, 5);

    res.json({
      totalCourses,
      totalClasses: courseCount,
      totalStudents: studentCount,
      totalTeachers: teacherCount,
      todayAttendance: {
        present: presentToday,
        absent: absentToday,
        leave: leaveToday,
        percentage: globalAttendanceRate
      },
      studentsWithFeeDue,
      activeNoticesCount,
      feeAlerts,
      upcomingNotices,
      recentActivities: topActivities
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
      include: { 
        assignedCourse: true,
        timetables: { select: { subject: true } }
      },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: teachers });
  } catch (err) {
    console.error('Error fetching teachers:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /teachers/:id - Fetch single teacher details
router.get('/teachers/:id', async (req, res) => {
  const schoolId = req.user.schoolId;
  const id = parseInt(req.params.id);

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: { 
        assignedCourse: true,
        timetables: {
          include: {
            course: true
          },
          orderBy: { dayOfWeek: 'asc' }
        }
      }
    });

    if (!teacher || teacher.schoolId !== schoolId) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    return res.json({ success: true, data: teacher });
  } catch (err) {
    console.error('Error fetching teacher:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});



// PUT /teachers/:id - Update teacher
router.put('/teachers/:id', async (req, res) => {
  const schoolId = req.user.schoolId;
  const id = parseInt(req.params.id);
  const { name, phone, courseId, subjects } = req.body;

  try {
    const existing = await prisma.teacher.findUnique({ where: { id } });
    if (!existing || existing.schoolId !== schoolId) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    const updated = await prisma.teacher.update({
      where: { id },
      data: {
        name,
        phone,
        courseId: courseId ? parseInt(courseId) : null,
        subjects: Array.isArray(subjects) ? subjects : []
      }
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating teacher:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /teachers/:id - Delete teacher
router.delete('/teachers/:id', async (req, res) => {
  const schoolId = req.user.schoolId;
  const id = parseInt(req.params.id);

  try {
    const existing = await prisma.teacher.findUnique({ where: { id } });
    if (!existing || existing.schoolId !== schoolId) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    await prisma.teacher.delete({ where: { id } });
    return res.json({ success: true, message: 'Teacher deleted successfully' });
  } catch (err) {
    console.error('Error deleting teacher:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /teachers/bulk-import-update
router.post('/teachers/bulk-import-update', async (req, res) => {
  const { teachers } = req.body;
  const schoolId = req.user.schoolId;
  
  if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
    return res.status(400).json({ error: 'Valid teachers array is required' });
  }

  try {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const teacherData of teachers) {
      if (!teacherData.name || !teacherData.email) continue;
      
      const existingTeacher = await prisma.teacher.findUnique({
        where: { email: String(teacherData.email) }
      });
      
      if (existingTeacher) {
         // Prevent updating teachers across different schools
         if (existingTeacher.schoolId !== schoolId) continue;
         
         await prisma.teacher.update({
           where: { id: existingTeacher.id },
           data: {
             name: String(teacherData.name),
             phone: teacherData.phone ? String(teacherData.phone) : existingTeacher.phone
           }
         });
         updatedCount++;
      } else {
         const teacherCount = await prisma.teacher.count({ where: { schoolId } });
         const newEmployeeId = `${school.schoolCode}-TCH${(teacherCount + 1 + createdCount).toString().padStart(3, '0')}`;
         const password = Math.random().toString(36).slice(-8);
         const passwordHash = await bcrypt.hash(password, 10);
         
         await prisma.teacher.create({
           data: {
             schoolId,
             employeeId: newEmployeeId,
             password: passwordHash,
             name: String(teacherData.name),
             email: String(teacherData.email),
             phone: teacherData.phone ? String(teacherData.phone) : null
           }
         });
         createdCount++;
      }
    }
    
    return res.json({
      success: true,
      message: `Bulk operation complete. Created: ${createdCount}, Updated: ${updatedCount}`
    });
  } catch (err) {
    console.error('Error in teachers bulk import:', err);
    return res.status(500).json({ error: 'Internal server error during bulk import' });
  }
});

// 2. Create New Course
router.post('/courses', async (req, res) => {
  const { courseName, section, academicYear } = req.body;
  if (!courseName || !section || !academicYear) return res.status(400).json({ error: 'Missing required fields' });
  
  const schoolId = req.user.schoolId;

  try {
    const existingClass = await prisma.course.findUnique({
      where: { schoolId_courseName_section_academicYear: { schoolId, courseName, section, academicYear } }
    });
    if (existingClass) return res.status(400).json({ success: false, error: 'Course already exists' });

    const newClass = await prisma.course.create({
      data: { schoolId, courseName, section, academicYear }
    });

    return res.status(201).json({ success: true, message: 'Course created successfully', data: newClass });
  } catch (err) {
    console.error('Error creating course:', err);
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
        timetables: { select: { subject: true } },
        feeStructures: true,
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

// GET /students - Fetch all students for this school with calculated fields
router.get('/students', async (req, res) => {
  const schoolId = req.user.schoolId;
  try {
    const students = await prisma.student.findMany({
      where: { schoolId },
      include: { 
        course: true,
        attendance: true,
        feeInvoices: { include: { payments: { where: { status: 'SUCCESS' } } } }
      },
      orderBy: { name: 'asc' }
    });
    
    // Process students to include computed stats
    const enrichedStudents = students.map(student => {
      // Calculate Attendance %
      let attendancePercentage = 100;
      if (student.attendance && student.attendance.length > 0) {
        const presentCount = student.attendance.filter(a => a.status === 'PRESENT').length;
        attendancePercentage = Math.round((presentCount / student.attendance.length) * 100);
      }
      
      // Calculate Fee Status
      let feeStatus = 'PAID';
      if (student.feeInvoices && student.feeInvoices.length > 0) {
        let hasPending = false;
        let hasOverdue = false;
        
        student.feeInvoices.forEach(inv => {
          const invPaid = inv.payments.reduce((acc, p) => acc + p.amount, 0);
          const pendingAmount = Math.max(0, inv.amount - invPaid);
          if (pendingAmount > 0) {
            if (inv.status === 'OVERDUE') hasOverdue = true;
            else hasPending = true;
          }
        });
        
        if (hasOverdue) feeStatus = 'OVERDUE';
        else if (hasPending) feeStatus = 'PENDING';
      }
      
      // Remove raw arrays to save bandwidth
      const { attendance, feeInvoices, ...studentData } = student;
      
      return {
        ...studentData,
        attendancePercentage,
        feeStatus
      };
    });
    
    return res.json({ success: true, data: enrichedStudents });
  } catch (err) {
    console.error('Error fetching students:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /students/bulk-import-update
router.post('/students/bulk-import-update', async (req, res) => {
  const { students } = req.body;
  const schoolId = req.user.schoolId;
  
  if (!students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: 'Valid students array is required' });
  }

  try {
    // Fetch school to get schoolCode for new students
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    
    let createdCount = 0;
    let updatedCount = 0;
    
    // Process sequentially to handle dependent creations properly
    for (const studentData of students) {
      if (!studentData.name) continue; // Skip empty rows
      
      const targetRollNumber = studentData.rollNumber ? String(studentData.rollNumber) : null;
      let existingStudent = null;
      
      // Try finding by studentId if provided
      if (studentData.studentId) {
         existingStudent = await prisma.student.findFirst({
           where: { schoolId, studentId: studentData.studentId }
         });
      }
      
      // Try finding by rollNumber if no studentId matched
      if (!existingStudent && targetRollNumber) {
         existingStudent = await prisma.student.findFirst({
           where: { schoolId, rollNumber: targetRollNumber }
         });
      }
      
      // Try matching Course
      let courseId = null;
      if (studentData.courseName && studentData.section && studentData.academicYear) {
         const course = await prisma.course.findUnique({
           where: { schoolId_courseName_section_academicYear: { schoolId, courseName: studentData.courseName, section: String(studentData.section), academicYear: String(studentData.academicYear) } }
         });
         if (course) courseId = course.id;
      }
      
      if (existingStudent) {
         // Update
         await prisma.student.update({
           where: { id: existingStudent.id },
           data: {
             name: studentData.name,
             fatherName: studentData.fatherName || existingStudent.fatherName,
             motherName: studentData.motherName || existingStudent.motherName,
             phone: studentData.phone ? String(studentData.phone) : existingStudent.phone,
             address: studentData.address || existingStudent.address,
             rollNumber: targetRollNumber || existingStudent.rollNumber,
             courseId: courseId || existingStudent.courseId
           }
         });
         updatedCount++;
      } else {
         // Create
         const studentCount = await prisma.student.count({ where: { schoolId } });
         const newStudentId = `${school.schoolCode}-ST${(studentCount + 1).toString().padStart(4, '0')}`;
         const password = Math.random().toString(36).slice(-8);
         const passwordHash = await bcrypt.hash(password, 10);
         
         await prisma.student.create({
           data: {
             schoolId,
             studentId: newStudentId,
             password: passwordHash,
             name: studentData.name,
             fatherName: studentData.fatherName,
             motherName: studentData.motherName,
             phone: studentData.phone ? String(studentData.phone) : null,
             address: studentData.address,
             rollNumber: targetRollNumber,
             courseId
           }
         });
         createdCount++;
      }
    }
    
    return res.json({ success: true, message: `Bulk operation complete. Created: ${createdCount}, Updated: ${updatedCount}` });
  } catch (err) {
    console.error('Error in bulk import:', err);
    return res.status(500).json({ error: 'Internal server error during bulk import' });
  }
});

// GET /students/:id - Fetch single student details
router.get('/students/:id', async (req, res) => {
  const schoolId = req.user.schoolId;
  const id = parseInt(req.params.id);

  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: { 
        course: true,
        attendance: { orderBy: { date: 'asc' } },
        feeInvoices: { include: { payments: { where: { status: 'SUCCESS' } } } }
      }
    });

    if (!student || student.schoolId !== schoolId) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Process stats
    let attendancePercentage = 100;
    const monthlyAttendance = [];
    
    if (student.attendance && student.attendance.length > 0) {
      const presentCount = student.attendance.filter(a => a.status === 'PRESENT').length;
      attendancePercentage = Math.round((presentCount / student.attendance.length) * 100);
      
      // Calculate monthly breakdown
      const months = {};
      student.attendance.forEach(record => {
        const d = new Date(record.date);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!months[monthKey]) {
          months[monthKey] = { total: 0, present: 0 };
        }
        months[monthKey].total += 1;
        if (record.status === 'PRESENT') {
          months[monthKey].present += 1;
        }
      });
      
      for (const [month, data] of Object.entries(months)) {
        monthlyAttendance.push({
          month,
          percentage: Math.round((data.present / data.total) * 100)
        });
      }
    }
    
    let feeStatus = 'PAID';
    if (student.feeInvoices && student.feeInvoices.length > 0) {
      let hasPending = false;
      let hasOverdue = false;
      student.feeInvoices.forEach(inv => {
        const invPaid = inv.payments.reduce((acc, p) => acc + p.amount, 0);
        const pendingAmount = Math.max(0, inv.amount - invPaid);
        if (pendingAmount > 0) {
          if (inv.status === 'OVERDUE' || new Date(inv.dueDate) < new Date()) {
            hasOverdue = true;
          } else {
            hasPending = true;
          }
        }
      });
      if (hasOverdue) feeStatus = 'OVERDUE';
      else if (hasPending) feeStatus = 'PENDING';
    }

    // Fetch Timetables
    const timetables = student.courseId ? await prisma.timetable.findMany({
      where: { courseId: student.courseId },
      include: { teacher: true }
    }) : [];

    // Fetch Notices
    const notices = await prisma.notice.findMany({
      where: {
        schoolId,
        OR: [
          { audience: 'SCHOOL' },
          { audience: 'STUDENTS' },
          ...(student.courseId ? [{ audience: 'CLASS', courseId: student.courseId }] : [])
        ]
      },
      orderBy: { date: 'desc' },
      take: 5
    });

    const { attendance, feeInvoices, ...studentData } = student;
    return res.json({ 
      success: true, 
      data: { 
        ...studentData, 
        attendancePercentage, 
        monthlyAttendance,
        feeStatus, 
        feeInvoices,
        timetables,
        notices
      } 
    });
  } catch (err) {
    console.error('Error fetching student:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /students/:id - Update student details
router.put('/students/:id', async (req, res) => {
  const schoolId = req.user.schoolId;
  const id = parseInt(req.params.id);
  const { name, fatherName, motherName, phone, address, rollNumber, courseId } = req.body;

  try {
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student || student.schoolId !== schoolId) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        name,
        fatherName,
        motherName,
        phone: phone ? String(phone) : null,
        address,
        rollNumber,
        courseId: courseId ? parseInt(courseId) : null
      }
    });

    return res.json({ success: true, data: updatedStudent });
  } catch (err) {
    console.error('Error updating student:', err);
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

router.get('/attendance-detail', async (req, res) => {
  const schoolId = req.user.schoolId;
  const { courseId, date } = req.query;

  if (!courseId || !date) {
    return res.status(400).json({ error: 'courseId and date are required' });
  }

  try {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);

    const students = await prisma.student.findMany({
      where: { schoolId, courseId: parseInt(courseId) },
      orderBy: { name: 'asc' },
      include: {
        attendance: {
          where: {
            date: {
              gte: targetDate,
              lt: nextDay
            }
          }
        }
      }
    });

    let presentLogs = 0;
    const totalStudents = students.length;

    const details = students.map(student => {
      const record = student.attendance.length > 0 ? student.attendance[0] : null;
      if (record && record.status === 'PRESENT') presentLogs++;
      
      return {
        id: student.id,
        studentId: student.studentId,
        name: student.name,
        rollNumber: student.rollNumber || '-',
        status: record ? record.status : 'UNMARKED'
      };
    });

    const percentage = totalStudents > 0 ? Math.round((presentLogs / totalStudents) * 100) : 0;

    return res.json({
      success: true,
      data: {
        percentage,
        totalStudents,
        present: presentLogs,
        absent: totalStudents - presentLogs,
        students: details
      }
    });
  } catch (err) {
    console.error('Error fetching attendance detail:', err);
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
    const tId = parseInt(teacherId);
    const cId = parseInt(courseId);
    
    const teacherBusy = await prisma.timetable.findFirst({
      where: { schoolId, teacherId: tId, dayOfWeek, period }
    });
    if (teacherBusy) {
      return res.status(400).json({ error: 'This teacher is already assigned to a class during this period.' });
    }

    const courseBusy = await prisma.timetable.findFirst({
      where: { schoolId, courseId: cId, dayOfWeek, period }
    });
    if (courseBusy) {
      return res.status(400).json({ error: 'This course already has a subject assigned during this period.' });
    }

    const newTimetable = await prisma.timetable.create({
      data: {
        schoolId,
        teacherId: tId,
        courseId: cId,
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

// --- COURSES ADDITIONAL ---
router.get('/courses/:id', async (req, res) => {
  const schoolId = req.user.schoolId;
  const id = parseInt(req.params.id);
  try {
    const cls = await prisma.course.findUnique({
      where: { id },
      include: {
        teacher: true,
        students: true,
        timetables: { select: { subject: true } },
        feeStructures: true
      }
    });
    if (!cls || cls.schoolId !== schoolId) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true, data: cls });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/courses/:id', async (req, res) => {
  const schoolId = req.user.schoolId;
  const id = parseInt(req.params.id);
  const { courseName, section, academicYear } = req.body;
  try {
    const cls = await prisma.course.findUnique({ where: { id } });
    if (!cls || cls.schoolId !== schoolId) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.course.update({
      where: { id },
      data: { courseName, section, academicYear }
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/courses/:id', async (req, res) => {
  const schoolId = req.user.schoolId;
  const id = parseInt(req.params.id);
  try {
    const cls = await prisma.course.findUnique({ where: { id } });
    if (!cls || cls.schoolId !== schoolId) return res.status(404).json({ error: 'Not found' });
    await prisma.course.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Settings & Profile ---
router.get('/settings', async (req, res) => {
  const schoolId = req.user.schoolId;
  const principalId = req.user.userId;
  try {
    const principal = await prisma.principal.findUnique({
      where: { id: principalId },
      select: { id: true, name: true, email: true, phone: true }
    });
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { schoolName: true, email: true, phone: true, address: true, maxStudents: true, studentCount: true, schoolCode: true, subscriptionStatus: true }
    });
    return res.json({ success: true, data: { principal, school } });
  } catch (err) {
    console.error('Error fetching settings:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings/profile', async (req, res) => {
  const principalId = req.user.userId;
  const { name, email, phone } = req.body;
  try {
    // Check if email is taken by another principal
    const existing = await prisma.principal.findUnique({ where: { email } });
    if (existing && existing.id !== principalId) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    const updated = await prisma.principal.update({
      where: { id: principalId },
      data: { name, email, phone }
    });
    return res.json({ success: true, data: { name: updated.name, email: updated.email, phone: updated.phone } });
  } catch (err) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings/password', async (req, res) => {
  const principalId = req.user.userId;
  const { currentPassword, newPassword } = req.body;
  try {
    const principal = await prisma.principal.findUnique({ where: { id: principalId } });
    const isMatch = await bcrypt.compare(currentPassword, principal.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.principal.update({
      where: { id: principalId },
      data: { password: hashedPassword }
    });
    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error updating password:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
