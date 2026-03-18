const express     = require('express');
const Anthropic   = require('@anthropic-ai/sdk');
const coursesJSON = require('../data/courses.json');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const TERM_RULES = {
  'Term IV': { min: 18, max: 21 },
  'Term V':  { min: 18, max: 21 },
  'Term VI': { min: 12, max: 12 },
};
const TOTAL_MAX = 52;

function termCredits(courses) {
  return courses.reduce((s, c) => s + (c.credits || 0), 0);
}

/**
 * Score a course's relevance to the student's aspirations.
 * Higher = more relevant → prioritised when filling credit gaps.
 */
function relevanceScore(course, { careerGoal, majors, minors }) {
  const tokens = str =>
    (str || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);

  const goalTokens  = tokens(careerGoal);
  const majorTokens = tokens(majors);
  const minorTokens = tokens(minors);
  const areaLower   = (course.area  || '').toLowerCase();
  const nameLower   = (course.course|| '').toLowerCase();
  const descLower   = (course.description || '').toLowerCase();

  let score = 0;

  // Strong match: area directly listed as a major/minor
  if (majorTokens.some(t => areaLower.includes(t))) score += 6;
  if (minorTokens.some(t => areaLower.includes(t))) score += 4;

  // Career goal keyword hits in area, course name, description
  goalTokens.forEach(t => {
    if (areaLower.includes(t))  score += 3;
    if (nameLower.includes(t))  score += 2;
    if (descLower.includes(t))  score += 1;
  });

  // Major keyword hits in course name / description
  majorTokens.forEach(t => {
    if (nameLower.includes(t))  score += 2;
    if (descLower.includes(t))  score += 1;
  });

  // Minor keyword hits
  minorTokens.forEach(t => {
    if (nameLower.includes(t))  score += 1;
  });

  return score;
}

/**
 * Enforce credit rules on a basket.
 * Trims over-limit terms; fills under-limit terms with the most relevant
 * remaining courses (scored against the student's aspirations).
 */
function enforceCredits(basket, allCourses, profile) {
  const byTerm = { 'Term IV': [], 'Term V': [], 'Term VI': [] };
  basket.forEach(c => { if (byTerm[c.term] !== undefined) byTerm[c.term].push({ ...c }); });

  // ── 1. Trim over-limit terms (remove least-relevant from end) ─────────────
  for (const [term, rule] of Object.entries(TERM_RULES)) {
    while (termCredits(byTerm[term]) > rule.max && byTerm[term].length > 0) {
      byTerm[term].pop();
    }
  }

  // ── 2. Build relevance-ranked fallback pool per term ──────────────────────
  const usedIds = new Set(Object.values(byTerm).flat().map(c => c.courseId));

  const pool = {};
  for (const term of Object.keys(TERM_RULES)) {
    pool[term] = allCourses
      .filter(c => c.term === term && !usedIds.has(c.courseId) && c.credits)
      .map(c => ({ ...c, _score: relevanceScore(c, profile) }))
      // Primary: relevance score descending; secondary: credits descending (fill faster)
      .sort((a, b) => b._score - a._score || b.credits - a.credits);
  }

  // ── 3. Fill under-limit terms with most relevant available courses ─────────
  for (const [term, rule] of Object.entries(TERM_RULES)) {
    let cr = termCredits(byTerm[term]);
    let i  = 0;
    while (cr < rule.min && i < pool[term].length) {
      const candidate = pool[term][i++];
      if (cr + candidate.credits <= rule.max) {
        const { _score, ...clean } = candidate;
        byTerm[term].push({
          ...clean,
          reason: `Added as the closest match to your aspirations to meet the minimum credit requirement for ${term}.`,
        });
        usedIds.add(candidate.courseId);
        cr += candidate.credits;
      }
    }
  }

  // ── 4. Trim total if it exceeds cap ───────────────────────────────────────
  let total = Object.values(byTerm).flat().reduce((s, c) => s + (c.credits || 0), 0);
  for (const term of ['Term VI', 'Term V', 'Term IV']) {
    while (total > TOTAL_MAX && byTerm[term].length > 0) {
      const removed = byTerm[term].pop();
      total -= removed.credits || 0;
    }
  }

  return Object.values(byTerm).flat();
}

// POST /api/suggestions  — requires auth
router.post('/', requireAuth, async (req, res) => {
  try {
    const { careerGoal, majors, minors } = req.body;
    if (!careerGoal)
      return res.status(400).json({ error: 'careerGoal is required' });

    if (!process.env.ANTHROPIC_API_KEY)
      return res.status(503).json({ error: 'AI suggestions not configured (missing ANTHROPIC_API_KEY)' });

    const allCourses = coursesJSON.map(c => ({
      courseId:    c.id,
      area:        c.area,
      term:        c.term,
      course:      c.course,
      faculty:     c.faculty,
      credits:     c.credits ?? null,
      description: c.description || '',
    }));

    const termSections = ['Term IV', 'Term V', 'Term VI'].map(term => {
      const list = allCourses
        .filter(c => c.term === term)
        .map(c => `  [ID:${c.courseId}] ${c.course} | Area: ${c.area} | Credits: ${c.credits ?? 'N/A'} | Faculty: ${c.faculty}`)
        .join('\n');
      return `${term}:\n${list}`;
    }).join('\n\n');

    const prompt = `You are an academic advisor at IIM Sambalpur selecting MBA electives for a student.

STUDENT PROFILE
Career goal   : ${careerGoal}
Preferred majors : ${majors || 'not specified'}
Preferred minors : ${minors || 'not specified'}

MANDATORY CREDIT RULES (you MUST satisfy ALL of these — verify before responding):
  Term IV  → minimum 18 credits, maximum 21 credits
  Term V   → minimum 18 credits, maximum 21 credits
  Term VI  → exactly 12 credits (no more, no less)
  Total    → minimum 48 credits, maximum 52 credits

INSTRUCTIONS:
1. Pick courses that best match the student's career goal and majors/minors.
2. After picking, SUM credits per term and verify all four rules pass.
3. If a term is below its minimum, add the next most relevant course from that term.
4. If a term exceeds its maximum, remove the least relevant course from that term.
5. Only select courses that have a numeric credit value (skip "N/A").
6. Never repeat a courseId.

AVAILABLE COURSES (grouped by term):
${termSections}

Respond ONLY with valid JSON — no markdown, no extra text:
{
  "summary": "2-3 sentences on why this basket fits the student's goals",
  "creditCheck": { "termIV": <n>, "termV": <n>, "termVI": <n>, "total": <n> },
  "basket": [
    { "courseId": <number>, "reason": "<one-line reason>" }
  ]
}`;

    const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 4096,
      messages:   [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text.trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return res.status(502).json({ error: 'AI returned an unexpected response format' });
      parsed = JSON.parse(match[0]);
    }

    const courseMap = Object.fromEntries(allCourses.map(c => [c.courseId, c]));
    const aiBasket  = (parsed.basket || [])
      .filter(b => courseMap[b.courseId])
      .map(b => ({ ...courseMap[b.courseId], reason: b.reason }));

    // Server-side enforcement with relevance-aware gap filling
    const profile     = { careerGoal, majors, minors };
    const finalBasket = enforceCredits(aiBasket, allCourses, profile);

    const stats = { 'Term IV': 0, 'Term V': 0, 'Term VI': 0 };
    finalBasket.forEach(c => { if (stats[c.term] !== undefined) stats[c.term] += c.credits || 0; });
    const totalCredits = Object.values(stats).reduce((s, v) => s + v, 0);

    res.json({
      summary:     parsed.summary,
      creditStats: { ...stats, total: totalCredits },
      basket:      finalBasket,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
