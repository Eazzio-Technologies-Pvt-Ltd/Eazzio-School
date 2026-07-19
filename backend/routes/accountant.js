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
        className: student.course ? `${student.course.courseName}-${student.course.section}` : 'N/A',
        courseName: student.course ? `${student.course.courseName}-${student.course.section}` : 'N/A',
        classId: student.courseId,
        courseId: student.courseId,
        academicYear: student.course ? student.course.academicYear : 'N/A',
        fatherName: student.fatherName || 'N/A',
        motherName: student.motherName || 'N/A',
        phone: student.phone || 'N/A',
        address: student.address || 'N/A',
        admissionDate: student.admissionDate || null,
        feeCycle: 'MONTHLY',
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
    const courses = await prisma.course.findMany({
      where: { schoolId: req.user.schoolId },
      include: {
        _count: {
          select: { students: true }
        },
        feeStructures: true
      },
      orderBy: { courseName: 'asc' }
    });
    // Map courseName to className for frontend compatibility and calculate total fees
    const mapped = courses.map(c => {
      const totalFees = c.feeStructures ? c.feeStructures.reduce((sum, fs) => sum + fs.amount, 0) : 0;
      return {
        ...c,
        className: c.courseName,
        totalFees,
        feesList: c.feeStructures || []
      };
    });
    return res.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Error fetching classes for accountant:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/accountant/students - Add student from accountant workspace
router.post('/students', async (req, res) => {
  const { name, rollNumber, classId, fatherName, motherName, phone, address, admissionDate, feeCycle } = req.body;
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
        courseId: (classId) ? parseInt(classId) : null,
        fatherName: fatherName || null,
        motherName: motherName || null,
        phone: phone || null,
        address: address || null,
        admissionDate: admissionDate ? new Date(admissionDate) : null
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
  const { name, rollNumber, classId, fatherName, motherName, phone, address, admissionDate, feeCycle } = req.body;

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
        courseId: classId ? parseInt(classId) : null,
        fatherName: fatherName || null,
        motherName: motherName || null,
        phone: phone || null,
        address: address || null,
        admissionDate: admissionDate ? new Date(admissionDate) : null
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

    const courses = await prisma.course.findMany({ where: { schoolId } });
    const classes = courses.map(c => ({ ...c, className: c.courseName }));
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
      let classId = null;
      
      // 1. Try matching by direct classId if provided in CSV
      let rawClassId = normalizedRow['classid'] || normalizedRow['idclass'];
      if (rawClassId) {
        const parsedClassId = parseInt(rawClassId, 10);
        if (!isNaN(parsedClassId)) {
          const exists = classes.some(c => c.id === parsedClassId);
          if (exists) {
            classId = parsedClassId;
          }
        }
      }

      // 2. Try matching by className, section, and session/academic year
      if (!classId) {
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
            const dbClassName = c.className.toLowerCase().trim();
            const dbSection = c.section.toLowerCase().trim();
            const dbAcademicYear = c.academicYear.toLowerCase().trim();

            // Match class name
            const classNameMatches = dbClassName === cleanClassName;
            if (!classNameMatches) return false;

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
            classId = matchedClass.id;
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
            courseId: classId,
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

// POST /api/accountant/classes - Create a new class/course
router.post('/classes', async (req, res) => {
  const { className, section, academicYear, fees, planType, feeType, oneTimeFee } = req.body;
  const schoolId = req.user.schoolId;

  if (!className || !section || !academicYear) {
    return res.status(400).json({ success: false, error: 'Class/Course name, section, and session are required' });
  }

  try {
    const newClass = await prisma.course.create({
      data: {
        schoolId,
        courseName: className,
        section,
        academicYear
      }
    });

    const parsedFees = parseInt(fees, 10);
    if (!isNaN(parsedFees) && parsedFees > 0) {
      await prisma.feeStructure.create({
        data: {
          schoolId,
          courseId: newClass.id,
          feeType: feeType || 'Tuition Fee',
          amount: parsedFees,
          planType: planType || 'MONTHLY'
        }
      });
    }

    const parsedOneTime = parseInt(oneTimeFee, 10);
    if (!isNaN(parsedOneTime) && parsedOneTime > 0) {
      await prisma.feeStructure.create({
        data: {
          schoolId,
          courseId: newClass.id,
          feeType: 'Admission Fee',
          amount: parsedOneTime,
          planType: 'ONE_TIME'
        }
      });
    }

    const updatedFeeStructures = await prisma.feeStructure.findMany({
      where: { courseId: newClass.id }
    });

    const mapped = {
      ...newClass,
      className: newClass.courseName,
      totalFees: updatedFeeStructures.reduce((sum, fs) => sum + fs.amount, 0),
      feesList: updatedFeeStructures
    };
    return res.status(201).json({ success: true, message: 'Class/Course created successfully', data: mapped });
  } catch (error) {
    console.error('Error creating class:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'A class/course with this name, section, and session already exists' });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/accountant/invoices - Create fee invoice(s)
router.post('/invoices', async (req, res) => {
  const { studentId, classId, feeType, amount, dueDate } = req.body;
  const schoolId = req.user.schoolId;

  if (!feeType || !amount || !dueDate) {
    return res.status(400).json({ success: false, error: 'Fee type, amount, and due date are required' });
  }

  const parsedAmount = parseInt(amount, 10);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
  }

  try {
    if (studentId) {
      const student = await prisma.student.findFirst({
        where: { id: parseInt(studentId), schoolId }
      });
      if (!student) {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }

      const invoice = await prisma.feeInvoice.create({
        data: {
          schoolId,
          studentId: student.id,
          feeType,
          amount: parsedAmount,
          dueDate: new Date(dueDate),
          status: 'PENDING'
        }
      });
      return res.status(201).json({ success: true, message: 'Fee invoice created successfully', data: [invoice] });
    } else if (classId) {
      const students = await prisma.student.findMany({
        where: { courseId: parseInt(classId), schoolId }
      });

      if (students.length === 0) {
        return res.status(400).json({ success: false, error: 'No students found in the selected class' });
      }

      const invoiceData = students.map(student => ({
        schoolId,
        studentId: student.id,
        feeType,
        amount: parsedAmount,
        dueDate: new Date(dueDate),
        status: 'PENDING'
      }));

      await prisma.feeInvoice.createMany({
        data: invoiceData
      });

      return res.status(201).json({
        success: true,
        message: `Successfully created ${students.length} invoices for the class`
      });
    } else {
      return res.status(400).json({ success: false, error: 'Either student ID or class ID must be provided' });
    }
  } catch (error) {
    console.error('Error creating invoice:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/accountant/invoices - Fetch invoices (with options to filter by student)
router.get('/invoices', async (req, res) => {
  const schoolId = req.user.schoolId;
  const { studentId } = req.query;

  try {
    const whereClause = { schoolId };
    if (studentId) {
      whereClause.studentId = parseInt(studentId);
    }

    const invoices = await prisma.feeInvoice.findMany({
      where: whereClause,
      include: {
        student: true,
        payments: {
          where: { status: 'SUCCESS' }
        }
      },
      orderBy: { dueDate: 'desc' }
    });

    return res.json({ success: true, data: invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/accountant/payments - Record a fee payment
router.post('/payments', async (req, res) => {
  const { feeInvoiceId, amount, paymentMethod, receiptNumber } = req.body;
  const schoolId = req.user.schoolId;

  if (!feeInvoiceId || !amount || !paymentMethod) {
    return res.status(400).json({ success: false, error: 'Invoice ID, amount, and payment method are required' });
  }

  const parsedAmount = parseInt(amount, 10);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
  }

  try {
    const invoice = await prisma.feeInvoice.findFirst({
      where: { id: parseInt(feeInvoiceId), schoolId },
      include: { payments: { where: { status: 'SUCCESS' } } }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Record payment
    const payment = await prisma.feePayment.create({
      data: {
        schoolId,
        studentId: invoice.studentId,
        feeInvoiceId: invoice.id,
        amount: parsedAmount,
        status: 'SUCCESS',
        paymentMethod,
        receiptNumber: receiptNumber || null,
        date: new Date()
      }
    });

    // Recalculate status of the invoice
    const totalPaidBefore = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaidNow = totalPaidBefore + parsedAmount;

    let newStatus = 'PENDING';
    if (totalPaidNow >= invoice.amount) {
      newStatus = 'PAID';
    }

    await prisma.feeInvoice.update({
      where: { id: invoice.id },
      data: { status: newStatus }
    });

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/accountant/classes/:id - Update class details
router.put('/classes/:id', async (req, res) => {
  const classId = parseInt(req.params.id);
  const schoolId = req.user.schoolId;
  const { className, section, academicYear, fees, planType, feeType, oneTimeFee } = req.body;

  if (!className || !section || !academicYear) {
    return res.status(400).json({ success: false, error: 'Class name, section, and academic year are required' });
  }

  try {
    const cls = await prisma.course.findFirst({
      where: { id: classId, schoolId }
    });

    if (!cls) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    const updatedClass = await prisma.course.update({
      where: { id: classId },
      data: { courseName: className, section, academicYear }
    });

    // Check if there is an existing Tuition Fee / FeeStructure for this course
    const parsedFees = parseInt(fees, 10);
    if (!isNaN(parsedFees)) {
      const existingFee = await prisma.feeStructure.findFirst({
        where: { courseId: classId, schoolId, planType: { not: 'ONE_TIME' } }
      });

      if (existingFee) {
        if (parsedFees > 0) {
          await prisma.feeStructure.update({
            where: { id: existingFee.id },
            data: { 
              feeType: feeType || existingFee.feeType,
              amount: parsedFees, 
              planType: planType || existingFee.planType 
            }
          });
        } else {
          // If updated fee is 0 or less, delete the Fee structure
          await prisma.feeStructure.delete({
            where: { id: existingFee.id }
          });
        }
      } else if (parsedFees > 0) {
        // Create new Fee structure
        await prisma.feeStructure.create({
          data: {
            schoolId,
            courseId: classId,
            feeType: feeType || 'Tuition Fee',
            amount: parsedFees,
            planType: planType || 'MONTHLY'
          }
        });
      }
    }

    // Check if there is an existing One-Time Fee for this course
    const parsedOneTime = parseInt(oneTimeFee, 10);
    if (!isNaN(parsedOneTime)) {
      const existingOneTime = await prisma.feeStructure.findFirst({
        where: { courseId: classId, schoolId, planType: 'ONE_TIME' }
      });

      if (existingOneTime) {
        if (parsedOneTime > 0) {
          await prisma.feeStructure.update({
            where: { id: existingOneTime.id },
            data: { amount: parsedOneTime }
          });
        } else {
          await prisma.feeStructure.delete({
            where: { id: existingOneTime.id }
          });
        }
      } else if (parsedOneTime > 0) {
        await prisma.feeStructure.create({
          data: {
            schoolId,
            courseId: classId,
            feeType: 'Admission Fee',
            amount: parsedOneTime,
            planType: 'ONE_TIME'
          }
        });
      }
    }

    // Fetch updated structures
    const updatedFeeStructures = await prisma.feeStructure.findMany({
      where: { courseId: classId }
    });
    const totalFees = updatedFeeStructures.reduce((sum, fs) => sum + fs.amount, 0);

    const mapped = {
      ...updatedClass,
      className: updatedClass.courseName,
      totalFees,
      feesList: updatedFeeStructures
    };

    return res.json({ success: true, message: 'Class updated successfully', data: mapped });
  } catch (error) {
    console.error('Error updating class:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'A class/course with this name, section, and session already exists' });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/accountant/classes/:id - Delete class and disconnect students/related records
router.delete('/classes/:id', async (req, res) => {
  const classId = parseInt(req.params.id);
  const schoolId = req.user.schoolId;

  try {
    const cls = await prisma.course.findFirst({
      where: { id: classId, schoolId }
    });

    if (!cls) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    // 1. Set courseId to null for all students in this class
    await prisma.student.updateMany({
      where: { courseId: classId, schoolId },
      data: { courseId: null }
    });

    // 2. Delete related notices
    await prisma.notice.deleteMany({
      where: { courseId: classId, schoolId }
    });

    // 3. Delete related timetables
    await prisma.timetable.deleteMany({
      where: { courseId: classId, schoolId }
    });

    // 4. Delete related feeStructures
    await prisma.feeStructure.deleteMany({
      where: { courseId: classId, schoolId }
    });

    // 5. Delete class
    await prisma.course.delete({
      where: { id: classId }
    });

    return res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/accountant/fee-structures - Fetch all fee structures
router.get('/fee-structures', async (req, res) => {
  try {
    const feeStructures = await prisma.feeStructure.findMany({
      where: { schoolId: req.user.schoolId },
      include: {
        course: {
          select: {
            id: true,
            courseName: true,
            section: true
          }
        }
      },
      orderBy: { id: 'desc' }
    });
    const mapped = feeStructures.map(fs => ({
      ...fs,
      class: fs.course ? {
        id: fs.course.id,
        className: fs.course.courseName,
        section: fs.course.section
      } : null
    }));
    return res.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Error fetching fee structures:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/accountant/fee-structures - Create a new fee structure
router.post('/fee-structures', async (req, res) => {
  const { classId, feeType, amount, dueDate, planType } = req.body;
  const schoolId = req.user.schoolId;

  if (!feeType || !amount) {
    return res.status(400).json({ success: false, error: 'Fee type and amount are required' });
  }

  const parsedAmount = parseInt(amount, 10);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
  }

  try {
    const newStructure = await prisma.feeStructure.create({
      data: {
        schoolId,
        courseId: classId ? parseInt(classId, 10) : null,
        feeType,
        amount: parsedAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
        planType: planType || 'MONTHLY'
      },
      include: {
        course: {
          select: {
            id: true,
            courseName: true,
            section: true
          }
        }
      }
    });

    const mapped = {
      ...newStructure,
      class: newStructure.course ? {
        id: newStructure.course.id,
        className: newStructure.course.courseName,
        section: newStructure.course.section
      } : null
    };

    return res.status(201).json({ success: true, message: 'Fee structure created successfully', data: mapped });
  } catch (error) {
    console.error('Error creating fee structure:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/accountant/fee-structures/:id - Update an existing fee structure
router.put('/fee-structures/:id', async (req, res) => {
  const structureId = parseInt(req.params.id);
  const schoolId = req.user.schoolId;
  const { classId, feeType, amount, dueDate, planType } = req.body;

  if (!feeType || !amount) {
    return res.status(400).json({ success: false, error: 'Fee type and amount are required' });
  }

  const parsedAmount = parseInt(amount, 10);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
  }

  try {
    const structure = await prisma.feeStructure.findFirst({
      where: { id: structureId, schoolId }
    });

    if (!structure) {
      return res.status(404).json({ success: false, error: 'Fee structure not found' });
    }

    const updatedStructure = await prisma.feeStructure.update({
      where: { id: structureId },
      data: {
        courseId: classId ? parseInt(classId, 10) : null,
        feeType,
        amount: parsedAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
        planType: planType || 'MONTHLY'
      },
      include: {
        course: {
          select: {
            id: true,
            courseName: true,
            section: true
          }
        }
      }
    });

    const mapped = {
      ...updatedStructure,
      class: updatedStructure.course ? {
        id: updatedStructure.course.id,
        className: updatedStructure.course.courseName,
        section: updatedStructure.course.section
      } : null
    };

    return res.json({ success: true, message: 'Fee structure updated successfully', data: mapped });
  } catch (error) {
    console.error('Error updating fee structure:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/accountant/fee-structures/:id - Delete an existing fee structure
router.delete('/fee-structures/:id', async (req, res) => {
  const structureId = parseInt(req.params.id);
  const schoolId = req.user.schoolId;

  try {
    const structure = await prisma.feeStructure.findFirst({
      where: { id: structureId, schoolId }
    });

    if (!structure) {
      return res.status(404).json({ success: false, error: 'Fee structure not found' });
    }

    await prisma.feeStructure.delete({
      where: { id: structureId }
    });

    return res.json({ success: true, message: 'Fee structure deleted successfully' });
  } catch (error) {
    console.error('Error deleting fee structure:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
