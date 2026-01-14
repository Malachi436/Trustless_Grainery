import db from '../config/database';
import logger from '../config/logger';
import authService from '../services/AuthService';
import { UserRole, WarehouseStatus } from '../types/enums';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  try {
    logger.info('🌱 Seeding database...');

    // Create Platform Admin
    const admin = await authService.createUser(
      'System Administrator',
      '0200000000',
      '0000',
      UserRole.PLATFORM_ADMIN,
      null
    );
    logger.info('✅ Created admin user', { adminId: admin.id });

    // Create warehouse
    const warehouseId = uuidv4();
    const ownerUserId = uuidv4();

    // Create owner first
    await db.query(
      `INSERT INTO users (id, name, phone, role, hashed_pin, warehouse_id)
       VALUES ($1, $2, $3, $4, $5, NULL)`,
      [ownerUserId, 'Sarah Mensah', '0201234567', UserRole.OWNER, await hashPin('5678')]
    );

    await db.query(
      `INSERT INTO warehouses (id, name, location, status, owner_id, warehouse_code)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [warehouseId, 'Main Warehouse', 'Accra, Ghana', WarehouseStatus.ACTIVE, ownerUserId, 'MNW']
    );

    // Update owner with warehouse_id
    await db.query(
      'UPDATE users SET warehouse_id = $1 WHERE id = $2',
      [warehouseId, ownerUserId]
    );

    // Add owner to warehouse_owners table
    await db.query(
      `INSERT INTO warehouse_owners (warehouse_id, user_id, role_type)
       VALUES ($1, $2, 'OWNER')
       ON CONFLICT (warehouse_id, user_id) DO NOTHING`,
      [warehouseId, ownerUserId]
    );

    logger.info('✅ Created warehouse and owner');

    // Create attendant
    const attendant = await authService.createUser(
      'James Okonkwo',
      '0241234567',
      '1234',
      UserRole.ATTENDANT,
      warehouseId
    );

    await authService.assignAttendantToWarehouse(attendant.id, warehouseId);

    logger.info('✅ Created attendant user', { attendantId: attendant.id });

    logger.info(`
╔══════════════════════════════════════════╗
║   SEED DATA CREATED                      ║
╠══════════════════════════════════════════╣
║   Admin:                                 ║
║   Phone: 0200000000                      ║
║   PIN: 0000                              ║
║                                          ║
║   Owner (Sarah Mensah):                  ║
║   Phone: 0201234567                      ║
║   PIN: 5678                              ║
║                                          ║
║   Attendant (James Okonkwo):             ║
║   Phone: 0241234567                      ║
║   PIN: 1234                              ║
╚══════════════════════════════════════════╝
    `);

    process.exit(0);
  } catch (error) {
    logger.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

async function hashPin(pin: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(pin, 10);
}

seed();
