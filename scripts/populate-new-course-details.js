/**
 * Populates description, key_takeaways, prerequisites, course_curriculum
 * for the 5 new courses added in the recent sync.
 *
 * Sources:
 *   id=107 — GMPPE/IIM_Sambhalpur_Elective_Wasim.pdf
 *   id=108 — Marketing/IMC Draft Outline IIM Sambalpur 230326.docx
 *   id=109 — Operations/Agile in Digital Environment.docx
 *   id=110 — Operations/Applied Optimization and Analytics_Term V.docx
 *   id=111 — Strategy/CEI-IIMS.doc
 *
 * Run: node scripts/populate-new-course-details.js [--apply]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const DRY_RUN = !process.argv.includes('--apply');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ── Course data ───────────────────────────────────────────────────────────────

const courses = [

  // ── 107: Macroeconomics for Business and Financial Strategy ─────────────────
  {
    id: 107,
    name: 'Macroeconomics for Business and Financial Strategy',
    description:
      'Macroeconomic conditions significantly influence strategic decisions across finance, marketing, operations, and investment. Changes in interest rates, inflation, exchange rates, fiscal policy, labour-market conditions, and financial sentiment affect pricing, valuation, capital allocation, and long-term planning. This course provides a practical and analytical understanding of how macroeconomic developments and financial-market dynamics shape business strategy and investment outcomes. Students will learn to interpret macroeconomic indicators, assess policy actions, and evaluate their implications for firms, industries, and financial markets. Particular emphasis is placed on reading and applying major policy documents, such as the Economic Survey, the Union Budget, the RBI Monetary Policy Reports, and IMF outlooks, in managerial and financial contexts.',
    key_takeaways:
      '1. Interpret macroeconomic and financial-market indicators for strategic business and investment decisions\n' +
      '2. Diagnose economic turning points using leading, coincident, and lagging indicators\n' +
      '3. Evaluate GDP, inflation, employment, and development indicators critically\n' +
      '4. Assess the implications of monetary and fiscal policy for firms, sectors, and markets\n' +
      '5. Analyse exchange-rate movements and global macro spillovers\n' +
      '6. Understand the role of human development, inequality, and labour-market dynamics in shaping demand and competitiveness\n' +
      '7. Apply macro-financial reasoning to equity valuation, sector rotation, and top-down investment strategies\n' +
      '8. Communicate macro-based strategic insights using data dashboards, memos, and presentations',
    prerequisites: 'MBA202: Macroeconomic Analysis',
    course_curriculum:
      'Session 1: Introduction to Macroeconomic Strategy — Role of macroeconomics in managerial and investment decisions, macro-financial linkages, markets as forward-looking indicators\n' +
      'Sessions 2–3: Business Cycles and Economic Indicators — Economic regimes, business cycles; leading, coincident, and lagging indicators; yield curve, PMI, credit, unemployment, inflation; macro dashboard construction\n' +
      'Sessions 4–5: National Income and Growth Analytics — GDP measurement approaches, real vs nominal GDP, output gaps, growth accounting, productivity, and earnings linkages\n' +
      'Session 6: Human Development and Structural Change — HDI and welfare metrics, human capital, structural transformation, demographic transition, long-run market attractiveness\n' +
      'Session 7: Income Inequality and Labour Markets — Inequality measures, skill premiums, wage differentials, labour productivity, inclusive growth and implications for demand\n' +
      'Sessions 8–9: Inflation and Pricing Decisions — Headline and core inflation, inflation drivers, expectations, pricing power, pass-through, elasticity, and pricing strategy\n' +
      'Sessions 10–11: Monetary Policy and Financial Conditions — Monetary transmission, interest-rate and credit channels, financial conditions, QE/QT, YCC, and negative interest rate regimes\n' +
      'Sessions 12–13: Fiscal Policy and Sovereign Risk — Fiscal accounting, budget indicators, deficits, fiscal multipliers, crowding out, debt sustainability, sovereign credibility\n' +
      'Sessions 14–15: Exchange Rates and External Sector Dynamics — NEER/REER, PPP, competitiveness, Marshall-Lerner, J-Curve, overshooting, capital flows\n' +
      'Sessions 16–17: Macro and Equity Valuation — Discount rates, cost of equity, ERP, equity duration, rate sensitivity, growth vs value, sector rotation, macro investing\n' +
      'Sessions 18–19: Financial Crises and Market Dislocations — Credit cycles, coordination failures, bank runs, leverage build-up, liquidity spirals, systemic risk indicators, crisis transmission\n' +
      'Session 20: Course Integration and Strategic Synthesis — Integrating macro indicators, policy, and markets into a strategic framework for managerial and investment decision-making',
  },

  // ── 108: Integrated Marketing Communication ─────────────────────────────────
  {
    id: 108,
    name: 'Integrated Marketing Communication',
    description:
      'We are living through a period of sweeping change in how brands reach and influence people. The proliferation of platforms, the rise of influencers, the fragmentation of attention, the power of data and personalisation — all of it has fundamentally altered the communication landscape. And yet, the more the tools change, the more the fundamentals matter. A powerful insight, a clear brand idea, a well-crafted brief, and a message that earns its place in people\'s lives have not gone out of fashion. If anything, they are harder to get right in a noisy digital world, and more valuable when you do. This course is built around that tension. Students will learn to embrace the possibilities of digital communication without losing sight of what has always made communication work — thinking like a brand strategist, briefing like an agency planner, and evaluating like someone who understands both the art and the numbers. The course follows the real-world process of building an IMC campaign: understanding the audience, developing the brand idea, choosing the right media and message, and measuring what works. Students work on a live brand project from day one, pitching a full IMC campaign at the end of the course.',
    key_takeaways:
      '1. Apply a strategic planning process to develop integrated marketing communication campaigns tied to business objectives\n' +
      '2. Uncover and articulate consumer insights using immersive research methods including observation, ethnography, and cultural analysis\n' +
      '3. Build a brand communication platform (the big idea) that connects the brand to its audience with consistency and resonance\n' +
      '4. Write effective creative briefs that inspire memorable, meaningful, and motivating work from agency partners\n' +
      '5. Make informed media decisions across traditional, digital, and emerging platforms — understanding not just reach but relevance\n' +
      '6. Evaluate communication effectiveness against brand, marketing, and business metrics\n' +
      '7. Recognise the ethical responsibilities that come with the power of marketing communication',
    prerequisites: 'None',
    course_curriculum:
      'Session 1: The Integrated Approach to Marketing Communication — Why integration matters, customer journey as organising principle, business and communication objectives\n' +
      'Session 2: Segmentation, Targeting & Positioning as the Foundation of Communication — STP through the communication lens, identifying the right audience for each touchpoint\n' +
      'Session 3: Understanding the Brand — Brand equity and communication effectiveness, developing a Brand Essence Statement\n' +
      'Session 4: Consumer Behaviour and the Communication Process — Attention, emotion, memory; models of communication; low vs high-involvement decisions\n' +
      'Session 5: Culture, Category, and Consumer Insight — Ethnography, observation, semiotics; turning a consumer truth into a communication insight\n' +
      'Session 6: The Brand Idea — What is a "big idea" and why it matters; brand archetypes; connecting culture, category, and brand\n' +
      'Sessions 7–8: Communication Strategy and the Briefing Process — Anatomy of a great creative brief; writing briefs that inspire; workshop exercise\n' +
      'Sessions 9–10: Creative Strategy — What makes communication memorable, meaningful, and motivating; brand storytelling; evaluating creative work\n' +
      'Session 11: Media Planning and Strategy — Setting media objectives, reach and frequency, media as message, selecting and optimising across platforms\n' +
      'Session 12: Thinking Communication in a Digital Age — Personalised and always-on communication; search, social, video, audio, and OTT; branded content\n' +
      'Session 13: Influencer Marketing and Community-Led Communication — Types and fit; celebrity endorsement vs micro-influencers; co-creating with communities\n' +
      'Session 14: Public Relations, Corporate Communication & CSR — Reputation management, corporate advertising, stakeholder communication, crisis communication\n' +
      'Session 15: Sales Promotion, Sponsorships, Activations, and Experiential Communication — Role in IMC mix, consumer vs trade promotions, risk of over-reliance\n' +
      'Session 16: Measuring Campaign Effectiveness — Pre-testing, tracking, post-evaluation; brand metrics vs business metrics\n' +
      'Session 17: IMC in B2B Contexts — What changes, what stays the same in business-to-business communication\n' +
      'Session 18: Ethics in Marketing Communication — Stereotyping, manipulation, misinformation; inclusivity and sustainability in IMC\n' +
      'Session 19: Connecting the Dots — Full-campaign simulation: brief to media plan to creative\n' +
      'Session 20: Project Presentations and Course Wrap-Up — Group IMC campaign pitches, peer and faculty Q&A',
  },

  // ── 109: Agile in Digital Environment ──────────────────────────────────────
  {
    id: 109,
    name: 'Agile in Digital Environment',
    description:
      'Agile product development and project management have become essential capabilities for organizations navigating digital transformation and AI-driven innovation. Traditional project management approaches are increasingly inadequate in environments characterized by uncertainty, rapid technological change, and evolving customer expectations. Agile methodologies, particularly Scrum, enable iterative development, faster feedback loops, and enhanced collaboration across cross-functional teams. This course provides a comprehensive understanding of Agile principles, Scrum frameworks, and Lean thinking, with a strong focus on their application in developing digital and AI-enabled solutions. It bridges theory with practice through case studies, hands-on exercises, and discussions on emerging technologies such as GenAI, RPA, and intelligent workflow orchestration. The course emphasizes practical implementation in both IT and non-IT contexts, including manufacturing and supply chain systems.',
    key_takeaways:
      '1. Understand the fundamental concepts and evolution of Agile methodologies\n' +
      '2. Develop an Agile mindset for managing uncertainty and complexity in projects\n' +
      '3. Differentiate Agile from traditional project management approaches such as Waterfall\n' +
      '4. Understand Scrum roles, events, and artifacts in project execution\n' +
      '5. Apply Lean principles such as MVP, Kanban, rapid prototyping, and continuous feedback\n' +
      '6. Explore the integration of Agile and Lean in developing digital and AI-based solutions\n' +
      '7. Analyse the role of emerging technologies (GenAI, RPA, control towers) in enabling organisational agility\n' +
      '8. Develop practical skills in backlog prioritization, user story development, and Agile execution tools\n' +
      '9. Evaluate real-world Agile applications through case studies in operations and digital transformation',
    prerequisites: 'None',
    course_curriculum:
      'Sessions 1–2: The Concept and Fundamentals of Agile — Brief history of Agile, enabling agility in a manufacturing world, key principles and pillars, Agile mindset, systems enabling agility in supply chain; Chapter review on Strategic Supply Chain Management\n' +
      'Sessions 3–4: Agile Project Management — Agile project lifecycle, difference from Waterfall model, roles (Product Owner, Scrum Master, Development Team), concepts of Epic/feature/user story/backlog prioritization; Lean concepts (MVP, Kanban, rapid prototyping, learn fast/fail fast); Article review: Gen AI Robots are reshaping Services\n' +
      'Sessions 5–6: Agile Execution and Scrum — Scrum framework, sprint planning, daily scrum, sprint review and retrospection, iterative development and feedback loop, adoption of Agile in non-IT projects; Hands-on activity: user story grooming, backlog prioritization (MoSCoW, WSJF), burndown chart\n' +
      'Sessions 7–8: Lean and Agile in AI Solutions — AI solution implementation with Lean and Agile, business preparedness, RPA, workflow automation, simulations, control towers, Conversational AI, Agentic AI, and Intelligent workflow orchestration; Article review: Customer experience in the age of AI\n' +
      'Sessions 9–10: Case Study Discussion, Presentation and Quiz',
  },

  // ── 110: Applied Optimization and Analytics ─────────────────────────────────
  {
    id: 110,
    name: 'Applied Optimization and Analytics',
    description:
      'Applied Optimization and Analytics (AOA) is an operations-domain focused elective that extends the LP foundations of Quantitative Techniques 2 into six advanced Operations Research (OR) domains: Foundations and Integer Programming, Transportation and Assignment Problems, Network Optimization Models, Mixed Integer & Binary Programming, Nonlinear Programming & Metaheuristics, and Game Theory & Decision Analysis. The course is intentionally focused — each topic is taught with sufficient depth for management students to confidently formulate, solve, and interpret real OR models without specialist assistance. Computational work is developed in parallel using Microsoft Excel (Solver Add-in) and Python (PuLP, NetworkX, SciPy), ensuring students graduate with both interpretability and scalability in their analytical toolkit.',
    key_takeaways:
      'Module I – Foundations of OR: Simplex formulation, Duality and Post-Optimal Analysis, Sensitivity Analysis for resource allocation, product mix, and budgeting decisions\n' +
      'Module II – Transportation & Assignment Problems: North-West Corner, Vogel\'s, MODI methods; Hungarian Algorithm for assignment; applications in machine-task allocation and job scheduling\n' +
      'Module III – Network Optimization Models: Dijkstra\'s shortest path, Minimum Spanning Tree, Maximum Flow, and Minimum Cost Flow for supply chain and logistics\n' +
      'Module IV – Mixed Integer & Binary Programming: Branch-and-Bound, Branch-and-Cut; facility location, capital budgeting, and crew scheduling problems using Excel Solver and Python PuLP\n' +
      'Module V – Nonlinear Programming & Metaheuristics: KKT conditions, Quadratic and Convex Programming, Simulated Annealing, and Genetic Algorithms for large combinatorial problems\n' +
      'Module VI – Game Theory & Decision Analysis: Decision trees, utility theory, Bayesian updating, and game-theoretic concepts applied to competitive strategy and investment under uncertainty',
    prerequisites: 'Quantitative Techniques 2 (Term II) — Linear Programming foundations assumed. Familiarity with Microsoft Excel. No prior Python knowledge required.',
    course_curriculum:
      'MODULE I — FOUNDATIONS OF OR (Sessions 1–4): Simplex Formulation, Duality and Post-Optimal Analysis; Applications: resource allocation, product mix, budgeting, sensitivity-based managerial decisions; Case: Managing Linen at Apollo Hospitals\n' +
      'MODULE II — TRANSPORTATION & ASSIGNMENT PROBLEMS (Sessions 5–8): Initial Basic Feasible Solution (NW Corner, Least Cost, Vogel\'s); Transportation Simplex (MODI/UV Method); Assignment Problem: formulation as 0-1 IP; Hungarian Algorithm; Applications: Machine-Task Allocation, Job Scheduling, Sales Territory Assignment; Case: Merton Truck Co.\n' +
      'MODULE III — NETWORK OPTIMIZATION MODELS (Sessions 9–10): Graphs, Nodes, Arcs and Flow Concepts; Shortest Path (Dijkstra\'s); Minimum Spanning Tree; Maximum Flow and Minimum Cost Flow; Applications: Supply Chain Routing, Project Networks; Case: DHL Global Forwarding\n' +
      'MODULE IV — MIXED INTEGER & BINARY PROGRAMMING (Sessions 11–13): Integer Programming formulation (Pure IP, Binary IP, Mixed IP); Branch-and-Bound and Branch-and-Cut Approach; Applications: Facility location, capital budgeting, crew scheduling; Case: Agarwal Automobiles: Fuel Station Forecasting\n' +
      'MODULE V — NONLINEAR PROGRAMMING & METAHEURISTICS (Sessions 14–17): Foundations of NLP; Quadratic, Separable and Convex Programming; Introduction to Metaheuristics; Simulated Annealing and Genetic Algorithms; Applications: Pricing, portfolio optimization, nonlinear cost planning\n' +
      'MODULE VI — GAME THEORY & DECISION ANALYSIS (Sessions 18–20): Game Theory (simple games vs mixed strategies); Decision Making under Uncertainty; Decision Trees and Utility Theory; Applications: Competitive strategy, negotiation, investment under uncertainty, risk-based managerial decisions',
  },

  // ── 111: Corporate Entrepreneurship & Innovation ────────────────────────────
  {
    id: 111,
    name: 'Corporate Entrepreneurship & Innovation',
    description:
      'This course introduces students to the field of corporate entrepreneurship and innovation, and familiarizes them with the tools, methods, and logic that enable participation in or leadership of successful corporate entrepreneurship (CE) and innovation programs. For an increasing number of established and large companies, it is becoming difficult to predict the future and manage growth from existing businesses. Maturing technologies and aging product portfolios require established companies to create, develop, and sustain innovative new initiatives. Corporate entrepreneurship and innovation is being adopted by organizations to address this challenge through creation of new businesses, as well as rewriting the dominant logic of existing businesses for strategic renewal. If organizations wish to avoid becoming obsolete (like NOKIA), building capabilities of entrepreneurship and innovation is essential. The course acquaints students with theoretical issues in corporate entrepreneurship, managing innovation processes, and strategic renewal of corporations, while building entrepreneurial orientation, innovative thinking, and knowledge of managing CE and innovation programs.',
    key_takeaways:
      '1. Knowledge of how organizations of different types, operating in varied contexts, survive, stay competitive, and grow using corporate entrepreneurship and innovation\n' +
      '2. Understanding of opportunities and challenges for firms while managing entrepreneurship and innovation in established organizations\n' +
      '3. Innovative thinking mindset for organizational excellence\n' +
      '4. Practical exposure to corporate accelerators, corporate venture capital, and design thinking as tools for scaling innovation\n' +
      '5. Ability to evaluate and develop corporate entrepreneurship strategies drawing on real-world case studies',
    prerequisites: 'Good competency in Strategic Management core course',
    course_curriculum:
      'Session 1: Competitive Advantage through Innovation and Entrepreneurship — Managing an ambidextrous organization: balancing innovation and efficiency\n' +
      'Sessions 2–3: Idea to Entrepreneurship; New Models of Managing Innovation — P&G\'s new model for innovation; Guardrails in Managing Technology and Innovation; Cases: XYZ Corporation, Corning Inc. Technology Strategy in 2003\n' +
      'Sessions 4–5: Design Thinking and Innovation — Why Design Thinking Works (Jeanne Liedtka, HBR 2018); Workshop\n' +
      'Sessions 6–7: Initiating and Scaling Corporate Entrepreneurship Activities — Ecosystem Advantage: Harnessing the Power of Partners; Cases: HCL Technologies: Fuel for Growth, HCL Technologies: Driving Innovation Through Ecosystem\n' +
      'Sessions 8–9: Corporate Accelerators and Corporate Venture Capital — Power of corporate accelerators; Corporate venture capital strategy; Cases: Intel Capital: The Berkeley Networks Investment\n' +
      'Session 10: Group Projects and Course Review — Group Presentations',
  },

];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (pass --apply to write) ===' : '=== APPLYING ===\n');

  for (const c of courses) {
    console.log(`\n[${c.id}] ${c.name}`);
    console.log(`  description   : ${c.description.slice(0, 80)}…`);
    console.log(`  key_takeaways : ${c.key_takeaways.split('\n').length} items`);
    console.log(`  prerequisites : ${c.prerequisites}`);
    console.log(`  curriculum    : ${c.course_curriculum.split('\n').length} sessions/modules`);

    if (!DRY_RUN) {
      await pool.query(
        `UPDATE courses
         SET description=$1, key_takeaways=$2, prerequisites=$3, course_curriculum=$4, updated_at=NOW()
         WHERE id=$5`,
        [c.description, c.key_takeaways, c.prerequisites, c.course_curriculum, c.id]
      );
    }
  }

  await pool.end();
  console.log(DRY_RUN
    ? '\nDry run complete — pass --apply to write changes.'
    : '\nAll 5 courses updated.'
  );
}

main().catch(e => { console.error(e.message); process.exit(1); });
