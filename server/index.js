require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const mongoose = require('mongoose');
const connectDB      = require('./db');
const coursesRouter     = require('./routes/courses');
const authRouter        = require('./routes/auth');
const reviewsRouter     = require('./routes/reviews');
const suggestionsRouter = require('./routes/suggestions');
const sessionRouter     = require('./routes/session');

// Auto-seed on first startup (empty Atlas DB)
async function autoSeed() {
  try {
    const User   = require('./models/User');
    const Course = require('./models/Course');
    const bcrypt = require('bcryptjs');
    const usersData   = require('./data/users.json');
    const coursesData = require('./data/courses.json');

    const userCount   = await User.countDocuments();
    const courseCount = await Course.countDocuments();

    if (userCount === 0) {
      const users = await Promise.all(
        usersData.map(async u => ({
          username: u.username,
          password: await bcrypt.hash(u.password, 10),
          role:     u.role,
          name:     u.name,
        }))
      );
      await User.insertMany(users);
      console.log(`✓ Auto-seeded ${users.length} users`);
    }

    if (courseCount === 0) {
      const courses = coursesData.map(c => ({
        courseId:    c.id,
        area:        c.area,
        term:        c.term,
        course:      c.course,
        faculty:     c.faculty,
        credits:     c.credits ?? null,
        description: c.description || '',
      }));
      await Course.insertMany(courses);
      console.log(`✓ Auto-seeded ${courses.length} courses`);
    }
  } catch (err) {
    console.error('Auto-seed error:', err.message);
  }
}

const app  = express();
const PORT = process.env.PORT || 6000;

const allowedOrigin = process.env.CORS_ORIGIN;
app.use(cors({
  origin: allowedOrigin || '*',
  credentials: true,
}));
app.use(express.json());

app.use('/api/courses',     coursesRouter);
app.use('/api/auth',        authRouter);
app.use('/api/reviews',     reviewsRouter);
app.use('/api/suggestions', suggestionsRouter);
app.use('/api/session',     sessionRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Connect to MongoDB then start server
connectDB().then(() => {
  autoSeed();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
