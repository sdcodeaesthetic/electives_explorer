const express   = require('express');
const router    = express.Router();
const multer    = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// POST /api/parse-course — admin only, accepts a PDF or DOCX file
router.post('/', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  try {
    // ── 1. Extract raw text from the file ──────────────────────────────────
    let text = '';
    const mime = req.file.mimetype;

    if (mime === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(req.file.buffer);
      text = data.text;
    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'application/msword'
    ) {
      const mammoth = require('mammoth');
      const result  = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    } else {
      // Treat as plain text
      text = req.file.buffer.toString('utf-8');
    }

    if (!text.trim()) {
      return res.status(422).json({ error: 'Could not extract text from the uploaded file.' });
    }

    // ── 2. Call Claude to extract structured course data ───────────────────
    const anthropic = new Anthropic();
    const message   = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Extract course information from the document below.
Return ONLY a valid JSON object with exactly these fields (use empty string "" if not found):
{
  "course": "<full course title>",
  "description": "<paragraph describing what the course is about>",
  "course_curriculum": "<one curriculum topic per line, plain text, no bullets or numbering>",
  "key_takeaways": "<one key takeaway per line, plain text, no bullets or numbering>",
  "prerequisites": "<paragraph describing prerequisites, or empty string>"
}

No markdown, no explanation, only the JSON object.

DOCUMENT:
${text.slice(0, 8000)}`,
      }],
    });

    const raw    = message.content[0].text.trim();
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error('parseCourse error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to parse file.' });
  }
});

module.exports = router;
