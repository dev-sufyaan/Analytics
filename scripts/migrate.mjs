import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Missing DATABASE_URL in .env.local');
  process.exit(1);
}

console.log('Connecting to database...');
const sql = postgres(dbUrl, { ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.error('No migrations found in', migrationsDir);
      process.exit(1);
    }

    for (const file of files) {
      console.log(`Applying ${file}...`);
      const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await sql.unsafe(migrationSql);
      console.log(`✓ ${file} applied`);
    }

    // Verify tables
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log('Public tables:', tables.map((t) => t.table_name).join(', '));

    // Verify functions
    const functions = await sql`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      ORDER BY routine_name;
    `;
    console.log('Public functions:', functions.map((f) => f.routine_name).join(', '));

    console.log('\nAll migrations applied successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
