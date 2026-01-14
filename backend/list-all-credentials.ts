import db from './src/config/database';
import bcrypt from 'bcryptjs';

async function listAllCredentials() {
  try {
    console.log('📋 ALL USER CREDENTIALS IN SYSTEM\n');
    console.log('='.repeat(60));

    const result = await db.query(`
      SELECT u.id, u.name, u.phone, u.role, u.warehouse_id, w.name as warehouse_name, u.hashed_pin
      FROM users u
      LEFT JOIN warehouses w ON u.warehouse_id = w.id
      ORDER BY u.role, u.created_at
    `);

    const roleGroups: Record<string, any[]> = {
      PLATFORM_ADMIN: [],
      OWNER: [],
      ATTENDANT: [],
      FIELD_AGENT: []
    };

    result.rows.forEach(user => {
      roleGroups[user.role].push(user);
    });

    for (const [role, users] of Object.entries(roleGroups)) {
      if (users.length > 0) {
        console.log(`\n🔹 ${role}s (${users.length}):`);
        console.log('-'.repeat(60));
        
        users.forEach((user, index) => {
          console.log(`\n  ${index + 1}. ${user.name}`);
          console.log(`     Phone: ${user.phone}`);
          console.log(`     Warehouse: ${user.warehouse_name || 'None'}`);
          
          // Check common PINs
          const commonPins = ['1234', '0000', '1111', '2222', '3333', '4444', '5555'];
          let foundPin: string | null = null;
          for (const pin of commonPins) {
            if (bcrypt.compareSync(pin, user.hashed_pin)) {
              foundPin = pin;
              break;
            }
          }
          
          if (foundPin) {
            console.log(`     PIN: ${foundPin} ✅`);
          } else {
            console.log(`     PIN: (custom - not in common list)`);
          }
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n💡 Use these credentials to login\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

listAllCredentials();
