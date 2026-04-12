const { Pool } = require('pg');

// ── In-memory mock (used when DATABASE_URL is not set) ────────────────────────
function createMockPool() {
  let users = [];
  let courses = [];
  let courseRatings = [];
  let professorRatings = [];
  let userBaskets = [];
  let nextId = { users: 100, courses: 200, courseRatings: 300, professorRatings: 400 };

  function parseQuery(text, params = []) {
    const t = text.replace(/\s+/g, ' ').trim().toLowerCase();

    // ── users ──
    if (t.startsWith('select count(*) from users'))
      return { rows: [{ count: String(users.length) }] };
    if (t.includes('select basket from users'))
      return { rows: (users.find(u => u.id === params[0]) || {}).basket ? [{ basket: users.find(u => u.id === params[0]).basket }] : [] };
    if (t.startsWith('update users set basket'))
      { const u = users.find(u => u.id === params[1]); if (u) u.basket = params[0]; return { rows: [] }; }
    if (t.startsWith('select id from users where email'))
      return { rows: users.filter(u => u.email === params[0]).map(u => ({ id: u.id })) };
    if (t.includes('select * from users where email'))
      return { rows: users.filter(u => u.email === params[0]) };
    if (t.includes('select * from users where username'))
      return { rows: users.filter(u => u.username === params[0]) };
    if (t.includes('select id') && t.includes('from users where id'))
      return { rows: users.filter(u => u.id === params[0]).map(u => ({ id: u.id, username: u.username, email: u.email, name: u.name, role: u.role })) };
    if (t.startsWith('insert into users (name, email')) {
      const [name, email, password] = params;
      const u = { id: nextId.users++, name, email, password, role: 'student', username: null, basket: [] };
      users.push(u);
      return { rows: [{ id: u.id, email, name, role: 'student' }] };
    }
    if (t.startsWith('insert into users (username') && t.includes('on conflict')) {
      const [username, password, role, name] = params;
      if (users.find(u => u.username === username)) return { rows: [] };
      users.push({ id: nextId.users++, username, password, role, name, email: null, basket: [] });
      return { rows: [] };
    }

    // ── courses ──
    if (t.startsWith('select count(*) from courses'))
      return { rows: [{ count: String(courses.length) }] };
    if (t.startsWith('select * from courses where id'))
      return { rows: courses.filter(c => c.id === params[0]) };
    if (t.startsWith('select * from courses'))
      return { rows: [...courses] };
    if (t.startsWith('insert into courses')) {
      const [area, term, course, faculty, credits, description] = params;
      const c = { id: nextId.courses++, area, term, course, faculty, credits, description: description || '', created_at: new Date(), updated_at: new Date() };
      courses.push(c);
      return { rows: [c] };
    }
    if (t.startsWith('update courses set')) {
      const c = courses.find(c => c.id === params[params.length - 1]);
      if (c) Object.assign(c, { area: params[0], term: params[1], course: params[2], faculty: params[3], credits: params[4], description: params[5], updated_at: new Date() });
      return { rows: c ? [c] : [] };
    }
    if (t.startsWith('delete from courses where id')) {
      const before = courses.length;
      courses = courses.filter(c => c.id !== params[0]);
      return { rows: [], rowCount: before - courses.length };
    }

    // ── course_ratings ──
    if (t.includes('from course_ratings where course_id'))
      return { rows: courseRatings.filter(r => r.course_id === params[0]) };
    if (t.startsWith('insert into course_ratings')) {
      const [course_id, user_id, user_name, rating, comment] = params;
      const r = { id: nextId.courseRatings++, course_id, user_id, user_name, rating, comment: comment || '', created_at: new Date() };
      courseRatings.push(r);
      return { rows: [r] };
    }
    if (t.startsWith('delete from course_ratings where id'))
      { courseRatings = courseRatings.filter(r => r.id !== params[0]); return { rows: [] }; }

    // ── professor_ratings ──
    if (t.includes('from professor_ratings where professor_name'))
      return { rows: professorRatings.filter(r => r.professor_name === params[0]) };
    if (t.startsWith('insert into professor_ratings')) {
      const [professor_name, course_id, user_id, user_name, rating, comment] = params;
      const r = { id: nextId.professorRatings++, professor_name, course_id, user_id, user_name, rating, comment: comment || '', created_at: new Date() };
      professorRatings.push(r);
      return { rows: [r] };
    }
    if (t.startsWith('delete from professor_ratings where id'))
      { professorRatings = professorRatings.filter(r => r.id !== params[0]); return { rows: [] }; }

    // ── user_baskets ──
    if (t.includes('from user_baskets where user_id'))
      return { rows: userBaskets.filter(b => b.user_id === params[0]) };
    if (t.startsWith('insert into user_baskets')) {
      const [user_id, basket] = params;
      const existing = userBaskets.find(b => b.user_id === user_id);
      if (existing) { existing.basket = basket; existing.updated_at = new Date(); }
      else userBaskets.push({ user_id, basket, updated_at: new Date() });
      return { rows: [] };
    }
    if (t.startsWith('update user_baskets'))
      { const b = userBaskets.find(b => b.user_id === params[1]); if (b) { b.basket = params[0]; b.updated_at = new Date(); } return { rows: [] }; }

    return { rows: [] };
  }

  return {
    _users: users, _courses: courses,
    query(text, params = []) { return Promise.resolve(parseQuery(text, params)); },
    connect() {
      const client = { query: (t, p) => Promise.resolve(parseQuery(t, p || [])), release: () => {} };
      return Promise.resolve(client);
    },
  };
}
// ─────────────────────────────────────────────────────────────────────────────

let pool;

if (!process.env.DATABASE_URL) {
  console.warn('⚠  DATABASE_URL not set — using in-memory mock (data resets on restart)');
  pool = createMockPool();
} else {
  const useSSL = process.env.DATABASE_URL.includes('supabase.co') ||
                 process.env.NODE_ENV === 'production';
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
  });
}

async function connectDB() {
  if (!process.env.DATABASE_URL) {
    console.log('Mock DB ready (in-memory)');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        email      VARCHAR(255),
        password   VARCHAR(255) NOT NULL,
        role       VARCHAR(20)  NOT NULL DEFAULT 'student',
        name       VARCHAR(255) NOT NULL,
        basket     INTEGER[]    NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_key
        ON users (email) WHERE email IS NOT NULL;

      CREATE TABLE IF NOT EXISTS professors (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(500) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS courses (
        id            SERIAL PRIMARY KEY,
        area          VARCHAR(100)  NOT NULL,
        term          VARCHAR(20)   NOT NULL,
        course        VARCHAR(500)  NOT NULL,
        faculty       VARCHAR(500),
        credits       REAL,
        description   TEXT          NOT NULL DEFAULT '',
        professor1_id INTEGER       REFERENCES professors(id),
        professor2_id INTEGER       REFERENCES professors(id),
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      -- Idempotent schema fixes for existing deployments
      ALTER TABLE courses
        ADD COLUMN IF NOT EXISTS professor1_id INTEGER REFERENCES professors(id),
        ADD COLUMN IF NOT EXISTS professor2_id INTEGER REFERENCES professors(id);

      -- Fix credits from NUMERIC (returns as string) to REAL (returns as number)
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='courses' AND column_name='credits' AND data_type='numeric'
        ) THEN
          ALTER TABLE courses ALTER COLUMN credits TYPE REAL USING credits::REAL;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS course_ratings (
        id          SERIAL PRIMARY KEY,
        course_id   INTEGER     NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        user_id     INTEGER     NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
        user_name   VARCHAR(255) NOT NULL,
        rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment     TEXT        NOT NULL DEFAULT '',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (course_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS professor_ratings (
        id              SERIAL PRIMARY KEY,
        professor_name  VARCHAR(500) NOT NULL,
        course_id       INTEGER      REFERENCES courses(id) ON DELETE SET NULL,
        user_id         INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_name       VARCHAR(255) NOT NULL,
        rating          SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment         TEXT         NOT NULL DEFAULT '',
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        UNIQUE (professor_name, user_id, course_id)
      );

      CREATE TABLE IF NOT EXISTS user_baskets (
        user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        basket     INTEGER[] NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const db = (await client.query('SELECT current_database()')).rows[0].current_database;
    console.log('PostgreSQL connected:', db);
  } finally {
    client.release();
  }
}

module.exports = { pool, connectDB };
