import { PrismaClient } from '@prisma/client';

const oldUrl = process.env.OLD_DATABASE_URL;
const newUrl = process.env.DATABASE_URL;

const prismaOld = new PrismaClient({
  datasources: { db: { url: oldUrl } },
});

const prismaNew = new PrismaClient({
  datasources: { db: { url: newUrl } },
});

async function main() {
  console.log('Starting data migration...');

  // The exact order of tables to avoid foreign key constraints failing
  const tables = [
    'school',
    'principal',
    'teacher',
    'class',
    'student',
    'attendance',
    'timetable',
    'feeStructure',
    'feeInvoice',
    'feePayment',
    'notice'
  ];

  for (const tableName of tables) {
    console.log(`Migrating table: ${tableName}...`);
    try {
      const records = await prismaOld[tableName].findMany();
      if (records.length > 0) {
        await prismaNew[tableName].createMany({
          data: records,
          skipDuplicates: true
        });
        console.log(`✅ Migrated ${records.length} records for ${tableName}.`);
      } else {
        console.log(`➖ No records found for ${tableName}.`);
      }
    } catch (err) {
      console.error(`❌ Failed to migrate ${tableName}:`, err.message);
    }
  }

  // Adjust sequence counters for PostgreSQL so autoincrement IDs don't collide on new inserts
  console.log('\nAdjusting auto-increment sequences...');
  for (const tableName of tables) {
    try {
      // Find max ID
      const maxRecord = await prismaNew[tableName].findFirst({
        orderBy: { id: 'desc' }
      });
      if (maxRecord) {
        const nextId = maxRecord.id + 1;
        // The table name in postgres is usually capitalized exactly as defined, but let's check prisma mapping
        // In prisma, models become capitalized (e.g. "School", "Class"). Let's capitalize first letter.
        const pgTable = tableName.charAt(0).toUpperCase() + tableName.slice(1);
        await prismaNew.$executeRawUnsafe(`SELECT setval('"${pgTable}_id_seq"', ${nextId}, false);`);
        console.log(`Reset sequence for ${pgTable} to ${nextId}`);
      }
    } catch (err) {
      console.error(`Warning: Could not reset sequence for ${tableName}:`, err.message);
    }
  }

  console.log('\n🎉 Migration complete!');
}

main()
  .catch((e) => {
    console.error('Migration failed completely', e);
  })
  .finally(async () => {
    await prismaOld.$disconnect();
    await prismaNew.$disconnect();
  });
