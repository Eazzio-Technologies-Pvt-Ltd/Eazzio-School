import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function getLast10Weekdays() {
  const dates = [];
  const today = new Date();
  let curr = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  while (dates.length < 10) {
    curr.setUTCDate(curr.getUTCDate() - 1);
    const day = curr.getUTCDay();
    if (day !== 0 && day !== 6) { // 0 = Sunday, 6 = Saturday
      dates.push(new Date(curr));
    }
  }
  return dates;
}

async function main() {
  console.log('🧹 Purging database records...');
  await prisma.attendance.deleteMany({});
  await prisma.studentProfile.deleteMany({});
  await prisma.teacherProfile.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🔑 Hashing passwords...');
  const legacyHash = await bcrypt.hash('adminpassword', 10);
  const demoHash = await bcrypt.hash('123456', 10);

  // 1. Seed Principal/Admin Accounts
  console.log('👤 Seeding Principal accounts...');
  await prisma.user.create({
    data: {
      name: 'Master Principal',
      email: 'principal@school.com',
      passwordHash: legacyHash,
      role: 'PRINCIPAL',
    },
  });

  await prisma.user.create({
    data: {
      name: 'School Principal (Demo)',
      email: 'principal@demo.com',
      passwordHash: demoHash,
      role: 'PRINCIPAL',
    },
  });

  // 2. Seed 3 Teachers
  console.log('👩‍🏫 Seeding Teacher accounts...');
  const teachersData = [
    { name: 'Emily Davis', email: 'teacher1@demo.com', assignedClass: 'Grade 10-A' },
    { name: 'Marcus Stone', email: 'teacher2@demo.com', assignedClass: 'Grade 10-B' },
    { name: 'Sarah Jenkins', email: 'teacher3@demo.com', assignedClass: 'Grade 9-A' },
  ];

  const teachers = [];
  for (const t of teachersData) {
    const user = await prisma.user.create({
      data: {
        name: t.name,
        email: t.email,
        passwordHash: demoHash,
        role: 'TEACHER',
      },
    });

    const profile = await prisma.teacherProfile.create({
      data: {
        userId: user.id,
        assignedClass: t.assignedClass,
      },
    });
    teachers.push({ user, profile });
  }

  // 3. Seed 25 Students
  console.log('🎒 Seeding 25 Student accounts...');
  const studentClasses = [
    ...Array(10).fill('Grade 10-A'), // 1 to 10
    ...Array(8).fill('Grade 10-B'),  // 11 to 18
    ...Array(7).fill('Grade 9-A'),   // 19 to 25
  ];

  const students = [];
  for (let i = 1; i <= 25; i++) {
    const name = `Student ${i}`;
    const email = `student${i}@demo.com`;
    const rollNumber = `ROLL-${String(i).padStart(3, '0')}`;
    const gradeClass = studentClasses[i - 1];
    
    // Distribute fees (17 Paid, 8 Pending)
    const feeStatus = i % 3 === 0 ? 'PENDING' : 'PAID';
    const totalFees = 3500;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: demoHash,
        role: 'STUDENT',
      },
    });

    const profile = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        rollNumber,
        gradeClass,
        feeStatus,
        totalFees,
      },
    });
    students.push({ user, profile, index: i });
  }

  // 4. Seed Attendance Logs for the last 10 school days
  console.log('📅 Seeding 10-day attendance roll records...');
  const schoolDays = getLast10Weekdays();

  for (const date of schoolDays) {
    await prisma.$transaction(
      students.map(({ profile, index }) => {
        let status = 'PRESENT';

        // Student 3 and 7: absent on 4 specific days to yield 60% attendance rate (risk alert)
        if ((index === 3 || index === 7) && [0, 2, 5, 8].includes(schoolDays.indexOf(date))) {
          status = 'ABSENT';
        }
        // Student 12: absent on 3 days to yield 70% rate
        else if (index === 12 && [1, 4, 7].includes(schoolDays.indexOf(date))) {
          status = 'ABSENT';
        }
        // Other students: randomly absent on at most 1 day
        else if (index !== 3 && index !== 7 && index !== 12 && index % 11 === 0 && schoolDays.indexOf(date) === 3) {
          status = 'ABSENT';
        }

        return prisma.attendance.create({
          data: {
            studentId: profile.id,
            date,
            status,
          },
        });
      })
    );
  }

  console.log('🎉 Demo Seeding Completed Successfully!');
  console.log('\n--- Seeding Summary ---');
  console.log('Admins/Principals:');
  console.log('- principal@school.com / adminpassword (legacy)');
  console.log('- principal@demo.com / 123456');
  console.log('\nTeachers (password: 123456):');
  teachers.forEach(t => {
    console.log(`- ${t.user.email} (${t.profile.assignedClass})`);
  });
  console.log('\nStudents (password: 123456):');
  console.log('- student1@demo.com through student25@demo.com');
  console.log('- Attendance Logs: Past 10 weekdays generated with risk flags.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
