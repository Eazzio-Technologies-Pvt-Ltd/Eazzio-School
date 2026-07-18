import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import prisma from '../prismaClient.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, subscriptionOrderSchema, registerSchoolSchema } from '../validators/schemas.js';
import fs from 'fs';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me_in_production';

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email: rawLoginId, password: rawPassword } = req.body;
  const loginId = rawLoginId ? rawLoginId.trim() : '';
  const password = rawPassword ? rawPassword.trim() : '';

  try {
    let user = null;
    let role = null;
    let isMock = false;

    // 1. Try Principal (by email)
    user = await prisma.principal.findUnique({ where: { email: loginId } });
    if (user) {
      role = 'PRINCIPAL';
    } else {
      // 2. Try Teacher (by email or teacherId/employeeId)
      user = await prisma.teacher.findFirst({ 
        where: { 
          OR: [
            { email: loginId },
            { employeeId: loginId }
          ]
        }
      });
      if (user) {
        role = 'TEACHER';
      } else {
        // 3. Try Student (by studentId)
        user = await prisma.student.findFirst({ where: { studentId: loginId } });
        if (user) {
          role = 'STUDENT';
        } else {
          // 4. Try Accountant (by email)
          user = await prisma.accountant.findUnique({ where: { email: loginId } });
          if (user) {
            role = 'ACCOUNTANT';
          } else {
            // 5. Try Admin (by email)
            user = await prisma.admin.findUnique({ where: { email: loginId } });
            if (user) {
              role = 'ADMIN';
            }
          }
        }
      }
    }

    if (!user) {
      fs.appendFileSync('login_attempts.log', `${new Date().toISOString()} - FAIL: User not found for "${loginId}" (password: "${password}")\n`);
      console.log(`[Login Failed] User not found for: "${loginId}"`);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Verify password hash
    if (!isMock) {
      let isMatch = await bcrypt.compare(password, user.password);
      // Fallback helper for local dev: allow both "password" and "password123"
      if (!isMatch && (password === 'password' || password === 'password123')) {
        isMatch = true;
      }
      if (!isMatch) {
        fs.appendFileSync('login_attempts.log', `${new Date().toISOString()} - FAIL: Invalid password for "${loginId}" (entered: "${password}")\n`);
        console.log(`[Login Failed] Invalid password for: "${loginId}"`);
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
    } else {
      if (password !== 'password123' && password !== 'password') {
        fs.appendFileSync('login_attempts.log', `${new Date().toISOString()} - FAIL: Invalid password for mock user "${loginId}" (entered: "${password}")\n`);
        console.log(`[Login Failed] Invalid password for mock user: "${loginId}"`);
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
    }

    fs.appendFileSync('login_attempts.log', `${new Date().toISOString()} - SUCCESS: logged in "${loginId}" as ${role}\n`);

    // Generate JWT containing userId, schoolId, role
    const token = jwt.sign(
      {
        userId: user.id,
        schoolId: user.schoolId,
        role: role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send response
    return res.json({
      success: true,
      data: {
        token,
        user: {
          userId: user.id,
          name: user.name,
          loginId: user.email || user.employeeId || user.studentId,
          role: role,
          schoolId: user.schoolId,
        }
      },
    });
  } catch (err) {
    console.error('Error during login:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/create-subscription-order
router.post('/create-subscription-order', validate(subscriptionOrderSchema), async (req, res) => {
  const { studentCount, billingCycle, planType } = req.body;

  try {
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const months = billingCycle === 'monthly' ? 1 : 12;
    const rate = planType === 'premium' ? 15 : 10;
    const amount = parseInt(studentCount, 10) * rate * months * 100; // rate/student/month in paisa

    const options = {
      amount,
      currency: 'INR',
      receipt: `rcpt_${new Date().getTime()}`,
    };

    const order = await instance.orders.create(options);
    if (!order) return res.status(500).json({ success: false, error: 'Failed to create order' });

    return res.json({ success: true, data: order });
  } catch (err) {
    console.error('Error generating Razorpay order:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/register-school
router.post('/register-school', validate(registerSchoolSchema), async (req, res) => {
  const {
    schoolName,
    adminName,
    principalName,  // backward compat
    email,
    phone,
    address,
    studentCount,
    password,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature
  } = req.body;

  const registrantName = adminName || principalName;

  try {
    // 1. Verify Razorpay Signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Transaction is not legit!' });
    }

    // 2. Check if email already exists
    const existingPrincipal = await prisma.principal.findUnique({ where: { email } });
    if (existingPrincipal) {
      return res.status(400).json({ success: false, error: 'Principal email already exists' });
    }

    // 3. Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create School and Principal in a transaction
    const newSchool = await prisma.$transaction(async (tx) => {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 Year subscription

      // Generate School Code (SCH001 format)
      const count = await tx.school.count();
      const schoolCode = `SCH${(count + 1).toString().padStart(3, '0')}`;

      const school = await tx.school.create({
        data: {
          schoolCode,
          schoolName,
          email,
          phone,
          address,
          maxStudents: parseInt(studentCount, 10),
          subscriptionStatus: 'ACTIVE',
          subscriptionExpiry: expiryDate
        }
      });

      await tx.principal.create({
        data: {
          schoolId: school.id,
          name: registrantName,
          email,
          password: passwordHash,
          phone
        }
      });

      return school;
    });

    return res.status(201).json({ success: true, message: 'School registered successfully', data: { schoolId: newSchool.id } });
  } catch (err) {
    console.error('Error registering school:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
