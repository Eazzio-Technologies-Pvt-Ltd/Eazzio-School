import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Login ID is required'),
  password: z.string().min(1, 'Password is required'),
  role: z.string().optional(),
});

export const subscriptionOrderSchema = z.object({
  studentCount: z.coerce.number().min(1, 'Valid student count is required'),
  billingCycle: z.enum(['monthly', 'annual']).default('annual'),
  planType: z.enum(['standard', 'premium']).default('standard'),
});

export const registerSchoolSchema = z.object({
  schoolName: z.string().min(1, 'School name is required'),
  adminName: z.string().min(1, 'Admin name is required').optional(),
  principalName: z.string().min(1, 'Principal name is required').optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().optional(),
  studentCount: z.coerce.number().min(1, 'Student count is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  razorpay_payment_id: z.string(),
  razorpay_order_id: z.string(),
  razorpay_signature: z.string(),
  planType: z.enum(['standard', 'premium']).default('standard').optional(),
}).refine(data => data.adminName || data.principalName, {
  message: 'Admin or Principal name is required',
  path: ['adminName'],
});

export const createTeacherSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createClassSchema = z.object({
  courseName: z.string().min(1, 'Course name is required'),
  section: z.string().min(1, 'Section is required'),
  academicYear: z.string().min(1, 'Academic year is required'),
});

export const createStudentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  courseId: z.coerce.number().min(1, 'Course ID is required'),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  rollNumber: z.string().optional(),
  admissionDate: z.string().optional().nullable(),
});

export const noticeSchema = z.object({
  schoolId: z.coerce.number(),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  audience: z.enum(['SCHOOL', 'CLASS', 'TEACHERS', 'STUDENTS', 'COURSE']),
  classId: z.coerce.number().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
});

export const createAccountantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createPrincipalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
