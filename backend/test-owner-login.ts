import db from './src/config/database';
import bcrypt from 'bcryptjs';

async function testOwnerLogin() {
  try {
    const phone = '0244067853';
    const pin = '0000';

    console.log('🔐 Testing owner login...\n');
    console.log(`Phone: ${phone}`);
    console.log(`PIN: ${pin}\n`);

    // Get user from database
    const result = await db.query(
      `SELECT u.*, w.name as warehouse_name
       FROM users u
       LEFT JOIN warehouses w ON u.warehouse_id = w.id
       WHERE u.phone = $1`,
      [phone]
    );

    if (result.rows.length === 0) {
      console.log('❌ No user found with this phone number');
      return;
    }

    const user = result.rows[0];
    console.log('✅ User found:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Warehouse: ${user.warehouse_name || 'None'}`);
    console.log(`   Warehouse ID: ${user.warehouse_id || 'N/A'}\n`);

    // Test PIN
    const isValidPin = await bcrypt.compare(pin, user.hashed_pin);
    
    if (isValidPin) {
      console.log('✅ PIN is CORRECT! Login should work.');
      console.log('\n📱 Login credentials verified:');
      console.log(`   Phone: ${phone}`);
      console.log(`   PIN: ${pin}`);
      console.log(`   Role: ${user.role}`);
    } else {
      console.log('❌ PIN is INCORRECT!');
      console.log('\nTrying other common PINs...');
      const commonPins = ['0000', '1234', '1111', '2222', '3333', '4444', '5555'];
      for (const testPin of commonPins) {
        const match = await bcrypt.compare(testPin, user.hashed_pin);
        if (match) {
          console.log(`✅ Correct PIN is: ${testPin}`);
          break;
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testOwnerLogin();
