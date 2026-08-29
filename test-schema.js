import fs from 'fs';
import initSqlJs from 'sql.js';
async function run() {
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync('data/elections.sqlite');
  const db = new SQL.Database(fileBuffer);
  try {
    const res = db.exec("SELECT sql FROM sqlite_master;");
    console.log("Schema:", JSON.stringify(res, null, 2));
  } catch(e) {
    console.error("Schema failed:", e.message);
  }
}
run();
