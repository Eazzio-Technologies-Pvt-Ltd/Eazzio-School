import express from 'express';
import prisma from '../prismaClient.js';
import { authenticateJWT } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Apply auth middleware to all accountant routes
router.use(authenticateJWT);

let cachedPasswordHash = null;
async function getCachedPasswordHash() {
  if (!cachedPasswordHash) {
    cachedPasswordHash = await bcrypt.hash('password', 10);
  }
  return cachedPasswordHash;
}

// Helper to get next student number securely without ID conflict
async function getNextStudentNumber(schoolId, schoolCode) {
  const students = await prisma.student.findMany({
    where: { schoolId },
    select: { studentId: true }
  });
  
  let maxNum = 0;
  const prefix = `${schoolCode}-ST`;
  
  students.forEach(s => {
    if (s.studentId && s.studentId.startsWith(prefix)) {
      const numStr = s.studentId.slice(prefix.length);
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });
  
  return maxNum;
}

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
        course: true,
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
        courseName: student.course ? `${student.course.courseName}-${student.course.section}` : 'N/A',
        courseId: student.courseId,
        academicYear: student.course ? student.course.academicYear : 'N/A',
        fatherName: student.fatherName || 'N/A',
        motherName: student.motherName || 'N/A',
        phone: student.phone || 'N/A',
        address: student.address || 'N/A',
        admissionDate: student.admissionDate || null,
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

// GET /api/accountant/courses - Fetch classes list for student registration dropdown
router.get('/courses', async (req, res) => {
  try {
    const classes = await prisma.course.findMany({
      where: { schoolId: req.user.schoolId },
      orderBy: { courseName: 'asc' }
    });
    return res.json({ success: true, data: classes });
  } catch (error) {
    console.error('Error fetching classes for accountant:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/accountant/students - Add student from accountant workspace
router.post('/students', async (req, res) => {
  const { name, rollNumber, courseId, fatherName, motherName, phone, address, admissionDate } = req.body;
  const schoolId = req.user.schoolId;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }

  try {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    const maxNum = await getNextStudentNumber(schoolId, school.schoolCode);
    const studentId = `${school.schoolCode}-ST${(maxNum + 1).toString().padStart(4, '0')}`;

    // Default password "password" to allow easy student login
    const passwordHash = await getCachedPasswordHash();

    const newStudent = await prisma.student.create({
      data: {
        schoolId,
        studentId,
        password: passwordHash,
        name,
        rollNumber: rollNumber || null,
        courseId: courseId ? parseInt(courseId) : null,
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

// PUT /api/accountant/students/:id - Update student details from accountant workspace
router.put('/students/:id', async (req, res) => {
  const studentId = parseInt(req.params.id);
  const schoolId = req.user.schoolId;
  const { name, rollNumber, courseId, fatherName, motherName, phone, address, admissionDate } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }

  try {
    // Verify student belongs to this school
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        name,
        rollNumber: rollNumber || null,
        courseId: courseId ? parseInt(courseId) : null,
        fatherName: fatherName || null,
        motherName: motherName || null,
        phone: phone || null,
        address: address || null,
        admissionDate: admissionDate ? new Date(admissionDate) : null,
      }
    });

    return res.json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent
    });
  } catch (error) {
    console.error('Error updating student from accountant:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/accountant/students/bulk - Bulk add students from accountant workspace
router.post('/students/bulk', async (req, res) => {
  const { students } = req.body;
  const schoolId = req.user.schoolId;

  if (!students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ success: false, error: 'No student data provided' });
  }

  try {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return res.status(404).json({ success: false, error: 'School not found' });
    }

    const classes = await prisma.course.findMany({ where: { schoolId } });
    let maxStudentNum = await getNextStudentNumber(schoolId, school.schoolCode);

    // Hashed default password
    const passwordHash = await getCachedPasswordHash();

    const createdStudents = [];
    const skippedRows = [];

    for (let i = 0; i < students.length; i++) {
      const row = students[i];
      
      // Create a normalized version of the row with lowercase, alphanumeric-only keys
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        normalizedRow[normalizedKey] = row[key];
      });

      const name = normalizedRow['name'] || normalizedRow['studentname'];
      if (!name) {
        skippedRows.push({ index: i + 1, reason: 'Name is missing' });
        continue;
      }

      // Resolve class
      let courseId = null;
      
      // 1. Try matching by direct courseId if provided in CSV
      let rawClassId = normalizedRow['classid'] || normalizedRow['idclass'];
      if (rawClassId) {
        const parsedClassId = parseInt(rawClassId, 10);
        if (!isNaN(parsedClassId)) {
          const exists = classes.some(c => c.id === parsedClassId);
          if (exists) {
            courseId = parsedClassId;
          }
        }
      }

      // 2. Try matching by courseName, section, and session/academic year
      if (!courseId) {
        let rawClassName = normalizedRow['class'] || normalizedRow['classname'] || normalizedRow['grade'] || normalizedRow['standard'] || normalizedRow['level'];
        let rawSection = normalizedRow['section'] || normalizedRow['sec'];
        let rawSession = normalizedRow['session'] || normalizedRow['academicyear'] || normalizedRow['year'] || normalizedRow['academic'];

        if (rawClassName) {
          rawClassName = rawClassName.toString().trim();
          // If class is like "10-A" or "10 A", split it
          if (!rawSection) {
            const parts = rawClassName.split(/[\s-]+/);
            if (parts.length > 1) {
              rawClassName = parts[0];
              rawSection = parts[1];
            }
          }

          if (rawSection) rawSection = rawSection.toString().trim();
          if (rawSession) rawSession = rawSession.toString().trim();

          // Strip helper prefixes like "class " (e.g. "Class 10" -> "10")
          const cleanClassName = rawClassName.replace(/^class\s+/i, '').trim().toLowerCase();

          // Match in classes list
          const matchedClass = classes.find(c => {
            const dbClassName = c.courseName.toLowerCase().trim();
            const dbSection = c.section.toLowerCase().trim();
            const dbAcademicYear = c.academicYear.toLowerCase().trim();

            // Match class name
            const courseNameMatches = dbClassName === cleanClassName;
            if (!courseNameMatches) return false;

            // Match section (if present in CSV)
            if (rawSection) {
              const sectionMatches = dbSection === rawSection.toLowerCase();
              if (!sectionMatches) return false;
            }

            // Match session/academic year (if present in CSV)
            if (rawSession) {
              const sessionClean = rawSession.toLowerCase();
              const sessionMatches = dbAcademicYear === sessionClean || 
                                     dbAcademicYear.includes(sessionClean) || 
                                     sessionClean.includes(dbAcademicYear);
              if (!sessionMatches) return false;
            }

            return true;
          });

          if (matchedClass) {
            courseId = matchedClass.id;
          }
        }
      }

      // Generate student ID
      maxStudentNum++;
      const studentId = `${school.schoolCode}-ST${maxStudentNum.toString().padStart(4, '0')}`;

      let rollNumber = normalizedRow['rollnumber'] || normalizedRow['roll'] || normalizedRow['rollno'];
      if (rollNumber) rollNumber = rollNumber.toString().trim();

      let phone = normalizedRow['phone'] || normalizedRow['phonenumber'] || normalizedRow['contact'] || normalizedRow['contactnumber'];
      if (phone) phone = phone.toString().trim();

      let fatherName = normalizedRow['fathersname'] || normalizedRow['fathername'] || normalizedRow['father'];
      if (fatherName) fatherName = fatherName.toString().trim();

      let motherName = normalizedRow['mothersname'] || normalizedRow['mothername'] || normalizedRow['mother'];
      if (motherName) motherName = motherName.toString().trim();

      let address = normalizedRow['address'] || normalizedRow['residentialaddress'];
      if (address) address = address.toString().trim();

      let admissionDate = normalizedRow['admissiondate'] || normalizedRow['dateofadmission'] || normalizedRow['doadmission'];
      if (admissionDate) {
        const parsedDate = new Date(admissionDate);
        admissionDate = isNaN(parsedDate.getTime()) ? null : parsedDate;
      }

      try {
        const student = await prisma.student.create({
          data: {
            schoolId,
            studentId,
            password: passwordHash,
            name: name.toString().trim(),
            rollNumber: rollNumber || null,
            courseId,
            fatherName: fatherName || null,
            motherName: motherName || null,
            phone: phone || null,
            address: address || null,
            admissionDate
          }
        });
        createdStudents.push(student);
      } catch (err) {
        console.error('Error creating student during bulk upload:', err);
        skippedRows.push({ index: i + 1, reason: err.message || 'Database error' });
      }
    }

    return res.json({
      success: true,
      message: `Successfully imported ${createdStudents.length} students.`,
      importedCount: createdStudents.length,
      skippedCount: skippedRows.length,
      skippedRows,
      importedStudentIds: createdStudents.map(s => s.id)
    });
  } catch (error) {
    console.error('Error during bulk upload:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/accountant/students/bulk-delete - Revert/Undo CSV bulk import
router.post('/students/bulk-delete', async (req, res) => {
  const { studentIds } = req.body;
  const schoolId = req.user.schoolId;

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ success: false, error: 'No student IDs provided' });
  }

  try {
    const deleteResult = await prisma.student.deleteMany({
      where: {
        id: { in: studentIds },
        schoolId: schoolId
      }
    });

    return res.json({
      success: true,
      message: `Successfully reverted import and deleted ${deleteResult.count} students.`
    });
  } catch (error) {
    console.error('Error bulk deleting students:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/accountant/students/:id - Delete a student from accountant workspace
router.delete('/students/:id', async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const schoolId = req.user.schoolId;

  try {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    await prisma.student.delete({
      where: { id: studentId }
    });

    return res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student from accountant:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
