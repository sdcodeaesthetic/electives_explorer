const express = require('express');
const cors    = require('cors');

const coursesRouter          = require('./routes/courses');
const authRouter             = require('./routes/auth');
const reviewsRouter          = require('./routes/reviews');
const courseRatingsRouter    = require('./routes/courseRatings');
const professorRatingsRouter = require('./routes/professorRatings');
const professorsRouter       = require('./routes/professors');
const suggestionsRouter      = require('./routes/suggestions');
const sessionRouter          = require('./routes/session');
const parseCourseRouter      = require('./routes/parseCourse');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, Postman)
    if (!origin) return callback(null, true);
    // If no CORS_ORIGIN configured, allow everything (dev / first deploy)
    if (!allowedOrigins.length) return callback(null, true);
    // Otherwise check against the whitelist
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/courses',            coursesRouter);
app.use('/api/auth',               authRouter);
app.use('/api/reviews',            reviewsRouter);
app.use('/api/course-ratings',     courseRatingsRouter);
app.use('/api/professor-ratings',  professorRatingsRouter);
app.use('/api/professors',         professorsRouter);
app.use('/api/suggestions',        suggestionsRouter);
app.use('/api/session',            sessionRouter);
app.use('/api/parse-course',       parseCourseRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

module.exports = app;
