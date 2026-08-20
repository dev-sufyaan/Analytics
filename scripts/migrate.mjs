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
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/0001_init.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying 0001_init.sql migration...');
    await sql.unsafe(migrationSql);

    console.log('Migration applied successfully!');

    // Verify tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log('Public tables:', tables.map(t => t.table_name));

    // Verify functions
    const functions = await sql`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      ORDER BY routine_name;
    `;
    console.log('Public functions:', functions.map(f => f.routine_name));
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
