/**
 * One-time script to create batches for existing genesis events
 * Run this to ensure all genesis inventory has corresponding batches with QR codes
 */

import db from '../config/database';
import batchService from '../services/BatchService';
import { CropType, EventType, BatchSourceType } from '../types/enums';
import logger from '../config/logger';

async function createGenesisBatches(): Promise<void> {
  try {
    logger.info('🔍 Checking for genesis events without batches...');

    // Get all genesis events
    const genesisResult = await db.query(
      `SELECT event_id, warehouse_id, actor_id, payload, created_at 
       FROM events 
       WHERE event_type = $1
       ORDER BY created_at`,
      [EventType.GENESIS_INVENTORY_RECORDED]
    );

    const genesisEvents = genesisResult.rows as Array<{
      event_id: string;
      warehouse_id: string;
      actor_id: string;
      payload: { crop: CropType; bag_quantity: number; photo_urls?: string[]; notes?: string };
      created_at: Date;
    }>;
    logger.info(`Found ${genesisEvents.length} genesis events`);

    let batchesCreated = 0;
    let batchesSkipped = 0;

    for (const event of genesisEvents) {
      const { warehouse_id, actor_id, payload, created_at } = event;

      // Check if batch already exists for this genesis event
      const existingBatch = await db.query(
        `SELECT id FROM batches 
         WHERE warehouse_id = $1 
         AND crop_type = $2 
         AND initial_bags = $3
         AND created_at::date = $4::date
         LIMIT 1`,
        [warehouse_id, payload.crop, payload.bag_quantity, created_at]
      );

      if (existingBatch.rows.length > 0) {
        batchesSkipped++;
        logger.info(`⏭️  Batch already exists for ${payload.crop} at ${warehouse_id}`);
        continue;
      }

      // Create batch for this genesis event
      const batch = await batchService.createBatch(
        warehouse_id,
        payload.crop,
        payload.bag_quantity,
        actor_id,
        BatchSourceType.OWN_FARM,
        'Genesis Inventory',
        'Initial Stock'
      );

      batchesCreated++;
      logger.info(`✅ Created batch ${batch.batch_code} for ${payload.crop} (${payload.bag_quantity} bags)`);
    }

    logger.info('');
    logger.info('📊 Summary:');
    logger.info(`   Total genesis events: ${genesisEvents.length}`);
    logger.info(`   Batches created: ${batchesCreated}`);
    logger.info(`   Batches skipped (already exist): ${batchesSkipped}`);
    logger.info('');
    logger.info('✅ Genesis batch creation complete!');

  } catch (error) {
    logger.error('❌ Error creating genesis batches:', error);
    throw error;
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the script
createGenesisBatches()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed:', error);
    process.exit(1);
  });
