
import authService from './src/services/AuthService';
import { UserRole } from './src/types/enums';

async function addMissingUser() {
  try {
    const warehouseId = 'b5624616-478c-439c-8bf3-b37a8a393bab'; // Main Warehouse
    await authService.createUser(
      'Azure Malachi New',
      '0555774494',
      '3333',
      UserRole.OWNER,
      warehouseId
    );
    console.log('✅ User 0555774494 created with PIN 3333');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

addMissingUser();
