import cron from 'node-cron';
import Deal from '../models/deal.model.js';

const startExpireDealsJob = () => {
  // Runs every 5 minutes: '*/5 * * * *'
  cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await Deal.updateMany(
        {
          isActive:   true,
          expiryTime: { $lte: new Date() },
        },
        { $set: { isActive: false } }
      );

      if (result.modifiedCount > 0) {
        console.log(` Expired ${result.modifiedCount} deal(s) at ${new Date().toLocaleTimeString()}`);
      }
    } catch (error) {
      console.error(' Error in expireDeals job:', error.message);
    }
  });

  console.log(' Deal expiry cron job started (runs every 5 minutes)');
};

export default startExpireDealsJob;