import { getDbConnection, executeQuery } from './src/server/db/connection.js';

async function test() {
  const data = await executeQuery('SELECT DISTINCT course, grade FROM students;');
  console.log(data);
}
test();
