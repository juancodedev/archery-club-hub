const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');

async function migrate() {
  console.log('🚀 Starting sequential migrations...');

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error('❌ Migrations directory not found:', MIGRATIONS_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files.`);

  for (const file of files) {
    console.log(`\n-- Applying ${file} --`);
    const filePath = path.join(MIGRATIONS_DIR, file);
    
    try {
      if (process.env.DATABASE_URL) {
        console.log(`Executing via psql/DATABASE_URL...`);
        try {
          execSync(`psql "${process.env.DATABASE_URL}" -f "${filePath}"`, { stdio: 'inherit' });
        } catch (e) {
          console.error(`❌ psql failed. Ensure psql is installed and DATABASE_URL is correct.`);
          throw e;
        }
      } else {
        console.log(`⚠️  DATABASE_URL not found in .env.`);
        console.log(`Trying 'supabase db push' (this will push all migrations at once)...`);
        execSync(`supabase db push`, { stdio: 'inherit' });
        console.log(`✅ 'supabase db push' command finished.`);
        break; // db push handles all files, so we exit loop
      }
      console.log(`✅ Finished ${file}`);
    } catch (error) {
      console.error(`❌ Error applying ${file}:`, error.message);
      console.log(`\n💡 TIP: If psql is not working, you can copy the content of ${file} into the Supabase SQL Editor.`);
      process.exit(1);
    }
  }

  // Reload PostgREST cache
  if (process.env.DATABASE_URL) {
    try {
      console.log('\n-- Reloading PostgREST cache --');
      execSync(`psql "${process.env.DATABASE_URL}" -c "NOTIFY pgrst, 'reload schema';"`, { stdio: 'inherit' });
    } catch (e) {
      console.log('⚠️  Failed to reload PostgREST cache via psql. You may need to refresh the Supabase dashboard.');
    }
  }

  console.log('\n✨ All migrations applied successfully!');
}

migrate();
