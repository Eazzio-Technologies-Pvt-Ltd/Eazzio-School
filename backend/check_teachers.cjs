const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Let's assume the teacher is logged in. Let's see all teachers and their courses.
  const teachers = await prisma.teacher.findMany({ include: { assignedCourse: { include: { students: true } } } });
  console.log(JSON.stringify(teachers, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
