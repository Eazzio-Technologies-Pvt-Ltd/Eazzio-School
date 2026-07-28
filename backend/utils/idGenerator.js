import prisma from '../prismaClient.js';

export async function getNextStudentNumber(schoolId) {
  const students = await prisma.student.findMany({
    where: { schoolId },
    select: { studentId: true }
  });
  
  let maxNum = 0;
  students.forEach(s => {
    if (s.studentId) {
      const match = s.studentId.match(/(\d+)$/);
      if (match) {
        let digits = match[1];
        let num = 0;
        if (digits.length <= 5) {
          num = parseInt(digits, 10);
        } else {
          num = parseInt(digits.slice(-5), 10);
        }
        if (num > maxNum) maxNum = num;
      }
    }
  });
  
  return maxNum;
}

export function generateStudentId(schoolCode, maxStudentNum, admissionDate) {
  const baseCode = schoolCode.startsWith('SCH_') ? schoolCode.substring(4) : schoolCode;
  const year = admissionDate ? new Date(admissionDate).getFullYear() : new Date().getFullYear();
  const sequence = maxStudentNum.toString().padStart(5, '0');
  return `${baseCode}${year}${sequence}`;
}
