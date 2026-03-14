import cronService from '../services/cronService.js';

/**
 * Initialize cron jobs when the application starts
 * This should be called from your main application entry point
 */

/**
 * Start all cron jobs
 */
export const startCronJobs = async () => {
  try {
    console.log('[CronInit] Starting cron job initialization...');
    await cronService.initialize();
    console.log('[CronInit] Cron jobs initialized successfully');
  } catch (error) {
    console.error('[CronInit] Failed to initialize cron jobs:', error);
  }
};

/**
 * Stop all cron jobs (for graceful shutdown)
 */
export const stopCronJobs = () => {
  try {
    console.log('[CronInit] Stopping all cron jobs...');
    cronService.shutdown();
    console.log('[CronInit] All cron jobs stopped');
  } catch (error) {
    console.error('[CronInit] Error stopping cron jobs:', error);
  }
};

/**
 * Get cron job status for monitoring
 */
export const getCronJobStatus = () => {
  return cronService.getJobStatus();
};

/**
 * Add a new schedule to cron jobs
 */
export const addScheduleToCron = async (schedule) => {
  try {
    await cronService.addSchedule(schedule);
    console.log(`[CronInit] Added schedule to cron: ${schedule.category}`);
  } catch (error) {
    console.error(`[CronInit] Failed to add schedule to cron: ${schedule.category}`, error);
  }
};

/**
 * Remove a schedule from cron jobs
 */
export const removeScheduleFromCron = (scheduleId) => {
  try {
    const success = cronService.removeSchedule(scheduleId);
    if (success) {
      console.log(`[CronInit] Removed schedule from cron: ${scheduleId}`);
    }
    return success;
  } catch (error) {
    console.error(`[CronInit] Failed to remove schedule from cron: ${scheduleId}`, error);
    return false;
  }
};

/**
 * Update a schedule in cron jobs
 */
export const updateScheduleInCron = async (schedule) => {
  try {
    await cronService.updateSchedule(schedule);
    console.log(`[CronInit] Updated schedule in cron: ${schedule.category}`);
  } catch (error) {
    console.error(`[CronInit] Failed to update schedule in cron: ${schedule.category}`, error);
  }
};

// Auto-start cron jobs when this module is imported (in production)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  startCronJobs();
}

// Handle graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    console.log('[CronInit] Received SIGTERM, shutting down cron jobs...');
    stopCronJobs();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[CronInit] Received SIGINT, shutting down cron jobs...');
    stopCronJobs();
    process.exit(0);
  });
}

export default {
  startCronJobs,
  stopCronJobs,
  getCronJobStatus,
  addScheduleToCron,
  removeScheduleFromCron,
  updateScheduleInCron
};
