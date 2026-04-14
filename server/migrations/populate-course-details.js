/**
 * Migration: populate-course-details
 *
 * Reads course outline files (docx, doc, rtf) from Subject_Details folder,
 * extracts Introduction, Prerequisites, Learning Outcomes, and Session Plan,
 * and updates the courses table with description, prerequisites, key_takeaways,
 * and course_curriculum fields.
 *
 * PDF files must be handled separately (see PDF_OVERRIDES below).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mammoth = require('mammoth');
const fs      = require('fs');
const path    = require('path');
const { pool } = require('../db');

const BASE = 'C:/Users/swarn/Projects/Electives/Subject_Details';

// ── File → course ID mapping ──────────────────────────────────────────────────
const FILES = [
  // Finance
  { file: 'Finance/Bank Operations Management(Prof. Nishi Malhotra).docx',                         id: 1  },
  { file: 'Finance/Business Analysis and Valuation( VF).docx',                                     id: 2  },
  { file: 'Finance/Financial Planning and Wealth Management (Prof. Diwahar Nadar).docx',            id: 3  },
  { file: 'Finance/Financial Risk Management(Prof. Nishi Malhotra).docx',                           id: 4  },
  { file: 'Finance/FISM course outline.docx',                                                       id: 5  },
  { file: 'Finance/FME- TERM V-1.5.docx',                                                           id: 6  },
  { file: 'Finance/International_Finance_Course outline.docx',                                      id: 7  },
  { file: 'Finance/Investment Banking - Course Outline in Updated Format (1).docx',                 id: 8  },
  { file: 'Finance/MBA Fintech Course Outline 25-26.docx',                                          id: 9  },
  { file: 'Finance/Merger & Acquisition(Prof. Seema Gupta).docx',                                   id: 10 },
  { file: 'Finance/Options, Futures and Derivatives.docx',                                          id: 11 },
  { file: 'Finance/Project Appraisal & Financing .docx',                                            id: 12 },
  { file: 'Finance/SAPM (Prof. Soumya Guha Deb).docx',                                              id: 13 },
  { file: 'Finance/Term VI - Ethical Trading Strategy.docx',                                        id: 14 },

  // ISM (docx/doc only — PDFs handled in PDF_OVERRIDES)
  { file: 'ISM/AGENTIC AI_TERM VI_ELECTIVE.docx',                                                   id: 15 },
  { file: 'ISM/AI_for_Business(Prof. Deepanwita Dutta) (1).docx',                                   id: 17 },
  { file: 'ISM/BIG DATA ANALYTICS_TERM V_ELECTIVE.docx',                                            id: 18 },
  { file: 'ISM/Business of Cloud Computing - Course Outline - IIM Sambalpur - 10022026.docx',       id: 21 },
  { file: 'ISM/Cybersecurity and Enterprise Risk Management(Prof. A Manish Kumar).docx',            id: 22 },
  { file: 'ISM/Digital Product Management(Ankita Parihar).docx',                                    id: 24 },
  { file: 'ISM/E-commerce(Mr. Rajesh Natrajan).docx',                                               id: 25 },
  { file: 'ISM/Managing Digital Transformation(Prof. A Manish Kumar).docx',                         id: 27 },
  { file: 'ISM/Sports Analytics(Prof. R Viveanand).docx',                                           id: 28 },
  { file: 'ISM/Tech Consulting and Business Analysis (Prof.Merlin Nandy).docx',                     id: 29 },

  // GMPPE (docx only — PDF handled in PDF_OVERRIDES)
  { file: 'GMPPE/Applied Econometrics for Manager.docx',                                            id: 87 },
  { file: 'GMPPE/Energy Market and Pricing Strategies for Business.docx',                           id: 88 },
  { file: 'GMPPE/Game Theory and Strategic Decision Making (Prof. Soumyakanta Mishra).docx',        id: 89 },
  { file: 'GMPPE/Law Business and Governance(Prof. Sujit Purseth).docx',                            id: 90 },
  { file: 'GMPPE/Pricing strategy for managerial decision making_AKT (1).docx',                     id: 91 },

  // Inter Area Electives
  { file: 'Inter Area Electives/Behavioral Strategy and Decision Making(Prof. Shikha Bharadwaj).docx', id: 93 },
  { file: 'Inter Area Electives/Entrepreneurship & Finance (Prof. Bhairav Patra& Prof. Diwahar Nadar).rtf.doc', id: 94 },
  { file: 'Inter Area Electives/Non-Marketing Strategy (Prof. Diptiranjan Mahapatra& Prof. Sumita Sindhi).docx', id: 95 },

  // Marketing (docx/rtf/doc — PDFs in PDF_OVERRIDES)
  { file: 'Marketing/Term IV_Advanced Marketing Research Course Outline.docx',   id: 32 },
  { file: 'Marketing/Term IV_B2B Marketing Course Outline.docx',                 id: 33 },
  { file: 'Marketing/Term IV_Brand Management Course Outline.docx',              id: 34 },
  { file: 'Marketing/Term IV_ConsumerBehaviorandNeuromarketingCourseOutline_2026.docx', id: 35 },
  { file: 'Marketing/Term IV_Sales in the Age of AI (SAI) Course Outline (1).docx', id: 36 },
  { file: 'Marketing/Term V_FMCG Marketing.docx',                                id: 37 },
  { file: 'Marketing/Term V_MARKETING OF SERVICES Course Outline.docx',          id: 38 },
  { file: 'Marketing/Term V_Poduct Management and Analytics Course Outline Updated Format_26012026.docx', id: 39 },
  { file: 'Marketing/Term V_Pricing & Policy Course Outline.docx',               id: 40 },
  { file: 'Marketing/Term V_SDM Outline - MBA 2026-27.rtf',                      id: 41 },
  { file: 'Marketing/Term V_Sustainability Marketing Course Outline.doc',        id: 42 },
  { file: 'Marketing/Term VI_LuxurymarketingCourseOutline_2026.docx',            id: 43 },
  { file: 'Marketing/Term VI_Marketing Semiotics Course Outline.docx',           id: 44 },
  { file: 'Marketing/Term VI_Rural Marketing - MBA 2026-27.rtf',                 id: 45 },
  { file: 'Marketing/Term VI_STRATEGIC MARKETING Course Outline.docx',           id: 46 },
  { file: 'Marketing/TermV__CRM Course outline _2026.docx',                      id: 47 },
  { file: 'Marketing/Updated Course Outline_RMS_IIMSambalpur (1).docx',          id: 48 },

  // OB-HR (docx/rtf — PDFs in PDF_OVERRIDES)
  { file: 'OB-HR/Decoding Team Dynamics(Prof. Shubhi Gupta).rtf',                id: 98  },
  { file: 'OB-HR/Employee Relations and Employment Laws.docx',                   id: 99  },
  { file: 'OB-HR/Final outline_Conflict negotiation_IInd Year_2024 (1).docx',    id: 100 },
  { file: 'OB-HR/Game People Play(Prof. Shikha Bharadwaj).docx',                 id: 102 },
  { file: 'OB-HR/Leading with Cultural Agility(Prof. Shubhi Gupta).rtf',         id: 103 },
  { file: 'OB-HR/Organizational Transformation & Change(Prof. Sikha Bharadwaj).docx', id: 104 },
  { file: 'OB-HR/Performance and compensation management (Prof. Shubhi Gupta).docx', id: 105 },

  // Operations (docx/rtf/doc — PDFs in PDF_OVERRIDES)
  { file: 'Operations/1.Course Outline_Operations Analytics_term IV_26-27.rtf',  id: 49 },
  { file: 'Operations/2. Course outline_ SOM_Term_V_26-27.docx',                 id: 50 },
  { file: 'Operations/3. Course Outline_RMDP_Term VI_26-27.docx',                id: 51 },
  { file: 'Operations/AMS_2026.docx',                                             id: 52 },
  { file: 'Operations/DMTM term IV_26-27 (1).docx',                              id: 55 },
  { file: 'Operations/Digital Supply Chains (2).docx',                           id: 54 },
  { file: 'Operations/Global Logistics and Distribution Term V (2).docx',        id: 56 },
  { file: 'Operations/Logistics and Warehouse Management Term V.doc',            id: 57 },
  { file: 'Operations/MBA  Project MANAGEMENT_Term IV.rtf',                      id: 58 },
  { file: 'Operations/Operational Excellence Course_Term IV (2).rtf',            id: 59 },
  { file: 'Operations/Operations Startegy Term VI (1).rtf',                      id: 60 },
  { file: 'Operations/Quick Commerce Supply Chains (1).docx',                    id: 61 },
  { file: 'Operations/SCM -IIMS-26-27.docx',                                     id: 62 },
  { file: 'Operations/SMB_2026 Term VI (1).docx',                                id: 63 },
  { file: 'Operations/Strategic Procurement -IIMS- 26-27.docx',                  id: 64 },
  { file: 'Operations/Supply Chain Analytics_ Term V 2026-27.docx',              id: 65 },
  { file: 'Operations/Supply chain Simulation for Managerial Decision-Making term V_26-27.docx', id: 66 },
  { file: 'Operations/Technology Enabled Operations (2).docx',                   id: 67 },

  // Strategy (docx/rtf — PDF in PDF_OVERRIDES)
  { file: 'Strategy/Business Models (Prof Sanyka Baneerjee).docx',               id: 68 },
  { file: 'Strategy/Chanakya Strategic Lessons For Today & Tomorrow(Prof. Sandeep Singh).docx', id: 69 },
  { file: 'Strategy/Corporate Strtategy(Prof. Nilesh Khare & Prof. Aarti Singh).rtf', id: 70 },
  { file: 'Strategy/Creating Markets Beyond Competition_Blue Ocean Strategy Outline.docx', id: 71 },
  { file: 'Strategy/Current and emerging trends.rtf',                            id: 72 },
  { file: 'Strategy/Digital Entrepreneurship (Prof. Bhairav Patra).rtf',         id: 73 },
  { file: 'Strategy/Entrepreneurship and Business Development(Prof. Bhairav Patra).rtf', id: 74 },
  { file: 'Strategy/Impact Entrepreneurship course outline.docx',                id: 75 },
  { file: 'Strategy/International Business.docx',                                id: 77 },
  { file: 'Strategy/M&A Course outline.docx',                                    id: 78 },
  { file: 'Strategy/Managing Platform Business Prof. Diptiranjan Mahapatra.docx', id: 80 },
  { file: 'Strategy/Managing Strategic Transformation(Dr Sanjeev Govil).rtf',    id: 81 },
  { file: 'Strategy/Managing a Consulting Business- A Practitioner\u2019s Perspective(Mr. Sandeep Hota) .docx', id: 79 },
  { file: 'Strategy/Strategic Leadership, Thinking and Decision Making(Diptiprakash Pradhan).docx', id: 83 },
  { file: 'Strategy/Systems Thinking For Management Consulting.rtf',             id: 84 },
  { file: 'Strategy/Technology & Innovation Management(Prof. Aqueeb Sohail).docx', id: 85 },
  { file: 'Strategy/Working with AI(Dr Preet Deep Singh).docx',                  id: 86 },
  { file: 'Strategy/startup mindset(Dr Preet Deep Singh).docx',                  id: 82 },
];

// ── RTF text extractor ────────────────────────────────────────────────────────
function extractRTFText(filePath) {
  const content = fs.readFileSync(filePath, 'latin1');
  let result = '';
  let i = 0;
  let depth = 0;
  let skipDepth = -1;

  while (i < content.length) {
    const ch = content[i];
    if (ch === '{') {
      depth++;
      // Check for \* destination group (skip these)
      if (content[i + 1] === '\\' && content[i + 2] === '*') {
        if (skipDepth === -1) skipDepth = depth;
      }
      i++;
    } else if (ch === '}') {
      if (depth === skipDepth) skipDepth = -1;
      depth--;
      i++;
    } else if (ch === '\\') {
      if (i + 1 >= content.length) { i++; continue; }
      const next = content[i + 1];
      if (next === '\\') { if (skipDepth === -1) result += '\\'; i += 2; }
      else if (next === '{') { if (skipDepth === -1) result += '{'; i += 2; }
      else if (next === '}') { if (skipDepth === -1) result += '}'; i += 2; }
      else if (next === '\n' || next === '\r') { i += 2; }
      else {
        let j = i + 1;
        while (j < content.length && content[j] >= 'a' && content[j] <= 'z') j++;
        const word = content.slice(i + 1, j);
        let neg = content[j] === '-';
        if (neg) j++;
        let numStr = '';
        while (j < content.length && content[j] >= '0' && content[j] <= '9') numStr += content[j++];
        const num = numStr ? (neg ? -parseInt(numStr) : parseInt(numStr)) : null;
        if (j < content.length && content[j] === ' ') j++;
        if (skipDepth === -1) {
          if (word === 'par') result += '\n';
          else if (word === 'line') result += '\n';
          else if (word === 'tab') result += '\t';
          else if (word === 'u' && num !== null) {
            const code = num < 0 ? num + 65536 : num;
            result += String.fromCharCode(code);
            // RTF unicode is followed by a substitute char — skip it
            if (j < content.length && content[j] === '?') j++;
          }
        }
        i = j;
      }
    } else {
      if (skipDepth === -1 && ch !== '\r') result += ch;
      i++;
    }
  }
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

// ── Extract text from file (any supported format) ────────────────────────────
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.docx' || ext === '.doc') {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (e) {
      // Some .doc/.rtf.doc files aren't true docx — fall back to RTF extraction
      return extractRTFText(filePath);
    }
  }
  if (ext === '.rtf') {
    return extractRTFText(filePath);
  }
  throw new Error(`Unsupported format: ${ext}`);
}

// ── Section parser ────────────────────────────────────────────────────────────
function parseSections(rawText) {
  // Normalise line endings
  let text = rawText.replace(/\r\n?/g, '\n');

  // Insert newlines before known all-caps inline headings so they become
  // standalone lines (e.g. "COURSE DESCRIPTIONThis course..." → two lines)
  const inlineCaps = [
    'COURSE DESCRIPTION', 'COURSE OBJECTIVES', 'COURSE COMPETENCIES',
    'LEARNING OUTCOMES', 'LEARNING OBJECTIVES', 'PREREQUISITES', 'PREREQUISITE',
    'INTRODUCTION', 'ABOUT THIS COURSE',
  ];
  for (const h of inlineCaps) {
    // Match heading immediately followed by an uppercase or title-case letter (no space/newline between)
    const re = new RegExp('(' + h + ')([A-Z][a-z])', 'g');
    text = text.replace(re, '$1\n$2');
  }

  text = text.replace(/\n{3,}/g, '\n\n');
  const lines = text.split('\n');
  const norm  = s => s.toLowerCase().trim();

  // Generic section collector
  // startRes: array of regex — match ANY to start collecting
  // stopRes:  array of regex — match ANY to stop
  function collectSection(startRes, stopRes) {
    let collecting = false;
    const buf = [];
    for (const line of lines) {
      const n = norm(line);
      if (!collecting) {
        if (startRes.some(re => re.test(n))) { collecting = true; continue; }
        continue;
      }
      if (stopRes.some(re => re.test(n))) break;
      buf.push(line.trim());
    }
    return buf.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  // ── Common stop patterns ───────────────────────────────────────────────────
  const AFTER_DESC = [
    /^prerequisite/, /^pre-?requisite/, /^prior knowledge/,
    /^course competenc/, /^learning outcome/, /^student learning/, /^program outcome/,
    /^course objective/, /^learning objective/, /^objective/,
    /^evaluation/, /^assessment/, /^grading/, /^pedagog/,
    /^text\s?book/, /^reference\s?book/, /^required\s?book/, /^reading/,
    /^session (plan|no|schedule)/, /^tentative session/, /^schedule of session/,
    /^course schedule/, /^session 1/, /^module 1/,
  ];
  const AFTER_PRE = [
    /^course competenc/, /^learning outcome/, /^student learning/, /^program outcome/,
    /^course objective/, /^learning objective/, /^objective/,
    /^evaluation/, /^grading/, /^text\s?book/, /^reference/, /^reading/,
    /^session (plan|no|schedule)/, /^tentative session/, /^schedule of session/,
    /^course schedule/, /^session 1/, /^pedagog/,
  ];
  const AFTER_KT = [
    /^evaluation/, /^grading/, /^assessment/, /^pedagog/,
    /^text\s?book/, /^reference/, /^required/, /^reading/,
    /^session (plan|no|schedule)/, /^tentative session/, /^schedule of session/,
    /^course schedule/, /^session 1/, /^module 1/,
  ];

  // ── Description ───────────────────────────────────────────────────────────
  const description = collectSection(
    [
      // Standalone headings (whole line matches)
      /^(introduction|about this course|course overview|overview|course background)[\s:]*$/,
      /^(course description|course descriptions?)[\s:]*$/,
      /^description[\s:]*$/,
      // Numbered sections: "1. Introduction", "II. Course Description:", etc.
      /^(\d+\.|[ivxlcIVXLC]+\.)\s*(introduction|course description|overview|about this course|background)/,
      // Roman numeral style from some files
      /^ii\.\s*course description/,
    ],
    AFTER_DESC
  );

  // ── Prerequisites ──────────────────────────────────────────────────────────
  const prerequisites = collectSection(
    [
      /^prerequisite[s:]*/,
      /^pre-?requisite[s:]*/,
      /^prior knowledge/,
    ],
    AFTER_PRE
  );

  // ── Key Takeaways / Learning Outcomes ─────────────────────────────────────
  const keyTakeaways = collectSection(
    [
      /^course competenc/,
      /^learning outcomes?[\s:]*$/,
      /^learning objectives?[\s:]*$/,
      /^student learning outcomes?/,
      /^program outcomes?/,
      /^course outcomes?/,
      /^course objectives?[\s:]*$/,
      /^(\d+\.|[ivxlcIVXLC]+\.)\s*(learning outcome|learning objective|student learning|course objective|program outcome)/,
      /^ii+\.\s*(learning|student learning|course objective)/,
      /^objectives[\s:]*$/,
    ],
    AFTER_KT
  );

  // ── Course Curriculum (Session Plan topics) ───────────────────────────────
  const sessionStartRes = [
    /session\s*(plan|schedule)[\s:]*$/,
    /tentative\s*session/,
    /schedule\s*of\s*sessions?/,
    /course\s*schedule[\s:]*$/,
    /^session\s*no\.?\s*(topic|and sub|$)/,
    /^(schedule|session|tentative)\s+of/,
  ];
  const sessionStopWords = /^(text\s?book|reference\s?book|required\s?(text|book)|evaluation\s?(scheme|component|weightage)|grading|note:|important instruction|bibliography|reading list|course material)/i;

  // Regex for a line that is a session-number marker
  const isSessionNum = l =>
    /^session\s+\d+(\s*[-–—]\s*\d+)?[\s:]*$/i.test(l) ||
    /^\d+\s*[-–—]\s*\d+\s*$/.test(l) ||
    /^\d+\s*$/.test(l);

  // Regex for a session line that CONTAINS a topic after the number
  // e.g. "1  Introduction to xyz" or "1–3   Module A: Concepts"
  const sessionWithTopic = /^\s*(\d+\s*[-–—]\s*\d+|\d+)\s+(.{5,})/;

  let inSession = false;
  const topicLines = [];

  for (let i = 0; i < lines.length; i++) {
    const raw     = lines[i];
    const trimmed = raw.trim();

    if (!inSession) {
      if (sessionStartRes.some(re => re.test(norm(trimmed)))) {
        inSession = true; continue;
      }
      // Also start on "Session 1 -" / "Session 1:" lines directly
      if (/^session\s+1\s*[-–:]/i.test(trimmed)) inSession = true;
      if (!inSession) continue;
    }

    if (!trimmed) continue;
    if (sessionStopWords.test(trimmed)) break;

    // Table header rows — skip
    if (/^(session\s*no\.?|topic\s*(and\s*sub.?topics?)?|sub.?topics?|reference|case|exercise|assignment|description)[\s:]*$/i.test(trimmed)) continue;

    // Tab-delimited table row: "N\tTopic\t..." or "N-M\tTopic\t..."
    const tabParts = trimmed.split(/\t+/);
    if (tabParts.length >= 2) {
      const maybeNum = tabParts[0].trim();
      if (/^(\d+\s*[-–—]\s*\d+|\d+)$/.test(maybeNum)) {
        let topic = tabParts[1].trim();
        // Remove trailing reference noise
        topic = topic.replace(/\s+(bhk|bkm|asb|rh|ch\.|chapter|book|pg\.|page)\s.*/i, '').trim();
        if (topic.length > 4 && !/^(topic|sub.?topic)/i.test(topic)) {
          topicLines.push(topic); continue;
        }
      }
    }

    // Session number only on its own line → topic is the NEXT meaningful line
    if (isSessionNum(trimmed)) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const next = lines[j].trim();
        if (!next) continue;
        if (/^objectives?:/i.test(next)) break;
        if (sessionStopWords.test(next)) break;
        if (!isSessionNum(next) && next.length > 4) {
          topicLines.push(next.replace(/:$/, '').trim());
        }
        break;
      }
      continue;
    }

    // Line that STARTS with a session number followed by topic text inline
    const m = trimmed.match(sessionWithTopic);
    if (m) {
      let topic = m[2].replace(/\s+(bhk|bkm|asb|rh|ch\.|chapter|book|pg\.|page)\s.*/i, '').trim();
      topic = topic.replace(/:$/, '').trim();
      if (topic.length > 4 && !/^(session|topic|sub.?topic|reference|case|exercise|assignment)/i.test(topic)) {
        topicLines.push(topic); continue;
      }
    }

    // "Session N - M: Topic Name" or "Session N: Topic" style
    const sessionTopicM = trimmed.match(/^session\s+\d+(\s*[-–—]\s*\d+)?\s*[-:]\s*(.{5,})/i);
    if (sessionTopicM) {
      let topic = sessionTopicM[2].replace(/:$/, '').trim();
      if (!/^(learning objective|objective|sub.?topic)/i.test(topic)) {
        topicLines.push(topic); continue;
      }
    }

    // "Module N: Topic" style
    const moduleM = trimmed.match(/^module\s+\d+\s*[-:]\s*(.{5,})/i);
    if (moduleM) {
      topicLines.push(moduleM[1].replace(/:$/, '').trim()); continue;
    }
  }

  const curriculum = [...new Set(topicLines)]   // deduplicate
    .filter(t => t.length > 4)
    .join('\n').trim();

  return { description, prerequisites, keyTakeaways, curriculum };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  const client = await pool.connect();
  let ok = 0, skip = 0, fail = 0;
  try {
    await client.query('BEGIN');

    for (const { file, id } of FILES) {
      const fullPath = path.join(BASE, file);
      if (!fs.existsSync(fullPath)) {
        console.warn(`  ⚠  File not found: ${file}`);
        skip++;
        continue;
      }
      try {
        const text = await extractText(fullPath);
        const { description, prerequisites, keyTakeaways, curriculum } = parseSections(text);

        await client.query(
          `UPDATE courses
              SET description       = $1,
                  prerequisites     = $2,
                  key_takeaways     = $3,
                  course_curriculum = $4,
                  updated_at        = NOW()
            WHERE id = $5`,
          [description || '', prerequisites || '', keyTakeaways || '', curriculum || '', id]
        );
        console.log(`  ✓  [${id}] ${path.basename(file)}`);
        if (!description)    console.log(`       (no description found)`);
        if (!prerequisites)  console.log(`       (no prerequisites found)`);
        if (!keyTakeaways)   console.log(`       (no learning outcomes found)`);
        if (!curriculum)     console.log(`       (no session plan topics found)`);
        ok++;
      } catch (e) {
        console.error(`  ✗  [${id}] ${path.basename(file)}: ${e.message}`);
        fail++;
      }
    }

    await client.query('COMMIT');
    console.log(`\nDone. ✓ ${ok} updated, ⚠ ${skip} skipped, ✗ ${fail} failed.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Fatal error, rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
