import fs from 'fs';
import initSqlJs from 'sql.js';
async function run() {
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync('data/elections.sqlite');
  const db = new SQL.Database(fileBuffer);
  try {
    const res = db.exec("SELECT id, name, year, description, start_at, end_at, status, allow_blank_vote, show_live_results, created_at, updated_at FROM elections WHERE status = 'OPEN' ORDER BY created_at DESC LIMIT 1");
    console.log("Query success:", res);
  } catch(e) {
    console.error("Query failed:", e.message);
  }
}
run();
