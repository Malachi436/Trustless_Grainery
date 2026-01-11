import db from './src/config/database';
import bcrypt from 'bcryptjs';

async function resetAdminPin() {
  try {
    console.log('✅ Resetting admin PIN...');

    const newPin = '0000';
    const hashedPin = await bcrypt.hash(newPin, 10);

    const result = await db.query(
      `UPDATE users 
       SET hashed_pin = $1 
       WHERE phone = $2 
       RETURNING id, phone, role`,
      [hashedPin, '0200000000']
    );

    if (result.rows.length > 0) {
      console.log('✅ Admin PIN reset successfully');
      console.log('User:', result.rows[0]);
      console.log('New PIN:', newPin);
    } else {
      console.log('❌ Admin user not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
}

resetAdminPin();
