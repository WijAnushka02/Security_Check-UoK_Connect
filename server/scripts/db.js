require('node:dns').setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const readline = require('readline');
const bcrypt = require('bcryptjs');

const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true } }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
const pool = new Pool(poolConfig);

const run = (client, sql, params) => client.query(sql, params);

const setupDb = async () => {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL...');
    await client.query('BEGIN');
    // Drop existing tables to apply schema changes cleanly
    await run(client, `
      DROP TABLE IF EXISTS comments, notifications, likes, followers, project_tags, project_views, refresh_tokens, projects, users, "session" CASCADE;
    `);

    // ── USERS ───────────────────────────────────────────────────────────────
    await run(client, `
      CREATE TABLE IF NOT EXISTS users (
        id             SERIAL        PRIMARY KEY,
        google_id      VARCHAR(255)  UNIQUE,
        password       VARCHAR(255),
        name           VARCHAR(255)  NOT NULL,
        email          VARCHAR(255)  UNIQUE NOT NULL,
        profile_pic    VARCHAR(500),
        role           VARCHAR(20)   NOT NULL DEFAULT 'student'
                         CHECK (role IN ('student', 'recruiter', 'admin')),
        student_id     VARCHAR(50)   UNIQUE,
        admin_verified BOOLEAN       NOT NULL DEFAULT FALSE,
        is_blocked     BOOLEAN       NOT NULL DEFAULT FALSE,
        is_email_verified BOOLEAN    NOT NULL DEFAULT FALSE,
        verification_token VARCHAR(64),
        verification_token_expires_at TIMESTAMP,
        oidc_subject   VARCHAR(255)  UNIQUE,
        created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMP     NOT NULL DEFAULT NOW()
      );
    `);

    // ── PROJECTS ─────────────────────────────────────────────────────────────
    await run(client, `
      CREATE TABLE IF NOT EXISTS projects (
        id            SERIAL        PRIMARY KEY,
        user_id       INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title         VARCHAR(255)  NOT NULL,
        description   TEXT          NOT NULL,
        thumbnail_url VARCHAR(500),
        github_url    VARCHAR(500),
        demo_url      VARCHAR(500),
        tech_stack    JSONB         NOT NULL DEFAULT '[]',
        status        VARCHAR(20)   NOT NULL DEFAULT 'published'
                        CHECK (status IN ('draft', 'published', 'hidden')),
        view_count    INTEGER       NOT NULL DEFAULT 0,
        created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
      );
    `);

    // ── PROJECT TAGS ──────────────────────────────────────────────────────────
    await run(client, `
      CREATE TABLE IF NOT EXISTS project_tags (
        id         SERIAL       PRIMARY KEY,
        project_id INTEGER      NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        tag        VARCHAR(100) NOT NULL,
        UNIQUE(project_id, tag)
      );
    `);

    // ── LIKES ────────────────────────────────────────────────────────────────
    await run(client, `
      CREATE TABLE IF NOT EXISTS likes (
        id         SERIAL    PRIMARY KEY,
        user_id    INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER   NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, project_id)
      );
    `);

    // ── COMMENTS ─────────────────────────────────────────────────────────────
    await run(client, `
      CREATE TABLE IF NOT EXISTS comments (
        id          SERIAL      PRIMARY KEY,
        project_id  INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content     TEXT        NOT NULL,
        is_private  BOOLEAN     NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMP   NOT NULL DEFAULT NOW()
      );
    `);

    // ── FOLLOWERS ────────────────────────────────────────────────────────────
    await run(client, `
      CREATE TABLE IF NOT EXISTS followers (
        id           SERIAL    PRIMARY KEY,
        follower_id  INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(follower_id, following_id),
        CHECK(follower_id <> following_id)
      );
    `);

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
    await run(client, `
      CREATE TABLE IF NOT EXISTS notifications (
        id           SERIAL      PRIMARY KEY,
        recipient_id INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        actor_id     INTEGER     REFERENCES users(id) ON DELETE SET NULL,
        project_id   INTEGER     REFERENCES projects(id) ON DELETE SET NULL,
        type         VARCHAR(50) NOT NULL
                       CHECK (type IN ('like', 'follow', 'project_created', 'comment', 'user_registered', 'admin_action', 'admin_edit', 'admin_delete', 'admin_hide', 'admin_removal')),
        message      TEXT        NOT NULL,
        is_private   BOOLEAN     NOT NULL DEFAULT FALSE,
        is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
        read_at      TIMESTAMP,
        created_at   TIMESTAMP   NOT NULL DEFAULT NOW()
      );
    `);

    // ── SESSION ───────────────────────────────────────────────────────────────
    await run(client, `
      CREATE TABLE IF NOT EXISTS "session" (
        "sid"    VARCHAR      NOT NULL COLLATE "default",
        "sess"   JSON         NOT NULL,
        "expire" TIMESTAMP(6) NOT NULL,
        PRIMARY KEY ("sid")
      );
    `);
    await run(client, `
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);

    // ── PROJECT VIEWS ────────────────────────────────────────────────────────
    await run(client, `
      CREATE TABLE IF NOT EXISTS project_views (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, project_id)
      );
    `);

    // ── REFRESH TOKENS ───────────────────────────────────────────────────────
    await run(client, `
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // ── INDEXES ───────────────────────────────────────────────────────────────
    await run(client, `
      CREATE INDEX IF NOT EXISTS idx_projects_status_created ON projects (status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);
      CREATE INDEX IF NOT EXISTS idx_likes_project_id ON likes (project_id);
      CREATE INDEX IF NOT EXISTS idx_comments_project_id ON comments (project_id);
      CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments (user_id);
      CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON project_tags (project_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications (recipient_id, is_read);
      CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers (following_id);
    `);

    // ── UPDATED_AT TRIGGER ────────────────────────────────────────────────────
    await run(client, `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    for (const table of ['users', 'projects', 'comments']) {
      await run(client, `DROP TRIGGER IF EXISTS trigger_${table}_updated_at ON ${table};`);
      await run(client, `
        CREATE TRIGGER trigger_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    await client.query('COMMIT');
    console.log('All tables created successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database setup failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
};

const confirm = () =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(
      `WARNING: This will permanently delete all data in "${process.env.DB_NAME}".\nType "yes" to confirm: `,
      (answer) => { rl.close(); resolve(answer.trim().toLowerCase()); }
    );
  });

const resetDb = async (force) => {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: db:reset cannot run in production. Set NODE_ENV != production.');
    process.exit(1);
  }

  if (!force) {
    const answer = await confirm();
    if (answer !== 'yes') {
      console.log('Reset cancelled.');
      process.exit(0);
    }
  }

  const client = await pool.connect();
  try {
    console.log('Resetting database...');
    await client.query('BEGIN');
    await client.query(`
      TRUNCATE TABLE
        notifications,
        comments,
        likes,
        followers,
        project_tags,
        project_views,
        refresh_tokens,
        projects,
        users,
        "session"
      RESTART IDENTITY
      CASCADE;
    `);
    await client.query('COMMIT');
    console.log('All tables truncated and sequences reset to 1.');
    console.log('Schema (tables, indexes, triggers) was preserved.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reset failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
};

const createAdmin = async (email, rawPassword) => {
  const query = `
    INSERT INTO users (name, email, role, admin_verified, is_email_verified, password) 
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (email) DO UPDATE 
    SET password = EXCLUDED.password, 
        role = EXCLUDED.role, 
        admin_verified = EXCLUDED.admin_verified,
        is_email_verified = EXCLUDED.is_email_verified,
        name = EXCLUDED.name;
  `;

  try {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);
    
    await pool.query(query, ['Admin User', email, 'admin', true, true, hashedPassword]);
    console.log(`Admin user '${email}' inserted/updated successfully!`);
    console.log(`You can now login locally using:\n   Email: ${email}\n   Password: ${rawPassword}`);
  } catch (err) {
    console.error('Error executing query:', err);
  }
};

(async () => {
  const action = process.argv[2];
  
  if (action === 'setup') {
    await setupDb();
  } else if (action === 'reset') {
    await resetDb(process.argv.includes('--force'));
  } else if (action === 'create-admin') {
    const email = process.argv[3] || process.env.ADMIN_EMAIL;
    const password = process.argv[4] || process.env.ADMIN_PASSWORD;
    if (!email || !password) {
      console.error('Usage: node scripts/db.js create-admin <email> <password>');
      process.exit(1);
    }
    await createAdmin(email, password);
  } else {
    console.error('Usage: node scripts/db.js [setup|reset|create-admin]');
    process.exit(1);
  }

  await pool.end();
})();
