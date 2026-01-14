import db from './src/config/database';

(async () => {
  try {
    console.log('Checking for photos in events...\n');
    
    // Check DISPATCH_EXECUTED events for photos
    const dispatchEvents = await db.query(`
      SELECT 
        event_id,
        event_type,
        created_at,
        payload->>'request_id' as request_id,
        payload->'photo_urls' as photo_urls
      FROM events 
      WHERE event_type = 'DISPATCH_EXECUTED'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('DISPATCH_EXECUTED events with photos:');
    console.log(JSON.stringify(dispatchEvents.rows, null, 2));
    
    console.log('\n\nChecking request_projections for photo_url...\n');
    
    // Check request_projections for photo_url
    const requests = await db.query(`
      SELECT 
        request_id,
        crop,
        bag_quantity,
        status,
        CASE 
          WHEN photo_url IS NOT NULL THEN 'HAS PHOTO'
          ELSE 'NO PHOTO'
        END as has_photo,
        SUBSTRING(photo_url, 1, 50) as photo_preview,
        executed_at
      FROM request_projections
      WHERE status = 'EXECUTED'
      ORDER BY executed_at DESC
      LIMIT 5
    `);
    
    console.log('Executed requests with photo_url:');
    console.log(JSON.stringify(requests.rows, null, 2));
    
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
