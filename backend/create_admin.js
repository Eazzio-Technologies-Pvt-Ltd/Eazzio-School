import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const schoolCode = process.argv[2];
  const name = process.argv[3];
  const email = process.argv[4];
  const password = process.argv[5];
  const phone = process.argv[6] || null;

  if (!schoolCode || !name || !email || !password) {
    console.error('Usage: node create_admin.js <schoolCode> <name> <email> <password> [phone]');
    process.exit(1);
  }

  try {
    const school = await prisma.school.findUnique({ where: { schoolCode } });
    if (!school) {
      console.error(`School with code ${schoolCode} not found.`);
      process.exit(1);
    }

    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    if (existingAdmin) {
      console.error(`Admin with email ${email} already exists.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await prisma.admin.create({
      data: {
        schoolId: school.id,
        name,
        email,
        password: passwordHash,
        phone
      }
    });

    console.log('Admin created successfully:', admin);
  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
