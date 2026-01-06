
import db from './src/config/database';

async function checkUsers() {
  try {
    const res = await db.query('SELECT phone, name, role FROM users');
    console.log('--- ALL USERS ---');
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
