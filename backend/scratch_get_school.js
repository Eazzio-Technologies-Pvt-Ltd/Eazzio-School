import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    select: {
      id: true,
      schoolName: true,
      feeDueDay: true,
      collectFeeAnyDay: true,
      allowPartPayment: true
    }
  });
  console.log("Schools:", schools);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
