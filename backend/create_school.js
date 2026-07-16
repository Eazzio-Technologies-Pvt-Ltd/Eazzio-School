import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const schoolName = "AIWC ACADEMY OF EXCELLENECE";
  const principalName = "JASBEER KAUR GILL";
  const phone = "9065329152";
  const address = "dhing road , old baridih jsr -831017";
  const email = "principal@aiwc.edu"; // Generated email for login
  const plainPassword = "password123";

  // Create school
  const schoolCode = "SCH_AIWC_" + Math.floor(Math.random() * 1000);
  
  const school = await prisma.school.create({
    data: {
      schoolName: schoolName,
      schoolCode: schoolCode,
      phone: phone,
      address: address,
      studentCount: 100,
      subscriptionStatus: "ACTIVE",
      subscriptionExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    }
  });

  console.log("School created:", school);

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);

  // Create principal
  const principal = await prisma.principal.create({
    data: {
      name: principalName,
      email: email,
      password: hashedPassword,
      phone: phone,
      schoolId: school.id
    }
  });

  console.log("Principal created:", principal);
  console.log("\n--- TEST LOGIN CREDENTIALS ---");
  console.log("Email:", email);
  console.log("Password:", plainPassword);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
