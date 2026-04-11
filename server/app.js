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

const app = express();

const allowedOrigin = process.env.CORS_ORIGIN;
app.use(cors({
  origin: allowedOrigin || '*',
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

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

module.exports = app;
