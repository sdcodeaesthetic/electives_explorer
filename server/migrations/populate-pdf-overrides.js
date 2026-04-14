/**
 * Migration: populate-pdf-overrides
 *
 * Populates course details for PDF-only courses (manually extracted) and
 * the HR Analytics docx course (id 101) which was missing from the main run.
 *
 * Covers course IDs: 16, 19, 20, 23, 26, 30, 31, 53, 76, 92, 96, 97, 101
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mammoth = require('mammoth');
const path    = require('path');
const { pool } = require('../db');

const BASE = 'C:/Users/swarn/Projects/Electives/Subject_Details';

// ── Manually extracted PDF data ───────────────────────────────────────────────
const PDF_OVERRIDES = [
  // ── ISM ──────────────────────────────────────────────────────────────────
  {
    id: 16,
    description:
      'AI for Finance introduces students to the transformative power of Artificial Intelligence in modern Financial Decision-Making. The course explores how Machine Learning, Deep Learning, and natural language processing are reshaping Forecasting, Portfolio Management, Financial Analysis, and Risk Assessment. Blending Financial Strategy with Cutting-Edge AI Applications, it equips students to move Beyond Traditional Tools and harness Data-Driven Intelligence for smarter, faster, and more strategic financial decisions in today\'s digital economy.',
    prerequisites:
      'Logical thinking\nBasic Math\nBasic statistics\nBasic computer skills\nBasic Knowledge of Finance',
    key_takeaways:
      'Critically evaluate AI-driven financial models by interpreting outputs, assessing limitations and risks\n' +
      'Formulate real-world financial challenges into structured AI-based analytical frameworks and apply appropriate techniques to generate strategic, data-driven solutions.\n' +
      'Analyze structured and unstructured financial data using AI tools and develop evidence-based financial insights through independent analytical work.',
    course_curriculum:
      'Foundations of AI and Financial Data Infrastructure\n' +
      'Predictive Analytics and Intelligent Decision Models\n' +
      'Natural Language Processing for Financial Text Analytics\n' +
      'Pattern Recognition, Anomaly Detection, and Explainable AI\n' +
      'Responsible AI, Governance, and Organizational Implementation\n' +
      'Emerging Applications of AI in Finance-Related Contexts',
  },
  {
    id: 19,
    description:
      'In this course, students will learn blockchain fundamentals, major platforms, and real business applications in finance, supply chains, and beyond, risks, regulation, and basic analytics for decision-making. The course ends with a team project designing a blockchain-based business solution.',
    prerequisites: 'None',
    key_takeaways:
      'Explain and differentiate between different blockchain concepts and platforms (distributed ledgers, consensus, smart contracts).\n' +
      'Evaluate and design blockchain-based business solutions, deciding when blockchain is appropriate, outlining high-level architectures, and mapping applications in finance, supply chain, and other domains\n' +
      'Assess value, risks, and implementation feasibility of blockchain initiatives, including ROI, regulatory and security risks, and adoption challenges, and communicate recommendations to non-technical stakeholders',
    course_curriculum:
      'Why Blockchain?\n' +
      'Ethereum Basics and Smart Contract Idea\n' +
      'Crypto Asset Classes and Market Structure\n' +
      'On-chain Data: What Managers Can See?\n' +
      'DAOs and Token Governance\n' +
      'Smart Contracts for Business Logic\n' +
      'Enterprise Blockchain and Hyperledger\n' +
      'Blockchain in Finance and DeFi\n' +
      'Case Study\n' +
      'Guided DApp / Architecture Exercise',
  },
  {
    id: 20,
    description:
      'Increased digitization of business processes has resulted in explosive growth in the amount of structured and unstructured data collected by firms. Business Analytics for Managerial Decisions (BAMD) is a process for increasing the competitive advantage of a firm through mining and intelligent use of available data in decision making. This course covers the concepts and fundamentals of BAMD with the various business decisions as a backdrop. The emphasis of the course is on application of analytics and associated techniques in real world business problems.',
    prerequisites: 'Quantitative Techniques-1',
    key_takeaways:
      'Develop a strong understanding of management theories and practices, with the ability to think critically and apply them to solve organizational problems, even in uncertain situations.\n' +
      'Gain the ability to apply insights from experience and observation in data analytics for effective decision-making.\n' +
      'Understand the process of acquiring and integrating information technology in modern businesses and learn to use IT-enabled decision support tools.\n' +
      'Appreciate the role of analytics and artificial intelligence in enhancing business decision-making.\n' +
      'Develop the ability to assess both the potential and limitations of IT-driven data analytics tools and techniques.',
    course_curriculum:
      'Introduction to Business Analytics for Managers\n' +
      'Business Problems vs Analytics Problems\n' +
      'Python Basics for Business Analytics\n' +
      'Data Cleaning, Exploratory Data Analysis (EDA), Manipulation, and Visualization\n' +
      'Predicting Customer Behaviour (Linear regression)\n' +
      'Forecasting & Time Series for Business Planning\n' +
      'Supervised vs Unsupervised Methods / Clustering (Customer Segmentation Using ML)\n' +
      'Some Classification Models (Logistic regression, Naive Bayes)\n' +
      'Dimensionality reduction – Principal Component Analysis\n' +
      'Some other Classification Models (SVM & Decision Tree)\n' +
      'Some Classification & Optimization Models (Random Forest & Stochastic Gradient Descent)\n' +
      'Associations/Market Basket Analysis\n' +
      'Text Analysis – Processing & Lexicon-based Sentiment Analysis\n' +
      'Feature Representation & ML-based Sentiment Analysis\n' +
      'Artificial Neural Networks (ANN) & AI for Business Decision-Making\n' +
      'Project\n' +
      'Data-Driven Storytelling in Business Analytics – Practical Applications',
  },
  {
    id: 23,
    description:
      'In the present data-driven world, data visualization has become an essential skill allowing managers and professionals to better understand their data and present the findings in a way that is most suitable for the intended audience, with the ultimate objective of narrating engaging data stories that matter. Combining aspects of varied areas such as statistics, psychology, and computer science, data visualization essentially allows one to explore and present the data in an effective manner.',
    prerequisites: 'None',
    key_takeaways:
      'Understand the key concepts related to data visualization and visual analytics\n' +
      'Create reports, dashboards, and data visualizations using Tableau\n' +
      'Create reports, dashboards, and data visualizations using Power BI\n' +
      'Understand how interactive dashboards help in managerial decision-making\n' +
      'Learn the art of crafting effective business stories backed by data',
    course_curriculum:
      'Introduction to Data Visualization and Business Storytelling\n' +
      'Power BI – Foundations and Setup\n' +
      'Data Preparation Essentials\n' +
      'Data Cleaning Mastery (Power Query Deep Dive)\n' +
      'Visualization Design & Analytics Features\n' +
      'Advanced Modelling and Data Transformation\n' +
      'Advanced Visual Interactions\n' +
      'DAX Fundamentals\n' +
      'Deployment, security and real-world practices\n' +
      'Basics of visualization in Tableau\n' +
      'Creating important charts in Tableau\n' +
      'Advanced and useful features in Tableau\n' +
      'Dashboards and Stories in Tableau\n' +
      'Advanced charts in Tableau\n' +
      'Identifying and fixing ineffective visuals\n' +
      'Telling effective business stories using data',
  },
  {
    id: 26,
    description:
      'This course introduces how the Internet of Things (IoT) can be used to improve, automate, and reimagine business processes across manufacturing, logistics, services, and customer-facing operations. We will explore how sensors, connectivity, edge devices, and cloud platforms work together with analytics to create real-time visibility and smarter decisions. The emphasis is managerial — you will learn to think in terms of processes, KPIs, value creation, risks, and implementation challenges, not low-level electronics or coding. By the end, you should be able to map a real business process, identify where IoT adds value, and design a feasible IoT-enabled solution with a clear business case.',
    prerequisites: 'Management Information Systems',
    key_takeaways:
      'Explain and model IoT-enabled business processes, describing how devices, edge, cloud, and analytics interact to improve operational KPIs in domains such as manufacturing, logistics, and services.\n' +
      'Design high-level IoT solutions for real business problems, selecting suitable sensors, edge/cloud architectures, and integration points (OT/IT) while accounting for security, privacy, and deployment constraints.\n' +
      'Evaluate the value, risks, and feasibility of IoT initiatives, including ROI, operational impact, cybersecurity and governance issues, and communicate implementation roadmaps to managerial stakeholders.',
    course_curriculum:
      'Introduction to IoT and Business Processes\n' +
      'Sensors, Actuators, and Data Flows\n' +
      'Edge vs Cloud Computing\n' +
      'IoT Data Analytics for Managers\n' +
      'IoT in Industry 4.0\n' +
      'IoT and Robotics Integration\n' +
      'IoT in Resource Management\n' +
      'IoT for Customer Experience and Services\n' +
      'Industry 4.0 to Industry 5.0 – Human-Centric Processes\n' +
      'Case Study – IoT in a Business Process\n' +
      'IoT Architectures and Protocols\n' +
      'Digital Twin Modelling using Unity\n' +
      'Cloud IoT Platforms\n' +
      'IoT Security Fundamentals\n' +
      'Crisis Management, Administration, and Compliance in IoT Systems\n' +
      'Deployment and Lifecycle Management\n' +
      'Hands-on Demonstration\n' +
      'Capstone Project – Problem Definition and Design\n' +
      'Capstone Project – ROI and Implementation Plan\n' +
      'Capstone Presentations and Synthesis',
  },

  // ── Marketing ─────────────────────────────────────────────────────────────
  {
    id: 30,
    description:
      'In an era where over 5.35 billion individuals are connected to the internet worldwide, the trajectory of digital marketing has been nothing short of explosive. From multinational corporations to burgeoning startups, the imperative to navigate the dynamic digital landscape has become undeniable. This course is designed to unveil the bedrock principles of Digital Marketing. Participants will embark on a comprehensive exploration of owned, paid, inbound, and outbound facets of digital marketing, equipping them with the tools and insights necessary to thrive in this ever-evolving domain.',
    prerequisites:
      'Understanding about basic principles of marketing management as taught in Marketing Management -1 & Marketing Management -2.\nNo programming knowledge is required',
    key_takeaways:
      'Deeper understanding of various components and channels of digital marketing.\n' +
      'Design digital marketing strategies for firms and manage teams of digital marketing professionals – both within the firm and with external agencies.\n' +
      'Master the utilisation of various digital marketing channels, including SEO, SEM, social media and affiliate advertising.\n' +
      'Develop skills to understand web analytics fundamentals and how to manage an analytics dashboard.',
    course_curriculum:
      'Introduction to Digital Marketing\n' +
      'Digital Consumer Psychology\n' +
      'Search Engine Optimisation (SEO)\n' +
      'Influencer Marketing and Creator Economy\n' +
      'Search Engine Marketing (SEM)\n' +
      'Digital Marketing Strategy\n' +
      'Mobile and Social Media Advertising\n' +
      'Email & Marketing Automation\n' +
      'Introduction to Web Analytics\n' +
      'Project Presentation',
  },
  {
    id: 31,
    description:
      'Artificial Intelligence (AI) is fundamentally reshaping how firms create, communicate, and deliver value. From predictive analytics and personalisation to generative AI and marketing automation, AI has transitioned from a technological support tool to a strategic driver of competitive advantage. This course provides a managerial understanding of AI in marketing, emphasising strategic implications, business applications, ethical concerns, and decision making frameworks. Students will learn how AI transforms core marketing processes including segmentation, targeting, positioning, branding, pricing, promotion, distribution, and customer relationship management.',
    prerequisites:
      'Basic understanding of core marketing concepts (STP, marketing mix, branding, marketing research)\n' +
      'Introductory knowledge of business analytics is desirable but not mandatory\n' +
      'No programming knowledge is required',
    key_takeaways:
      'Explain the strategic role of AI in marketing systems.\n' +
      'Understand the foundational logic of machine learning, deep learning, and large language models from a managerial perspective.\n' +
      'Evaluate how AI transforms segmentation, targeting, positioning, and marketing mix decisions.\n' +
      'Analyse the use of AI in branding, performance marketing, and customer engagement.\n' +
      'Identify risks related to bias, ethics, privacy, and algorithmic decision making.\n' +
      'Design AI enabled marketing strategies aligned with business objectives.',
    course_curriculum:
      'Understanding AI in Marketing\n' +
      'How AI Works – A Managerial Perspective\n' +
      'Data as a Foundation of AI Driven Marketing\n' +
      'Marketing Research in the Age of AI\n' +
      'Marketing Strategy with AI\n' +
      'Integrating AI across the Marketing Mix\n' +
      'AI in Branding, Communication, and Value Delivery\n' +
      'Marketing Automation and AI Agents\n' +
      'Project Presentation and Course Wrap-Up',
  },

  // ── Operations ────────────────────────────────────────────────────────────
  {
    id: 53,
    description:
      'Constraint Management, grounded in the Theory of Constraints (TOC) developed by Dr. Eliyahu Goldratt, views organizations as interconnected systems rather than collections of isolated processes. This course equips students with both the conceptual foundations and practical tools to identify, exploit, and elevate constraints—ultimately improving throughput, quality, and profitability. Topics span TOC applications in manufacturing, services, supply chains, and project management. Students will develop skills in systematic cause-and-effect analysis, constraint optimization, and leading organizational change.',
    prerequisites: '',
    key_takeaways:
      'Understand the core principles of TOC including the systems perspective and the Five Focusing Steps.\n' +
      'Apply TOC concepts to project environments, focusing on buffer management, resource contention, and schedule reliability.\n' +
      'Learn and apply DBR scheduling to synchronize production, distribution, and project workflows around the system constraint.\n' +
      'Contrast throughput accounting with traditional cost accounting and use TOC-based metrics to guide operational and strategic decisions.\n' +
      'Construct and analyse logical trees (CRT, EC, FRT, PRT, TT) to diagnose root causes, design solutions, and anticipate implementation obstacles.\n' +
      'Implement TOC-based solutions in marketing, sales, distribution, supply chains, and inventory management.',
    course_curriculum:
      'Introduction to Theory of Constraints\n' +
      'Critical Chain Project Management\n' +
      'Drum-Buffer-Rope Fundamentals\n' +
      'Concepts of Throughput Accounting\n' +
      'TOC Thinking Process\n' +
      'Current Reality Tree\n' +
      'Evaporating Cloud\n' +
      'Future Reality Tree and Negative Branch Reservation\n' +
      'Prerequisite Tree and Transition Tree\n' +
      'Application of TOC in Marketing, Sales, and Distribution\n' +
      'Application of TOC in Supply Chains and Inventory Management',
  },

  // ── Strategy ──────────────────────────────────────────────────────────────
  {
    id: 76,
    description:
      'This course explores the unique world of Indigenous ventures and entrepreneurship ecosystem with frugal innovation strategies such as Jugaad, highlighting how communities creatively navigate challenges with limited resources. Students will delve into inspiring cases and practices of Indigenous entrepreneurs and their innovations, uncovering valuable lessons for modern business and enterprise scaling. Participants will develop an appreciation for resourcefulness, empathy for those working with constraints, and practical skills to incorporate frugal and sustainable methods into their own entrepreneurial and business pursuits. The course develops context-sensitive managerial capabilities—skills that allow students to design solutions for emerging markets, rural economies, and underserved communities.',
    prerequisites: 'Basic knowledge in Entrepreneurship',
    key_takeaways:
      'Demonstrate a critical understanding of Indigenous entrepreneurship in India and explain how indigenous knowledge systems and innovation strategies function as context-driven approaches to venture creation under resource constraints.\n' +
      'Apply frameworks of frugal innovation, jugaad, bricolage, and grassroots entrepreneurship to identify and evaluate opportunities for business creation in emerging and underserved markets.\n' +
      'Collaborate in heterogeneous teams through simulation exercises, case discussions, and group-based innovation projects to develop strategic business solutions for indigenous enterprises.\n' +
      'Develop, prototype, and present a practical innovation-led venture concept demonstrating the feasibility, scalability, and socio-economic impact of resource-constrained innovation models.',
    course_curriculum:
      'Introduction to Indigenous Entrepreneurship and Innovation Systems\n' +
      'Indigenous Knowledge Systems\n' +
      'Base of the Pyramid Innovations\n' +
      'The Principles of Jugaad\n' +
      'Methods of Innovation at the Grassroots: Business Creation\n' +
      'Bricolage and Scaffolding\n' +
      'Frugal Innovation Systems\n' +
      'The Sustainable Development Goals (SDGs): Drivers and Recent Trends of Indigenous Business\n' +
      'Implementing Jugaad into Formal Organizations as a Strategic Pivot\n' +
      'Jugaad Driven Business Development Project Phase I: Ideation\n' +
      'Sustainability Impacts of Grassroots Innovations for Indigenous Businesses\n' +
      'Scalability and Marketability of Indigenous Innovation\n' +
      'Lean Business Models for a Resource Constrained World\n' +
      'Growth Challenges of Lean Businesses\n' +
      'Crafting and Maintaining Lean Organizations\n' +
      'Innovating Business Models for Global Markets: Resource Based Views for Sustainability\n' +
      'Project Presentation',
  },

  // ── GMPPE ─────────────────────────────────────────────────────────────────
  {
    id: 92,
    description:
      'This course introduces how the global economic environment shapes business strategy and performance. The course begins with a conceptual understanding of trade theories (Mercantilism, Absolute and Comparative Advantage, Heckscher–Ohlin, New trade theory) to explain patterns of specialization, scale economies and national competitiveness. It builds an analytical framework to understand why countries trade, the gains from trade and how global trade is evolving. The course links the economics of international trade, global value chains and market integration to business decisions like market entry, export/import, outsourcing and cross-border partnerships. Students shall learn about the international monetary and financial system, covering exchange-rate regimes, determinants of currency movements, central bank intervention and the balance of payments. The course also examines trade policy instruments (tariffs, quotas, standards, subsidies, export incentives) and the role of multilateral bodies (WTO, IMF, World Bank).',
    prerequisites:
      'Basic knowledge of Microeconomics and Macroeconomics\n' +
      'Basic quantitative skills like data interpretation using graphs and equations\n' +
      'Familiarity with basic concepts of Finance',
    key_takeaways:
      'To understand why countries engage in international trade and what are the gains from trade\n' +
      'To make informed business decisions by understanding the evolving pattern of international trade.\n' +
      'To interpret various trade policy measures from national as well as international perspectives.\n' +
      'To understand the importance of Free Trade Agreements for global business.\n' +
      'To critically analyse the role and policies of the Reserve Bank of India in managing internal and external stability.',
    course_curriculum:
      'International Trade Theories (Why countries trade?)\n' +
      'Heckscher Ohlin Theory, New Trade Theory\n' +
      "Porter's Diamond Model: Competitive Advantage of Nations\n" +
      'International Trade Policies: Tariffs and Quotas\n' +
      'International Trade Agreements and WTO\n' +
      'Trade Blocs and their Implications\n' +
      'International Monetary System\n' +
      'International Financial System, FDI, FPI, and Market Entry Mode\n' +
      'Multinational Corporations (MNCs)\n' +
      'Economic Systems, Economic Cycles, and Global Economic Environment\n' +
      'International Market Entry Strategies\n' +
      'International Business Negotiation and Communication',
  },

  // ── OB-HR ─────────────────────────────────────────────────────────────────
  {
    id: 96,
    description:
      'The current workplace is undergoing ever-changing disruptions from emerging technologies and demographic shifts, thereby redefining human behaviour and relationships. How should we flourish and thrive in this complex world? How should we attain and lead well-being (SDG 3) for ourselves and others in the workplace and society? The World Economic Forum has identified 10 essential future skills for 2030, of which 6 are behavioural skills—analytical skills, resilience-flexibility-agility, creative thinking, leadership and social influence, curiosity and lifelong learning, and empathy and active listening. This course aims at enabling participants to learn future skills to flourish and thrive, attain and lead well-being. The course will deliver the mechanism of leading by coaching and mentoring with the objectives of (i) unleashing the hidden potential of individuals and transforming them into performers; (ii) enhancing their well-being and quality of life; and (iii) considering coaching as an alternative career choice.',
    prerequisites: '',
    key_takeaways:
      'The science of happiness and well-being\n' +
      'The transformation from an individual contributor to a manager\n' +
      'The interaction of self and different identities as the centre of focus in the managerial journey\n' +
      'The nitty-gritty of coaching and mentoring: Theories and tools',
    course_curriculum:
      'Introduction to Positive Psychology\n' +
      'Art of Flourishing and Thriving in the Disruptive Workplace\n' +
      'Decoding Meaningfulness at Workplace\n' +
      'The Science of Well-being and Happiness\n' +
      'Understanding Self & Others\n' +
      'Role of Identity and Self-regulation in Flourishing\n' +
      'Introduction to Coaching\n' +
      'Coaching vis-a-vis Mentoring\n' +
      'Coaching Theories and Tools for Career and Life Enrichment\n' +
      'Coaching Self and Peers\n' +
      'Understanding the Art of Storytelling\n' +
      'Leading by Coaching: The Best Practices\n' +
      'Team Coaching and Executive Coaching\n' +
      'Term Project: Leading by Storytelling',
  },
  {
    id: 97,
    description:
      'Talent is crucial for the competitive advantage. But talent is scarce. Thus, organisations develop several talent management imperatives to fight the war for talent. However, identifying and managing talent in today\'s accelerating, volatile business environment is becoming complex and challenging than ever before. This course examines various talent management issues and strategies adopted by contemporary organisations in the disruptive business landscape.',
    prerequisites: '',
    key_takeaways:
      'Talent Management: Basic Principles and Integrated Model\n' +
      'Talent Management and Future of Work: The New Normal Era\n' +
      'Talent Management for Building High-Performance Workplace\n' +
      'Talent Building Blocks: Competency Based Management\n' +
      'Journey of Talent in Organization: Talent Planning, Acquisition, Segmentation, Development, and Engagement\n' +
      'Best Practices in Talent Management',
    course_curriculum:
      'Future of Work: The Changing Business Landscape\n' +
      'A Map of the Territory between HR and Talent Management\n' +
      'Defining Talent and War for Talent\n' +
      'Understanding the Principles of Talent Management\n' +
      'Integrated Model of Talent Management\n' +
      'Technology Based Talent Management\n' +
      'Understanding Competency and Competency Model\n' +
      'Developing Competency Framework for Organizations\n' +
      'Competency Mapping and Competency-based Management\n' +
      'Talent Identification and Segmentation\n' +
      'Assessment Centre\n' +
      'Talent Attraction and Retention\n' +
      'Employer Branding\n' +
      'Developing Talent and Workplace Learning\n' +
      'Career Development and Management\n' +
      'Mentoring\n' +
      'Talent Performance and Talent Engagement\n' +
      'Global Talent Management\n' +
      'Term Project Submissions and Presentations',
  },
];

// ── Docx file that was missing from the main run ──────────────────────────────
// ID 101: HR Analytics
async function extractDocxText(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

function norm(s) { return s.toLowerCase().trim(); }

function parseSections(rawText) {
  // Preprocess: insert newline before all-caps headings run together
  rawText = rawText.replace(/([a-z])([A-Z]{4,})/g, '$1\n$2');
  const lines = rawText.split(/\r?\n/);

  const AFTER_DESC = [
    /^prerequisite/, /^pre-?requisite/, /^prior knowledge/,
    /^course competenc/, /^learning outcomes?/, /^learning objectives?/,
    /^student learning outcomes?/, /^course objectives?[\s:]*$/,
    /^evaluation/, /^text\s?book/, /^session\s*(plan|schedule)/,
    /^tentative\s*session/, /^schedule\s*of\s*sessions?/,
  ];
  const AFTER_PRE = [
    /^course competenc/, /^learning outcomes?/, /^learning objectives?/,
    /^student learning outcomes?/, /^program outcomes?/, /^course outcomes?/,
    /^course objectives?[\s:]*$/, /^objectives[\s:]*$/,
    /^evaluation/, /^text\s?book/, /^session\s*(plan|schedule)/,
    /^tentative\s*session/,
  ];
  const AFTER_KT = [
    /^evaluation/, /^text\s?book/, /^required\s?(text|book)/,
    /^session\s*(plan|schedule)/, /^tentative\s*session/,
    /^schedule\s*of\s*sessions?/, /^course\s*schedule[\s:]*$/,
    /^grading/, /^note:/, /^bibliography/,
  ];

  function collectSection(startRes, stopRes) {
    let inSection = false;
    const parts = [];
    for (const line of lines) {
      const n = norm(line);
      if (!inSection) {
        if (startRes.some(re => re.test(n))) { inSection = true; continue; }
        continue;
      }
      if (!n) continue;
      if (stopRes.some(re => re.test(n))) break;
      parts.push(line.trim());
    }
    return parts.join('\n').trim();
  }

  const description = collectSection(
    [
      /^(introduction|about this course|course overview|overview|course background)[\s:]*$/,
      /^(course description|course descriptions?)[\s:]*$/,
      /^description[\s:]*$/,
      /^(\d+\.|[ivxlcIVXLC]+\.)\s*(introduction|course description|overview|about this course|background)/,
      /^ii\.\s*course description/,
    ],
    AFTER_DESC
  );

  const prerequisites = collectSection(
    [/^prerequisite[s:]*/,/^pre-?requisite[s:]*/,/^prior knowledge/],
    AFTER_PRE
  );

  const keyTakeaways = collectSection(
    [
      /^course competenc/,/^learning outcomes?[\s:]*$/,/^learning objectives?[\s:]*$/,
      /^student learning outcomes?/,/^program outcomes?/,/^course outcomes?/,
      /^course objectives?[\s:]*$/,
      /^(\d+\.|[ivxlcIVXLC]+\.)\s*(learning outcome|learning objective|student learning|course objective|program outcome)/,
      /^ii+\.\s*(learning|student learning|course objective)/,
      /^objectives[\s:]*$/,
    ],
    AFTER_KT
  );

  const sessionStartRes = [
    /session\s*(plan|schedule)[\s:]*$/,/tentative\s*session/,
    /schedule\s*of\s*sessions?/,/course\s*schedule[\s:]*$/,
    /^session\s*no\.?\s*(topic|and sub|$)/,/^(schedule|session|tentative)\s+of/,
  ];
  const sessionStopWords = /^(text\s?book|reference\s?book|required\s?(text|book)|evaluation\s?(scheme|component|weightage)|grading|note:|important instruction|bibliography|reading list|course material)/i;
  const isSessionNum = l =>
    /^session\s+\d+(\s*[-–—]\s*\d+)?[\s:]*$/i.test(l) ||
    /^\d+\s*[-–—]\s*\d+\s*$/.test(l) || /^\d+\s*$/.test(l);
  const sessionWithTopic = /^\s*(\d+\s*[-–—]\s*\d+|\d+)\s+(.{5,})/;

  let inSession = false;
  const topicLines = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!inSession) {
      if (sessionStartRes.some(re => re.test(norm(trimmed)))) { inSession = true; continue; }
      if (/^session\s+1\s*[-–:]/i.test(trimmed)) inSession = true;
      if (!inSession) continue;
    }
    if (!trimmed) continue;
    if (sessionStopWords.test(trimmed)) break;
    if (/^(session\s*no\.?|topic\s*(and\s*sub.?topics?)?|sub.?topics?|reference|case|exercise|assignment|description)[\s:]*$/i.test(trimmed)) continue;
    const tabParts = trimmed.split(/\t+/);
    if (tabParts.length >= 2) {
      const maybeNum = tabParts[0].trim();
      if (/^(\d+\s*[-–—]\s*\d+|\d+)$/.test(maybeNum)) {
        let topic = tabParts[1].trim().replace(/\s+(bhk|bkm|asb|rh|ch\.|chapter|book|pg\.|page)\s.*/i, '').trim();
        if (topic.length > 4 && !/^(topic|sub.?topic)/i.test(topic)) { topicLines.push(topic); continue; }
      }
    }
    if (isSessionNum(trimmed)) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const next = lines[j].trim();
        if (!next) continue;
        if (/^objectives?:/i.test(next)) break;
        if (sessionStopWords.test(next)) break;
        if (!isSessionNum(next) && next.length > 4) topicLines.push(next.replace(/:$/, '').trim());
        break;
      }
      continue;
    }
    const m = trimmed.match(sessionWithTopic);
    if (m) {
      let topic = m[2].replace(/\s+(bhk|bkm|asb|rh|ch\.|chapter|book|pg\.|page)\s.*/i, '').trim().replace(/:$/, '').trim();
      if (topic.length > 4 && !/^(session|topic|sub.?topic|reference|case|exercise|assignment)/i.test(topic)) { topicLines.push(topic); continue; }
    }
    const sessionTopicM = trimmed.match(/^session\s+\d+(\s*[-–—]\s*\d+)?\s*[-:]\s*(.{5,})/i);
    if (sessionTopicM) {
      let topic = sessionTopicM[2].replace(/:$/, '').trim();
      if (!/^(learning objective|objective|sub.?topic)/i.test(topic)) { topicLines.push(topic); continue; }
    }
    const moduleM = trimmed.match(/^module\s+\d+\s*[-:]\s*(.{5,})/i);
    if (moduleM) { topicLines.push(moduleM[1].replace(/:$/, '').trim()); continue; }
  }

  const curriculum = [...new Set(topicLines)].filter(t => t.length > 4).join('\n').trim();
  return { description, prerequisites, keyTakeaways, curriculum };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  const client = await pool.connect();
  let ok = 0, fail = 0;
  try {
    await client.query('BEGIN');

    // 1. PDF overrides (hardcoded extracted data)
    for (const entry of PDF_OVERRIDES) {
      await client.query(
        `UPDATE courses
            SET description       = $1,
                prerequisites     = $2,
                key_takeaways     = $3,
                course_curriculum = $4,
                updated_at        = NOW()
          WHERE id = $5`,
        [
          entry.description       || '',
          entry.prerequisites     || '',
          entry.key_takeaways     || '',
          entry.course_curriculum || '',
          entry.id,
        ]
      );
      console.log(`  ✓  [${entry.id}] PDF override applied`);
      ok++;
    }

    // 2. ID 101 — HR Analytics (docx, was missing from main run)
    const hrPath = path.join(BASE, 'OB-HR/Final_HRanalytics_2025.docx');
    try {
      const text = await extractDocxText(hrPath);
      const { description, prerequisites, keyTakeaways, curriculum } = parseSections(text);
      await client.query(
        `UPDATE courses
            SET description       = $1,
                prerequisites     = $2,
                key_takeaways     = $3,
                course_curriculum = $4,
                updated_at        = NOW()
          WHERE id = $5`,
        [description || '', prerequisites || '', keyTakeaways || '', curriculum || '', 101]
      );
      console.log('  ✓  [101] Final_HRanalytics_2025.docx');
      if (!description)   console.log('       (no description found)');
      if (!prerequisites) console.log('       (no prerequisites found)');
      if (!keyTakeaways)  console.log('       (no learning outcomes found)');
      if (!curriculum)    console.log('       (no session plan topics found)');
      ok++;
    } catch (e) {
      console.error(`  ✗  [101] Final_HRanalytics_2025.docx: ${e.message}`);
      fail++;
    }

    await client.query('COMMIT');
    console.log(`\nDone. ✓ ${ok} updated, ✗ ${fail} failed.`);
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
