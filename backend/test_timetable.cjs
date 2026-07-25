const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAutoGenerate() {
  const schoolId = 5; // AIWC school, checking my previous dump
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = 6;
  const clearExisting = true;

  try {
    if (clearExisting) {
      await prisma.timetable.deleteMany({ where: { schoolId } });
    }

    const courses = await prisma.course.findMany({
      where: { schoolId },
      include: {
        courseSubjects: true
      }
    });

    console.log(`Found ${courses.length} courses in School ${schoolId}.`);

    const newEntries = [];
    const teacherBusyMap = {};
    
    for (const course of courses) {
      const subjects = course.courseSubjects;
      if (subjects.length === 0) {
         console.log(`Course ${course.courseName} has 0 subjects. Skipping.`);
         continue;
      }

      let subjectIndex = 0;
      
      for (const day of days) {
        for (let p = 1; p <= periods; p++) {
          const periodStr = `Period ${p}`;
          
          let assigned = false;
          let attempts = 0;
          
          while (!assigned && attempts < subjects.length) {
            const sub = subjects[subjectIndex % subjects.length];
            const teacherKey = `${sub.teacherId}-${day}-${periodStr}`;
            
            if (!teacherBusyMap[teacherKey]) {
              teacherBusyMap[teacherKey] = true;
              newEntries.push({
                schoolId,
                teacherId: sub.teacherId,
                dayOfWeek: day,
                period: periodStr,
                subject: sub.subject,
                courseId: course.id
              });
              assigned = true;
            }
            
            subjectIndex++;
            attempts++;
          }
        }
      }
    }

    if (newEntries.length > 0) {
      await prisma.timetable.createMany({ data: newEntries });
      console.log(`Successfully generated ${newEntries.length} timetable entries.`);
    } else {
      console.log(`No timetable entries generated.`);
    }
  } catch (err) {
    console.error('Error auto generating timetable:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testAutoGenerate();
