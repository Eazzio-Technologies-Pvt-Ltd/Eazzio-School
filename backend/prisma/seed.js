import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging old database records...');
  // Delete in reverse order of dependencies
  await prisma.feePayment.deleteMany({});
  await prisma.feeInvoice.deleteMany({});
  await prisma.feeStructure.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.timetable.deleteMany({});
  await prisma.notice.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.teacher.deleteMany({});
  await prisma.accountant.deleteMany({});
  await prisma.principal.deleteMany({});
  await prisma.admin.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.school.deleteMany({});

  console.log('🔑 Hashing passwords...');
  const passwordHash = await bcrypt.hash('password123', 10);

  console.log('🏫 Seeding School...');
  const school = await prisma.school.create({
    data: {
      schoolName: 'Greenwood High School',
      email: 'contact@greenwood.edu',
      phone: '1234567890',
      address: '123 Academic Way, Education City',
      schoolCode: 'SCH001',
      subscriptionStatus: 'ACTIVE',
      maxStudents: 500,
    }
  });

  console.log('👤 Seeding Admin...');
  await prisma.admin.create({
    data: {
      schoolId: school.id,
      name: 'Master Admin',
      email: 'admin@demo.com',
      password: passwordHash,
      phone: '9999999999',
    }
  });

  console.log('👤 Seeding Principal...');
  await prisma.principal.create({
    data: {
      schoolId: school.id,
      name: 'Dr. Sarah Smith',
      email: 'principal@demo.com',
      password: passwordHash,
      phone: '8888888888',
    }
  });

  console.log('👤 Seeding Accountant...');
  await prisma.accountant.create({
    data: {
      schoolId: school.id,
      name: 'John Accountant',
      email: 'accountant@demo.com',
      password: passwordHash,
      phone: '7777777777',
    }
  });

  console.log('👩‍🏫 Seeding Teachers...');
  const teacherNames = ['Emily Davis', 'Marcus Stone', 'Sarah Jenkins'];
  const teachers = [];
  for (let i = 0; i < teacherNames.length; i++) {
    const teacher = await prisma.teacher.create({
      data: {
        schoolId: school.id,
        name: teacherNames[i],
        email: `teacher${i + 1}@demo.com`,
        password: passwordHash,
        employeeId: `TCH${(i + 1).toString().padStart(3, '0')}`,
        phone: `666666666${i}`,
      }
    });
    teachers.push(teacher);
  }

  console.log('🏫 Seeding Courses...');
  const coursesData = [
    { courseName: 'Grade 10', section: 'A', academicYear: '2025-2026', teacherId: teachers[0].id },
    { courseName: 'Grade 10', section: 'B', academicYear: '2025-2026', teacherId: teachers[1].id },
    { courseName: 'Grade 9', section: 'A', academicYear: '2025-2026', teacherId: teachers[2].id },
  ];

  const courses = [];
  for (const c of coursesData) {
    const course = await prisma.course.create({
      data: {
        schoolId: school.id,
        courseName: c.courseName,
        section: c.section,
        academicYear: c.academicYear,
        teacherId: c.teacherId,
      }
    });
    courses.push(course);
  }

  console.log('🎒 Seeding Students...');
  const students = [];
  // Seed 15 students
  for (let i = 1; i <= 15; i++) {
    const course = courses[(i - 1) % courses.length];
    const student = await prisma.student.create({
      data: {
        schoolId: school.id,
        studentId: `STU${String(i).padStart(3, '0')}`,
        password: passwordHash,
        name: `Student ${i}`,
        fatherName: `Father of Student ${i}`,
        motherName: `Mother of Student ${i}`,
        phone: `55555555${String(i).padStart(2, '0')}`,
        address: `${i} Green Park Avenue`,
        courseId: course.id,
        rollNumber: `ROLL-${String(i).padStart(3, '0')}`,
        admissionDate: new Date(),
      }
    });
    students.push(student);
  }

  console.log('📋 Seeding Fee Structures...');
  const feeStructuresData = [
    { courseId: courses[0].id, feeType: 'Tuition Fee', amount: 2500, planType: 'MONTHLY' },
    { courseId: courses[0].id, feeType: 'Exam Fee', amount: 1500, planType: 'QUARTERLY' },
    { courseId: courses[1].id, feeType: 'Tuition Fee', amount: 2400, planType: 'MONTHLY' },
    { courseId: courses[2].id, feeType: 'Tuition Fee', amount: 2200, planType: 'MONTHLY' },
    { courseId: null, feeType: 'Annual Sport Fee', amount: 1000, planType: 'YEARLY' },
    { courseId: null, feeType: 'Library Fund', amount: 500, planType: 'HALF_YEARLY' },
  ];

  for (const f of feeStructuresData) {
    await prisma.feeStructure.create({
      data: {
        schoolId: school.id,
        courseId: f.courseId,
        feeType: f.feeType,
        amount: f.amount,
        planType: f.planType,
      }
    });
  }

  console.log('📅 Seeding Attendance Statuses...');
  const dates = [
    new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
    new Date(), // today
  ];

  for (const date of dates) {
    for (const student of students) {
      await prisma.attendance.create({
        data: {
          schoolId: school.id,
          studentId: student.id,
          courseId: student.courseId,
          date,
          status: Math.random() > 0.1 ? 'PRESENT' : 'ABSENT',
        }
      });
    }
  }

  console.log('🎉 Seeding completed successfully!');
  console.log('\nLogin Credentials (password: password123):');
  console.log('- Admin: admin@demo.com');
  console.log('- Principal: principal@demo.com');
  console.log('- Accountant: accountant@demo.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
