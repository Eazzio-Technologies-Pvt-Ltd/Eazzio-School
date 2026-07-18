import express from 'express';
import prisma from '../prismaClient.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { validate } from '../middleware/validate.js';
import { noticeSchema } from '../validators/schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Multer setup for PDF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/notices');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'notice-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// Create Notice (Principal Only)
router.post('/', upload.single('attachment'), validate(noticeSchema), async (req, res) => {
  try {
    const { schoolId, title, content, audience, courseId, scheduledAt } = req.body;

    const noticeData = {
      schoolId: parseInt(schoolId),
      title,
      content,
      audience
    };

    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate > new Date()) {
        noticeData.scheduledAt = scheduledDate;
        noticeData.status = 'SCHEDULED';
      }
    }

    if (courseId && audience === 'COURSE') {
      noticeData.courseId = parseInt(courseId);
    }

    if (req.file) {
      noticeData.attachmentUrl = `/uploads/notices/${req.file.filename}`;
    }

    const notice = await prisma.notice.create({
      data: noticeData
    });

    res.status(201).json({ success: true, data: notice });
  } catch (error) {
    console.error('Error creating notice:', error);
    res.status(500).json({ success: false, error: 'Failed to create notice' });
  }
});

// Update Notice (Principal Only)
router.put('/:id', upload.single('attachment'), validate(noticeSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, audience, courseId, scheduledAt } = req.body;

    // Check if notice exists
    const existingNotice = await prisma.notice.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingNotice) {
      return res.status(404).json({ success: false, error: 'Notice not found' });
    }

    const updateData = {
      title,
      content,
      audience
    };

    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate > new Date()) {
        updateData.scheduledAt = scheduledDate;
        updateData.status = 'SCHEDULED';
      } else {
        updateData.scheduledAt = null;
        updateData.status = 'PUBLISHED';
      }
    } else {
      updateData.scheduledAt = null;
      updateData.status = 'PUBLISHED';
    }

    if (audience === 'COURSE' && courseId) {
      updateData.courseId = parseInt(courseId);
    } else {
      updateData.courseId = null;
    }

    if (req.file) {
      updateData.attachmentUrl = `/uploads/notices/${req.file.filename}`;

      // Delete old attachment if exists
      if (existingNotice.attachmentUrl) {
        const oldFilePath = path.join(__dirname, '..', existingNotice.attachmentUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    const notice = await prisma.notice.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({ success: true, data: notice });
  } catch (error) {
    console.error('Error updating notice:', error);
    res.status(500).json({ success: false, error: 'Failed to update notice' });
  }
});

// Delete Notice (Principal Only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const notice = await prisma.notice.findUnique({
      where: { id: parseInt(id) }
    });

    if (!notice) {
      return res.status(404).json({ success: false, error: 'Notice not found' });
    }

    // Delete attachment if exists
    if (notice.attachmentUrl) {
      const filePath = path.join(__dirname, '..', notice.attachmentUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.notice.delete({
      where: { id: parseInt(id) }
    });

    res.json({ success: true, message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Error deleting notice:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notice' });
  }
});

// Get Notices (Role Based)
router.get('/', async (req, res) => {
  try {
    const { schoolId, role, courseId } = req.query;

    let audienceFilter = ['SCHOOL'];

    if (role === 'TEACHER') {
      audienceFilter.push('TEACHERS');
    } else if (role === 'STUDENT') {
      audienceFilter.push('STUDENTS');
    }

    let whereClause = {
      schoolId: parseInt(schoolId),
    };

    if (role === 'PRINCIPAL') {
      // Principal sees everything in their school
      // whereClause remains just schoolId
    } else {
      // Teachers and Students only see PUBLISHED notices
      whereClause.status = 'PUBLISHED';

      // Teachers and Students see SCHOOL + their specific audience + their CLASS (if applicable)
      whereClause.OR = [
        { audience: { in: audienceFilter } }
      ];

      if (courseId) {
        whereClause.OR.push({
          audience: 'COURSE',
          courseId: parseInt(courseId)
        });
      }
    }

    const notices = await prisma.notice.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: {
        course: true
      }
    });

    res.json({ success: true, data: notices });
  } catch (error) {
    console.error('Error fetching notices:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notices' });
  }
});

export default router;
