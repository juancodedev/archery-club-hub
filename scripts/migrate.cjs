// scripts/migrate.cjs
// Runs only PENDING migrations by tracking applied ones in a _migrations_log table.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');

// SQL to create the migrations log table if it doesn't exist
const SETUP_LOG_SQL = `
CREATE TABLE IF NOT EXISTS public._migrations_log (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

function psql(sql) {
  execSync(`psql "${process.env.DATABASE_URL}" -c "${sql.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
}

function psqlFile(filePath) {
  execSync(`psql "${process.env.DATABASE_URL}" -f "${filePath}"`, { stdio: 'inherit' });
}

function getAppliedMigrations() {
  try {
    const result = execSync(
      `psql "${process.env.DATABASE_URL}" -t -A -c "SELECT filename FROM public._migrations_log ORDER BY applied_at;"`,
      { stdio: 'pipe' }
    ).toString().trim();
    return result ? new Set(result.split('\n').map(s => s.trim())) : new Set();
  } catch {
    return new Set(); // Table doesn't exist yet, all migrations are pending
  }
}

function markApplied(filename) {
  execSync(
    `psql "${process.env.DATABASE_URL}" -c "INSERT INTO public._migrations_log (filename) VALUES ('${filename}') ON CONFLICT (filename) DO NOTHING;"`,
    { stdio: 'pipe' }
  );
}

async function migrate() {
  console.log('🚀 Starting sequential migrations...\n');

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error('❌ Migrations directory not found:', MIGRATIONS_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files.`);

  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not found in .env.');
    console.log('Trying "supabase db push" (applies all at once)...');
    execSync('supabase db push', { stdio: 'inherit' });
    console.log('✅ Done via supabase db push.');
    return;
  }

  // Ensure the log table exists
  try {
    execSync(`psql "${process.env.DATABASE_URL}" -c "${SETUP_LOG_SQL.replace(/\n/g, ' ')}"`, { stdio: 'pipe' });
  } catch (e) {
    console.error('❌ Failed to create _migrations_log table:', e.message);
    process.exit(1);
  }

  const applied = getAppliedMigrations();
  const pending = files.filter(f => !applied.has(f));

  if (pending.length === 0) {
    console.log('\n✅ No pending migrations. Database is up to date!');
    return;
  }

  console.log(`\n📋 ${applied.size} already applied. Running ${pending.length} pending migration(s):\n`);

  for (const file of pending) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    console.log(`-- Applying ${file} --`);
    try {
      psqlFile(filePath);
      markApplied(file);
      console.log(`✅ ${file}\n`);
    } catch (error) {
      console.error(`\n❌ Error applying ${file}`);
      console.log(`💡 Fix the error above, then run 'pnpm db:migrate' again to continue.`);
      console.log(`   Or paste the content of ${file} into the Supabase SQL Editor manually.\n`);
      process.exit(1);
    }
  }

  // Reload PostgREST cache
  try {
    execSync(`psql "${process.env.DATABASE_URL}" -c "NOTIFY pgrst, 'reload schema';"`, { stdio: 'pipe' });
    console.log('🔄 PostgREST cache reloaded.');
  } catch {
    console.log('⚠️  Could not reload PostgREST cache automatically.');
  }

  console.log('\n✨ All pending migrations applied successfully!');
}

migrate();
