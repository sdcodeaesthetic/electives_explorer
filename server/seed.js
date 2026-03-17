/**
 * seed.js — Migrate JSON data into MongoDB
 * Run once: node server/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./models/User');
const Course   = require('./models/Course');
const coursesData = require('./data/courses.json');
const usersData   = require('./data/users.json');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // ── Users ──────────────────────────────────────────────────────────────────
  const existingUsers = await User.countDocuments();
  if (existingUsers === 0) {
    const users = await Promise.all(
      usersData.map(async u => ({
        username: u.username,
        password: await bcrypt.hash(u.password, 10),
        role:     u.role,
        name:     u.name,
      }))
    );
    await User.insertMany(users);
    console.log(`✓ Seeded ${users.length} users`);
  } else {
    console.log(`  Users already seeded (${existingUsers} found), skipping`);
  }

  // ── Courses ────────────────────────────────────────────────────────────────
  const existingCourses = await Course.countDocuments();
  if (existingCourses === 0) {
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
    console.log(`✓ Seeded ${courses.length} courses`);
  } else {
    console.log(`  Courses already seeded (${existingCourses} found), skipping`);
  }

  await mongoose.disconnect();
  console.log('Done — MongoDB disconnected');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
