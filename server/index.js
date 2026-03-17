require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const connectDB     = require('./db');
const coursesRouter     = require('./routes/courses');
const authRouter        = require('./routes/auth');
const reviewsRouter     = require('./routes/reviews');
const suggestionsRouter = require('./routes/suggestions');

// Connect to MongoDB
connectDB();

const app  = express();
const PORT = process.env.PORT || 6000;

// CORS_ORIGIN: set to your Vercel frontend URL in production env vars
// e.g. https://elective-dashboard.vercel.app
// Leave unset (or '*') during development
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

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
