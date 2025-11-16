import cron from 'node-cron';
import { autoConfirmOrders } from '../services/order.service.js';

export const startOrderAutoConfirmJob = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('running auto-confirm orders job...');
      const confirmedCount = await autoConfirmOrders();
      console.log(`auto-confirmed ${confirmedCount} orders`);
    } catch (error) {
      console.error('error in auto-confirm orders job:', error);
    }
  });

  console.log('order auto-confirm scheduler started (runs daily at 2 AM)');
};

export default {
  startOrderAutoConfirmJob,
};