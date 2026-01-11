import db from './src/config/database';
import bcrypt from 'bcryptjs';

(async () => {
  const result = await db.query(
    'SELECT phone, hashed_pin, role FROM users WHERE phone = $1',
    ['0200000000']
  );
  
  console.log('User found:', result.rows[0]);
  
  if (result.rows[0]) {
    const isValid = await bcrypt.compare('0000', result.rows[0].hashed_pin);
    console.log('PIN valid:', isValid);
  }
  
  process.exit(0);
})();
