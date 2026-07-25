import express from 'express';
import prisma from '../prismaClient.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateJWT);

// GET /api/feedback
router.get('/', async (req, res) => {
  const { schoolId, role, id } = req.user;

  try {
    let whereClause = { schoolId };

    if (role === 'TEACHER') {
      whereClause = {
        schoolId,
        OR: [
          { authorTeacherId: id },
          { targetTeacherId: id }
        ]
      };
    } else if (role === 'ADMIN' || role === 'PRINCIPAL') {
      // Admins and Principals see all feedbacks for the school
      whereClause = { schoolId };
    } else {
      return res.status(403).json({ error: 'Unauthorized to view feedback' });
    }

    const feedbacks = await prisma.feedback.findMany({
      where: whereClause,
      include: {
        authorPrincipal: { select: { id: true, name: true } },
        authorTeacher: { select: { id: true, name: true } },
        targetTeacher: { select: { id: true, name: true } },
        targetStudent: { select: { id: true, name: true, rollNumber: true, course: { select: { courseName: true, section: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(feedbacks);
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    res.status(500).json({ error: 'Failed to fetch feedbacks' });
  }
});

// POST /api/feedback
router.post('/', async (req, res) => {
  const { schoolId, role, id } = req.user;
  const { targetType, targetId, content } = req.body;

  try {
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    let feedbackData = {
      schoolId,
      content
    };

    if (role === 'PRINCIPAL') {
      if (targetType !== 'TEACHER') return res.status(400).json({ error: 'Principals can only review teachers' });
      feedbackData.authorPrincipalId = id;
      feedbackData.targetTeacherId = parseInt(targetId);
    } else if (role === 'TEACHER') {
      if (targetType !== 'STUDENT') return res.status(400).json({ error: 'Teachers can only review students' });
      feedbackData.authorTeacherId = id;
      feedbackData.targetStudentId = parseInt(targetId);
    } else {
      return res.status(403).json({ error: 'Unauthorized to create feedback' });
    }

    const newFeedback = await prisma.feedback.create({
      data: feedbackData,
      include: {
        authorPrincipal: { select: { id: true, name: true } },
        authorTeacher: { select: { id: true, name: true } },
        targetTeacher: { select: { id: true, name: true } },
        targetStudent: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ success: true, feedback: newFeedback });
  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({ error: 'Failed to create feedback' });
  }
});

export default router;
