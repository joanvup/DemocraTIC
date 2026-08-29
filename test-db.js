import fs from 'fs';
import initSqlJs from 'sql.js';
async function run() {
  const SQL = await initSqlJs();
  try {
    const fileBuffer = fs.readFileSync('data/elections.sqlite');
    console.log("File size:", fileBuffer.length);
    const db = new SQL.Database(fileBuffer);
    console.log("Database opened.");
    db.exec('PRAGMA schema_version;');
    console.log("Database valid.");
  } catch (err) {
    console.error("Error:", err.message);
  }
}
run();
