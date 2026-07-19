import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import principalRoutes from './routes/principal.js';
import teacherRoutes from './routes/teacher.js';
import studentRoutes from './routes/student.js';
import noticeRoutes from './routes/notice.js';
import accountantRoutes from './routes/accountant.js';
import prisma from './prismaClient.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

import fs from 'fs';
const originalConsoleError = console.error;
console.error = function (...args) {
  try {
    fs.appendFileSync('error_log.txt', `${new Date().toISOString()} - ${args.map(a => a && a.stack ? a.stack : String(a)).join(' ')}\n`);
  } catch (e) {}
  originalConsoleError.apply(console, args);
};

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend communication
const allowedOrigin = process.env.FRONTEND_URL || '*';
app.use(cors({
  origin: allowedOrigin, // Uses FRONTEND_URL in production, allows any in dev
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/principal', principalRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/accountant', accountantRoutes);

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack || err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// --- CRON JOBS ---
// Auto-publish scheduled notices every minute
setInterval(async () => {
  try {
    const now = new Date();
    const result = await prisma.notice.updateMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now }
      },
      data: {
        status: 'PUBLISHED',
        date: now,
        scheduledAt: null
      }
    });
    if (result.count > 0) {
      console.log(`[Cron] Auto-published ${result.count} scheduled notice(s) at ${now.toISOString()}`);
    }
  } catch (error) {
    console.error('[Cron Error] Failed to publish scheduled notices:', error);
  }
}, 60000);
