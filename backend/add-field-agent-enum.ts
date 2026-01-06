import db from './src/config/database';
import logger from './src/config/logger';

async function addFieldAgentEnum() {
  try {
    logger.info('🚀 Adding FIELD_AGENT to user_role enum...');
    await db.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'FIELD_AGENT'");
    logger.info('✅ FIELD_AGENT successfully added to user_role enum');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to add FIELD_AGENT:', error);
    process.exit(1);
  }
}

addFieldAgentEnum();
