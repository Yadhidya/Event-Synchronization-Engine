// config/db-setup.js — Run once to create schema
// Usage: node config/db-setup.js
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');
require('dotenv').config();

async function setup() {
  // Connect without a database first so we can create it
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || 'yadhidya',
    multipleStatements: true,
  });

  const dbName = process.env.DB_NAME || 'event_engine';

  console.log(`📦  Creating database "${dbName}" if not exists…`);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await conn.query(`USE \`${dbName}\``);

  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('❌  schema.sql not found at', schemaPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    try {
      await conn.query(stmt);
    } catch (e) {
      if (!e.message.includes('already exists') && !e.message.includes('Duplicate entry')) {
        console.warn('⚠️   Skipped:', e.message.slice(0, 80));
      }
    }
  }

  console.log('✅  Schema applied successfully!');
  console.log('👤  Seed credentials (password for all): Admin@123');
  await conn.end();
}

setup().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
